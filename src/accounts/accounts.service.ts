import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    // 使用事务确保账户创建和记账记录原子性
    return this.prisma.$transaction(async (tx) => {
      // 计算月供（如果未提供但有足够信息）
      let monthlyPayment = dto.monthlyPayment;
      if (!monthlyPayment && dto.loanTermMonths && dto.interestRate !== undefined) {
        monthlyPayment = this.calculateMonthlyPayment(
          Math.abs(dto.balance),
          dto.interestRate,
          dto.loanTermMonths,
        );
      }

      // 1. 创建账户
      const account = await tx.account.create({
        data: {
          name: dto.name,
          type: dto.type,
          balance: dto.balance,
          currency: dto.currency || 'CNY',
          userId,
          // 银行卡/账户标识（尾号）
          cardIdentifier: dto.cardIdentifier,
          // 贷款专用字段
          loanTermMonths: dto.loanTermMonths,
          interestRate: dto.interestRate,
          monthlyPayment: monthlyPayment,
          repaymentDay: dto.repaymentDay,
          loanStartDate: dto.loanStartDate ? new Date(dto.loanStartDate) : null,
          institutionName: dto.institutionName,
        },
      });

      // 2. 如果有初始余额，自动生成期初余额记账记录
      if (dto.balance !== 0) {
        const isLiability = ['CREDIT_CARD', 'LOAN', 'MORTGAGE', 'OTHER_LIABILITY'].includes(dto.type);
        const recordType = dto.balance > 0 ? 'INCOME' : 'EXPENSE';
        
        await tx.record.create({
          data: {
            amount: Math.abs(dto.balance),
            type: isLiability && dto.balance < 0 ? 'EXPENSE' : recordType,
            category: 'INITIAL_BALANCE',
            description: `${dto.name} 期初余额`,
            date: new Date(),
            accountId: account.id,
            userId,
            isConfirmed: true,
          },
        });
      }

      // 3. 如果启用了自动扣款，创建 AutoPayment 配置
      if (dto.autoRepayment && dto.repaymentDay) {
        const paymentType = dto.type === 'MORTGAGE' ? 'MORTGAGE' : 'LOAN';
        
        // 查找扣款来源账户
        let sourceAccountId = dto.sourceAccountId;
        if (!sourceAccountId && dto.sourceAccountName) {
          const sourceAccount = await tx.account.findFirst({
            where: { userId, name: { contains: dto.sourceAccountName } },
          });
          sourceAccountId = sourceAccount?.id;
        }

        await tx.autoPayment.create({
          data: {
            name: `${dto.name}还款`,
            paymentType,
            liabilityAccountId: account.id,
            fixedAmount: monthlyPayment,
            dayOfMonth: dto.repaymentDay,
            executeTime: '08:00',
            reminderDaysBefore: 2,
            insufficientFundsPolicy: 'TRY_NEXT_SOURCE',
            isEnabled: true,
            nextExecuteAt: this.calculateNextExecuteTime(dto.repaymentDay),
            userId,
            // 创建来源账户配置
            sources: sourceAccountId
              ? {
                  create: {
                    accountId: sourceAccountId,
                    priority: 1,
                  },
                }
              : undefined,
          },
        });
      }

      return account;
    });
  }

  /**
   * 计算等额本息月供
   */
  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    termMonths: number,
  ): number {
    if (annualRate === 0) {
      return principal / termMonths;
    }

    const monthlyRate = annualRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);

    return Math.round(monthlyPayment * 100) / 100;
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecuteTime(dayOfMonth: number): Date {
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 8, 0, 0, 0);

    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }

    if (next.getDate() !== dayOfMonth) {
      next.setDate(0);
    }

    return next;
  }

  async findAll(userId: string) {
    // 1. 获取非信用卡的账户（排除旧的 CREDIT_CARD 类型，过滤已删除）
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        type: { not: 'CREDIT_CARD' },
        deletedAt: null, // 只返回未删除的账户
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. 获取信用卡数据
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 3. 转换信用卡为账户格式
    const creditCardAsAccounts = creditCards.map((card) => ({
      id: card.id,
      name: card.name,
      type: 'CREDIT_CARD',
      balance: card.currentBalance, // 待还金额作为负债
      currency: card.currency,
      userId: card.userId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      cardIdentifier: card.cardIdentifier,
      institutionName: card.institutionName,
      // 贷款字段设为 null
      loanTermMonths: null,
      interestRate: null,
      monthlyPayment: null,
      repaymentDay: null,
      loanStartDate: null,
    }));

    // 4. 合并返回
    return [...accounts, ...creditCardAsAccounts];
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null }, // 只查找未删除的账户
    });

    if (!account) {
      throw new NotFoundException('资产不存在');
    }

    return account;
  }

  async update(id: string, userId: string, dto: UpdateAccountDto) {
    await this.findOne(id, userId); // 检查权限

    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.balance !== undefined && { balance: dto.balance }),
        ...(dto.cardIdentifier !== undefined && { cardIdentifier: dto.cardIdentifier }),
        ...(dto.loanTermMonths !== undefined && { loanTermMonths: dto.loanTermMonths }),
        ...(dto.interestRate !== undefined && { interestRate: dto.interestRate }),
        ...(dto.monthlyPayment !== undefined && { monthlyPayment: dto.monthlyPayment }),
        ...(dto.repaymentDay !== undefined && { repaymentDay: dto.repaymentDay }),
        ...(dto.loanStartDate && { loanStartDate: new Date(dto.loanStartDate) }),
        ...(dto.institutionName !== undefined && { institutionName: dto.institutionName }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // 检查权限

    // 软删除：设置 deletedAt 而非真正删除
    return this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 计算总资产 (包含持仓市值和信用卡负债)
  async getTotalAssets(userId: string) {
    // 获取所有账户（排除旧的 CREDIT_CARD 类型，过滤已删除）
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        type: { not: 'CREDIT_CARD' },
        deletedAt: null, // 只计算未删除的账户
      },
    });

    // 获取信用卡数据
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId },
    });

    // 获取所有持仓
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
    });

    // 计算账户余额总计（不含信用卡）
    const cashTotal = accounts.reduce(
      (sum: number, acc: any) => sum + Number(acc.balance),
      0,
    );

    // 计算信用卡待还金额总计
    const creditCardTotal = creditCards.reduce(
      (sum: number, card: any) => sum + Number(card.currentBalance),
      0,
    );

    // 计算持仓总市值
    const holdingsMarketValue = holdings.reduce((sum, h) => {
      const price = h.currentPrice || h.avgCostPrice;
      return sum + h.quantity * price;
    }, 0);

    // 计算持仓总成本
    const holdingsCost = holdings.reduce((sum, h) => {
      return sum + h.quantity * h.avgCostPrice;
    }, 0);

    // 处理账户列表，添加持仓信息
    const accountsWithHoldings = accounts.map((acc: any) => {
      const accHoldings = acc.holdings || [];
      const holdingsValue = accHoldings.reduce((sum: number, h: any) => {
        const price = h.currentPrice || h.avgCostPrice;
        return sum + h.quantity * price;
      }, 0);

      return {
        ...acc,
        holdingsCount: accHoldings.length,
        holdingsValue,
        totalValue: acc.balance + holdingsValue,
        holdings: undefined, // 移除详细持仓，避免响应过大
      };
    });

    // 将信用卡转换为账户格式并添加到列表
    const creditCardAsAccounts = creditCards.map((card: any) => ({
      id: card.id,
      name: card.name,
      type: 'CREDIT_CARD',
      balance: card.currentBalance,
      currency: card.currency,
      userId: card.userId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      cardIdentifier: card.cardIdentifier,
      institutionName: card.institutionName,
      loanTermMonths: null,
      interestRate: null,
      monthlyPayment: null,
      repaymentDay: null,
      loanStartDate: null,
      holdingsCount: 0,
      holdingsValue: 0,
      totalValue: card.currentBalance,
    }));

    return {
      total: cashTotal + holdingsMarketValue - creditCardTotal, // 总资产减去信用卡负债
      cashTotal,
      holdingsMarketValue,
      holdingsCost,
      creditCardTotal, // 新增：信用卡待还总额
      unrealizedPnL: holdingsMarketValue - holdingsCost,
      accounts: [...accountsWithHoldings, ...creditCardAsAccounts],
    };
  }
}

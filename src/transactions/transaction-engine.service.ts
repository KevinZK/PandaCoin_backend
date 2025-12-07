import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  CreateTransactionDto,
  TransactionType,
  TransactionResultDto,
  NetWorthDto,
} from './dto/transaction.dto';

/**
 * 交易引擎服务
 * 统一处理所有记账类型，自动联动账户余额和投资持仓
 */
@Injectable()
export class TransactionEngineService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  /**
   * 创建交易记录并联动更新账户余额
   * 这是核心聚合方法，所有记账操作都通过这里
   */
  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResultDto> {
    this.logger.debug(`Creating transaction: ${dto.type} - ${dto.amount}`, 'TransactionEngine');

    // 验证请求
    await this.validateTransaction(userId, dto);

    // 使用事务确保原子性
    return this.prisma.$transaction(async (tx) => {
      const accountChanges: TransactionResultDto['accountChanges'] = [];
      let investmentChanges: TransactionResultDto['investmentChanges'] = undefined;

      // 1. 处理源账户余额变化
      const sourceAccount = await tx.account.findUnique({
        where: { id: dto.accountId },
      });

      if (!sourceAccount) {
        throw new NotFoundException('源账户不存在');
      }

      const sourceChange = this.calculateSourceChange(dto.type, dto.amount);
      const newSourceBalance = sourceAccount.balance + sourceChange;

      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: newSourceBalance },
      });

      accountChanges.push({
        accountId: sourceAccount.id,
        accountName: sourceAccount.name,
        previousBalance: sourceAccount.balance,
        newBalance: newSourceBalance,
        change: sourceChange,
      });

      // 2. 处理目标账户余额变化 (转账/还款)
      if (dto.targetAccountId && this.needsTargetAccount(dto.type)) {
        const targetAccount = await tx.account.findUnique({
          where: { id: dto.targetAccountId },
        });

        if (!targetAccount) {
          throw new NotFoundException('目标账户不存在');
        }

        const targetChange = this.calculateTargetChange(dto.type, dto.amount);
        const newTargetBalance = targetAccount.balance + targetChange;

        await tx.account.update({
          where: { id: dto.targetAccountId },
          data: { balance: newTargetBalance },
        });

        accountChanges.push({
          accountId: targetAccount.id,
          accountName: targetAccount.name,
          previousBalance: targetAccount.balance,
          newBalance: newTargetBalance,
          change: targetChange,
        });
      }

      // 3. 处理投资持仓变化 (买入/卖出)
      if (dto.investmentId && this.needsInvestment(dto.type)) {
        const investment = await tx.investment.findUnique({
          where: { id: dto.investmentId },
        });

        if (!investment) {
          throw new NotFoundException('投资持仓不存在');
        }

        const quantityChange = this.calculateQuantityChange(dto.type, dto.quantity || 0);
        const newQuantity = investment.quantity + quantityChange;

        if (newQuantity < 0) {
          throw new BadRequestException('卖出数量超过持仓数量');
        }

        // 更新持仓数量和成本价
        const updateData: any = { quantity: newQuantity };
        
        // 买入时更新成本价（加权平均）
        if (dto.type === TransactionType.INVEST_BUY && dto.unitPrice) {
          const totalCost = investment.costPrice * investment.quantity + dto.unitPrice * (dto.quantity || 0);
          updateData.costPrice = newQuantity > 0 ? totalCost / newQuantity : 0;
        }

        await tx.investment.update({
          where: { id: dto.investmentId },
          data: updateData,
        });

        investmentChanges = {
          investmentId: investment.id,
          investmentName: investment.name,
          previousQuantity: investment.quantity,
          newQuantity: newQuantity,
          change: quantityChange,
          costPrice: updateData.costPrice || investment.costPrice,
        };
      }

      // 4. 创建记账记录
      const record = await tx.record.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          category: dto.category,
          description: dto.description,
          rawText: dto.rawText,
          date: dto.date ? new Date(dto.date) : new Date(),
          confidence: dto.confidence,
          isConfirmed: true,
          accountId: dto.accountId,
          targetAccountId: dto.targetAccountId,
          investmentId: dto.investmentId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          userId,
        },
      });

      this.logger.log(
        `Transaction created: ${record.id}, type: ${dto.type}, amount: ${dto.amount}`,
        'TransactionEngine',
      );

      return {
        record: {
          id: record.id,
          type: record.type,
          amount: record.amount,
          category: record.category,
          description: record.description || undefined,
          date: record.date,
        },
        accountChanges,
        investmentChanges,
      };
    });
  }

  /**
   * 计算净资产
   */
  async calculateNetWorth(userId: string): Promise<NetWorthDto> {
    // 获取所有账户
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    // 获取所有投资
    const investments = await this.prisma.investment.findMany({
      where: { userId },
    });

    // 计算各类资产
    let bankAccounts = 0;
    let cashAccounts = 0;
    let digitalWalletAccounts = 0;
    let savingsAccounts = 0;
    let retirementAccounts = 0;
    let cryptoAccounts = 0;
    let propertyValue = 0;
    let vehicleValue = 0;
    let otherAssets = 0;
    let creditCardDebt = 0;
    let loanDebt = 0;
    let mortgageDebt = 0;
    let otherLiabilities = 0;

    accounts.forEach((account) => {
      switch (account.type) {
        case 'BANK':
          bankAccounts += account.balance;
          break;
        case 'CASH':
          cashAccounts += account.balance;
          break;
        case 'DIGITAL_WALLET':
          digitalWalletAccounts += account.balance;
          break;
        case 'SAVINGS':
          savingsAccounts += account.balance;
          break;
        case 'RETIREMENT':
          retirementAccounts += account.balance;
          break;
        case 'CRYPTO':
          cryptoAccounts += account.balance;
          break;
        case 'PROPERTY':
          propertyValue += account.balance;
          break;
        case 'VEHICLE':
          vehicleValue += account.balance;
          break;
        case 'OTHER_ASSET':
          otherAssets += account.balance;
          break;
        case 'CREDIT_CARD':
          // 信用卡余额为负表示欠款
          creditCardDebt += Math.abs(Math.min(0, account.balance));
          break;
        case 'LOAN':
          loanDebt += Math.abs(account.balance);
          break;
        case 'MORTGAGE':
          mortgageDebt += Math.abs(account.balance);
          break;
        case 'OTHER_LIABILITY':
          otherLiabilities += Math.abs(account.balance);
          break;
      }
    });

    // 计算投资市值
    const investmentDetails = investments.map((inv) => {
      const currentPrice = inv.currentPrice || inv.costPrice;
      const marketValue = inv.quantity * currentPrice;
      const costValue = inv.quantity * inv.costPrice;
      return {
        id: inv.id,
        name: inv.name,
        type: inv.type,
        quantity: inv.quantity,
        costPrice: inv.costPrice,
        currentPrice: currentPrice,
        marketValue: marketValue,
        profitLoss: marketValue - costValue,
      };
    });

    const investmentValue = investmentDetails.reduce((sum, inv) => sum + inv.marketValue, 0);

    // 汇总
    const liquidAssets = bankAccounts + cashAccounts + digitalWalletAccounts + savingsAccounts;
    const fixedAssets = propertyValue + vehicleValue;
    const alternativeAssets = cryptoAccounts + retirementAccounts;
    const totalAssets = liquidAssets + fixedAssets + alternativeAssets + investmentValue + otherAssets;
    const totalLiabilities = creditCardDebt + loanDebt + mortgageDebt + otherLiabilities;
    const netWorth = totalAssets - totalLiabilities;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      breakdown: {
        bankAccounts,
        cashAccounts,
        digitalWalletAccounts,
        savingsAccounts,
        retirementAccounts,
        cryptoAccounts,
        propertyValue,
        vehicleValue,
        otherAssets,
        investmentValue,
        creditCardDebt,
        loanDebt,
        mortgageDebt,
        otherLiabilities,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
      })),
      investments: investmentDetails,
    };
  }

  /**
   * 删除交易并回滚账户余额
   */
  async deleteTransaction(userId: string, recordId: string): Promise<void> {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, userId },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    // 类型断言
    const rec = record as typeof record & {
      targetAccountId?: string;
      investmentId?: string;
      quantity?: number;
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. 回滚源账户
      const sourceRollback = -this.calculateSourceChange(rec.type as TransactionType, rec.amount);
      await tx.account.update({
        where: { id: rec.accountId },
        data: { balance: { increment: sourceRollback } },
      });

      // 2. 回滚目标账户
      if (rec.targetAccountId) {
        const targetRollback = -this.calculateTargetChange(rec.type as TransactionType, rec.amount);
        await tx.account.update({
          where: { id: rec.targetAccountId },
          data: { balance: { increment: targetRollback } },
        });
      }

      // 3. 回滚投资持仓
      if (rec.investmentId && rec.quantity) {
        const quantityRollback = -this.calculateQuantityChange(rec.type as TransactionType, rec.quantity);
        await tx.investment.update({
          where: { id: rec.investmentId },
          data: { quantity: { increment: quantityRollback } },
        });
      }

      // 4. 删除记录
      await tx.record.delete({ where: { id: recordId } });
    });

    this.logger.log(`Transaction deleted and rolled back: ${recordId}`, 'TransactionEngine');
  }

  // ============ 私有辅助方法 ============

  /**
   * 验证交易请求
   */
  private async validateTransaction(userId: string, dto: CreateTransactionDto): Promise<void> {
    // 验证源账户归属
    const sourceAccount = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!sourceAccount) {
      throw new BadRequestException('源账户不存在或不属于当前用户');
    }

    // 转账/还款需要目标账户
    if (this.needsTargetAccount(dto.type) && !dto.targetAccountId) {
      throw new BadRequestException(`${dto.type} 类型需要指定目标账户`);
    }

    // 验证目标账户归属
    if (dto.targetAccountId) {
      const targetAccount = await this.prisma.account.findFirst({
        where: { id: dto.targetAccountId, userId },
      });
      if (!targetAccount) {
        throw new BadRequestException('目标账户不存在或不属于当前用户');
      }
    }

    // 投资买卖需要投资ID和数量
    if (this.needsInvestment(dto.type)) {
      if (!dto.investmentId) {
        throw new BadRequestException(`${dto.type} 类型需要指定投资持仓`);
      }
      if (!dto.quantity || dto.quantity <= 0) {
        throw new BadRequestException('投资数量必须大于0');
      }
    }
  }

  /**
   * 计算源账户余额变化
   */
  private calculateSourceChange(type: TransactionType, amount: number): number {
    switch (type) {
      case TransactionType.INCOME:
        return amount;  // 收入：+金额
      case TransactionType.EXPENSE:
        return -amount; // 支出：-金额
      case TransactionType.TRANSFER:
        return -amount; // 转账转出：-金额
      case TransactionType.REPAYMENT:
        return -amount; // 还款从银行卡扣：-金额
      case TransactionType.INVEST_BUY:
        return -amount; // 买入从现金扣：-金额
      case TransactionType.INVEST_SELL:
        return amount;  // 卖出进现金：+金额
      default:
        return 0;
    }
  }

  /**
   * 计算目标账户余额变化
   */
  private calculateTargetChange(type: TransactionType, amount: number): number {
    switch (type) {
      case TransactionType.TRANSFER:
        return amount;  // 转账转入：+金额
      case TransactionType.REPAYMENT:
        return amount;  // 还款到信用卡：+金额（减少欠款）
      default:
        return 0;
    }
  }

  /**
   * 计算投资持仓数量变化
   */
  private calculateQuantityChange(type: TransactionType, quantity: number): number {
    switch (type) {
      case TransactionType.INVEST_BUY:
        return quantity;  // 买入：+数量
      case TransactionType.INVEST_SELL:
        return -quantity; // 卖出：-数量
      default:
        return 0;
    }
  }

  /**
   * 是否需要目标账户
   */
  private needsTargetAccount(type: TransactionType): boolean {
    return type === TransactionType.TRANSFER || type === TransactionType.REPAYMENT;
  }

  /**
   * 是否需要投资持仓
   */
  private needsInvestment(type: TransactionType): boolean {
    return type === TransactionType.INVEST_BUY || type === TransactionType.INVEST_SELL;
  }
}

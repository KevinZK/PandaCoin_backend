import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardDto, UpdateCreditCardDto } from './dto/credit-card.dto';
import { CreateCreditCardTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class CreditCardsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCreditCardDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 创建信用卡
      const creditCard = await tx.creditCard.create({
        data: {
          name: dto.name,
          institutionName: dto.institutionName,
          cardIdentifier: dto.cardIdentifier,
          creditLimit: dto.creditLimit,
          currentBalance: dto.currentBalance ?? 0,  // 待还金额，默认0
          repaymentDueDate: dto.repaymentDueDate,
          currency: dto.currency || 'CNY',
          userId,
        },
      });

      // 2. 如果启用了自动扣款，创建 AutoPayment 配置
      if (dto.autoRepayment && dto.repaymentDueDate) {
        const repaymentDay = parseInt(dto.repaymentDueDate, 10);
        if (!isNaN(repaymentDay) && repaymentDay >= 1 && repaymentDay <= 28) {
          const paymentType = dto.repaymentType === 'MIN' ? 'CREDIT_CARD_MIN' : 'CREDIT_CARD_FULL';

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
              name: `${dto.name}自动还款`,
              paymentType,
              creditCardId: creditCard.id,
              dayOfMonth: repaymentDay,
              executeTime: '08:00',
              reminderDaysBefore: 2,
              insufficientFundsPolicy: 'TRY_NEXT_SOURCE',
              isEnabled: true,
              nextExecuteAt: this.calculateNextExecuteTime(repaymentDay),
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
      }

      return creditCard;
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecuteTime(dayOfMonth: number, executeTime: string = '08:00'): Date {
    const now = new Date();
    const [hours, minutes] = executeTime.split(':').map(Number);

    let next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);

    // 如果今天已经过了执行时间，计算下个月
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }

    // 处理月末日期问题（如 31 号在 2 月）
    if (next.getDate() !== dayOfMonth) {
      next.setDate(0); // 设为上月最后一天
    }

    return next;
  }

  async findAll(userId: string) {
    return this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('信用卡不存在');
    }

    return card;
  }

  async findByIdentifier(cardIdentifier: string, userId: string) {
    return this.prisma.creditCard.findFirst({
      where: { cardIdentifier, userId },
    });
  }

  async update(id: string, userId: string, dto: UpdateCreditCardDto) {
    // 先检查是否存在
    await this.findOne(id, userId);

    return this.prisma.creditCard.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.institutionName && { institutionName: dto.institutionName }),
        ...(dto.cardIdentifier && { cardIdentifier: dto.cardIdentifier }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.currentBalance !== undefined && { currentBalance: dto.currentBalance }),
        ...(dto.repaymentDueDate !== undefined && { repaymentDueDate: dto.repaymentDueDate }),
        ...(dto.currency && { currency: dto.currency }),
      },
    });
  }

  async remove(id: string, userId: string) {
    // 先检查是否存在
    await this.findOne(id, userId);

    return this.prisma.creditCard.delete({
      where: { id },
    });
  }

  // 更新余额（用于交易联动）
  async updateBalance(cardIdentifier: string, userId: string, amount: number, transactionType: 'EXPENSE' | 'PAYMENT') {
    const card = await this.findByIdentifier(cardIdentifier, userId);
    
    if (!card) {
      throw new NotFoundException(`找不到卡片: ${cardIdentifier}`);
    }

    let newBalance = card.currentBalance;
    if (transactionType === 'EXPENSE') {
      newBalance += amount;
    } else if (transactionType === 'PAYMENT') {
      newBalance = Math.max(0, newBalance - amount);
    }

    return this.prisma.creditCard.update({
      where: { id: card.id },
      data: { currentBalance: newBalance },
    });
  }

  // 创建信用卡消费记录（事务处理）
  async createTransaction(userId: string, dto: CreateCreditCardTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 查找信用卡
      const creditCard = await tx.creditCard.findFirst({
        where: { cardIdentifier: dto.cardIdentifier, userId },
      });

      if (!creditCard) {
        throw new NotFoundException(`找不到卡片: ${dto.cardIdentifier}`);
      }

      // 2. 计算新余额
      const balanceChange = dto.type === 'EXPENSE' ? dto.amount : -dto.amount;
      const newBalance = Math.max(0, creditCard.currentBalance + balanceChange);

      // 3. 更新信用卡余额
      const updatedCard = await tx.creditCard.update({
        where: { id: creditCard.id },
        data: { currentBalance: newBalance },
      });

      // 4. 创建主记录（用于记账流水）
      const record = await tx.record.create({
        data: {
          amount: dto.amount,
          type: dto.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
          category: dto.category,
          description: dto.description,
          date: dto.date ? new Date(dto.date) : new Date(),
          creditCardId: creditCard.id,
          cardIdentifier: dto.cardIdentifier,
          accountId: undefined,
          userId,
          isConfirmed: true,
        },
      });

      // 5. 创建信用卡消费记录
      const transaction = await tx.creditCardTransaction.create({
        data: {
          creditCardId: creditCard.id,
          amount: dto.amount,
          type: dto.type,
          category: dto.category,
          description: dto.description,
          date: dto.date ? new Date(dto.date) : new Date(),
          recordId: record.id,
          userId,
        },
      });

      return {
        transaction,
        creditCard: updatedCard,
        record,
      };
    });
  }

  // 获取信用卡消费记录
  async getTransactions(creditCardId: string, userId: string, month?: string) {
    // 验证信用卡存在
    await this.findOne(creditCardId, userId);

    let dateFilter = {};
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const transactions = await this.prisma.creditCardTransaction.findMany({
      where: {
        creditCardId,
        userId,
        ...dateFilter,
      },
      orderBy: { date: 'desc' },
    });

    // 计算汇总
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.type === 'EXPENSE') {
          acc.totalExpense += t.amount;
        } else {
          acc.totalPayment += t.amount;
        }
        return acc;
      },
      { totalExpense: 0, totalPayment: 0 },
    );

    const card = await this.prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    return {
      transactions,
      summary: {
        ...summary,
        balance: card?.currentBalance || 0,
      },
    };
  }
}

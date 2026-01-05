import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  CreateAutoPaymentDto,
  UpdateAutoPaymentDto,
  PaymentType,
  InsufficientFundsPolicy,
  SourceAccountDto,
} from './dto/auto-payment.dto';

@Injectable()
export class AutoPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 创建自动扣款配置
   */
  async create(userId: string, dto: CreateAutoPaymentDto) {
    // 验证关联
    await this.validateRelations(userId, dto);

    // 计算下次执行时间
    const nextExecuteAt = this.calculateNextExecuteTime(dto.dayOfMonth, dto.executeTime);

    const autoPayment = await this.prisma.autoPayment.create({
      data: {
        name: dto.name,
        paymentType: dto.paymentType,
        creditCardId: dto.creditCardId,
        liabilityAccountId: dto.liabilityAccountId,
        fixedAmount: dto.fixedAmount,
        dayOfMonth: dto.dayOfMonth,
        executeTime: dto.executeTime || '08:00',
        reminderDaysBefore: dto.reminderDaysBefore ?? 2,
        insufficientFundsPolicy: dto.insufficientFundsPolicy || InsufficientFundsPolicy.TRY_NEXT_SOURCE,
        totalPeriods: dto.totalPeriods,
        completedPeriods: dto.completedPeriods ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        isEnabled: dto.isEnabled ?? true,
        nextExecuteAt,
        userId,
        // 创建来源账户配置
        sources: dto.sourceAccounts?.length
          ? {
              create: dto.sourceAccounts.map((source) => ({
                accountId: source.accountId,
                priority: source.priority,
              })),
            }
          : undefined,
      },
      include: this.getIncludeConfig(),
    });

    this.logger.log(
      `Created auto payment: ${autoPayment.name} (${autoPayment.id})`,
      'AutoPaymentsService',
    );

    return this.formatResponse(autoPayment);
  }

  /**
   * 获取用户所有自动扣款配置
   */
  async findAll(userId: string) {
    const payments = await this.prisma.autoPayment.findMany({
      where: { userId },
      include: this.getIncludeConfig(),
      orderBy: { dayOfMonth: 'asc' },
    });

    return payments.map((p) => this.formatResponse(p));
  }

  /**
   * 获取单个自动扣款配置
   */
  async findOne(userId: string, id: string) {
    const autoPayment = await this.prisma.autoPayment.findFirst({
      where: { id, userId },
      include: {
        ...this.getIncludeConfig(),
        logs: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!autoPayment) {
      throw new NotFoundException('自动扣款配置不存在');
    }

    return this.formatResponse(autoPayment);
  }

  /**
   * 更新自动扣款配置
   */
  async update(userId: string, id: string, dto: UpdateAutoPaymentDto) {
    await this.findOne(userId, id);

    // 验证关联
    await this.validateRelations(userId, dto);

    // 如果要更新来源账户，先删除旧的
    if (dto.sourceAccounts !== undefined) {
      await this.prisma.autoPaymentSource.deleteMany({
        where: { autoPaymentId: id },
      });
    }

    const updateData: any = {
      name: dto.name,
      paymentType: dto.paymentType,
      creditCardId: dto.creditCardId,
      liabilityAccountId: dto.liabilityAccountId,
      fixedAmount: dto.fixedAmount,
      dayOfMonth: dto.dayOfMonth,
      executeTime: dto.executeTime,
      reminderDaysBefore: dto.reminderDaysBefore,
      insufficientFundsPolicy: dto.insufficientFundsPolicy,
      totalPeriods: dto.totalPeriods,
      completedPeriods: dto.completedPeriods,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      isEnabled: dto.isEnabled,
    };

    // 移除 undefined 的字段
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // 如果更改了执行日期，重新计算下次执行时间
    if (dto.dayOfMonth || dto.executeTime) {
      const current = await this.prisma.autoPayment.findUnique({ where: { id } });
      updateData.nextExecuteAt = this.calculateNextExecuteTime(
        dto.dayOfMonth || current!.dayOfMonth,
        dto.executeTime || current!.executeTime,
      );
    }

    // 创建新的来源账户
    if (dto.sourceAccounts?.length) {
      updateData.sources = {
        create: dto.sourceAccounts.map((source) => ({
          accountId: source.accountId,
          priority: source.priority,
        })),
      };
    }

    const autoPayment = await this.prisma.autoPayment.update({
      where: { id },
      data: updateData,
      include: this.getIncludeConfig(),
    });

    this.logger.log(
      `Updated auto payment: ${autoPayment.name} (${autoPayment.id})`,
      'AutoPaymentsService',
    );

    return this.formatResponse(autoPayment);
  }

  /**
   * 删除自动扣款配置
   */
  async delete(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.autoPayment.delete({
      where: { id },
    });

    this.logger.log(`Deleted auto payment: ${id}`, 'AutoPaymentsService');

    return { success: true };
  }

  /**
   * 切换启用状态
   */
  async toggle(userId: string, id: string) {
    const autoPayment = await this.prisma.autoPayment.findFirst({
      where: { id, userId },
    });

    if (!autoPayment) {
      throw new NotFoundException('自动扣款配置不存在');
    }

    const updated = await this.prisma.autoPayment.update({
      where: { id },
      data: { isEnabled: !autoPayment.isEnabled },
      include: this.getIncludeConfig(),
    });

    this.logger.log(
      `Toggled auto payment: ${autoPayment.name} -> ${updated.isEnabled ? 'enabled' : 'disabled'}`,
      'AutoPaymentsService',
    );

    return this.formatResponse(updated);
  }

  /**
   * 获取今日待执行的自动扣款
   */
  async getPendingPayments() {
    const now = new Date();

    return this.prisma.autoPayment.findMany({
      where: {
        isEnabled: true,
        nextExecuteAt: {
          lte: now,
        },
      },
      include: {
        ...this.getIncludeConfig(),
        user: true,
      },
    });
  }

  /**
   * 获取即将到期的扣款（用于提醒）
   */
  async getUpcomingPayments(daysBefore: number = 2) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysBefore);

    const targetDay = targetDate.getDate();

    return this.prisma.autoPayment.findMany({
      where: {
        isEnabled: true,
        dayOfMonth: targetDay,
        reminderDaysBefore: {
          gte: daysBefore,
        },
      },
      include: {
        ...this.getIncludeConfig(),
        user: true,
      },
    });
  }

  /**
   * 执行单个自动扣款（支持多来源账户优先级）
   */
  async executePayment(paymentId: string) {
    const payment = await this.prisma.autoPayment.findUnique({
      where: { id: paymentId },
      include: {
        creditCard: true,
        liabilityAccount: true,
        sources: {
          include: { account: true },
          orderBy: { priority: 'asc' }, // 按优先级排序
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('自动扣款配置不存在');
    }

    // 计算需要扣款的金额
    const amount = await this.calculatePaymentAmount(payment);

    if (amount <= 0) {
      await this.logExecution(payment.id, 'SKIPPED', 0, null, '扣款金额为0，跳过');
      return { success: true, message: '无需扣款' };
    }

    // 检查是否有来源账户
    if (!payment.sources || payment.sources.length === 0) {
      await this.logExecution(payment.id, 'FAILED', 0, null, '未设置扣款来源账户');
      return { success: false, message: '未设置扣款来源账户' };
    }

    // 按优先级尝试各个来源账户
    let remainingAmount = amount;
    const executedSources: { accountId: string; accountName: string; amount: number }[] = [];

    for (const source of payment.sources) {
      if (remainingAmount <= 0) break;

      const account = source.account;
      const availableBalance = account.balance;

      if (availableBalance <= 0) {
        continue; // 跳过无余额的账户
      }

      const deductAmount = Math.min(remainingAmount, availableBalance);

      try {
        await this.prisma.$transaction(async (tx) => {
          // 扣减来源账户
          await tx.account.update({
            where: { id: account.id },
            data: { balance: { decrement: deductAmount } },
          });

          // 更新目标
          if (payment.creditCardId) {
            await tx.creditCard.update({
              where: { id: payment.creditCardId },
              data: { currentBalance: { decrement: deductAmount } },
            });
          } else if (payment.liabilityAccountId) {
            // 贷款类负债：余额存储为正数（欠款金额），还款后应减少
            await tx.account.update({
              where: { id: payment.liabilityAccountId },
              data: { balance: { decrement: deductAmount } },
            });
          }

          // 创建记账记录 - 关联到贷款账户，便于在贷款详情页查看还款历史
          await tx.record.create({
            data: {
              amount: deductAmount,
              type: 'PAYMENT',  // 还款类型
              category: 'LOAN_REPAYMENT',
              description: `[自动扣款] ${payment.name} (来源: ${account.name})`,
              accountId: payment.liabilityAccountId || payment.creditCardId, // 关联到贷款/信用卡账户
              targetAccountId: account.id, // 扣款来源账户
              creditCardId: payment.creditCardId,
              userId: payment.userId,
              date: new Date(),
              isConfirmed: true,
            },
          });
        });

        executedSources.push({
          accountId: account.id,
          accountName: account.name,
          amount: deductAmount,
        });
        remainingAmount -= deductAmount;

        this.logger.log(
          `Deducted ¥${deductAmount} from ${account.name} for ${payment.name}`,
          'AutoPaymentsService',
        );
      } catch (error) {
        this.logger.error(
          `Failed to deduct from ${account.name}: ${error.message}`,
          error.stack,
          'AutoPaymentsService',
        );
        // 继续尝试下一个账户
      }
    }

    // 检查是否全额完成
    const totalDeducted = executedSources.reduce((sum, s) => sum + s.amount, 0);
    const isComplete = remainingAmount <= 0;

    // 更新执行状态和期数
    const nextExecuteAt = this.calculateNextExecuteTime(payment.dayOfMonth, payment.executeTime);
    const updateData: any = {
      lastExecutedAt: new Date(),
      nextExecuteAt,
    };

    // 如果完成，增加已完成期数
    if (isComplete && payment.totalPeriods) {
      updateData.completedPeriods = payment.completedPeriods + 1;

      // 检查是否已还清
      if (updateData.completedPeriods >= payment.totalPeriods) {
        updateData.isEnabled = false;
        this.logger.log(`Auto payment ${payment.name} completed all periods!`, 'AutoPaymentsService');
      }
    }

    await this.prisma.autoPayment.update({
      where: { id: payment.id },
      data: updateData,
    });

    // 记录执行日志
    const status = isComplete ? 'SUCCESS' : remainingAmount < amount ? 'PARTIAL' : 'INSUFFICIENT_FUNDS';
    const message = executedSources.length > 0
      ? `从 ${executedSources.map((s) => `${s.accountName}(¥${s.amount})`).join(', ')} 扣款成功`
      : '所有来源账户余额不足';

    await this.logExecution(
      payment.id,
      status,
      totalDeducted,
      null,
      message + (remainingAmount > 0 ? `，剩余 ¥${remainingAmount} 未扣款` : ''),
    );

    if (!isComplete) {
      // 处理余额不足的情况
      return this.handleInsufficientFunds(payment, amount, totalDeducted);
    }

    this.logger.log(
      `Executed auto payment: ${payment.name}, total amount: ¥${totalDeducted}`,
      'AutoPaymentsService',
    );

    return { success: true, amount: totalDeducted, sources: executedSources };
  }

  /**
   * 计算扣款金额
   */
  private async calculatePaymentAmount(payment: any): Promise<number> {
    if (payment.fixedAmount) {
      return payment.fixedAmount;
    }

    if (payment.creditCard) {
      if (payment.paymentType === PaymentType.CREDIT_CARD_FULL) {
        return Math.max(0, payment.creditCard.currentBalance);
      } else if (payment.paymentType === PaymentType.CREDIT_CARD_MIN) {
        // 最低还款额通常为账单的 10%，最低 10 元
        return Math.max(payment.creditCard.currentBalance * 0.1, 10);
      }
    }

    if (payment.liabilityAccount && payment.liabilityAccount.monthlyPayment) {
      return payment.liabilityAccount.monthlyPayment;
    }

    return 0;
  }

  /**
   * 处理余额不足
   */
  private async handleInsufficientFunds(
    payment: any,
    requiredAmount: number,
    partialPaid: number,
  ) {
    const shortfall = requiredAmount - partialPaid;

    switch (payment.insufficientFundsPolicy) {
      case InsufficientFundsPolicy.NOTIFY:
        // TODO: 发送通知
        return {
          success: false,
          message: `余额不足，已扣款 ¥${partialPaid}，剩余 ¥${shortfall} 需要手动处理`,
        };

      case InsufficientFundsPolicy.RETRY_NEXT_DAY:
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        await this.prisma.autoPayment.update({
          where: { id: payment.id },
          data: { nextExecuteAt: tomorrow },
        });

        return { success: false, message: '余额不足，将于明日重试' };

      case InsufficientFundsPolicy.TRY_NEXT_SOURCE:
        // 已经在 executePayment 中处理了
        return {
          success: partialPaid > 0,
          message: `已从可用账户扣款 ¥${partialPaid}，剩余 ¥${shortfall} 需要手动处理`,
        };

      case InsufficientFundsPolicy.SKIP:
      default:
        const nextMonth = this.calculateNextExecuteTime(
          payment.dayOfMonth,
          payment.executeTime,
        );
        await this.prisma.autoPayment.update({
          where: { id: payment.id },
          data: { nextExecuteAt: nextMonth },
        });
        return { success: false, message: '余额不足，已跳过本次' };
    }
  }

  /**
   * 记录执行日志
   */
  private async logExecution(
    autoPaymentId: string,
    status: string,
    amount: number,
    sourceBalance: number | null,
    message?: string | null,
    recordId?: string,
  ) {
    await this.prisma.autoPaymentLog.create({
      data: {
        autoPaymentId,
        status,
        amount,
        sourceBalance,
        message,
        recordId,
      },
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecuteTime(dayOfMonth: number, executeTime?: string): Date {
    const now = new Date();
    const [hours, minutes] = (executeTime || '08:00').split(':').map(Number);

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

  /**
   * 验证关联关系
   */
  private async validateRelations(userId: string, dto: CreateAutoPaymentDto | UpdateAutoPaymentDto) {
    if (dto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: dto.creditCardId, userId },
      });
      if (!card) {
        throw new BadRequestException('信用卡不存在');
      }
    }

    if (dto.liabilityAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.liabilityAccountId, userId },
      });
      if (!account) {
        throw new BadRequestException('贷款账户不存在');
      }
    }

    // 验证所有来源账户
    if (dto.sourceAccounts?.length) {
      for (const source of dto.sourceAccounts) {
        const account = await this.prisma.account.findFirst({
          where: { id: source.accountId, userId },
        });
        if (!account) {
          throw new BadRequestException(`扣款来源账户 ${source.accountId} 不存在`);
        }
        // 验证是净资产账户
        const validTypes = ['BANK', 'CASH', 'DIGITAL_WALLET', 'SAVINGS'];
        if (!validTypes.includes(account.type)) {
          throw new BadRequestException(`账户 ${account.name} 不能作为扣款来源`);
        }
      }
    }
  }

  /**
   * 获取执行日志
   */
  async getLogs(userId: string, paymentId: string, limit: number = 20) {
    await this.findOne(userId, paymentId);

    return this.prisma.autoPaymentLog.findMany({
      where: { autoPaymentId: paymentId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 计算等额本息月供
   */
  static calculateMonthlyPayment(
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
   * 获取标准包含配置
   */
  private getIncludeConfig() {
    return {
      creditCard: true,
      liabilityAccount: true,
      sources: {
        include: { account: true },
        orderBy: { priority: 'asc' as const },
      },
    };
  }

  /**
   * 格式化响应
   */
  private formatResponse(payment: any) {
    return {
      ...payment,
      remainingPeriods: payment.totalPeriods
        ? payment.totalPeriods - payment.completedPeriods
        : null,
      sources: payment.sources?.map((s: any) => ({
        id: s.id,
        accountId: s.accountId,
        priority: s.priority,
        account: {
          id: s.account.id,
          name: s.account.name,
          type: s.account.type,
          balance: s.account.balance,
        },
      })) || [],
    };
  }
}

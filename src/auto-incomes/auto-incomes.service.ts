import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAutoIncomeDto,
  UpdateAutoIncomeDto,
  IncomeTypeToCategory,
  AutoIncomeExecutionResultDto,
} from './dto/auto-income.dto';

@Injectable()
export class AutoIncomesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建自动入账配置
   */
  async create(userId: string, dto: CreateAutoIncomeDto) {
    // 验证目标账户存在且属于用户
    const targetAccount = await this.prisma.account.findFirst({
      where: { id: dto.targetAccountId, userId },
    });

    if (!targetAccount) {
      throw new NotFoundException('目标账户不存在');
    }

    // 验证账户类型（只能是储蓄类账户）
    const validTypes = ['BANK', 'CASH', 'DIGITAL_WALLET', 'SAVINGS'];
    if (!validTypes.includes(targetAccount.type)) {
      throw new BadRequestException('目标账户类型不支持自动入账，请选择储蓄类账户');
    }

    // 设置默认分类
    const category = dto.category || IncomeTypeToCategory[dto.incomeType] || '其他收入';

    // 计算下次执行时间
    const nextExecuteAt = this.calculateNextExecuteTime(
      dto.dayOfMonth,
      dto.executeTime || '09:00',
    );

    const autoIncome = await this.prisma.autoIncome.create({
      data: {
        name: dto.name,
        incomeType: dto.incomeType,
        amount: dto.amount,
        targetAccountId: dto.targetAccountId,
        category,
        dayOfMonth: dto.dayOfMonth,
        executeTime: dto.executeTime || '09:00',
        reminderDaysBefore: dto.reminderDaysBefore ?? 1,
        isEnabled: dto.isEnabled ?? true,
        nextExecuteAt,
        userId,
      },
      include: {
        targetAccount: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
    });

    return autoIncome;
  }

  /**
   * 获取用户所有自动入账配置
   */
  async findAll(userId: string) {
    return this.prisma.autoIncome.findMany({
      where: { userId },
      include: {
        targetAccount: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
      orderBy: { dayOfMonth: 'asc' },
    });
  }

  /**
   * 获取单个自动入账配置
   */
  async findOne(id: string, userId: string) {
    const autoIncome = await this.prisma.autoIncome.findFirst({
      where: { id, userId },
      include: {
        targetAccount: {
          select: { id: true, name: true, type: true, balance: true },
        },
        logs: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!autoIncome) {
      throw new NotFoundException('自动入账配置不存在');
    }

    return autoIncome;
  }

  /**
   * 更新自动入账配置
   */
  async update(id: string, userId: string, dto: UpdateAutoIncomeDto) {
    // 验证配置存在
    const existing = await this.prisma.autoIncome.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('自动入账配置不存在');
    }

    // 如果更新目标账户，验证新账户
    if (dto.targetAccountId) {
      const targetAccount = await this.prisma.account.findFirst({
        where: { id: dto.targetAccountId, userId },
      });

      if (!targetAccount) {
        throw new NotFoundException('目标账户不存在');
      }

      const validTypes = ['BANK', 'CASH', 'DIGITAL_WALLET', 'SAVINGS'];
      if (!validTypes.includes(targetAccount.type)) {
        throw new BadRequestException('目标账户类型不支持自动入账');
      }
    }

    // 如果更新了日期或时间，重新计算下次执行时间
    let nextExecuteAt = existing.nextExecuteAt;
    if (dto.dayOfMonth || dto.executeTime) {
      nextExecuteAt = this.calculateNextExecuteTime(
        dto.dayOfMonth || existing.dayOfMonth,
        dto.executeTime || existing.executeTime,
      );
    }

    // 如果更新了入账类型且没有指定分类，使用默认分类
    let category = dto.category;
    if (dto.incomeType && !dto.category) {
      category = IncomeTypeToCategory[dto.incomeType];
    }

    const updated = await this.prisma.autoIncome.update({
      where: { id },
      data: {
        ...dto,
        category: category || undefined,
        nextExecuteAt,
      },
      include: {
        targetAccount: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
    });

    return updated;
  }

  /**
   * 删除自动入账配置
   */
  async delete(id: string, userId: string) {
    const existing = await this.prisma.autoIncome.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('自动入账配置不存在');
    }

    await this.prisma.autoIncome.delete({ where: { id } });

    return { deleted: true };
  }

  /**
   * 切换启用/禁用状态
   */
  async toggle(id: string, userId: string) {
    const existing = await this.prisma.autoIncome.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('自动入账配置不存在');
    }

    const updated = await this.prisma.autoIncome.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
      include: {
        targetAccount: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
    });

    return updated;
  }

  /**
   * 获取待执行的自动入账配置
   */
  async getPendingIncomes() {
    const now = new Date();

    return this.prisma.autoIncome.findMany({
      where: {
        isEnabled: true,
        nextExecuteAt: { lte: now },
      },
      include: {
        targetAccount: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 执行单个自动入账
   */
  async executeIncome(incomeId: string): Promise<AutoIncomeExecutionResultDto> {
    const income = await this.prisma.autoIncome.findUnique({
      where: { id: incomeId },
      include: { targetAccount: true },
    });

    if (!income) {
      throw new NotFoundException('自动入账配置不存在');
    }

    if (!income.isEnabled) {
      return {
        success: false,
        incomeId,
        amount: 0,
        message: '自动入账已禁用',
      };
    }

    try {
      // 使用事务处理入账
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. 增加目标账户余额
        await tx.account.update({
          where: { id: income.targetAccountId },
          data: { balance: { increment: income.amount } },
        });

        // 2. 创建收入记录
        const record = await tx.record.create({
          data: {
            type: 'INCOME',
            amount: income.amount,
            category: income.category,
            description: `[自动入账] ${income.name}`,
            accountId: income.targetAccountId,
            userId: income.userId,
            isConfirmed: true,
          },
        });

        // 3. 记录执行日志
        await tx.autoIncomeLog.create({
          data: {
            autoIncomeId: incomeId,
            status: 'SUCCESS',
            amount: income.amount,
            recordId: record.id,
            message: `成功入账 ¥${income.amount.toFixed(2)} 到 ${income.targetAccount.name}`,
          },
        });

        // 4. 更新下次执行时间
        const nextExecuteAt = this.calculateNextExecuteTime(
          income.dayOfMonth,
          income.executeTime,
        );

        await tx.autoIncome.update({
          where: { id: incomeId },
          data: {
            lastExecutedAt: new Date(),
            nextExecuteAt,
          },
        });

        return record;
      });

      return {
        success: true,
        incomeId,
        amount: income.amount,
        recordId: result.id,
        message: `成功入账 ¥${income.amount.toFixed(2)}`,
      };
    } catch (error) {
      // 记录失败日志
      await this.prisma.autoIncomeLog.create({
        data: {
          autoIncomeId: incomeId,
          status: 'FAILED',
          amount: income.amount,
          message: `执行失败: ${error.message}`,
        },
      });

      return {
        success: false,
        incomeId,
        amount: income.amount,
        message: `执行失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取执行日志
   */
  async getLogs(incomeId: string, userId: string, limit = 20) {
    // 验证配置属于用户
    const income = await this.prisma.autoIncome.findFirst({
      where: { id: incomeId, userId },
    });

    if (!income) {
      throw new NotFoundException('自动入账配置不存在');
    }

    return this.prisma.autoIncomeLog.findMany({
      where: { autoIncomeId: incomeId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 获取即将执行的入账（用于提醒）
   */
  async getUpcomingIncomes(daysBefore: number = 1) {
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + daysBefore);

    return this.prisma.autoIncome.findMany({
      where: {
        isEnabled: true,
        nextExecuteAt: {
          gte: now,
          lte: reminderDate,
        },
      },
      include: {
        targetAccount: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecuteTime(dayOfMonth: number, executeTime: string): Date {
    const now = new Date();
    const [hours, minutes] = executeTime.split(':').map(Number);

    let next = new Date(
      now.getFullYear(),
      now.getMonth(),
      dayOfMonth,
      hours,
      minutes,
      0,
      0,
    );

    // 如果今天已经过了执行时间，计算下个月
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }

    // 处理月末日期问题（如 2 月无 31 号）
    if (next.getDate() !== dayOfMonth) {
      next.setDate(0); // 设为上月最后一天
    }

    return next;
  }
}

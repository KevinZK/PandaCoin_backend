import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetProgressDto,
  MonthlyBudgetSummaryDto,
} from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 创建预算
   */
  async create(userId: string, dto: CreateBudgetDto) {
    // 检查是否已存在相同的预算
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        month: dto.month,
        category: dto.category || null,
      },
    });

    if (existing) {
      throw new ConflictException('该月份的预算已存在');
    }

    const budget = await this.prisma.budget.create({
      data: {
        month: dto.month,
        category: dto.category || null,
        name: dto.name || null,
        amount: dto.amount,
        isRecurring: dto.isRecurring || false,
        userId,
      },
    });

    this.logger.log(
      `Created budget: ${dto.month} ${dto.category || '总预算'} = ¥${dto.amount} (recurring: ${dto.isRecurring || false})`,
      'BudgetsService',
    );

    return budget;
  }

  /**
   * 获取指定月份的所有预算
   */
  async findByMonth(userId: string, month: string) {
    return this.prisma.budget.findMany({
      where: { userId, month },
      orderBy: { category: 'asc' },
    });
  }

  /**
   * 获取用户所有预算
   */
  async findAll(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId },
      orderBy: [{ month: 'desc' }, { category: 'asc' }],
    });
  }

  /**
   * 获取单个预算
   */
  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      throw new NotFoundException('预算不存在');
    }

    return budget;
  }

  /**
   * 更新预算金额
   * 如果是循环预算，同时更新当前月份及未来月份的相同预算
   */
  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const budget = await this.findOne(userId, id);

    // 更新当前预算
    const updatedBudget = await this.prisma.budget.update({
      where: { id },
      data: {
        amount: dto.amount ?? budget.amount,
        name: dto.name ?? budget.name,
        isRecurring: dto.isRecurring ?? budget.isRecurring,
      },
    });

    // 如果是循环预算，更新未来月份的相同预算
    if (updatedBudget.isRecurring && budget.category) {
      const currentMonth = budget.month;
      await this.prisma.budget.updateMany({
        where: {
          userId,
          category: budget.category,
          isRecurring: true,
          month: { gt: currentMonth },
        },
        data: {
          amount: dto.amount ?? budget.amount,
          name: dto.name ?? budget.name,
        },
      });

      this.logger.log(
        `Updated recurring budget and future months: ${budget.category}`,
        'BudgetsService',
      );
    }

    return updatedBudget;
  }

  /**
   * 删除预算（仅删除当月）
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.budget.delete({
      where: { id },
    });
  }

  /**
   * 取消循环预算（删除当月及所有未来月份的相同分类循环预算）
   */
  async cancelRecurring(userId: string, id: string) {
    const budget = await this.findOne(userId, id);

    if (!budget.isRecurring) {
      // 如果不是循环预算，直接删除
      return this.remove(userId, id);
    }

    // 删除当前及所有未来月份的相同分类循环预算
    const result = await this.prisma.budget.deleteMany({
      where: {
        userId,
        category: budget.category,
        isRecurring: true,
        month: { gte: budget.month },
      },
    });

    this.logger.log(
      `Cancelled recurring budget: ${budget.category}, deleted ${result.count} budgets`,
      'BudgetsService',
    );

    return { deletedCount: result.count };
  }

  /**
   * 获取月度预算进度
   */
  async getMonthlyProgress(
    userId: string,
    month: string,
  ): Promise<MonthlyBudgetSummaryDto> {
    // 获取该月所有预算
    const budgets = await this.findByMonth(userId, month);

    // 计算该月实际支出
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // 按分类汇总支出
    const spentByCategory: Record<string, number> = {};
    let totalSpent = 0;

    for (const record of records) {
      const cat = record.category;
      spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(record.amount);
      totalSpent += Number(record.amount);
    }

    // 计算每个预算的进度
    const categoryBudgets: BudgetProgressDto[] = [];
    let totalBudget = 0;

    for (const budget of budgets) {
      const isTotal = !budget.category;
      const spentAmount = isTotal
        ? totalSpent
        : spentByCategory[budget.category!] || 0;

      const remainingAmount = budget.amount - spentAmount;
      const usagePercent =
        budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

      categoryBudgets.push({
        id: budget.id,
        month: budget.month,
        category: budget.category,
        name: budget.name,
        budgetAmount: budget.amount,
        spentAmount,
        remainingAmount,
        usagePercent: Math.round(usagePercent * 10) / 10,
        isOverBudget: spentAmount > budget.amount,
        isRecurring: budget.isRecurring,
      });

      if (isTotal) {
        totalBudget = budget.amount;
      }
    }

    // 如果没有设置总预算，计算分类预算之和
    if (totalBudget === 0) {
      totalBudget = categoryBudgets
        .filter(b => b.category)
        .reduce((sum, b) => sum + b.budgetAmount, 0);
    }

    const totalRemaining = totalBudget - totalSpent;
    const overallUsagePercent =
      totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      month,
      totalBudget,
      totalSpent,
      totalRemaining,
      overallUsagePercent: Math.round(overallUsagePercent * 10) / 10,
      categoryBudgets,
    };
  }

  /**
   * 获取当前月份预算进度
   */
  async getCurrentMonthProgress(userId: string): Promise<MonthlyBudgetSummaryDto> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.getMonthlyProgress(userId, month);
  }

  /**
   * 复制上月预算到当月（手动触发，复制所有预算）
   */
  async copyFromPreviousMonth(userId: string): Promise<number> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 计算上个月
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const previousMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // 获取上月预算
    const previousBudgets = await this.findByMonth(userId, previousMonth);

    if (previousBudgets.length === 0) {
      return 0;
    }

    let copiedCount = 0;

    for (const budget of previousBudgets) {
      try {
        await this.create(userId, {
          month: currentMonth,
          category: budget.category || undefined,
          name: budget.name || undefined,
          amount: budget.amount,
          isRecurring: budget.isRecurring,
        });
        copiedCount++;
      } catch (error) {
        // 忽略已存在的预算
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }
    }

    this.logger.log(
      `Copied ${copiedCount} budgets from ${previousMonth} to ${currentMonth}`,
      'BudgetsService',
    );

    return copiedCount;
  }

  /**
   * 自动复制循环预算到新月份（定时任务调用）
   * 仅复制 isRecurring = true 的预算
   *
   * 修复：查询所有历史月份的循环预算，避免链式中断
   * 如果用户在某个月删除了循环预算，下个月仍会从更早的月份恢复
   */
  async autoCreateRecurringBudgets(): Promise<number> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 获取所有用户最新的循环预算配置（按用户+分类分组，取最近月份的）
    // 这样即使某个月被删除，也能从更早的月份恢复
    const allRecurringBudgets = await this.prisma.budget.findMany({
      where: {
        isRecurring: true,
        month: { lt: currentMonth },  // 只查询当前月份之前的
      },
      orderBy: { month: 'desc' },  // 按月份降序，最新的在前
    });

    if (allRecurringBudgets.length === 0) {
      this.logger.log('No recurring budgets to copy', 'BudgetsService');
      return 0;
    }

    // 按 userId + category 分组，只保留最新的一条
    const latestBudgetMap = new Map<string, typeof allRecurringBudgets[0]>();
    for (const budget of allRecurringBudgets) {
      const key = `${budget.userId}:${budget.category || '__TOTAL__'}`;
      if (!latestBudgetMap.has(key)) {
        latestBudgetMap.set(key, budget);
      }
    }

    let createdCount = 0;

    for (const budget of latestBudgetMap.values()) {
      // 检查当月是否已存在
      const existing = await this.prisma.budget.findFirst({
        where: {
          userId: budget.userId,
          month: currentMonth,
          category: budget.category,
        },
      });

      if (!existing) {
        await this.prisma.budget.create({
          data: {
            month: currentMonth,
            category: budget.category,
            name: budget.name,
            amount: budget.amount,
            isRecurring: true,
            userId: budget.userId,
          },
        });
        createdCount++;

        this.logger.debug(
          `Created recurring budget for user ${budget.userId}: ${budget.category || '总预算'} = ¥${budget.amount}`,
          'BudgetsService',
        );
      }
    }

    this.logger.log(
      `Auto-created ${createdCount} recurring budgets for ${currentMonth}`,
      'BudgetsService',
    );

    return createdCount;
  }

  /**
   * 手动触发当月循环预算检查（供用户进入预算页面时调用）
   * 确保即使错过了定时任务，用户也能看到循环预算
   */
  async ensureRecurringBudgetsForCurrentMonth(userId: string): Promise<number> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 获取该用户最新的循环预算配置
    const userRecurringBudgets = await this.prisma.budget.findMany({
      where: {
        userId,
        isRecurring: true,
        month: { lt: currentMonth },
      },
      orderBy: { month: 'desc' },
    });

    // 按 category 分组，只保留最新的
    const latestBudgetMap = new Map<string, typeof userRecurringBudgets[0]>();
    for (const budget of userRecurringBudgets) {
      const key = budget.category || '__TOTAL__';
      if (!latestBudgetMap.has(key)) {
        latestBudgetMap.set(key, budget);
      }
    }

    let createdCount = 0;

    for (const budget of latestBudgetMap.values()) {
      const existing = await this.prisma.budget.findFirst({
        where: {
          userId,
          month: currentMonth,
          category: budget.category,
        },
      });

      if (!existing) {
        await this.prisma.budget.create({
          data: {
            month: currentMonth,
            category: budget.category,
            name: budget.name,
            amount: budget.amount,
            isRecurring: true,
            userId,
          },
        });
        createdCount++;
      }
    }

    if (createdCount > 0) {
      this.logger.log(
        `Ensured ${createdCount} recurring budgets for user ${userId} in ${currentMonth}`,
        'BudgetsService',
      );
    }

    return createdCount;
  }
}

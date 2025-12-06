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
        amount: dto.amount,
        userId,
      },
    });

    this.logger.log(
      `Created budget: ${dto.month} ${dto.category || '总预算'} = ¥${dto.amount}`,
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
   */
  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { amount: dto.amount },
    });
  }

  /**
   * 删除预算
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.budget.delete({
      where: { id },
    });
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
        budgetAmount: budget.amount,
        spentAmount,
        remainingAmount,
        usagePercent: Math.round(usagePercent * 10) / 10,
        isOverBudget: spentAmount > budget.amount,
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
   * 复制上月预算到当月
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
          amount: budget.amount,
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
}

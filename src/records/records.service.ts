import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRecordDto, UpdateRecordDto, VoiceRecordDto } from './dto/record.dto';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  // 创建记账记录
  async create(userId: string, dto: CreateRecordDto) {
    let account = null;
    let creditCard = null;
    
    // 如果指定了账户，验证账户存在
    if (dto.accountId) {
      account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
      });

      if (!account) {
        throw new NotFoundException('账户不存在');
      }
    }

    // 如果指定了信用卡ID，验证信用卡存在
    if (dto.creditCardId) {
      creditCard = await this.prisma.creditCard.findFirst({
        where: { id: dto.creditCardId, userId },
      });
    }
    
    // 如果只有卡片标识（尾号），通过尾号查找信用卡
    if (!creditCard && dto.cardIdentifier) {
      creditCard = await this.prisma.creditCard.findFirst({
        where: { userId, cardIdentifier: dto.cardIdentifier },
      });
    }

    // 创建记录
    const record = await this.prisma.record.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        rawText: dto.rawText,
        date: dto.date ? new Date(dto.date) : new Date(),
        isConfirmed: dto.isConfirmed ?? true,
        confidence: dto.confidence,
        accountId: dto.accountId,
        creditCardId: creditCard?.id,
        cardIdentifier: dto.cardIdentifier,
        userId,
      },
    });

    // 更新余额
    if (creditCard) {
      // 信用卡消费：增加待还金额
      await this.updateCreditCardBalance(creditCard.id, dto.type, dto.amount);
    } else if (account) {
      // 普通账户：更新余额
      await this.updateAccountBalance(account.id, dto.type, dto.amount);
    }

    return record;
  }

  // 语音记账 - 核心功能
  async createFromVoice(userId: string, dto: VoiceRecordDto) {
    // 获取用户的账户列表
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { name: true },
    });

    const accountNames = accounts.map(a => a.name);

    // 调用AI解析
    const { records: parsedRecords } = await this.aiService.parseVoiceToRecords(
      dto.text,
      accountNames,
    );

    // 批量创建记录
    const createdRecords = [];
    for (const parsed of parsedRecords) {
      // 根据账户名查找账户ID
      const account = await this.prisma.account.findFirst({
        where: {
          userId,
          name: parsed.accountName,
        },
      });

      if (!account) {
        continue; // 跳过找不到的账户
      }

      const record = await this.create(userId, {
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        description: parsed.description,
        rawText: dto.text,
        date: parsed.date,
        isConfirmed: false, // AI解析的需要用户确认
        confidence: parsed.confidence,
        accountId: account.id,
      });

      createdRecords.push(record);
    }

    return {
      records: createdRecords,
      originalText: dto.text,
    };
  }

  // 查询记录列表
  async findAll(userId: string, filters?: {
    type?: string;
    category?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {
      userId,
      deletedAt: null, // 只返回未删除的记录
    };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.record.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            deletedAt: true, // 包含账户删除状态，用于前端显示标签
          },
        },
        targetAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // 获取单条记录
  async findOne(id: string, userId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, userId, deletedAt: null }, // 只查找未删除的记录
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            deletedAt: true,
          },
        },
        targetAccount: {
          select: {
            id: true,
            name: true,
            type: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    return record;
  }

  // 更新记录
  async update(id: string, userId: string, dto: UpdateRecordDto) {
    const record = await this.findOne(id, userId);

    // 如果修改了金额或类型,需要回滚并重新计算余额
    if (dto.amount !== undefined || dto.type !== undefined) {
      // 回滚原余额（仅当有 accountId 时）
      if (record.accountId) {
        await this.updateAccountBalance(
          record.accountId,
          record.type,
          -Number(record.amount),
        );
      }

      // 应用新余额（仅当有 accountId 时）
      const newAccountId = dto.accountId || record.accountId;
      if (newAccountId) {
        await this.updateAccountBalance(
          newAccountId,
          dto.type || record.type,
          dto.amount || Number(record.amount),
        );
      }
    }

    return this.prisma.record.update({
      where: { id },
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        accountId: dto.accountId,
      },
    });
  }

  // 删除记录（软删除）
  async remove(id: string, userId: string) {
    const record = await this.findOne(id, userId);

    // 回滚余额
    if (record.creditCardId) {
      // 回滚信用卡余额
      await this.updateCreditCardBalance(
        record.creditCardId,
        record.type,
        -Number(record.amount),
      );
    } else if (record.accountId) {
      // 回滚账户余额
      await this.updateAccountBalance(
        record.accountId,
        record.type,
        -Number(record.amount),
      );
    }

    // 软删除：设置 deletedAt 而非真正删除
    return this.prisma.record.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 更新账户余额的辅助方法
  private async updateAccountBalance(
    accountId: string,
    type: string,
    amount: number,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) return;

    let balanceChange = 0;
    if (type === 'INCOME') {
      balanceChange = amount;
    } else if (type === 'EXPENSE') {
      balanceChange = -amount;
    }
    // TRANSFER 不影响总余额(在同一用户内部)

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        balance: Number(account.balance) + balanceChange,
      },
    });
  }

  // 更新信用卡余额的辅助方法
  private async updateCreditCardBalance(
    creditCardId: string,
    type: string,
    amount: number,
  ) {
    const creditCard = await this.prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    if (!creditCard) return;

    let balanceChange = 0;
    if (type === 'EXPENSE') {
      // 信用卡消费：增加待还金额
      balanceChange = amount;
    } else if (type === 'INCOME' || type === 'PAYMENT') {
      // 信用卡还款：减少待还金额
      balanceChange = -amount;
    }

    await this.prisma.creditCard.update({
      where: { id: creditCardId },
      data: {
        currentBalance: Math.max(0, Number(creditCard.currentBalance) + balanceChange),
      },
    });
  }

  // 统计数据
  async getStatistics(userId: string, period: 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'month') {
      startDate.setMonth(now.getMonth());
      startDate.setDate(1);
    } else {
      startDate.setFullYear(now.getFullYear());
      startDate.setMonth(0);
      startDate.setDate(1);
    }
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
    });

    // 计算总收入和总支出
    const totalIncome = records
      .filter(r => r.type === 'INCOME')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpense = records
      .filter(r => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    // 按分类统计（支出）
    const categoryStats: Record<string, number> = {};
    records
      .filter(r => r.type === 'EXPENSE')
      .forEach(r => {
        categoryStats[r.category] = (categoryStats[r.category] || 0) + Number(r.amount);
      });

    // 按分类统计（收入）
    const incomeCategoryStats: Record<string, number> = {};
    records
      .filter(r => r.type === 'INCOME')
      .forEach(r => {
        incomeCategoryStats[r.category] = (incomeCategoryStats[r.category] || 0) + Number(r.amount);
      });

    return {
      period,
      startDate,
      endDate: now,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      categoryStats,
      incomeCategoryStats,
      recordCount: records.length,
    };
  }

  // ========== 趋势统计 ==========
  async getTrendStatistics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    let start: Date;
    let end: Date = endDate ? new Date(endDate) : now;

    // 设置默认时间范围
    if (startDate) {
      start = new Date(startDate);
    } else {
      start = new Date();
      if (period === 'daily') {
        start.setDate(start.getDate() - 30); // 默认30天
      } else if (period === 'weekly') {
        start.setDate(start.getDate() - 84); // 默认12周
      } else {
        start.setMonth(start.getMonth() - 12); // 默认12个月
      }
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // 按时间段聚合数据
    const dataMap = new Map<string, { income: number; expense: number }>();

    records.forEach(record => {
      const date = new Date(record.date);
      let key: string;

      if (period === 'daily') {
        key = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      } else if (period === 'weekly') {
        // 获取周数
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-W${this.getWeekNumber(date)}`;
      } else {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { income: 0, expense: 0 });
      }

      const data = dataMap.get(key)!;
      if (record.type === 'INCOME') {
        data.income += Number(record.amount);
      } else if (record.type === 'EXPENSE') {
        data.expense += Number(record.amount);
      }
    });

    // 转换为数组并填充空白日期
    const trendData = Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        balance: Math.round((data.income - data.expense) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 计算汇总
    const totalIncome = trendData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = trendData.reduce((sum, d) => sum + d.expense, 0);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const maxExpenseDay = trendData.reduce(
      (max, d) => (d.expense > max.amount ? { date: d.date, amount: d.expense } : max),
      { date: '', amount: 0 },
    );

    return {
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      data: trendData,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        avgDailyExpense: Math.round((totalExpense / days) * 100) / 100,
        maxExpenseDay: maxExpenseDay.date,
        maxExpenseAmount: maxExpenseDay.amount,
      },
    };
  }

  // 获取周数
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // ========== 环比对比统计 ==========
  async getComparisonStatistics(userId: string, currentMonth?: string) {
    const now = new Date();
    const current = currentMonth ? new Date(currentMonth + '-01') : now;

    // 当前月份范围
    const currentStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const currentEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

    // 上个月份范围
    const previousStart = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const previousEnd = new Date(current.getFullYear(), current.getMonth(), 0, 23, 59, 59);

    // 获取两个月的记录
    const [currentRecords, previousRecords] = await Promise.all([
      this.prisma.record.findMany({
        where: { userId, date: { gte: currentStart, lte: currentEnd } },
      }),
      this.prisma.record.findMany({
        where: { userId, date: { gte: previousStart, lte: previousEnd } },
      }),
    ]);

    // 计算统计数据
    const calcStats = (records: any[]) => {
      const income = records.filter(r => r.type === 'INCOME').reduce((s, r) => s + Number(r.amount), 0);
      const expense = records.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + Number(r.amount), 0);
      return {
        totalIncome: Math.round(income * 100) / 100,
        totalExpense: Math.round(expense * 100) / 100,
        balance: Math.round((income - expense) * 100) / 100,
        savingsRate: income > 0 ? Math.round(((income - expense) / income) * 10000) / 100 : 0,
      };
    };

    const currentStats = calcStats(currentRecords);
    const previousStats = calcStats(previousRecords);

    // 计算变化
    const calcChange = (current: number, previous: number) => ({
      change: Math.round((current - previous) * 100) / 100,
      percent: previous > 0 ? Math.round(((current - previous) / previous) * 10000) / 100 : (current > 0 ? 100 : 0),
    });

    const incomeChange = calcChange(currentStats.totalIncome, previousStats.totalIncome);
    const expenseChange = calcChange(currentStats.totalExpense, previousStats.totalExpense);

    // 按分类对比
    const categoryMap = new Map<string, { current: number; previous: number }>();

    currentRecords.filter(r => r.type === 'EXPENSE').forEach(r => {
      const cat = categoryMap.get(r.category) || { current: 0, previous: 0 };
      cat.current += Number(r.amount);
      categoryMap.set(r.category, cat);
    });

    previousRecords.filter(r => r.type === 'EXPENSE').forEach(r => {
      const cat = categoryMap.get(r.category) || { current: 0, previous: 0 };
      cat.previous += Number(r.amount);
      categoryMap.set(r.category, cat);
    });

    const categoryComparison = Array.from(categoryMap.entries())
      .map(([category, data]) => {
        const change = calcChange(data.current, data.previous);
        return {
          category,
          currentAmount: Math.round(data.current * 100) / 100,
          previousAmount: Math.round(data.previous * 100) / 100,
          change: change.change,
          changePercent: change.percent,
        };
      })
      .sort((a, b) => b.currentAmount - a.currentAmount);

    return {
      currentPeriod: `${currentStart.getFullYear()}-${(currentStart.getMonth() + 1).toString().padStart(2, '0')}`,
      previousPeriod: `${previousStart.getFullYear()}-${(previousStart.getMonth() + 1).toString().padStart(2, '0')}`,
      current: currentStats,
      previous: previousStats,
      changes: {
        incomeChange: incomeChange.change,
        incomeChangePercent: incomeChange.percent,
        expenseChange: expenseChange.change,
        expenseChangePercent: expenseChange.percent,
        balanceChange: Math.round((currentStats.balance - previousStats.balance) * 100) / 100,
      },
      categoryComparison,
    };
  }

  // ========== 收入分析 ==========
  async getIncomeAnalysis(userId: string, period: 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'month') {
      startDate.setDate(1);
    } else {
      startDate.setMonth(0);
      startDate.setDate(1);
    }
    startDate.setHours(0, 0, 0, 0);

    // 固定收入分类
    const fixedIncomeCategories = ['INCOME_SALARY', 'SALARY', '工资', '公积金', '养老金', 'PENSION'];

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startDate },
      },
    });

    // 按分类统计
    const categoryMap = new Map<string, { amount: number; count: number; isFixed: boolean }>();
    let totalIncome = 0;
    let fixedIncome = 0;

    records.forEach(r => {
      const amount = Number(r.amount);
      totalIncome += amount;

      const isFixed = fixedIncomeCategories.some(c =>
        r.category.toUpperCase().includes(c.toUpperCase())
      );
      if (isFixed) fixedIncome += amount;

      const cat = categoryMap.get(r.category) || { amount: 0, count: 0, isFixed };
      cat.amount += amount;
      cat.count += 1;
      categoryMap.set(r.category, cat);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        percent: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 10000) / 100 : 0,
        count: data.count,
        isFixed: data.isFixed,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 获取近6个月收入趋势
    const trendStart = new Date();
    trendStart.setMonth(trendStart.getMonth() - 6);
    trendStart.setDate(1);

    const trendRecords = await this.prisma.record.findMany({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: trendStart },
      },
    });

    const trendMap = new Map<string, number>();
    trendRecords.forEach(r => {
      const date = new Date(r.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      trendMap.set(key, (trendMap.get(key) || 0) + Number(r.amount));
    });

    const trend = Array.from(trendMap.entries())
      .map(([date, income]) => ({
        date,
        income: Math.round(income * 100) / 100,
        expense: 0,
        balance: Math.round(income * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: period === 'month'
        ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
        : `${now.getFullYear()}`,
      totalIncome: Math.round(totalIncome * 100) / 100,
      fixedIncome: Math.round(fixedIncome * 100) / 100,
      variableIncome: Math.round((totalIncome - fixedIncome) * 100) / 100,
      fixedIncomeRatio: totalIncome > 0 ? Math.round((fixedIncome / totalIncome) * 10000) / 100 : 0,
      categories,
      trend,
    };
  }

  // ========== 财务健康度 ==========
  async getFinancialHealth(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 获取本月记录
    const monthRecords = await this.prisma.record.findMany({
      where: { userId, date: { gte: monthStart } },
    });

    // 获取账户信息
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    // 获取信用卡信息
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId },
    });

    // 获取预算信息
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: currentMonthStr },
    });

    // 计算各项指标
    const totalIncome = monthRecords.filter(r => r.type === 'INCOME').reduce((s, r) => s + Number(r.amount), 0);
    const totalExpense = monthRecords.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + Number(r.amount), 0);

    // 必要支出分类
    const essentialCategories = ['FOOD', 'HOUSING', 'TRANSPORT', 'HEALTH', '餐饮', '住房', '交通', '医疗'];
    const essentialExpense = monthRecords
      .filter(r => r.type === 'EXPENSE' && essentialCategories.some(c => r.category.toUpperCase().includes(c.toUpperCase())))
      .reduce((s, r) => s + Number(r.amount), 0);

    // 流动资产 (现金、储蓄、数字钱包)
    const liquidTypes = ['CASH', 'BANK', 'SAVINGS', 'DIGITAL_WALLET'];
    const liquidAssets = accounts
      .filter(a => liquidTypes.includes(a.type))
      .reduce((s, a) => s + Number(a.balance), 0);

    // 信用卡负债
    const totalDebt = creditCards.reduce((s, c) => s + Number(c.currentBalance), 0);

    // 预算执行
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

    // 计算各项评分
    const metrics = {
      savingsRate: this.calcSavingsRateScore(totalIncome, totalExpense),
      essentialExpenseRatio: this.calcEssentialRatioScore(essentialExpense, totalExpense),
      debtRatio: this.calcDebtRatioScore(totalDebt, totalIncome),
      liquidityRatio: this.calcLiquidityScore(liquidAssets, totalExpense),
      budgetAdherence: this.calcBudgetScore(totalExpense, totalBudget),
    };

    // 计算综合评分
    const weights = { savingsRate: 0.25, essentialExpenseRatio: 0.15, debtRatio: 0.25, liquidityRatio: 0.20, budgetAdherence: 0.15 };
    const overallScore = Math.round(
      metrics.savingsRate.score * weights.savingsRate +
      metrics.essentialExpenseRatio.score * weights.essentialExpenseRatio +
      metrics.debtRatio.score * weights.debtRatio +
      metrics.liquidityRatio.score * weights.liquidityRatio +
      metrics.budgetAdherence.score * weights.budgetAdherence
    );

    const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';

    // 生成建议
    const suggestions: string[] = [];
    if (metrics.savingsRate.status === 'poor') suggestions.push('建议提高储蓄率，目标至少 20%');
    if (metrics.debtRatio.status === 'poor') suggestions.push('信用卡负债较高，建议优先还款');
    if (metrics.liquidityRatio.status === 'poor') suggestions.push('流动资金不足，建议储备 3 个月支出');
    if (metrics.budgetAdherence.status === 'poor') suggestions.push('支出超预算，建议控制非必要消费');

    return {
      overallScore,
      grade,
      metrics,
      suggestions,
    };
  }

  // 储蓄率评分
  private calcSavingsRateScore(income: number, expense: number) {
    const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
    let score: number, status: 'excellent' | 'good' | 'fair' | 'poor', suggestion: string;

    if (rate >= 30) { score = 100; status = 'excellent'; suggestion = '储蓄率优秀，继续保持！'; }
    else if (rate >= 20) { score = 80; status = 'good'; suggestion = '储蓄率良好，可尝试提高至 30%'; }
    else if (rate >= 10) { score = 60; status = 'fair'; suggestion = '储蓄率一般，建议减少非必要支出'; }
    else { score = Math.max(0, rate * 3); status = 'poor'; suggestion = '储蓄率偏低，需要重新规划支出'; }

    return { value: Math.round(rate * 100) / 100, score, status, suggestion };
  }

  // 必要支出比评分
  private calcEssentialRatioScore(essential: number, total: number) {
    const rate = total > 0 ? (essential / total) * 100 : 0;
    let score: number, status: 'excellent' | 'good' | 'fair' | 'poor', suggestion: string;

    if (rate <= 50) { score = 100; status = 'excellent'; suggestion = '支出结构健康，必要支出控制良好'; }
    else if (rate <= 65) { score = 75; status = 'good'; suggestion = '支出结构尚可，可适当控制'; }
    else if (rate <= 80) { score = 50; status = 'fair'; suggestion = '必要支出占比偏高，检查是否有优化空间'; }
    else { score = 25; status = 'poor'; suggestion = '必要支出占比过高，生活压力较大'; }

    return { value: Math.round(rate * 100) / 100, score, status, suggestion };
  }

  // 负债率评分
  private calcDebtRatioScore(debt: number, income: number) {
    const rate = income > 0 ? (debt / income) * 100 : (debt > 0 ? 100 : 0);
    let score: number, status: 'excellent' | 'good' | 'fair' | 'poor', suggestion: string;

    if (rate <= 20) { score = 100; status = 'excellent'; suggestion = '负债水平健康，保持良好习惯'; }
    else if (rate <= 40) { score = 70; status = 'good'; suggestion = '负债可控，注意及时还款'; }
    else if (rate <= 60) { score = 40; status = 'fair'; suggestion = '负债偏高，建议制定还款计划'; }
    else { score = 10; status = 'poor'; suggestion = '负债过高，请优先处理债务'; }

    return { value: Math.round(rate * 100) / 100, score, status, suggestion };
  }

  // 流动性评分
  private calcLiquidityScore(liquid: number, expense: number) {
    const ratio = expense > 0 ? liquid / expense : (liquid > 0 ? 10 : 0);
    let score: number, status: 'excellent' | 'good' | 'fair' | 'poor', suggestion: string;

    if (ratio >= 6) { score = 100; status = 'excellent'; suggestion = '应急资金充足，财务稳健'; }
    else if (ratio >= 3) { score = 80; status = 'good'; suggestion = '流动性良好，建议继续积累'; }
    else if (ratio >= 1) { score = 50; status = 'fair'; suggestion = '流动资金偏少，建议储备 3 个月支出'; }
    else { score = 20; status = 'poor'; suggestion = '流动资金不足，需建立应急储备'; }

    return { value: Math.round(ratio * 100) / 100, score, status, suggestion };
  }

  // 预算执行评分
  private calcBudgetScore(expense: number, budget: number) {
    if (budget <= 0) {
      return { value: 0, score: 60, status: 'fair' as const, suggestion: '建议设置月度预算，更好管理支出' };
    }

    const rate = (expense / budget) * 100;
    let score: number, status: 'excellent' | 'good' | 'fair' | 'poor', suggestion: string;

    if (rate <= 80) { score = 100; status = 'excellent'; suggestion = '预算执行优秀，支出控制得当'; }
    else if (rate <= 100) { score = 80; status = 'good'; suggestion = '预算执行良好，接近预算上限'; }
    else if (rate <= 120) { score = 50; status = 'fair'; suggestion = '略微超预算，注意控制支出'; }
    else { score = 20; status = 'poor'; suggestion = '严重超预算，需调整消费习惯'; }

    return { value: Math.round(rate * 100) / 100, score, status, suggestion };
  }

  // ========== 分类趋势 ==========
  async getCategoryTrend(userId: string, category: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        category,
        type: 'EXPENSE',
        date: { gte: startDate },
      },
    });

    const monthlyData = new Map<string, number>();
    records.forEach(r => {
      const date = new Date(r.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.set(key, (monthlyData.get(key) || 0) + Number(r.amount));
    });

    const data = Array.from(monthlyData.entries())
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const total = data.reduce((s, d) => s + d.amount, 0);
    const average = data.length > 0 ? Math.round((total / data.length) * 100) / 100 : 0;

    // 判断趋势
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 2) {
      const recent = data.slice(-3).reduce((s, d) => s + d.amount, 0) / Math.min(3, data.length);
      const earlier = data.slice(0, -3).reduce((s, d) => s + d.amount, 0) / Math.max(1, data.length - 3);
      if (recent > earlier * 1.1) trend = 'up';
      else if (recent < earlier * 0.9) trend = 'down';
    }

    return { category, data, average, trend };
  }
}

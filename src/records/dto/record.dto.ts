import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecordDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsEnum(['EXPENSE', 'INCOME', 'TRANSFER', 'PAYMENT'])
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'PAYMENT';

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  creditCardId?: string;  // 关联的信用卡ID

  @IsOptional()
  @IsString()
  cardIdentifier?: string;  // 信用卡尾号（用于匹配信用卡）

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;

  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class UpdateRecordDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsEnum(['EXPENSE', 'INCOME', 'TRANSFER', 'PAYMENT'])
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'PAYMENT';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

// AI语音记账DTO
export class VoiceRecordDto {
  @IsString()
  text: string; // 语音转换的文本
}

// 批量创建记账记录
export class BatchCreateRecordsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecordDto)
  records: CreateRecordDto[];
}

// ========== 统计报表相关 DTO ==========

// 趋势数据点
export class TrendDataPointDto {
  date: string;      // 日期标识 (如 "12-01" 或 "2025-07")
  income: number;    // 收入
  expense: number;   // 支出
  balance: number;   // 结余
}

// 趋势统计响应
export class TrendStatisticsDto {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  data: TrendDataPointDto[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    avgDailyExpense: number;
    maxExpenseDay: string;
    maxExpenseAmount: number;
  };
}

// 环比对比项
export class ComparisonItemDto {
  category: string;
  currentAmount: number;
  previousAmount: number;
  change: number;        // 变化金额
  changePercent: number; // 变化百分比
}

// 环比对比统计响应
export class ComparisonStatisticsDto {
  currentPeriod: string;   // 如 "2025-12"
  previousPeriod: string;  // 如 "2025-11"
  current: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;   // 储蓄率
  };
  previous: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
  };
  changes: {
    incomeChange: number;
    incomeChangePercent: number;
    expenseChange: number;
    expenseChangePercent: number;
    balanceChange: number;
  };
  categoryComparison: ComparisonItemDto[];
}

// 收入分析项
export class IncomeAnalysisItemDto {
  category: string;
  amount: number;
  percent: number;
  count: number;         // 收入次数
  isFixed: boolean;      // 是否固定收入
}

// 收入分析响应
export class IncomeAnalysisDto {
  period: string;
  totalIncome: number;
  fixedIncome: number;      // 固定收入总额
  variableIncome: number;   // 浮动收入总额
  fixedIncomeRatio: number; // 固定收入占比
  categories: IncomeAnalysisItemDto[];
  trend: TrendDataPointDto[]; // 近6个月收入趋势
}

// 财务健康度指标
export class FinancialHealthDto {
  // 综合评分 (0-100)
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  // 各项指标
  metrics: {
    // 储蓄率 (收入-支出)/收入
    savingsRate: {
      value: number;
      score: number;      // 0-100
      status: 'excellent' | 'good' | 'fair' | 'poor';
      suggestion: string;
    };
    // 必要支出比 (必要支出/总支出)
    essentialExpenseRatio: {
      value: number;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      suggestion: string;
    };
    // 负债率 (信用卡待还/月收入)
    debtRatio: {
      value: number;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      suggestion: string;
    };
    // 流动性 (现金类资产/月支出)
    liquidityRatio: {
      value: number;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      suggestion: string;
    };
    // 预算执行率
    budgetAdherence: {
      value: number;
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      suggestion: string;
    };
  };

  // 改进建议
  suggestions: string[];
}

// 分类趋势数据
export class CategoryTrendDto {
  category: string;
  data: {
    month: string;
    amount: number;
  }[];
  average: number;
  trend: 'up' | 'down' | 'stable';
}

import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Matches,
} from 'class-validator';

// 创建预算 DTO
export class CreateBudgetDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month 格式必须为 YYYY-MM' })
  month: string; // 格式: YYYY-MM

  @IsOptional()
  @IsString()
  category?: string; // 分类名称，null表示总预算

  @IsNumber()
  @Min(0)
  amount: number; // 预算金额
}

// 更新预算 DTO
export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

// 预算进度响应
export class BudgetProgressDto {
  id: string;
  month: string;
  category: string | null;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;
  isOverBudget: boolean;
}

// 月度预算汇总
export class MonthlyBudgetSummaryDto {
  month: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePercent: number;
  categoryBudgets: BudgetProgressDto[];
}

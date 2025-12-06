export declare class CreateBudgetDto {
    month: string;
    category?: string;
    amount: number;
}
export declare class UpdateBudgetDto {
    amount?: number;
}
export declare class BudgetProgressDto {
    id: string;
    month: string;
    category: string | null;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    usagePercent: number;
    isOverBudget: boolean;
}
export declare class MonthlyBudgetSummaryDto {
    month: string;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallUsagePercent: number;
    categoryBudgets: BudgetProgressDto[];
}

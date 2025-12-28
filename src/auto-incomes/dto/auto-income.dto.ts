import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, IsIn } from 'class-validator';

// 入账类型
export const IncomeTypes = {
  SALARY: 'SALARY',           // 工资
  HOUSING_FUND: 'HOUSING_FUND', // 公积金
  PENSION: 'PENSION',         // 养老金/退休金
  RENTAL: 'RENTAL',           // 租金收入
  INVESTMENT_RETURN: 'INVESTMENT_RETURN', // 投资收益
  OTHER: 'OTHER',             // 其他固定收入
} as const;

export type IncomeType = typeof IncomeTypes[keyof typeof IncomeTypes];

// 入账类型与默认分类映射
export const IncomeTypeToCategory: Record<IncomeType, string> = {
  SALARY: '工资',
  HOUSING_FUND: '公积金',
  PENSION: '养老金',
  RENTAL: '租金',
  INVESTMENT_RETURN: '投资收益',
  OTHER: '其他收入',
};

/**
 * 创建自动入账 DTO
 */
export class CreateAutoIncomeDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(Object.values(IncomeTypes))
  incomeType: IncomeType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  targetAccountId: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(1)
  @Max(28)
  dayOfMonth: number;

  @IsOptional()
  @IsString()
  executeTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

/**
 * 更新自动入账 DTO
 */
export class UpdateAutoIncomeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(IncomeTypes))
  incomeType?: IncomeType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  targetAccountId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @IsString()
  executeTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

/**
 * 自动入账响应 DTO
 */
export interface AutoIncomeResponseDto {
  id: string;
  name: string;
  incomeType: IncomeType;
  amount: number;
  targetAccountId: string;
  category: string;
  dayOfMonth: number;
  executeTime: string;
  reminderDaysBefore: number;
  isEnabled: boolean;
  lastExecutedAt: Date | null;
  nextExecuteAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  targetAccount?: {
    id: string;
    name: string;
    type: string;
    balance: number;
  };
}

/**
 * 自动入账日志响应 DTO
 */
export interface AutoIncomeLogResponseDto {
  id: string;
  autoIncomeId: string;
  status: string;
  amount: number;
  recordId: string | null;
  message: string | null;
  executedAt: Date;
}

/**
 * 执行结果 DTO
 */
export interface AutoIncomeExecutionResultDto {
  success: boolean;
  incomeId: string;
  amount: number;
  recordId?: string;
  message: string;
}

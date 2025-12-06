import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';

/**
 * 定时任务类型
 */
export enum TaskType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

/**
 * 执行频率
 */
export enum TaskFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * 创建定时任务 DTO
 */
export class CreateScheduledTaskDto {
  @IsString()
  name: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  category: string;

  @IsString()
  accountId: string;

  @IsEnum(TaskFrequency)
  frequency: TaskFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'executeTime must be in HH:mm format',
  })
  executeTime?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 更新定时任务 DTO
 */
export class UpdateScheduledTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(TaskFrequency)
  frequency?: TaskFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'executeTime must be in HH:mm format',
  })
  executeTime?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 定时任务响应 DTO
 */
export interface ScheduledTaskResponseDto {
  id: string;
  name: string;
  type: string;
  amount: number;
  category: string;
  accountId: string;
  frequency: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  executeTime: string;
  startDate: string;
  endDate?: string;
  isEnabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  description?: string;
  createdAt: string;
}

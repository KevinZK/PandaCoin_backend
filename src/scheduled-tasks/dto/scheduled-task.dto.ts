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

// 任务类型
export enum TaskType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

// 执行频率
export enum TaskFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// 创建定时任务 DTO
export class CreateScheduledTaskDto {
  @IsString()
  name: string; // 任务名称

  @IsEnum(TaskType)
  type: TaskType; // 收入/支出/转账

  @IsNumber()
  @Min(0.01)
  amount: number; // 金额

  @IsString()
  category: string; // 分类

  @IsString()
  accountId: string; // 账户ID

  @IsEnum(TaskFrequency)
  frequency: TaskFrequency; // 执行频率

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number; // 每月几号

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number; // 每周几 (0=周日)

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  monthOfYear?: number; // 每年几月

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'executeTime must be in HH:mm format',
  })
  executeTime?: string; // 执行时间

  @IsDateString()
  startDate: string; // 开始日期

  @IsOptional()
  @IsDateString()
  endDate?: string; // 结束日期

  @IsOptional()
  @IsString()
  description?: string; // 备注
}

// 更新定时任务 DTO
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
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
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

// 任务响应 DTO
export class ScheduledTaskResponseDto {
  id: string;
  name: string;
  type: TaskType;
  amount: number;
  category: string;
  accountId: string;
  frequency: TaskFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  executeTime: string;
  startDate: Date;
  endDate?: Date;
  isEnabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentType {
  CREDIT_CARD_FULL = 'CREDIT_CARD_FULL',
  CREDIT_CARD_MIN = 'CREDIT_CARD_MIN',
  LOAN = 'LOAN',
  MORTGAGE = 'MORTGAGE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum InsufficientFundsPolicy {
  NOTIFY = 'NOTIFY',
  RETRY_NEXT_DAY = 'RETRY_NEXT_DAY',
  PARTIAL_PAY = 'PARTIAL_PAY',
  TRY_NEXT_SOURCE = 'TRY_NEXT_SOURCE', // 新增: 尝试下一个来源账户
  SKIP = 'SKIP',
}

// 来源账户配置
export class SourceAccountDto {
  @IsString()
  accountId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  priority: number; // 1 = 最高优先级
}

export class CreateAutoPaymentDto {
  @IsString()
  name: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsString()
  creditCardId?: string;

  @IsOptional()
  @IsString()
  liabilityAccountId?: string;

  // 多来源账户（按优先级排序）
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceAccountDto)
  sourceAccounts?: SourceAccountDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth: number;

  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'executeTime must be in HH:mm format',
  })
  executeTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsEnum(InsufficientFundsPolicy)
  insufficientFundsPolicy?: InsufficientFundsPolicy;

  // 贷款进度跟踪
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPeriods?: number; // 总期数

  @IsOptional()
  @IsInt()
  @Min(0)
  completedPeriods?: number; // 已还期数

  @IsOptional()
  @IsDateString()
  startDate?: string; // 开始日期

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateAutoPaymentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsString()
  creditCardId?: string;

  @IsOptional()
  @IsString()
  liabilityAccountId?: string;

  // 多来源账户
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceAccountDto)
  sourceAccounts?: SourceAccountDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  executeTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsEnum(InsufficientFundsPolicy)
  insufficientFundsPolicy?: InsufficientFundsPolicy;

  // 贷款进度跟踪
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPeriods?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  completedPeriods?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// 来源账户响应
export class SourceAccountResponseDto {
  id: string;
  accountId: string;
  priority: number;
  account: {
    id: string;
    name: string;
    type: string;
    balance: number;
  };
}

export class AutoPaymentResponseDto {
  id: string;
  name: string;
  paymentType: string;
  creditCardId?: string;
  liabilityAccountId?: string;
  fixedAmount?: number;
  dayOfMonth: number;
  executeTime: string;
  reminderDaysBefore: number;
  insufficientFundsPolicy: string;
  isEnabled: boolean;
  lastExecutedAt?: Date;
  nextExecuteAt?: Date;

  // 贷款进度
  totalPeriods?: number;
  completedPeriods: number;
  startDate?: Date;
  remainingPeriods?: number; // 计算字段: totalPeriods - completedPeriods

  createdAt: Date;
  updatedAt: Date;

  // 关联信息
  creditCard?: {
    id: string;
    name: string;
    institutionName: string;
    cardIdentifier: string;
  };
  liabilityAccount?: {
    id: string;
    name: string;
    type: string;
    balance: number;
    interestRate?: number;
    loanTermMonths?: number;
    monthlyPayment?: number;
  };
  // 多来源账户（按优先级排序）
  sources: SourceAccountResponseDto[];
}

export class AutoPaymentLogResponseDto {
  id: string;
  status: string;
  amount: number;
  sourceBalance?: number;
  recordId?: string;
  message?: string;
  executedAt: Date;
  sourceAccountName?: string; // 实际使用的来源账户名称
}

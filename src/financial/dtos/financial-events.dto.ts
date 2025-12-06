import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Enums ====================

export enum EventType {
  TRANSACTION = 'TRANSACTION',
  ASSET_UPDATE = 'ASSET_UPDATE',
  GOAL = 'GOAL',
  NULL_STATEMENT = 'NULL_STATEMENT',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  PAYMENT = 'PAYMENT',
}

export enum Category {
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  SHOPPING = 'SHOPPING',
  HOUSING = 'HOUSING',
  ENTERTAINMENT = 'ENTERTAINMENT',
  INCOME_SALARY = 'INCOME_SALARY',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  ASSET_SALE = 'ASSET_SALE',
  FEES_AND_TAXES = 'FEES_AND_TAXES',
  SUBSCRIPTION = 'SUBSCRIPTION',
  OTHER = 'OTHER',
}

export enum AssetType {
  BANK_BALANCE = 'BANK_BALANCE',
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  PHYSICAL_ASSET = 'PHYSICAL_ASSET',
  LIABILITY = 'LIABILITY',
  FIXED_INCOME = 'FIXED_INCOME',
}

export enum GoalAction {
  CREATE_SAVINGS = 'CREATE_SAVINGS',
  CREATE_DEBT_REPAYMENT = 'CREATE_DEBT_REPAYMENT',
  UPDATE_TARGET = 'UPDATE_TARGET',
}

export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum PaymentSchedule {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// ==================== Data Classes ====================

export class TransactionData {
  @IsEnum(TransactionType)
  transaction_type: TransactionType;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  source_account?: string;

  @IsString()
  @IsOptional()
  target_account?: string;

  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsOptional()
  fee_amount?: number;

  @IsString()
  @IsOptional()
  fee_currency?: string;

  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @IsEnum(PaymentSchedule)
  @IsOptional()
  payment_schedule?: PaymentSchedule;
}

export class AssetUpdateData {
  @IsEnum(AssetType)
  asset_type: AssetType;

  @IsString()
  @IsOptional()
  asset_name?: string;

  @IsString()
  @IsOptional()
  institution_name?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  total_value?: number;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsBoolean()
  @IsOptional()
  is_initial_record?: boolean;

  @IsNumber()
  @IsOptional()
  cost_basis?: number;

  @IsString()
  @IsOptional()
  cost_basis_currency?: string;

  @IsNumber()
  @IsOptional()
  interest_rate_apy?: number;

  @IsDateString()
  @IsOptional()
  maturity_date?: string;
}

export class GoalData {
  @IsEnum(GoalAction)
  goal_action: GoalAction;

  @IsString()
  @IsOptional()
  goal_name?: string;

  @IsNumber()
  @IsOptional()
  target_amount?: number;

  @IsString()
  @IsOptional()
  target_currency?: string;

  @IsDateString()
  @IsOptional()
  target_date?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsNumber()
  @IsOptional()
  current_contribution?: number;
}

export class NullStatementData {
  @IsString()
  @IsOptional()
  error_message?: string;
}

// Union type for all possible data types
export type FinancialEventData =
  | TransactionData
  | AssetUpdateData
  | GoalData
  | NullStatementData;

// ==================== Main DTOs ====================

export class FinancialEventDto {
  @IsEnum(EventType)
  event_type: EventType;

  data: FinancialEventData;
}

export class FinancialEventsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancialEventDto)
  events: FinancialEventDto[];
}

// ==================== Request DTO ====================

export class ParseFinancialRequestDto {
  @IsString()
  text: string;
}

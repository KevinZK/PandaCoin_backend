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
  CREDIT_CARD_UPDATE = 'CREDIT_CARD_UPDATE',
  HOLDING_UPDATE = 'HOLDING_UPDATE',
  BUDGET = 'BUDGET',
  AUTO_PAYMENT = 'AUTO_PAYMENT',  // 订阅/自动扣款
  NEED_MORE_INFO = 'NEED_MORE_INFO',
  QUERY_RESPONSE = 'QUERY_RESPONSE',
  NULL_STATEMENT = 'NULL_STATEMENT',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
  PAYMENT = 'PAYMENT',
}

export enum Category {
  // Expense categories
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  SHOPPING = 'SHOPPING',
  HOUSING = 'HOUSING',
  ENTERTAINMENT = 'ENTERTAINMENT',
  HEALTH = 'HEALTH',
  EDUCATION = 'EDUCATION',
  COMMUNICATION = 'COMMUNICATION',
  SPORTS = 'SPORTS',
  BEAUTY = 'BEAUTY',
  TRAVEL = 'TRAVEL',
  PETS = 'PETS',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FEES_AND_TAXES = 'FEES_AND_TAXES',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  OTHER = 'OTHER',
  // Income categories
  INCOME_SALARY = 'INCOME_SALARY',
  INCOME_BONUS = 'INCOME_BONUS',
  INCOME_INVESTMENT = 'INCOME_INVESTMENT',
  INCOME_FREELANCE = 'INCOME_FREELANCE',
  INCOME_GIFT = 'INCOME_GIFT',
  ASSET_SALE = 'ASSET_SALE',
  INCOME_OTHER = 'INCOME_OTHER',
}

export enum AssetType {
  BANK = 'BANK',
  INVESTMENT = 'INVESTMENT',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  LOAN = 'LOAN',
  MORTGAGE = 'MORTGAGE',
  SAVINGS = 'SAVINGS',
  RETIREMENT = 'RETIREMENT',
  CRYPTO = 'CRYPTO',
  PROPERTY = 'PROPERTY',
  VEHICLE = 'VEHICLE',
  OTHER_ASSET = 'OTHER_ASSET',
  OTHER_LIABILITY = 'OTHER_LIABILITY',
}

export enum BudgetAction {
  CREATE_BUDGET = 'CREATE_BUDGET',
  UPDATE_BUDGET = 'UPDATE_BUDGET',
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

  @IsString()
  @IsOptional()
  card_identifier?: string;
}

export class AssetUpdateData {
  @IsEnum(AssetType)
  asset_type: AssetType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  institution_name?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  currency?: string;

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

  @IsNumber()
  @IsOptional()
  projected_value?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  repayment_amount?: number;

  @IsEnum(PaymentSchedule)
  @IsOptional()
  repayment_schedule?: PaymentSchedule;

  @IsString()
  @IsOptional()
  card_identifier?: string;

  // 贷款专用字段 (LOAN / MORTGAGE)
  @IsNumber()
  @IsOptional()
  loan_term_months?: number; // 贷款期限(月)

  @IsNumber()
  @IsOptional()
  interest_rate?: number; // 年利率 (%)

  @IsNumber()
  @IsOptional()
  monthly_payment?: number; // 月供金额

  @IsNumber()
  @IsOptional()
  repayment_day?: number; // 还款日 (1-28)

  // 自动扣款配置
  @IsBoolean()
  @IsOptional()
  auto_repayment?: boolean; // 是否启用自动扣款

  @IsString()
  @IsOptional()
  source_account?: string; // 扣款来源账户名称
}

export class BudgetData {
  @IsEnum(BudgetAction)
  budget_action: BudgetAction;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @IsEnum(Category)
  @IsOptional()
  category?: Category;
}

export enum RepaymentType {
  FULL = 'FULL',
  MIN = 'MIN',
}

export class CreditCardUpdateData {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  institution_name?: string;

  @IsNumber()
  @IsOptional()
  credit_limit?: number;

  @IsString()
  @IsOptional()
  repayment_due_date?: string;

  @IsString()
  @IsOptional()
  card_identifier?: string;

  @IsNumber()
  @IsOptional()
  outstanding_balance?: number; // 当前待还金额

  // 自动扣款配置
  @IsBoolean()
  @IsOptional()
  auto_repayment?: boolean; // 是否启用自动扣款

  @IsEnum(RepaymentType)
  @IsOptional()
  repayment_type?: RepaymentType; // 全额还款 / 最低还款

  @IsString()
  @IsOptional()
  source_account?: string; // 扣款来源账户名称
}

export class NullStatementData {
  @IsString()
  @IsOptional()
  error_message?: string;
}

// 智能追问数据（Function Calling 使用）
export class NeedMoreInfoData {
  @IsString()
  question: string;  // 要问用户的问题

  @IsArray()
  @IsOptional()
  missing_fields?: string[];  // 缺少的字段列表

  @IsString()
  @IsOptional()
  context?: string;  // 已理解的上下文信息

  @IsArray()
  @IsOptional()
  suggested_options?: string[];  // 建议的选项
}

// 自动扣款类型
export enum AutoPaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',     // 订阅服务
  MEMBERSHIP = 'MEMBERSHIP',         // 会员费
  INSURANCE = 'INSURANCE',           // 保险
  UTILITY = 'UTILITY',               // 水电燃气
  RENT = 'RENT',                     // 房租
  OTHER = 'OTHER',                   // 其他
}

export class AutoPaymentData {
  @IsString()
  name: string;  // 订阅名称，如 "Finboo App"

  @IsEnum(AutoPaymentType)
  @IsOptional()
  payment_type?: AutoPaymentType;  // 扣款类型

  @IsNumber()
  amount: number;  // 扣款金额

  @IsString()
  @IsOptional()
  currency?: string;  // 币种，默认 CNY

  @IsNumber()
  @IsOptional()
  day_of_month?: number;  // 每月扣款日 (1-28)

  @IsString()
  @IsOptional()
  source_account?: string;  // 扣款来源账户

  @IsEnum(Category)
  @IsOptional()
  category?: Category;  // 分类，默认 SUBSCRIPTION

  @IsString()
  @IsOptional()
  note?: string;  // 备注
}

// Union type for all possible data types
export type FinancialEventData =
  | TransactionData
  | AssetUpdateData
  | CreditCardUpdateData
  | BudgetData
  | NullStatementData
  | NeedMoreInfoData
  | AutoPaymentData;

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

// 对话历史消息
export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ParseFinancialRequestDto {
  @IsString()
  text: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  conversationHistory?: ChatMessageDto[];  // 多轮对话历史
}

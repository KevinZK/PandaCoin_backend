export declare enum EventType {
    TRANSACTION = "TRANSACTION",
    ASSET_UPDATE = "ASSET_UPDATE",
    GOAL = "GOAL",
    NULL_STATEMENT = "NULL_STATEMENT"
}
export declare enum TransactionType {
    EXPENSE = "EXPENSE",
    INCOME = "INCOME",
    TRANSFER = "TRANSFER",
    PAYMENT = "PAYMENT"
}
export declare enum Category {
    FOOD = "FOOD",
    TRANSPORT = "TRANSPORT",
    SHOPPING = "SHOPPING",
    HOUSING = "HOUSING",
    ENTERTAINMENT = "ENTERTAINMENT",
    INCOME_SALARY = "INCOME_SALARY",
    LOAN_REPAYMENT = "LOAN_REPAYMENT",
    ASSET_SALE = "ASSET_SALE",
    FEES_AND_TAXES = "FEES_AND_TAXES",
    SUBSCRIPTION = "SUBSCRIPTION",
    OTHER = "OTHER"
}
export declare enum AssetType {
    BANK_BALANCE = "BANK_BALANCE",
    STOCK = "STOCK",
    CRYPTO = "CRYPTO",
    PHYSICAL_ASSET = "PHYSICAL_ASSET",
    LIABILITY = "LIABILITY",
    FIXED_INCOME = "FIXED_INCOME"
}
export declare enum GoalAction {
    CREATE_SAVINGS = "CREATE_SAVINGS",
    CREATE_DEBT_REPAYMENT = "CREATE_DEBT_REPAYMENT",
    UPDATE_TARGET = "UPDATE_TARGET"
}
export declare enum Priority {
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export declare enum PaymentSchedule {
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY"
}
export declare class TransactionData {
    transaction_type: TransactionType;
    amount: number;
    currency?: string;
    source_account?: string;
    target_account?: string;
    category?: Category;
    note?: string;
    date?: string;
    fee_amount?: number;
    fee_currency?: string;
    is_recurring?: boolean;
    payment_schedule?: PaymentSchedule;
}
export declare class AssetUpdateData {
    asset_type: AssetType;
    asset_name?: string;
    institution_name?: string;
    quantity?: number;
    currency?: string;
    total_value?: number;
    date?: string;
    is_initial_record?: boolean;
    cost_basis?: number;
    cost_basis_currency?: string;
    interest_rate_apy?: number;
    maturity_date?: string;
}
export declare class GoalData {
    goal_action: GoalAction;
    goal_name?: string;
    target_amount?: number;
    target_currency?: string;
    target_date?: string;
    priority?: Priority;
    current_contribution?: number;
}
export declare class NullStatementData {
    error_message?: string;
}
export type FinancialEventData = TransactionData | AssetUpdateData | GoalData | NullStatementData;
export declare class FinancialEventDto {
    event_type: EventType;
    data: FinancialEventData;
}
export declare class FinancialEventsResponseDto {
    events: FinancialEventDto[];
}
export declare class ParseFinancialRequestDto {
    text: string;
}

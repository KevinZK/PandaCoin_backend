export declare enum EventType {
    TRANSACTION = "TRANSACTION",
    ASSET_UPDATE = "ASSET_UPDATE",
    CREDIT_CARD_UPDATE = "CREDIT_CARD_UPDATE",
    BUDGET = "BUDGET",
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
    BANK = "BANK",
    INVESTMENT = "INVESTMENT",
    CASH = "CASH",
    CREDIT_CARD = "CREDIT_CARD",
    DIGITAL_WALLET = "DIGITAL_WALLET",
    LOAN = "LOAN",
    MORTGAGE = "MORTGAGE",
    SAVINGS = "SAVINGS",
    RETIREMENT = "RETIREMENT",
    CRYPTO = "CRYPTO",
    PROPERTY = "PROPERTY",
    VEHICLE = "VEHICLE",
    OTHER_ASSET = "OTHER_ASSET",
    OTHER_LIABILITY = "OTHER_LIABILITY"
}
export declare enum BudgetAction {
    CREATE_BUDGET = "CREATE_BUDGET",
    UPDATE_BUDGET = "UPDATE_BUDGET"
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
    card_identifier?: string;
}
export declare class AssetUpdateData {
    asset_type: AssetType;
    name?: string;
    amount?: number;
    institution_name?: string;
    quantity?: number;
    currency?: string;
    date?: string;
    is_initial_record?: boolean;
    cost_basis?: number;
    cost_basis_currency?: string;
    interest_rate_apy?: number;
    maturity_date?: string;
    projected_value?: number;
    location?: string;
    repayment_amount?: number;
    repayment_schedule?: PaymentSchedule;
    card_identifier?: string;
}
export declare class BudgetData {
    budget_action: BudgetAction;
    name?: string;
    amount?: number;
    currency?: string;
    date?: string;
    priority?: Priority;
}
export declare class CreditCardUpdateData {
    name?: string;
    amount?: number;
    currency?: string;
    date?: string;
    institution_name?: string;
    credit_limit?: number;
    repayment_due_date?: string;
    card_identifier?: string;
}
export declare class NullStatementData {
    error_message?: string;
}
export type FinancialEventData = TransactionData | AssetUpdateData | CreditCardUpdateData | BudgetData | NullStatementData;
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

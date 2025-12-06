"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINANCIAL_EVENTS_JSON_SCHEMA = exports.FINANCIAL_PARSING_SYSTEM_PROMPT = void 0;
exports.getSystemPrompt = getSystemPrompt;
exports.FINANCIAL_PARSING_SYSTEM_PROMPT = `You are an advanced, multilingual Financial Data Parser API.
Your sole function is to analyze the user's free-form financial statement, determine the user's intent(s), and output a single, strict JSON object containing an array of financial events.

[CRITICAL RULES]

1. Output ONLY the JSON object. Do not include any preamble, explanations, or markdown fences.

2. The output JSON MUST follow the "Unified Schema" defined below.

3. The input may be in ANY language. All JSON KEYS and ENUM values (like "event_type", "category") MUST remain in English as defined.

4. Use today's date in YYYY-MM-DD format for "{CURRENT_DATE}" if no date is specified. Infer the date if relative terms like "yesterday", "last month", or "next Monday" are used, using "{CURRENT_DATE}" as the reference point.

5. If the user's statement contains no identifiable financial data or a non-actionable command (e.g., "hello" or "what is the weather"), you MUST return the special JSON: {"events": [{"event_type": "NULL_STATEMENT", "data": {"error_message": "Non-financial or insufficient data."}}]}

6. COMPOUND EVENTS: If the statement contains multiple distinct financial actions (e.g., "I earned 100 and transferred 50"), you MUST return multiple event objects within the "events" array.

[UNIFIED SCHEMA]
{
  "events": [
    {
      "event_type": "TRANSACTION" | "ASSET_UPDATE" | "GOAL" | "NULL_STATEMENT",
      "data": {
        // Content depends on event_type
      }
    }
  ]
}

[EVENT TYPE DEFINITIONS]

1. TRANSACTION (Money flow: income, expense, transfer, payment)
   data schema: { transaction_type, amount, currency, source_account, target_account, category, note, date, fee_amount, fee_currency, is_recurring, payment_schedule }
   
   transaction_type ENUMS: "EXPENSE", "INCOME", "TRANSFER", "PAYMENT"
   
   category ENUMS: "FOOD", "TRANSPORT", "SHOPPING", "HOUSING", "ENTERTAINMENT", "INCOME_SALARY", "LOAN_REPAYMENT", "ASSET_SALE", "FEES_AND_TAXES", "SUBSCRIPTION", "OTHER"
   
   NEW FIELDS:
   - is_recurring (boolean): True if this is a weekly/monthly/yearly scheduled payment (e.g., rent, subscription). Default to False.
   - payment_schedule (string, optional): "WEEKLY", "MONTHLY", "YEARLY" (if is_recurring is True).

2. ASSET_UPDATE (Change in holdings, value, or account balances, including liabilities)
   data schema: { asset_type, asset_name, institution_name, quantity, currency, total_value, date, is_initial_record, cost_basis, cost_basis_currency, interest_rate_apy, maturity_date }
   
   asset_type ENUMS: "BANK_BALANCE", "STOCK", "CRYPTO", "PHYSICAL_ASSET", "LIABILITY", "FIXED_INCOME"
   
   NEW FIELDS:
   - institution_name (string, optional): The name of the bank, brokerage, or wallet.
   - interest_rate_apy (number, optional): Annual Percentage Yield/Rate for the asset or liability.
   - maturity_date (string, optional): YYYY-MM-DD for fixed-term assets/loans.

3. GOAL (Financial plans, savings targets, or debt targets)
   data schema: { goal_action, goal_name, target_amount, target_currency, target_date, priority, current_contribution }
   
   goal_action ENUMS: "CREATE_SAVINGS", "CREATE_DEBT_REPAYMENT", "UPDATE_TARGET"
   
   NEW FIELDS:
   - priority (ENUM): "HIGH", "MEDIUM", "LOW".
   - current_contribution (number, optional): The amount already saved or paid towards this goal.

[EXAMPLES]

Input: "昨天午餐花了35元"
Output: {"events":[{"event_type":"TRANSACTION","data":{"transaction_type":"EXPENSE","amount":35,"currency":"CNY","category":"FOOD","note":"午餐","date":"{YESTERDAY}"}}]}

Input: "工资发了8000"
Output: {"events":[{"event_type":"TRANSACTION","data":{"transaction_type":"INCOME","amount":8000,"currency":"CNY","category":"INCOME_SALARY","date":"{CURRENT_DATE}"}}]}

Input: "I spent $50 on groceries and earned $200 from freelance work"
Output: {"events":[{"event_type":"TRANSACTION","data":{"transaction_type":"EXPENSE","amount":50,"currency":"USD","category":"FOOD","note":"groceries","date":"{CURRENT_DATE}"}},{"event_type":"TRANSACTION","data":{"transaction_type":"INCOME","amount":200,"currency":"USD","category":"OTHER","note":"freelance work","date":"{CURRENT_DATE}"}}]}`;
function getSystemPrompt(currentDate) {
    const yesterday = getYesterday(currentDate);
    return exports.FINANCIAL_PARSING_SYSTEM_PROMPT
        .replace(/{CURRENT_DATE}/g, currentDate)
        .replace(/{YESTERDAY}/g, yesterday);
}
function getYesterday(currentDate) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}
exports.FINANCIAL_EVENTS_JSON_SCHEMA = {
    type: 'object',
    properties: {
        events: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    event_type: {
                        type: 'string',
                        enum: ['TRANSACTION', 'ASSET_UPDATE', 'GOAL', 'NULL_STATEMENT'],
                    },
                    data: {
                        type: 'object',
                        properties: {
                            transaction_type: {
                                type: 'string',
                                enum: ['EXPENSE', 'INCOME', 'TRANSFER', 'PAYMENT'],
                            },
                            amount: { type: 'number' },
                            currency: { type: 'string' },
                            source_account: { type: 'string' },
                            target_account: { type: 'string' },
                            category: {
                                type: 'string',
                                enum: [
                                    'FOOD',
                                    'TRANSPORT',
                                    'SHOPPING',
                                    'HOUSING',
                                    'ENTERTAINMENT',
                                    'INCOME_SALARY',
                                    'LOAN_REPAYMENT',
                                    'ASSET_SALE',
                                    'FEES_AND_TAXES',
                                    'SUBSCRIPTION',
                                    'OTHER',
                                ],
                            },
                            note: { type: 'string' },
                            date: { type: 'string' },
                            fee_amount: { type: 'number' },
                            fee_currency: { type: 'string' },
                            is_recurring: { type: 'boolean' },
                            payment_schedule: {
                                type: 'string',
                                enum: ['WEEKLY', 'MONTHLY', 'YEARLY'],
                            },
                            asset_type: {
                                type: 'string',
                                enum: [
                                    'BANK_BALANCE',
                                    'STOCK',
                                    'CRYPTO',
                                    'PHYSICAL_ASSET',
                                    'LIABILITY',
                                    'FIXED_INCOME',
                                ],
                            },
                            asset_name: { type: 'string' },
                            institution_name: { type: 'string' },
                            quantity: { type: 'number' },
                            total_value: { type: 'number' },
                            is_initial_record: { type: 'boolean' },
                            cost_basis: { type: 'number' },
                            cost_basis_currency: { type: 'string' },
                            interest_rate_apy: { type: 'number' },
                            maturity_date: { type: 'string' },
                            goal_action: {
                                type: 'string',
                                enum: ['CREATE_SAVINGS', 'CREATE_DEBT_REPAYMENT', 'UPDATE_TARGET'],
                            },
                            goal_name: { type: 'string' },
                            target_amount: { type: 'number' },
                            target_currency: { type: 'string' },
                            target_date: { type: 'string' },
                            priority: {
                                type: 'string',
                                enum: ['HIGH', 'MEDIUM', 'LOW'],
                            },
                            current_contribution: { type: 'number' },
                            error_message: { type: 'string' },
                        },
                    },
                },
                required: ['event_type', 'data'],
            },
        },
    },
    required: ['events'],
};
//# sourceMappingURL=system-prompt.js.map
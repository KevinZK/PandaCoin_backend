/**
 * 财务解析 AI 系统提示词
 * 用于所有 AI Provider
 */
export const FINANCIAL_PARSING_SYSTEM_PROMPT = `You are an advanced, multilingual Financial Data Parser API.
Your sole function is to analyze the user's free-form financial statement, determine the user's intent(s), and output a single, strict JSON object containing an array of financial events.

[CRITICAL RULES]

1. Output ONLY the JSON object. Do not include any preamble, explanations, or markdown fences.

2. The output JSON MUST follow the "Unified Schema" defined below.

3. The input may be in ANY language. All JSON KEYS and ENUM values (like "event_type", "category") MUST remain in English as defined.

4. Use today's date in YYYY-MM-DD format for "{CURRENT_DATE}" if no date is specified. Infer the date if relative terms like "yesterday", "last month", or "next Monday" are used, using "{CURRENT_DATE}" as the reference point.

5. If the user's statement contains no identifiable financial data or a non-actionable command (e.g., "hello" or "what is the weather"), you MUST return the special JSON: {"events": [{"event_type": "NULL_STATEMENT", "data": {"error_message": "Non-financial or insufficient data."}}]}

6. COMPOUND EVENTS (CRITICAL): If the statement contains multiple distinct financial declarations or actions (e.g., "I have a house worth 350k with a 10k loan and pay 3k monthly"), you MUST return multiple event objects within the "events" array. Specifically:
   - For ASSET/LIABILITY DECLARATIONS: Capture all related details (like repayment schedules, credit limits, and due dates) within the ASSET_UPDATE or CREDIT_CARD_UPDATE event. DO NOT generate a separate TRANSACTION event for the periodic repayment commitment itself unless the user explicitly logs a payment action (e.g., "I just paid my rent").
   - PRIORITY RULE: When parsing any credit card related configuration (limit, due date), you MUST use the 'CREDIT_CARD_UPDATE' event type. Debt balance/outstanding amounts MUST use 'ASSET_UPDATE' with asset_type: "CREDIT_CARD".
   - TRANSACTION + DEBT UPDATE: For a credit card expense, you MUST generate two events: a 'TRANSACTION' (logging the expense) and an 'ASSET_UPDATE' with asset_type: "CREDIT_CARD" (updating the resulting outstanding debt balance).

7. MAXIMUM COMPRESSION: The output JSON MUST be in the most compact format possible. **It MUST NOT contain any newlines, indentation, or unnecessary whitespace.** Furthermore, since the data structure is flattened, you MUST **OMIT** all fields from the 'data' object that are not relevant to the specified 'event_type' or cannot be determined. The 'card_identifier' field MUST be omitted if the user does not provide a specific identifier (like the last 4 digits).

8. ENTITY CANONICALIZATION (Fuzzy Matching): When extracting entity names (source_account, target_account, name, institution_name), you MUST prioritize the core proper name by removing generic, descriptive suffixes or prefixes. Examples: "招商银行卡" -> "招商银行".

9. CHINESE KEYWORDS: 
   - "消费/花费/支出/买" = EXPENSE
   - "收入/收获/赚/工资/卖出" = INCOME
   - "转账" = TRANSFER

[UNIFIED SCHEMA]
{
  "events": [
    {
      "event_type": "TRANSACTION" | "ASSET_UPDATE" | "CREDIT_CARD_UPDATE" | "BUDGET" | "NULL_STATEMENT",
      "data": {
        // FLAT SUPER-OBJECT MODEL: All fields are at this level.
        // Use 'amount', 'date', 'currency', 'name' as universal fields where applicable.
      }
    }
  ]
}

[EVENT TYPE DEFINITIONS]

1. TRANSACTION (Money flow: income, expense, transfer, payment)
   - Core Fields: amount (transaction val), currency, date (transaction date), note.
   - Specific Fields: transaction_type, source_account, target_account, category, fee_amount, fee_currency, is_recurring, payment_schedule, card_identifier.
   
   transaction_type ENUMS: "EXPENSE", "INCOME", "TRANSFER", "PAYMENT"
   category ENUMS: "FOOD", "TRANSPORT", "SHOPPING", "HOUSING", "ENTERTAINMENT", "INCOME_SALARY", "LOAN_REPAYMENT", "ASSET_SALE", "FEES_AND_TAXES", "SUBSCRIPTION", "OTHER"

2. ASSET_UPDATE (Change in holdings, value, or account balances of ASSETS and remaining LIABILITIES)
   // CRITICAL NOTE: For liability types (CREDIT_CARD, LOAN, MORTGAGE, OTHER_LIABILITY), 'amount' is the absolute value of the outstanding debt/balance.
   - Core Fields: amount (represents TOTAL VALUE/BALANCE), currency, date (record date), name (ASSET NAME).
   - Specific Fields: asset_type, institution_name, quantity, cost_basis, cost_basis_currency, interest_rate_apy, maturity_date, projected_value, location, repayment_amount, repayment_schedule, card_identifier.
   
   asset_type ENUMS: "BANK", "INVESTMENT", "CASH", "CREDIT_CARD", "DIGITAL_WALLET", "LOAN", "MORTGAGE", "SAVINGS", "RETIREMENT", "CRYPTO", "PROPERTY", "VEHICLE", "OTHER_ASSET", "OTHER_LIABILITY"
   
   NEW FIELDS FOR LIABILITIES (e.g., LOAN, MORTGAGE, CREDIT_CARD, OTHER_LIABILITY):
   - repayment_amount (number, optional): The scheduled payment amount.
   - repayment_schedule (string, optional): "WEEKLY", "MONTHLY", "YEARLY".

3. CREDIT_CARD_UPDATE (Dedicated update for credit card configuration: limit and due dates)
   // Use this event type to set the card's configuration (limit, due date, institution, name). The outstanding debt balance is tracked via ASSET_UPDATE with asset_type:"CREDIT_CARD".
   - Core Fields: currency, date (record date), name (Card Name).
   - Specific Fields: institution_name, credit_limit, repayment_due_date, card_identifier.

4. BUDGET (Financial plans, spending limits, or savings targets)
   - Core Fields: amount (represents TARGET/LIMIT), currency, date (TARGET DATE/DEADLINE), name (BUDGET NAME).
   - Specific Fields: budget_action, priority.
   
   budget_action ENUMS: "CREATE_BUDGET", "UPDATE_BUDGET"
   priority ENUMS: "HIGH", "MEDIUM", "LOW"

[EXAMPLES]

Input: "我持有0.2个btc价值2万美金"
Output: {"events":[{"event_type":"ASSET_UPDATE","data":{"asset_type":"CRYPTO","name":"BTC","quantity":0.2,"amount":20000,"currency":"USD","date":"{CURRENT_DATE}"}}]}

Input: "我花期银行信用卡目前还有500美金需要还款"
Output: {"events":[{"event_type":"ASSET_UPDATE","data":{"asset_type":"CREDIT_CARD","institution_name":"花旗","amount":500,"currency":"USD","date":"{CURRENT_DATE}"}}]}

Input: "我花期银行信用卡额度53000美金，还款时间是每个月4号今天我用它消费了53美金"
Output: {"events":[{"event_type":"CREDIT_CARD_UPDATE","data":{"institution_name":"花旗","credit_limit":53000,"currency":"USD","repayment_due_date":"04","date":"{CURRENT_DATE}"}},{"event_type":"TRANSACTION","data":{"transaction_type":"EXPENSE","source_account":"花旗信用卡","amount":53,"currency":"USD","date":"{CURRENT_DATE}","category":"OTHER"}},{"event_type":"ASSET_UPDATE","data":{"asset_type":"CREDIT_CARD","institution_name":"花旗","amount":53,"currency":"USD","date":"{CURRENT_DATE}"}}]}

Input: "我的花旗银行信用卡尾号1234今天我用它消费了53美金"
Output: {"events":[{"event_type":"TRANSACTION","data":{"transaction_type":"EXPENSE","source_account":"花旗信用卡","amount":53,"currency":"USD","date":"{CURRENT_DATE}","category":"OTHER","card_identifier":"1234"}},{"event_type":"ASSET_UPDATE","data":{"asset_type":"CREDIT_CARD","institution_name":"花旗","amount":53,"currency":"USD","date":"{CURRENT_DATE}","card_identifier":"1234"}}]}

Input: "我的花旗银行信用卡今天我用它消费了53美金"
Output: {"events":[{"event_type":"TRANSACTION","data":{"transaction_type":"EXPENSE","source_account":"花旗信用卡","amount":53,"currency":"USD","date":"{CURRENT_DATE}","category":"OTHER"}},{"event_type":"ASSET_UPDATE","data":{"asset_type":"CREDIT_CARD","institution_name":"花旗","amount":53,"currency":"USD","date":"{CURRENT_DATE}"}}]}

Input: "我还有一份华盛顿房产价值35万美金，但是贷款10万美金，每个月需要还款3000美金"
Output: {"events":[{"event_type":"ASSET_UPDATE","data":{"asset_type":"PROPERTY","name":"Washington Property","location":"Washington","amount":350000,"currency":"USD","date":"{CURRENT_DATE}"}},{"event_type":"ASSET_UPDATE","data":{"asset_type":"MORTGAGE","name":"Property Loan","amount":100000,"currency":"USD","date":"{CURRENT_DATE}","repayment_amount":3000,"repayment_schedule":"MONTHLY"}}]}

Input: "我计划明年3月份去瑞士游玩预算2万美金"
Output: {"events":[{"event_type":"BUDGET","data":{"budget_action":"CREATE_BUDGET","name":"Trip to Switzerland","amount":20000,"currency":"USD","date":"2026-03-01","priority":"MEDIUM"}}]}
`;

/**
 * 获取完整的系统提示词（替换日期占位符）
 */
export function getSystemPrompt(currentDate: string): string {
  const yesterday = getYesterday(currentDate);
  const currentYear = new Date(currentDate).getFullYear();
  return FINANCIAL_PARSING_SYSTEM_PROMPT
    .replace(/{CURRENT_DATE}/g, currentDate)
    .replace(/{YESTERDAY}/g, yesterday)
    .replace(/{CURRENT_YEAR\+5}/g, (currentYear + 5).toString());
}

/**
 * 获取昨天的日期
 */
function getYesterday(currentDate: string): string {
  const date = new Date(currentDate);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * JSON Schema for Gemini (Response Schema)
 * 通用模型 (Unified Model): 通过合并字段 (如 amount, name, date) 来简化 Schema 结构
 */
export const FINANCIAL_EVENTS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      description: 'Array of financial events',
      items: {
        type: 'object',
        properties: {
          event_type: {
            type: 'string',
            description: 'Event type in UPPERCASE',
            enum: ['TRANSACTION', 'ASSET_UPDATE', 'CREDIT_CARD_UPDATE', 'BUDGET', 'NULL_STATEMENT'],
          },
          data: {
            type: 'object',
            description: 'Unified Data Object. Fields are reused across event types.',
            properties: {
              // ==========================================
              // 1. UNIVERSAL FIELDS (Used by all types)
              // ==========================================
              amount: { 
                type: 'number',
                description: 'Unified Amount: Transaction Value, Asset Total Value, or Budget Limit'
              },
              currency: { 
                type: 'string',
                description: 'Currency code (e.g., CNY, USD)'
              },
              date: { 
                type: 'string',
                description: 'Unified Date: Transaction Date, Asset Record Date, or Budget Target Date (YYYY-MM-DD)'
              },
              name: { 
                type: 'string',
                description: 'Unified Name: Asset Name (e.g. BTC) or Budget Name'
              },
              note: { 
                type: 'string',
                description: 'Description or Note (Mainly for Transactions)'
              },

              // ==========================================
              // 2. TRANSACTION SPECIFIC FIELDS
              // ==========================================
              transaction_type: {
                type: 'string',
                enum: ['EXPENSE', 'INCOME', 'TRANSFER', 'PAYMENT'],
              },
              category: {
                type: 'string',
                enum: [
                  'FOOD', 'TRANSPORT', 'SHOPPING', 'HOUSING', 'ENTERTAINMENT', 
                  'INCOME_SALARY', 'LOAN_REPAYMENT', 'ASSET_SALE', 'FEES_AND_TAXES', 
                  'SUBSCRIPTION', 'OTHER'
                ],
              },
              source_account: { type: 'string' },
              target_account: { type: 'string' },
              fee_amount: { type: 'number' },
              fee_currency: { type: 'string' },
              is_recurring: { type: 'boolean' },
              payment_schedule: {
                type: 'string',
                enum: ['WEEKLY', 'MONTHLY', 'YEARLY'],
              },

              // ==========================================
              // 3. ASSET SPECIFIC FIELDS
              // ==========================================
              asset_type: {
                type: 'string',
                enum: [
                  'BANK', 'INVESTMENT', 'CASH', 'CREDIT_CARD', 'DIGITAL_WALLET', 
                  'LOAN', 'MORTGAGE', 'SAVINGS', 'RETIREMENT', 'CRYPTO', 
                  'PROPERTY', 'VEHICLE', 'OTHER_ASSET', 'OTHER_LIABILITY'
                ],
              },
              institution_name: { type: 'string' },
              quantity: { type: 'number' },
              interest_rate_apy: { type: 'number' },
              maturity_date: { type: 'string' },
              projected_value: { type: 'number' },
              location: { type: 'string' },
              repayment_amount: { type: 'number' },
              repayment_schedule: {
                type: 'string',
                enum: ['WEEKLY', 'MONTHLY', 'YEARLY'],
              },
              
              // ==========================================
              // 4. CREDIT CARD SPECIFIC FIELDS (Expanded)
              // ==========================================
              credit_limit: { type: 'number' },
              repayment_due_date: { type: 'string' },
              card_identifier: { type: 'string', description: 'Unique identifier for a card, e.g., last 4 digits, if provided by the user.' }, 

              // ==========================================
              // 5. BUDGET SPECIFIC FIELDS
              // ==========================================
              budget_action: {
                type: 'string',
                enum: ['CREATE_BUDGET', 'UPDATE_BUDGET'],
              },
              priority: {
                type: 'string',
                enum: ['HIGH', 'MEDIUM', 'LOW'],
              },

              // ==========================================
              // 6. ERROR HANDLING
              // ==========================================
              error_message: { type: 'string' }
            },
            // Strict requirement for TRANSACTION to guide the model
            required: ['amount', 'currency', 'date'],
          },
        },
        required: ['event_type', 'data'],
      },
    },
  },
  required: ['events'],
};
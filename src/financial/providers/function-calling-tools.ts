/**
 * Function Calling 工具定义
 * 用于 Qwen3-Max 的智能记账解析
 *
 * 核心优势：
 * - LLM 自主决定调用哪个函数，无需穷举规则
 * - 智能追问：LLM 自主判断何时需要更多信息
 * - 更自然的对话体验
 */

// ==================== 工具定义 ====================

export const FINANCIAL_TOOLS = [
  // 工具 1: 记录交易
  {
    type: 'function',
    function: {
      name: 'record_transaction',
      description: '记录一笔收支交易（消费、收入、转账、还款）',
      parameters: {
        type: 'object',
        properties: {
          transaction_type: {
            type: 'string',
            enum: ['EXPENSE', 'INCOME', 'TRANSFER', 'PAYMENT'],
            description: '交易类型：EXPENSE=支出, INCOME=收入, TRANSFER=转账, PAYMENT=还款',
          },
          amount: {
            type: 'number',
            description: '金额（正数）',
          },
          currency: {
            type: 'string',
            description: '货币代码，如 CNY, USD, EUR',
            default: 'CNY',
          },
          category: {
            type: 'string',
            enum: [
              'FOOD', 'TRANSPORT', 'SHOPPING', 'HOUSING', 'ENTERTAINMENT',
              'HEALTH', 'EDUCATION', 'COMMUNICATION', 'SPORTS', 'BEAUTY',
              'TRAVEL', 'PETS', 'SUBSCRIPTION', 'FEES_AND_TAXES', 'LOAN_REPAYMENT', 'OTHER',
              'INCOME_SALARY', 'INCOME_BONUS', 'INCOME_INVESTMENT', 'INCOME_FREELANCE',
              'INCOME_GIFT', 'ASSET_SALE', 'INCOME_OTHER',
            ],
            description: '分类',
          },
          note: {
            type: 'string',
            description: '备注/商户名称',
          },
          date: {
            type: 'string',
            description: '日期，格式 YYYY-MM-DD',
          },
          source_account: {
            type: 'string',
            description: '来源账户名称（用于转账/还款）',
          },
          target_account: {
            type: 'string',
            description: '目标账户名称（用于转账/还款）',
          },
          card_identifier: {
            type: 'string',
            description: '银行卡尾号（4位数字）',
          },
        },
        required: ['transaction_type', 'amount'],
      },
    },
  },

  // 工具 2: 更新资产
  {
    type: 'function',
    function: {
      name: 'update_asset',
      description: '创建或更新资产/负债信息（银行存款、贷款、房产、车辆等）',
      parameters: {
        type: 'object',
        properties: {
          asset_type: {
            type: 'string',
            enum: [
              'BANK', 'INVESTMENT', 'CASH', 'CREDIT_CARD', 'DIGITAL_WALLET',
              'LOAN', 'MORTGAGE', 'SAVINGS', 'RETIREMENT', 'CRYPTO',
              'PROPERTY', 'VEHICLE', 'OTHER_ASSET', 'OTHER_LIABILITY',
            ],
            description: '资产类型',
          },
          name: {
            type: 'string',
            description: '资产名称，如"招商银行储蓄卡"',
          },
          amount: {
            type: 'number',
            description: '金额/余额/价值',
          },
          currency: {
            type: 'string',
            description: '货币代码',
            default: 'CNY',
          },
          institution_name: {
            type: 'string',
            description: '机构名称（银行名、贷款机构等）',
          },
          card_identifier: {
            type: 'string',
            description: '银行卡尾号（4位数字）',
          },
          loan_term_months: {
            type: 'number',
            description: '贷款期限（月）',
          },
          interest_rate: {
            type: 'number',
            description: '年利率（%）',
          },
          monthly_payment: {
            type: 'number',
            description: '月供金额',
          },
          repayment_day: {
            type: 'number',
            description: '还款日（1-28）',
          },
          auto_repayment: {
            type: 'boolean',
            description: '是否启用自动扣款',
          },
          source_account: {
            type: 'string',
            description: '自动扣款来源账户',
          },
        },
        required: ['asset_type', 'name'],
      },
    },
  },

  // 工具 3: 更新信用卡
  {
    type: 'function',
    function: {
      name: 'update_credit_card',
      description: '创建或更新信用卡信息',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '信用卡名称，如"招商银行信用卡"',
          },
          institution_name: {
            type: 'string',
            description: '发卡银行',
          },
          credit_limit: {
            type: 'number',
            description: '信用额度',
          },
          outstanding_balance: {
            type: 'number',
            description: '当前待还金额',
          },
          repayment_due_date: {
            type: 'string',
            description: '还款日（每月几号）',
          },
          card_identifier: {
            type: 'string',
            description: '卡号尾号（4位数字）',
          },
          auto_repayment: {
            type: 'boolean',
            description: '是否启用自动还款',
          },
          repayment_type: {
            type: 'string',
            enum: ['FULL', 'MIN'],
            description: '还款方式：FULL=全额, MIN=最低',
          },
          source_account: {
            type: 'string',
            description: '自动还款来源账户',
          },
        },
        required: ['name', 'credit_limit', 'outstanding_balance', 'repayment_due_date'],  // 卡号尾号可选
      },
    },
  },

  // 工具 4: 设置预算
  {
    type: 'function',
    function: {
      name: 'set_budget',
      description: '创建或更新预算',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '预算名称',
          },
          amount: {
            type: 'number',
            description: '预算金额',
          },
          category: {
            type: 'string',
            description: '预算分类',
          },
          currency: {
            type: 'string',
            default: 'CNY',
          },
        },
        required: ['name', 'amount'],
      },
    },
  },

  // 工具 5: 设置自动扣款
  {
    type: 'function',
    function: {
      name: 'set_auto_payment',
      description: '设置订阅或自动扣款（如会员费、保险、房租等）',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '订阅/扣款名称',
          },
          amount: {
            type: 'number',
            description: '扣款金额',
          },
          payment_type: {
            type: 'string',
            enum: ['SUBSCRIPTION', 'MEMBERSHIP', 'INSURANCE', 'UTILITY', 'RENT', 'OTHER'],
            description: '扣款类型',
          },
          day_of_month: {
            type: 'number',
            description: '每月扣款日（1-28）',
          },
          source_account: {
            type: 'string',
            description: '扣款来源账户',
          },
          category: {
            type: 'string',
            description: '分类',
          },
        },
        required: ['name', 'amount'],
      },
    },
  },

  // 工具 6: 更新持仓（股票/基金/ETF/加密货币）
  {
    type: 'function',
    function: {
      name: 'update_holding',
      description: '买入/卖出/更新投资持仓（股票、基金、ETF、加密货币等）',
      parameters: {
        type: 'object',
        properties: {
          holding_action: {
            type: 'string',
            enum: ['BUY', 'SELL', 'HOLD'],
            description: '操作类型：BUY=买入, SELL=卖出, HOLD=持有声明',
          },
          holding_type: {
            type: 'string',
            enum: ['STOCK', 'FUND', 'ETF', 'BOND', 'CRYPTO', 'OPTIONS', 'OTHER'],
            description: '持仓类型',
          },
          name: {
            type: 'string',
            description: '证券名称，如"茅台"、"沪深300ETF"',
          },
          ticker_code: {
            type: 'string',
            description: '证券代码，如"600519"、"510300"',
          },
          quantity: {
            type: 'number',
            description: '数量（股数/份数）',
          },
          price: {
            type: 'number',
            description: '单价/成本价',
          },
          currency: {
            type: 'string',
            description: '货币代码',
            default: 'CNY',
          },
          account_name: {
            type: 'string',
            description: '证券账户名称',
          },
          date: {
            type: 'string',
            description: '交易日期，格式 YYYY-MM-DD',
          },
        },
        required: ['holding_action', 'name', 'quantity'],
      },
    },
  },

  // 工具 7: 智能追问（核心！）
  {
    type: 'function',
    function: {
      name: 'ask_clarification',
      description: '当用户输入信息不足时，向用户提问获取更多信息。仅在确实缺少关键信息时使用。',
      parameters: {
        type: 'object',
        properties: {
          original_intent: {
            type: 'string',
            enum: ['TRANSACTION', 'ASSET_UPDATE', 'CREDIT_CARD_UPDATE', 'HOLDING_UPDATE', 'BUDGET', 'AUTO_PAYMENT'],
            description: '用户原始意图对应的事件类型',
          },
          question: {
            type: 'string',
            description: '要问用户的问题（用中文，友好自然的语气）',
          },
          missing_fields: {
            type: 'array',
            items: { type: 'string' },
            description: '缺少的字段列表，如 ["price", "quantity"]',
          },
          partial_data: {
            type: 'object',
            description: '已解析的部分数据，用于用户回复后合并。例如买股票时已知名称和数量，缺少价格',
          },
          picker_type: {
            type: 'string',
            enum: ['EXPENSE_ACCOUNT', 'INCOME_ACCOUNT', 'INVESTMENT_ACCOUNT', 'DAY_OF_MONTH', 'CATEGORY', 'NONE'],
            description: '前端选择器类型：EXPENSE_ACCOUNT=支出账户选择, INVESTMENT_ACCOUNT=证券账户选择, DAY_OF_MONTH=日期选择, NONE=文本输入',
          },
          suggested_options: {
            type: 'array',
            items: { type: 'string' },
            description: '建议的选项（如果适用）',
          },
        },
        required: ['original_intent', 'question', 'missing_fields', 'partial_data'],
      },
    },
  },

  // 工具 8: 无操作响应
  {
    type: 'function',
    function: {
      name: 'no_action',
      description: '当用户输入不是财务相关请求时使用（如闲聊、问候等）',
      parameters: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: '给用户的友好回复',
          },
        },
        required: ['response'],
      },
    },
  },
];

// ==================== 系统提示词 ====================

export const FUNCTION_CALLING_SYSTEM_PROMPT = `你是一个智能记账助手。根据用户输入，调用合适的函数来处理。

## 核心原则
1. 优先理解用户意图，选择正确的函数
2. 只在确实缺少**关键信息**时才调用 ask_clarification
3. 能推断的信息尽量推断（日期默认今天、货币默认 CNY、分类根据商户推断）

## 函数选择指南

### record_transaction - 记录交易（最常用！）
- "花了"、"买了"、"消费"、"付了" → EXPENSE
- "收到"、"赚了"、"工资到账" → INCOME
- "转账给"、"转了" → TRANSFER
- "还了XX信用卡" → PAYMENT
- **"信用卡消费了XX"、"信用卡刷了XX"** → EXPENSE（这是消费记录，不是信用卡配置！）

### update_asset - 资产/负债声明
- "我有XX银行卡"、"余额是XX" → BANK
- "我有XX车贷/房贷" → LOAN/MORTGAGE
- "支付宝/微信有XX" → DIGITAL_WALLET

### update_credit_card - 信用卡配置（仅用于初次添加或修改卡片信息）
- "我有XX信用卡"、"额度XX"、"已用XX" → 配置信用卡基本信息
- **注意区分**：
  - "信用卡消费了45" → record_transaction (EXPENSE)，只记录一笔消费
  - "我有一张信用卡额度68000" → update_credit_card，配置卡片信息
  - **不要同时调用两个函数！只选择一个最合适的**

### update_holding - 投资持仓（重要！）
- "买了XX股"、"建仓"、"加仓" → BUY
- "卖了XX股"、"清仓"、"减仓" → SELL
- "我持有XX股" → HOLD

### set_auto_payment - 订阅/自动扣款
- "订阅XX"、"每月XX会员"、"自动扣款"

### set_budget - 预算设置
- "预算XX"、"这个月不超过XX"

### ask_clarification - 智能追问
**追问原则：一次性问清所有缺失信息，避免多轮追问！**

**必须追问的场景：**
- TRANSACTION 缺金额："在星巴克消费" → 追问金额
- HOLDING_UPDATE 买入缺价格："买了100股茅台" → 追问买入价格
- AUTO_PAYMENT 缺扣款日："订阅Netflix每月88" → 追问每月几号扣款
- ASSET_UPDATE 贷款缺月供/还款日
- **CREDIT_CARD_UPDATE**："我有招商银行信用卡额度68000" → 缺少以下信息，应**一次性追问全部**：
  - 待还金额 (outstanding_balance)
  - 还款日 (repayment_due_date)
  - 卡号尾号 (card_identifier) - 可选但建议询问
  - 示例追问："好的，还需要几个信息：1️⃣ 当前待还金额是多少？2️⃣ 每月几号还款？3️⃣ 卡号尾号是多少（方便区分多张卡）？"

**不应追问的场景（重要！）：**
- "午饭花了30" → 信息完整，直接记录
- "工资8000" → 信息完整，直接记录
- "我的花旗银行有4000美金" → 信息完整，直接记录
- 缺少账户信息 → 不追问，让前端处理账户选择

### no_action - 非财务请求
- 闲聊、问候等

## 分类智能推断
- 星巴克/瑞幸/麦当劳 → FOOD
- 滴滴/高德/地铁 → TRANSPORT
- 淘宝/京东/拼多多 → SHOPPING
- 电费/水费/燃气 → HOUSING

## 重要提醒
1. **只调用一个函数**：每次用户输入只应调用一个最合适的函数，不要同时调用多个！
2. **一次性追问**：如果缺失多个字段，在一条消息中全部问清，不要分多次追问
3. **不要过度追问**：能推断就推断，能省略就省略
4. **持仓操作**：买入必须有价格，卖出可以不要价格（用市价）
5. **账户选择**：交易不需要追问账户，前端会处理
6. **信用卡消费≠信用卡配置**："信用卡消费了XX"是记录交易，不是配置信用卡`;

// ==================== 类型定义 ====================

export interface FunctionCallResult {
  functionName: string;
  arguments: Record<string, any>;
}

export interface ToolCallResponse {
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  content?: string;
}

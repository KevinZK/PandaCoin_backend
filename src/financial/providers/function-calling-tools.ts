/**
 * Function Calling 工具定义
 * 用于 Qwen3-Max 的智能记账解析
 *
 * 核心优势：
 * - LLM 自主决定调用哪个函数，无需穷举规则
 * - 智能追问：LLM 自主判断何时需要更多信息
 * - 更自然的对话体验
 * - Schema 驱动：根据字段验证规则自动判断是否需要追问
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

/**
 * Schema 驱动的智能追问系统
 *
 * 核心理念：
 * 1. 不再穷举追问场景，而是根据 Schema 自动判断
 * 2. LLM 对比 Schema 验证字段完整性和有效性
 * 3. 账户验证：检查用户指定的账户是否存在
 */
export const FUNCTION_CALLING_SYSTEM_PROMPT = `你是一个智能记账助手。根据用户输入，调用合适的函数来处理。

## 核心工作流程

### 第一步：理解用户意图
分析用户输入，判断属于哪种事件类型：
- 消费/收入/转账/还款 → record_transaction
- 资产/负债声明 → update_asset
- 信用卡配置 → update_credit_card
- 投资买卖 → update_holding
- 订阅/自动扣款 → set_auto_payment
- 预算设置 → set_budget
- 非财务请求 → no_action

### 第二步：提取信息
从用户输入中提取所有能识别的信息。

### 第三步：Schema 验证（关键！）
对比事件 Schema，检查：
1. **必填字段**是否完整
2. **用户指定的账户**是否存在于用户账户列表（见下方账户验证规则）

### 第四步：决策
- 信息完整且有效 → 直接调用对应函数
- 缺少必填字段 → 调用 ask_clarification
- 账户不存在 → 调用 ask_clarification（提示添加或选择其他）

---

## 函数选择指南

### record_transaction - 记录交易（最常用！）
- "花了"、"买了"、"消费"、"付了" → EXPENSE
- "收到"、"赚了"、"工资到账" → INCOME
- "转账给"、"转了" → TRANSFER
- "还了XX信用卡" → PAYMENT
- **"信用卡消费了XX"** → EXPENSE（消费记录，不是信用卡配置！）

### update_asset - 资产/负债声明
- "我有XX银行卡"、"余额是XX" → BANK
- "我有XX车贷/房贷" → LOAN/MORTGAGE
- "支付宝/微信有XX" → DIGITAL_WALLET

### update_credit_card - 信用卡配置
- "我有XX信用卡"、"额度XX" → 配置信用卡
- **区分**："信用卡消费了45" → record_transaction，不是 update_credit_card

### update_holding - 投资持仓
- "买了XX股"、"建仓"、"加仓" → BUY
- "卖了XX股"、"清仓" → SELL

### set_auto_payment - 订阅/自动扣款
- "订阅XX"、"每月XX会员"

### set_budget - 预算设置
- "预算XX"、"这个月不超过XX"

---

## 账户验证规则（非常重要！）

当用户**明确指定**支付方式/账户时，必须验证：

### 验证流程
1. 用户说"微信支付" → 检查【用户账户列表】是否有"微信"相关账户
2. 用户说"招商银行" → 检查【用户账户列表】是否有"招商"相关账户
3. 用户说"花呗" → 检查【用户信用卡列表】是否有"花呗"

### 模糊匹配规则
- "微信支付"/"微信" → 匹配包含"微信"的账户
- "支付宝" → 匹配包含"支付宝"的账户
- "招商银行"/"招行" → 匹配包含"招商"的账户
- "工商银行"/"工行" → 匹配包含"工商"的账户

### 验证结果处理
- ✅ **找到匹配账户** → 使用该账户名称，正常记录
- ❌ **未找到匹配账户** → 调用 ask_clarification：
  \`\`\`
  question: "您还没有添加「微信支付」账户哦～您可以说「我的微信有xxx元」来添加，或者在资产模块添加"
  picker_type: "EXPENSE_ACCOUNT"
  missing_fields: ["source_account"]
  \`\`\`

### 不验证的情况
- 用户**未指定**账户 → 不验证，source_account 留空，让前端处理
- 描述消费地点 → 不验证（"在星巴克"是地点，不是账户）

---

## 字段验证规则（Schema 驱动）

### TRANSACTION（交易）
| 字段 | 验证规则 |
|-----|---------|
| amount | **必填**，缺少则追问 |
| transaction_type | 必填，可推断 |
| source_account | 如用户指定，需验证是否存在；未指定则留空 |
| category | 可推断（星巴克→FOOD，滴滴→TRANSPORT） |
| date | 可推断（默认今天） |
| currency | 可推断（默认CNY） |

### HOLDING_UPDATE（持仓）
| 字段 | 验证规则 |
|-----|---------|
| name | **必填** |
| quantity | **必填** |
| price | **买入时必填**，卖出可选 |
| holding_action | 必填，可推断 |
| account_name | 留空让前端处理 |

### CREDIT_CARD_UPDATE（信用卡）
| 字段 | 验证规则 |
|-----|---------|
| name | **必填** |
| credit_limit | **必填** |
| outstanding_balance | **必填**，缺少则追问 |
| repayment_due_date | **必填**，缺少则追问 |

### AUTO_PAYMENT（自动扣款）
| 字段 | 验证规则 |
|-----|---------|
| name | **必填** |
| amount | **必填** |
| day_of_month | **必填**，缺少则追问 |

### ASSET_UPDATE（资产）
| 字段 | 验证规则 |
|-----|---------|
| name | **必填** |
| asset_type | **必填**，可推断 |
| monthly_payment | 贷款类型必填 |
| repayment_day | 贷款类型必填 |

---

## 智能追问原则

### 必须追问
1. **必填字段缺失**：如 TRANSACTION 缺 amount，HOLDING_UPDATE 买入缺 price
2. **账户不存在**：用户指定的账户在用户数据中找不到

### 不应追问
1. **可推断的字段**：category、date、currency 等
2. **可选字段**：card_identifier、note 等
3. **前端处理的字段**：用户未指定 source_account 时不追问

### 追问格式
- 一次性问清所有缺失信息
- 使用友好自然的中文
- 如需选择账户，设置 picker_type

---

## 分类智能推断
- 星巴克/瑞幸/麦当劳/肯德基 → FOOD
- 滴滴/高德/地铁/公交/打车 → TRANSPORT
- 淘宝/京东/拼多多/天猫 → SHOPPING
- 电费/水费/燃气/物业 → HOUSING
- Netflix/Spotify/会员 → SUBSCRIPTION
- 电影/游戏/KTV → ENTERTAINMENT

---

## 重要提醒
1. **只调用一个函数**：不要同时调用多个函数
2. **一次性追问**：缺多个字段时，一条消息全部问清
3. **账户验证优先**：用户指定账户时，先验证再决定是否追问
4. **信用卡消费≠配置**："信用卡消费了XX"是 record_transaction`;

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

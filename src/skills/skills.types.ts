/**
 * Skills 类型定义
 */

// 技能定义（从 SKILL.md 解析）
export interface SkillDefinition {
  name: string;
  description: string;
  contextRequired: string[];
  instructions: string;
  outputSchema: object;
  examples: SkillExample[];
}

// 技能示例
export interface SkillExample {
  input: string;
  output: object;
}

// 对话历史消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 技能上下文
export interface SkillContext {
  // 用户信息
  userId: string;

  // 账户相关
  accounts?: any[];
  creditCards?: any[];

  // 记录相关
  records?: any[];
  categories?: any[];

  // 预算相关
  budgets?: any[];

  // 投资相关
  holdings?: any[];

  // 贷款相关
  loans?: any[];
  autoPayments?: any[];

  // 时间信息
  currentDate: string;
  daysInMonth: number;

  // 多轮对话历史（用于 Function Calling 智能追问）
  conversationHistory?: ChatMessage[];

  // 其他上下文
  [key: string]: any;
}

// 技能执行请求
export interface SkillExecuteRequest {
  userMessage: string;
  skillName?: string; // 可选，不指定则自动路由
  context: SkillContext;
}

// 技能执行结果
export interface SkillExecuteResult {
  success: boolean;
  skillUsed: string;
  response: any;
  confidence: number;
  rawAiResponse?: string;
  error?: string;
}

// 技能路由结果
export interface SkillRouteResult {
  skillName: string;
  confidence: number;
  reasoning: string;
}

// 支持的技能类型
export type SkillType =
  | 'accounting'       // 记账解析
  | 'bill-analysis'    // 账单分析
  | 'budget-advisor'   // 预算顾问
  | 'investment'       // 投资分析
  | 'loan-advisor';    // 贷款顾问

// 技能元数据（用于路由）
export interface SkillMetadata {
  name: SkillType;
  description: string;
  keywords: string[];
  priority: number;
}

// 预定义的技能元数据
export const SKILL_METADATA: SkillMetadata[] = [
  {
    name: 'accounting',
    description: '记账、记录消费、收入',
    keywords: ['记账', '花了', '买了', '消费', '支出', '收入', '工资', '花费', '付款', '付了'],
    priority: 1,
  },
  {
    name: 'bill-analysis',
    description: '分析消费、账单统计、消费趋势',
    keywords: ['分析', '统计', '花了多少', '消费情况', '账单', '趋势', '报告', '总结'],
    priority: 2,
  },
  {
    name: 'budget-advisor',
    description: '预算管理、超支预警、预算建议',
    keywords: ['预算', '超支', '剩余', '还能花', '限额', '控制'],
    priority: 3,
  },
  {
    name: 'investment',
    description: '投资分析、持仓、收益、股票、基金',
    keywords: ['投资', '股票', '基金', '持仓', '收益', '盈亏', '涨', '跌', '买入', '卖出'],
    priority: 4,
  },
  {
    name: 'loan-advisor',
    description: '贷款、还款、负债、信用卡还款',
    keywords: ['贷款', '还款', '负债', '欠款', '房贷', '车贷', '信用卡', '还钱'],
    priority: 5,
  },
];

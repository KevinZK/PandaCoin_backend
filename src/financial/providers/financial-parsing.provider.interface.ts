import { FinancialEventsResponseDto } from '../dtos/financial-events.dto';

/**
 * AI Provider 抽象接口
 * 所有 AI 服务提供商必须实现此接口
 */
export interface FinancialParsingProvider {
  /**
   * Provider 名称标识
   */
  readonly name: string;

  /**
   * 解析财务语句
   * @param text 用户输入的自然语言文本
   * @param currentDate 当前日期 (YYYY-MM-DD 格式)
   * @returns 结构化的财务事件响应
   */
  parse(text: string, currentDate: string): Promise<FinancialEventsResponseDto>;
}

/**
 * Provider 配置接口
 */
export interface ProviderConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
}

/**
 * Provider 常量
 */
export const PROVIDER_NAMES = {
  GEMINI: 'Gemini',
  OPENAI: 'OpenAI',
  QWEN: 'Qwen',
} as const;

export type ProviderName = (typeof PROVIDER_NAMES)[keyof typeof PROVIDER_NAMES];

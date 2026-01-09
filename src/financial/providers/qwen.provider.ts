import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  FinancialParsingProvider,
  PROVIDER_NAMES,
} from './financial-parsing.provider.interface';
import { FinancialEventsResponseDto } from '../dtos/financial-events.dto';
import { getSystemPrompt } from './system-prompt';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * Qwen Provider (国际版)
 * 使用阿里云通义千问进行财务语句解析
 *
 * 特性：
 * - 使用 OpenAI 兼容接口
 * - 使用 JSON Object 结构化输出
 *
 * 注意：
 * - Function Calling（智能追问）由 skill-executor.service.ts 处理
 * - 此 Provider 提供通用的 JSON Object 解析接口
 * - accounting 技能通过 Skills 系统使用 Function Calling
 */
@Injectable()
export class QwenProvider implements FinancialParsingProvider {
  readonly name = PROVIDER_NAMES.QWEN;
  private readonly apiKey: string;
  // 使用 OpenAI 兼容接口以支持 JSON Schema
  private readonly endpoint =
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  private readonly model = 'qwen3-max';
  private readonly timeout = 8000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('QWEN_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('QWEN_API_KEY not configured', 'QwenProvider');
    }
  }

  async parse(
    text: string,
    currentDate: string,
  ): Promise<FinancialEventsResponseDto> {
    const systemPrompt = getSystemPrompt(currentDate);

    try {
      this.logger.debug(
        `Qwen parsing: "${text.substring(0, 50)}..."`,
        'QwenProvider',
      );

      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
          // 启用 JSON Object 结构化输出
          response_format: { type: 'json_object' },
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // OpenAI 兼容格式的响应
      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Qwen');
      }

      // JSON Object 模式下直接解析，无需清理
      const parsed = JSON.parse(content) as FinancialEventsResponseDto;

      this.logger.debug(
        `Qwen parsed ${parsed.events.length} events`,
        'QwenProvider',
      );

      return parsed;
    } catch (error) {
      this.logger.error(
        `Qwen parse failed: ${error.message}`,
        error.stack,
        'QwenProvider',
      );
      throw error;
    }
  }

  /**
   * 从响应中提取 JSON
   * 处理可能的 markdown fences 和其他非 JSON 内容
   */
  private extractJson(content: string): string {
    let cleaned = content.trim();

    // 移除 markdown fences
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // 尝试提取 JSON 对象
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // 如果没有匹配到，返回清理后的内容
    return cleaned;
  }
}

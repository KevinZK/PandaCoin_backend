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
 * 特性：需从 LLM 输出中提取 JSON（正则/字符串清洗）
 */
@Injectable()
export class QwenProvider implements FinancialParsingProvider {
  readonly name = PROVIDER_NAMES.QWEN;
  private readonly apiKey: string;
  private readonly endpoint =
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  private readonly model = 'qwen-max';
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
          input: {
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
          },
          parameters: {
            result_format: 'message',
            temperature: 0.1,
            max_tokens: 2048,
          },
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // 提取响应内容
      const content =
        response.data?.output?.choices?.[0]?.message?.content ||
        response.data?.output?.text;

      if (!content) {
        throw new Error('Empty response from Qwen');
      }

      // 清理并提取 JSON
      const cleanedContent = this.extractJson(content);
      const parsed = JSON.parse(cleanedContent) as FinancialEventsResponseDto;

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

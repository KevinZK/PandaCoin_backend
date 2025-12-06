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
 * OpenAI Provider
 * 使用 OpenAI GPT-4o-mini 进行财务语句解析
 * 特性：启用 response_format: { type: 'json_object' }
 */
@Injectable()
export class OpenAIProvider implements FinancialParsingProvider {
  readonly name = PROVIDER_NAMES.OPENAI;
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4o-mini';
  private readonly timeout = 8000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured', 'OpenAIProvider');
    }
  }

  async parse(
    text: string,
    currentDate: string,
  ): Promise<FinancialEventsResponseDto> {
    const systemPrompt = getSystemPrompt(currentDate);

    try {
      this.logger.debug(
        `OpenAI parsing: "${text.substring(0, 50)}..."`,
        'OpenAIProvider',
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
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2048,
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
      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // 清理可能的 markdown fences
      const cleanedContent = this.cleanJsonResponse(content);
      const parsed = JSON.parse(cleanedContent) as FinancialEventsResponseDto;

      this.logger.debug(
        `OpenAI parsed ${parsed.events.length} events`,
        'OpenAIProvider',
      );

      return parsed;
    } catch (error) {
      this.logger.error(
        `OpenAI parse failed: ${error.message}`,
        error.stack,
        'OpenAIProvider',
      );
      throw error;
    }
  }

  /**
   * 清理 JSON 响应中的 markdown fences
   */
  private cleanJsonResponse(content: string): string {
    // 移除 ```json ... ``` 或 ``` ... ```
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }
}

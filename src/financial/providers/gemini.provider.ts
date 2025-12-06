import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  FinancialParsingProvider,
  PROVIDER_NAMES,
} from './financial-parsing.provider.interface';
import { FinancialEventsResponseDto } from '../dtos/financial-events.dto';
import {
  getSystemPrompt,
  FINANCIAL_EVENTS_JSON_SCHEMA,
} from './system-prompt';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * Gemini AI Provider
 * 使用 Google Gemini 2.5 Pro 进行财务语句解析
 * 特性：原生 JSON Schema 支持，无需后处理
 */
@Injectable()
export class GeminiProvider implements FinancialParsingProvider {
  readonly name = PROVIDER_NAMES.GEMINI;
  private readonly apiKey: string;
  private readonly endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent';
  private readonly timeout = 8000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured', 'GeminiProvider');
    }
  }

  async parse(
    text: string,
    currentDate: string,
  ): Promise<FinancialEventsResponseDto> {
    const systemPrompt = getSystemPrompt(currentDate);

    try {
      this.logger.debug(
        `Gemini parsing: "${text.substring(0, 50)}..."`,
        'GeminiProvider',
      );

      const response = await axios.post(
        `${this.endpoint}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nUser input: ${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: FINANCIAL_EVENTS_JSON_SCHEMA,
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // 提取响应内容
      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      // Gemini 使用 responseSchema 会直接返回 JSON，无需额外处理
      const parsed = JSON.parse(content) as FinancialEventsResponseDto;

      this.logger.debug(
        `Gemini parsed ${parsed.events.length} events`,
        'GeminiProvider',
      );

      return parsed;
    } catch (error) {
      this.logger.error(
        `Gemini parse failed: ${error.message}`,
        error.stack,
        'GeminiProvider',
      );
      throw error;
    }
  }
}

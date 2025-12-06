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
 * Gemini AI Provider (Optimized for JSON Parsing)
 */
@Injectable()
export class GeminiProvider implements FinancialParsingProvider {
  readonly name = PROVIDER_NAMES.GEMINI;
  private readonly apiKey: string;
  private readonly endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  private readonly timeout = 10000;

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
    // 获取包含所有规则和示例的完整 Prompt
    const systemPrompt = getSystemPrompt(currentDate);

    try {
      this.logger.debug(
        `Gemini parsing: "${text.substring(0, 50)}..."`,
        'GeminiProvider',
      );

      const response = await axios.post(
        `${this.endpoint}?key=${this.apiKey}`,
        {
          // 🛠️ 修复点 1: 使用 systemInstruction 字段隔离规则和用户输入
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          // 传入用户查询
          contents: [
            {
              role: 'user', // 明确指出这是用户输入
              parts: [{ text: `User input: ${text}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: FINANCIAL_EVENTS_JSON_SCHEMA,
            // 🛠️ 修复点 2: 降低温度以确保确定性和准确性
            temperature: 0.0, 
            maxOutputTokens: 2048,
            topP: 0.95, 
            // 禁用思考功能保持不变
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
          // Safety Settings 保持不变
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
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

      // 记录原始响应（用于调试）
      this.logger.debug(
        `Gemini raw response: ${content}`,
        'GeminiProvider',
      );

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
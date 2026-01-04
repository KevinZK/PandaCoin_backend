import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkillLoaderService } from './skill-loader.service';
import { SkillRouterService } from './skill-router.service';
import {
  SkillContext,
  SkillDefinition,
  SkillExecuteRequest,
  SkillExecuteResult,
  SkillType,
} from './skills.types';
import { LoggerService } from '../common/logger/logger.service';

/**
 * 技能执行器 - 执行技能并返回结果
 */
@Injectable()
export class SkillExecutorService {
  constructor(
    private configService: ConfigService,
    private skillLoader: SkillLoaderService,
    private skillRouter: SkillRouterService,
    private logger: LoggerService,
  ) {}

  /**
   * 执行技能
   */
  async execute(request: SkillExecuteRequest): Promise<SkillExecuteResult> {
    this.logger.debug(`🚀 执行技能请求: ${request.userMessage}`, 'SkillExecutor');

    try {
      // 1. 确定使用哪个技能
      let skillName = request.skillName;
      let routeConfidence = 1.0;

      if (!skillName) {
        const routeResult = await this.skillRouter.routeMessage(request.userMessage);
        skillName = routeResult.skillName;
        routeConfidence = routeResult.confidence;
        this.logger.debug(
          `📍 路由到技能: ${skillName} (${routeConfidence})`,
          'SkillExecutor',
        );
      }

      // 2. 获取技能定义
      const skill = this.skillLoader.getSkill(skillName as SkillType);
      if (!skill) {
        return {
          success: false,
          skillUsed: skillName,
          response: null,
          confidence: 0,
          error: `技能不存在: ${skillName}`,
        };
      }

      // 3. 构建 Prompt 并调用 AI
      const result = await this.executeSkillWithAI(
        skill,
        request.userMessage,
        request.context,
      );

      return {
        success: true,
        skillUsed: skillName,
        response: result.response,
        confidence: result.confidence * routeConfidence,
        rawAiResponse: result.rawResponse,
      };
    } catch (error) {
      this.logger.error('技能执行失败', error.stack, 'SkillExecutor');
      return {
        success: false,
        skillUsed: request.skillName || 'unknown',
        response: null,
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * 使用 AI 执行技能（支持 Qwen）
   */
  private async executeSkillWithAI(
    skill: SkillDefinition,
    userMessage: string,
    context: SkillContext,
  ): Promise<{ response: any; confidence: number; rawResponse: string }> {
    const qwenApiKey = this.configService.get<string>('QWEN_API_KEY');

    // 构建完整的 Prompt
    const prompt = this.buildPrompt(skill, userMessage, context);

    if (!qwenApiKey) {
      // 没有 API Key，返回模拟数据
      this.logger.warn('⚠️ 使用模拟数据（未配置 QWEN_API_KEY）', 'SkillExecutor');
      return this.getMockResponse(skill, userMessage, context);
    }

    try {
      const response = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${qwenApiKey}`,
          },
          body: JSON.stringify({
            model: 'qwen-max',
            input: {
              messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage },
              ],
            },
            parameters: {
              result_format: 'message',
              temperature: 0.1,
              max_tokens: 2048,
            },
          }),
        },
      );

      const data = await response.json();
      const aiText =
        data?.output?.choices?.[0]?.message?.content ||
        data?.output?.text ||
        '';

      this.logger.debug(`Qwen 返回: ${aiText.substring(0, 200)}...`, 'SkillExecutor');

      // 提取 JSON
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          response: result,
          confidence: 0.85,
          rawResponse: aiText,
        };
      }

      // 如果无法解析 JSON，返回原始文本
      return {
        response: { summary: aiText },
        confidence: 0.5,
        rawResponse: aiText,
      };
    } catch (error) {
      this.logger.error('Qwen 调用失败', error.stack, 'SkillExecutor');
      return this.getMockResponse(skill, userMessage, context);
    }
  }

  /**
   * 构建 AI Prompt
   */
  private buildPrompt(
    skill: SkillDefinition,
    userMessage: string,
    context: SkillContext,
  ): string {
    // 构建上下文数据部分
    const contextData = this.formatContext(skill.contextRequired, context);

    // 构建示例部分
    const examples = skill.examples
      .map(
        (ex, i) =>
          `示例${i + 1}:\n输入: "${ex.input}"\n输出: ${JSON.stringify(ex.output, null, 2)}`,
      )
      .join('\n\n');

    return `${skill.instructions}

## 当前上下文数据
${contextData}

## 输出格式
请严格按照以下 JSON Schema 返回结果：
${JSON.stringify(skill.outputSchema, null, 2)}

## 示例
${examples}

## 用户输入
"${userMessage}"

请分析用户输入，结合上下文数据，返回符合 Output Schema 的 JSON 结果。只返回 JSON，不要其他内容。`;
  }

  /**
   * 格式化上下文数据
   */
  private formatContext(required: string[], context: SkillContext): string {
    const parts: string[] = [];

    parts.push(`当前日期: ${context.currentDate}`);
    parts.push(`当月天数: ${context.daysInMonth}`);

    for (const key of required) {
      if (context[key] !== undefined) {
        if (Array.isArray(context[key])) {
          parts.push(`${key}: ${JSON.stringify(context[key], null, 2)}`);
        } else if (typeof context[key] === 'object') {
          parts.push(`${key}: ${JSON.stringify(context[key], null, 2)}`);
        } else {
          parts.push(`${key}: ${context[key]}`);
        }
      }
    }

    return parts.join('\n');
  }

  /**
   * 获取模拟响应（用于测试或 API 不可用时）
   */
  private getMockResponse(
    skill: SkillDefinition,
    userMessage: string,
    context: SkillContext,
  ): { response: any; confidence: number; rawResponse: string } {
    // 根据技能类型返回不同的模拟数据
    switch (skill.name) {
      case 'accounting':
        return {
          response: {
            success: true,
            data: {
              type: 'EXPENSE',
              amount: this.extractAmount(userMessage),
              category: '其他',
              date: context.currentDate,
              confidence: 0.7,
            },
            needsConfirmation: true,
            message: '已识别消费记录，请确认',
          },
          confidence: 0.7,
          rawResponse: '模拟数据',
        };

      case 'bill-analysis':
        return {
          response: {
            analysisType: 'overview',
            summary: '本月消费数据正在分析中...',
            data: {
              totalExpense: context.records?.reduce(
                (sum: number, r: any) => sum + (r.type === 'EXPENSE' ? r.amount : 0),
                0,
              ) || 0,
            },
            suggestions: ['建议持续记录消费以获得更准确的分析'],
          },
          confidence: 0.6,
          rawResponse: '模拟数据',
        };

      case 'budget-advisor':
        return {
          response: {
            overallStatus: 'healthy',
            summary: '预算状况良好',
            data: {
              totalBudget: context.budgets?.reduce(
                (sum: number, b: any) => sum + b.amount,
                0,
              ) || 0,
            },
            suggestions: ['继续保持良好的消费习惯'],
          },
          confidence: 0.6,
          rawResponse: '模拟数据',
        };

      case 'investment':
        return {
          response: {
            analysisType: 'overview',
            summary: '投资组合分析中...',
            data: {
              totalMarketValue: context.holdings?.reduce(
                (sum: number, h: any) => sum + (h.quantity * h.currentPrice),
                0,
              ) || 0,
            },
            suggestions: ['建议定期检视投资组合'],
          },
          confidence: 0.6,
          rawResponse: '模拟数据',
        };

      case 'loan-advisor':
        return {
          response: {
            analysisType: 'overview',
            summary: '负债分析中...',
            data: {
              totalDebt: context.loans?.reduce(
                (sum: number, l: any) => sum + Math.abs(l.balance),
                0,
              ) || 0,
            },
            suggestions: ['建议按时还款保持良好信用'],
          },
          confidence: 0.6,
          rawResponse: '模拟数据',
        };

      default:
        return {
          response: {
            summary: '无法处理该请求',
          },
          confidence: 0.3,
          rawResponse: '模拟数据',
        };
    }
  }

  /**
   * 从文本中提取金额
   */
  private extractAmount(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
}

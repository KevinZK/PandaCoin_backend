import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkillLoaderService } from './skill-loader.service';
import {
  SkillRouteResult,
  SkillType,
  SKILL_METADATA,
} from './skills.types';
import { LoggerService } from '../common/logger/logger.service';

/**
 * 技能路由器 - 根据用户输入选择合适的技能
 */
@Injectable()
export class SkillRouterService {
  constructor(
    private configService: ConfigService,
    private skillLoader: SkillLoaderService,
    private logger: LoggerService,
  ) {}

  /**
   * 路由用户消息到合适的技能
   */
  async routeMessage(userMessage: string): Promise<SkillRouteResult> {
    this.logger.debug(`🔀 路由消息: ${userMessage}`, 'SkillRouter');

    // 1. 首先尝试关键词匹配（快速路径）
    const keywordMatch = this.matchByKeywords(userMessage);
    if (keywordMatch.confidence > 0.8) {
      this.logger.debug(
        `✅ 关键词匹配: ${keywordMatch.skillName} (${keywordMatch.confidence})`,
        'SkillRouter',
      );
      return keywordMatch;
    }

    // 2. 如果关键词匹配置信度不高，使用 AI 路由
    const aiMatch = await this.routeByAI(userMessage);
    if (aiMatch.confidence > keywordMatch.confidence) {
      this.logger.debug(
        `✅ AI路由: ${aiMatch.skillName} (${aiMatch.confidence})`,
        'SkillRouter',
      );
      return aiMatch;
    }

    // 3. 返回置信度较高的结果
    return keywordMatch.confidence > 0.5 ? keywordMatch : aiMatch;
  }

  /**
   * 基于关键词匹配技能
   */
  private matchByKeywords(userMessage: string): SkillRouteResult {
    const message = userMessage.toLowerCase();
    let bestMatch: SkillRouteResult = {
      skillName: 'accounting',
      confidence: 0.3,
      reasoning: '默认使用记账技能',
    };

    for (const metadata of SKILL_METADATA) {
      let matchCount = 0;
      let matchedKeywords: string[] = [];

      for (const keyword of metadata.keywords) {
        if (message.includes(keyword)) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      if (matchCount > 0) {
        // 计算置信度：匹配的关键词数量 / 总关键词数量的比例
        const confidence = Math.min(0.5 + matchCount * 0.2, 0.95);

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            skillName: metadata.name,
            confidence,
            reasoning: `匹配关键词: ${matchedKeywords.join(', ')}`,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * 使用 AI 进行技能路由
   */
  private async routeByAI(userMessage: string): Promise<SkillRouteResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey || apiKey === 'your-gemini-api-key') {
      // 没有配置 API Key，返回低置信度结果
      return {
        skillName: 'accounting',
        confidence: 0.3,
        reasoning: 'AI路由不可用，使用默认技能',
      };
    }

    try {
      const skillsSummary = this.skillLoader.getSkillsSummary();
      const skillList = skillsSummary
        .map((s) => `- ${s.name}: ${s.description}`)
        .join('\n');

      const prompt = `你是一个意图分类器。根据用户的消息，判断应该使用哪个技能来处理。

可用技能:
${skillList}

用户消息: "${userMessage}"

请返回JSON格式:
{
  "skillName": "技能名称",
  "confidence": 0.0-1.0之间的置信度,
  "reasoning": "选择原因"
}

只返回JSON，不要其他内容。`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 256,
            },
          }),
        },
      );

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // 提取 JSON
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          skillName: result.skillName as SkillType,
          confidence: result.confidence || 0.7,
          reasoning: result.reasoning || 'AI路由',
        };
      }
    } catch (error) {
      this.logger.error('AI路由失败', error.stack, 'SkillRouter');
    }

    return {
      skillName: 'accounting',
      confidence: 0.3,
      reasoning: 'AI路由失败，使用默认技能',
    };
  }

  /**
   * 验证技能是否存在
   */
  isValidSkill(skillName: string): boolean {
    return this.skillLoader.getSkill(skillName as SkillType) !== undefined;
  }
}

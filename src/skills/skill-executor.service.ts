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
import { FINANCIAL_TOOLS, FUNCTION_CALLING_SYSTEM_PROMPT } from '../financial/providers/function-calling-tools';

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
   * 使用 AI 执行技能
   *
   * 架构说明：
   * - accounting 技能使用 Function Calling 模式（智能追问）
   * - 其他技能使用 JSON Object 模式（SKILL.md 规则）
   *
   * Function Calling 优势：
   * - LLM 自主决定何时追问，无需穷举规则
   * - 更自然的对话体验
   */
  private async executeSkillWithAI(
    skill: SkillDefinition,
    userMessage: string,
    context: SkillContext,
  ): Promise<{ response: any; confidence: number; rawResponse: string }> {
    const qwenApiKey = this.configService.get<string>('QWEN_API_KEY');
    const useFunctionCalling = this.configService.get<string>('USE_FUNCTION_CALLING', 'true') === 'true';

    // 对于 accounting 技能，使用 Function Calling（智能追问）
    if (skill.name === 'accounting' && useFunctionCalling && qwenApiKey) {
      return this.executeWithFunctionCalling(userMessage, context, qwenApiKey);
    }

    // 其他技能使用 JSON Object 模式
    const prompt = this.buildPrompt(skill, userMessage, context);

    if (!qwenApiKey) {
      // 没有 API Key，返回模拟数据
      this.logger.warn('⚠️ 使用模拟数据（未配置 QWEN_API_KEY）', 'SkillExecutor');
      return this.getMockResponse(skill, userMessage, context);
    }

    try {
      // 使用 OpenAI 兼容接口 + JSON Object 结构化输出
      const response = await fetch(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${qwenApiKey}`,
          },
          body: JSON.stringify({
            model: 'qwen3-max',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' },
          }),
        },
      );

      const data = await response.json();
      // OpenAI 兼容格式的响应
      const aiText = data?.choices?.[0]?.message?.content || '';

      this.logger.debug(`Qwen 返回: ${aiText.substring(0, 200)}...`, 'SkillExecutor');

      // JSON Object 模式下直接解析
      if (aiText) {
        const result = JSON.parse(aiText);
        return {
          response: result,
          confidence: 0.85,
          rawResponse: aiText,
        };
      }

      // 空响应
      return {
        response: { summary: '' },
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
   * 使用 Function Calling 执行（智能追问模式）
   *
   * 优势：
   * - LLM 自主决定何时调用 ask_clarification
   * - 不需要在 prompt 中穷举所有追问场景
   * - 更自然的对话体验
   */
  private async executeWithFunctionCalling(
    userMessage: string,
    context: SkillContext,
    apiKey: string,
  ): Promise<{ response: any; confidence: number; rawResponse: string }> {
    try {
      this.logger.debug('🔧 使用 Function Calling 模式', 'SkillExecutor');

      // 构建消息列表，包含对话历史
      const accountsList = context.accounts && context.accounts.length > 0
        ? context.accounts.map((a: any) => `- ${a.name} (${a.type})`).join('\n')
        : '（用户暂无账户）';

      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: `${FUNCTION_CALLING_SYSTEM_PROMPT}\n\n---\n\n## 当前上下文\n\n当前日期: ${context.currentDate}\n\n### 【用户账户列表】\n${accountsList}`,
        },
      ];

      // 添加对话历史（如果有）
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        for (const msg of context.conversationHistory) {
          messages.push({ role: msg.role, content: msg.content });
        }
        this.logger.debug(`📜 包含 ${context.conversationHistory.length} 条对话历史`, 'SkillExecutor');
      }

      // 添加当前用户消息
      messages.push({ role: 'user', content: userMessage });

      const response = await fetch(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'qwen3-max',
            messages,
            tools: FINANCIAL_TOOLS,
            tool_choice: 'auto',
            temperature: 0.1,
            max_tokens: 2048,
          }),
        },
      );

      const data = await response.json();
      const message = data?.choices?.[0]?.message;

      this.logger.debug(`Function Calling 响应: ${JSON.stringify(message).substring(0, 300)}...`, 'SkillExecutor');

      // 检查是否有 tool_calls
      if (message?.tool_calls && message.tool_calls.length > 0) {
        let events = this.convertToolCallsToEvents(message.tool_calls, context.currentDate);
        
        this.logger.debug(`转换后的事件: ${JSON.stringify(events)}`, 'SkillExecutor');
        this.logger.debug(`用户账户列表: ${JSON.stringify(context.accounts)}`, 'SkillExecutor');
        
        // 后处理：验证用户指定的账户是否存在
        events = this.validateAccountsInEvents(events, context.accounts || []);
        
        this.logger.debug(`验证后的事件: ${JSON.stringify(events)}`, 'SkillExecutor');
        
        return {
          response: events,
          confidence: 0.9,
          rawResponse: JSON.stringify(message),
        };
      }

      // 如果没有 tool_calls，尝试解析 content
      if (message?.content) {
        try {
          const parsed = JSON.parse(message.content);
          return {
            response: parsed,
            confidence: 0.85,
            rawResponse: message.content,
          };
        } catch {
          return {
            response: { events: [] },
            confidence: 0.5,
            rawResponse: message.content,
          };
        }
      }

      return {
        response: { events: [] },
        confidence: 0.5,
        rawResponse: '',
      };
    } catch (error) {
      this.logger.error('Function Calling 失败', error.stack, 'SkillExecutor');
      throw error;
    }
  }

  /**
   * 将 tool_calls 转换为事件格式
   */
  private convertToolCallsToEvents(
    toolCalls: Array<{ function: { name: string; arguments: string } }>,
    currentDate: string,
  ): { events: any[] } {
    const events = [];

    for (const toolCall of toolCalls) {
      const funcName = toolCall.function.name;
      let args: Record<string, any>;

      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        this.logger.warn(`解析 tool arguments 失败: ${toolCall.function.arguments}`, 'SkillExecutor');
        continue;
      }

      switch (funcName) {
        case 'record_transaction':
          events.push({
            event_type: 'TRANSACTION',
            data: {
              transaction_type: args.transaction_type || 'EXPENSE',
              amount: args.amount,
              currency: args.currency || 'CNY',
              category: args.category || 'OTHER',
              note: args.note,
              date: args.date || currentDate,
              source_account: args.source_account,
              target_account: args.target_account,
              card_identifier: args.card_identifier,
            },
          });
          break;

        case 'update_asset':
          events.push({
            event_type: 'ASSET_UPDATE',
            data: {
              asset_type: args.asset_type || 'BANK',
              name: args.name,
              amount: args.amount,
              currency: args.currency || 'CNY',
              institution_name: args.institution_name,
              card_identifier: args.card_identifier,
              loan_term_months: args.loan_term_months,
              interest_rate: args.interest_rate,
              monthly_payment: args.monthly_payment,
              repayment_day: args.repayment_day,
              auto_repayment: args.auto_repayment,
              source_account: args.source_account,
              date: currentDate,
            },
          });
          break;

        case 'update_credit_card':
          events.push({
            event_type: 'CREDIT_CARD_UPDATE',
            data: {
              name: args.name,
              institution_name: args.institution_name,
              credit_limit: args.credit_limit,
              outstanding_balance: args.outstanding_balance,
              repayment_due_date: args.repayment_due_date,
              card_identifier: args.card_identifier,
              auto_repayment: args.auto_repayment,
              repayment_type: args.repayment_type,
              source_account: args.source_account,
              date: currentDate,
            },
          });
          break;

        case 'update_holding':
          events.push({
            event_type: 'HOLDING_UPDATE',
            data: {
              holding_action: args.holding_action || 'BUY',
              holding_type: args.holding_type || 'STOCK',
              name: args.name,
              ticker_code: args.ticker_code,
              quantity: args.quantity,
              price: args.price,
              currency: args.currency || 'CNY',
              account_name: args.account_name,
              date: args.date || currentDate,
            },
          });
          break;

        case 'set_budget':
          events.push({
            event_type: 'BUDGET',
            data: {
              budget_action: 'CREATE_BUDGET',
              name: args.name,
              amount: args.amount,
              currency: args.currency || 'CNY',
              category: args.category,
            },
          });
          break;

        case 'set_auto_payment':
          events.push({
            event_type: 'AUTO_PAYMENT',
            data: {
              name: args.name,
              amount: args.amount,
              payment_type: args.payment_type || 'SUBSCRIPTION',
              day_of_month: args.day_of_month,
              source_account: args.source_account,
              category: args.category || 'SUBSCRIPTION',
            },
          });
          break;

        case 'ask_clarification':
          events.push({
            event_type: 'NEED_MORE_INFO',
            data: {
              original_intent: args.original_intent,
              question: args.question,
              missing_fields: args.missing_fields,
              partial_data: args.partial_data,
              picker_type: args.picker_type,
              suggested_options: args.suggested_options,
            },
          });
          break;

        case 'no_action':
          events.push({
            event_type: 'NULL_STATEMENT',
            data: {
              error_message: args.response,
            },
          });
          break;

        default:
          this.logger.warn(`未知函数: ${funcName}`, 'SkillExecutor');
      }
    }

    return { events };
  }

  /**
   * 验证事件中用户指定的账户是否存在
   * 如果用户明确指定了账户（如"微信支付"）但账户不存在，转换为 NEED_MORE_INFO
   */
  private validateAccountsInEvents(
    result: { events: any[] },
    userAccounts: Array<{ name: string; type: string }>,
  ): { events: any[] } {
    const validatedEvents: any[] = [];

    for (const event of result.events) {
      if (event.event_type === 'TRANSACTION' && event.data?.source_account) {
        const specifiedAccount = event.data.source_account;
        
        // 检查用户是否有匹配的账户
        const accountExists = this.findMatchingAccount(specifiedAccount, userAccounts);
        
        if (!accountExists) {
          // 账户不存在，转换为 NEED_MORE_INFO
          this.logger.debug(`账户验证: "${specifiedAccount}" 不存在于用户账户列表`, 'SkillExecutor');
          
          // 检查用户是否有任何可选账户
          const hasAnyAccounts = userAccounts.length > 0;
          
          if (hasAnyAccounts) {
            // 有其他账户可选，显示选择器
            validatedEvents.push({
              event_type: 'NEED_MORE_INFO',
              data: {
                original_intent: 'TRANSACTION',
                question: `您还没有添加「${specifiedAccount}」账户哦～您可以说「我的${specifiedAccount}有xxx元」来添加，或者从下方选择其他账户`,
                missing_fields: ['source_account'],
                picker_type: event.data.transaction_type === 'INCOME' ? 'INCOME_ACCOUNT' : 'EXPENSE_ACCOUNT',
                partial_data: {
                  transaction_type: event.data.transaction_type,
                  amount: event.data.amount,
                  currency: event.data.currency,
                  category: event.data.category,
                  note: event.data.note,
                  date: event.data.date,
                },
              },
            });
          } else {
            // 没有任何账户，提示用户先创建账户，不显示选择器
            validatedEvents.push({
              event_type: 'NEED_MORE_INFO',
              data: {
                original_intent: 'TRANSACTION',
                question: `您还没有添加任何账户哦～请先说「我的${specifiedAccount}有xxx元」来添加账户，然后再记账`,
                missing_fields: ['source_account'],
                picker_type: 'TEXT_INPUT', // 使用文本输入而非选择器
                partial_data: {
                  transaction_type: event.data.transaction_type,
                  amount: event.data.amount,
                  currency: event.data.currency,
                  category: event.data.category,
                  note: event.data.note,
                  date: event.data.date,
                },
              },
            });
          }
          continue;
        }
      }
      
      validatedEvents.push(event);
    }

    return { events: validatedEvents };
  }

  /**
   * 模糊匹配账户名称
   */
  private findMatchingAccount(
    specifiedName: string,
    userAccounts: Array<{ name: string; type: string }>,
  ): boolean {
    if (!specifiedName || userAccounts.length === 0) return false;

    const normalized = specifiedName.toLowerCase().replace(/支付|钱包|账户|卡/g, '');
    
    // 常见别名映射
    const aliasMap: Record<string, string[]> = {
      '微信': ['微信', 'wechat', 'weixin'],
      '支付宝': ['支付宝', 'alipay', 'zhifubao'],
      '招商': ['招商', '招行', 'cmb'],
      '工商': ['工商', '工行', 'icbc'],
      '建设': ['建设', '建行', 'ccb'],
      '农业': ['农业', '农行', 'abc'],
      '中国银行': ['中国银行', '中行', 'boc'],
      '交通': ['交通', '交行', 'bocom'],
      '花呗': ['花呗', 'huabei'],
    };

    for (const account of userAccounts) {
      const accountName = account.name.toLowerCase();
      
      // 直接包含匹配
      if (accountName.includes(normalized) || normalized.includes(accountName.replace(/支付|钱包|账户|卡/g, ''))) {
        return true;
      }
      
      // 别名匹配
      for (const [key, aliases] of Object.entries(aliasMap)) {
        if (aliases.some(a => normalized.includes(a))) {
          if (aliases.some(a => accountName.includes(a))) {
            return true;
          }
        }
      }
    }

    return false;
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

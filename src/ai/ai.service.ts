import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/logger/logger.service';

// AI解析结果接口
export interface ParsedTransaction {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  category: string;
  accountName: string;
  description: string;
  date?: string;
  confidence?: number;
}

@Injectable()
export class AiService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  /**
   * 核心功能: 使用Gemini AI解析语音文本为结构化记账数据
   */
  async parseVoiceToRecords(
    text: string,
    userAccounts: string[],
  ): Promise<{
    records: ParsedTransaction[];
    rawResponse: string;
  }> {
    const systemPrompt = this.buildPrompt(userAccounts);

    try {
      // 调用Gemini API
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      
      this.logger.debug('🤖 AI解析开始', 'AiService');
      this.logger.debug(`输入文本: ${text}`, 'AiService');
      
      if (!apiKey || apiKey === 'your-gemini-api-key') {
        this.logger.warn('⚠️  使用模拟AI数据（未配置真实API Key）', 'AiService');
        const result = this.mockParse(text);
        this.logger.debug(`✅ 模拟解析完成: ${result.records.length}条记录`, 'AiService');
        return result;
      }

      // 使用稳定的 gemini-2.5-flash 模型
      // 文档：https://ai.google.dev/gemini-api/docs/text-generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n用户输入: ${text}`,
              }],
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
              // 禁用思考功能以加快响应（简单任务不需要思考）
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        },
      );

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      
      // 提取JSON
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
      const records: ParsedTransaction[] = JSON.parse(jsonStr);

      return {
        records,
        rawResponse: aiText,
      };
    } catch (error) {
      this.logger.error('❌ AI解析失败，使用降级方案', error.stack, 'AiService');
      this.logger.logAiCall('Gemini', 'gemini-pro', text, undefined, error);
      // 失败时返回模拟数据
      return this.mockParse(text);
    }
  }

  /**
   * 构建AI Prompt
   */
  private buildPrompt(userAccounts: string[]): string {
    const now = new Date().toISOString();
    const accountList = userAccounts.join('、');

    return `你是一个专业的记账助手。请将用户的自然语言描述转化为结构化的记账JSON数据。

当前时间: ${now}
用户的账户: [${accountList}] (如果用户未指定账户,默认使用"支付宝")

请严格输出JSON数组格式(不要包含Markdown代码块):
[
  {
    "type": "EXPENSE" | "INCOME" | "TRANSFER",
    "amount": 数字,
    "category": "餐饮|交通|购物|娱乐|医疗|住房|教育|通讯|运动|美容|旅行|宠物|工资|奖金|理财|兼职|红包|其他",
    "accountName": "账户名称",
    "description": "简短描述",
    "date": "ISO日期字符串",
    "confidence": 0-1之间的置信度
  }
]

智能识别规则:
1. 支持一句话多笔记账,如"早饭15块,打车30元" -> 两条记录
2. 时间词汇识别: "昨天"、"上周"、"前天"等自动计算日期
3. 分类自动匹配: "买菜"->餐饮, "滴滴"->交通, "看病"->医疗
4. 金额识别: 支持"块"、"元"、"￥"等多种表达
5. 账户匹配: "微信"、"支付宝"、"招行"等自动映射到用户账户

示例:
输入: "刚才早饭吃了15块,然后打车花了35"
输出:
[
  {
    "type": "EXPENSE",
    "amount": 15,
    "category": "餐饮",
    "accountName": "支付宝",
    "description": "早饭",
    "date": "${now}",
    "confidence": 0.95
  },
  {
    "type": "EXPENSE",
    "amount": 35,
    "category": "交通",
    "accountName": "支付宝",
    "description": "打车",
    "date": "${now}",
    "confidence": 0.92
  }
]`;
  }

  /**
   * 模拟解析(用于开发测试)
   */
  private mockParse(text: string): {
    records: ParsedTransaction[];
    rawResponse: string;
  } {
    // 简单的模拟逻辑
    const records: ParsedTransaction[] = [];
    
    // 检测金额
    const amountMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|￥)?/g);
    
    if (amountMatches && amountMatches.length > 0) {
      amountMatches.forEach((match, index) => {
        const amount = parseFloat(match.replace(/[^0-9.]/g, ''));
        
        records.push({
          type: 'EXPENSE',
          amount,
          category: this.guessCategory(text),
          accountName: '支付宝',
          description: text.substring(0, 20),
          date: new Date().toISOString(),
          confidence: 0.7,
        });
      });
    }

    return {
      records,
      rawResponse: `模拟解析: ${text}`,
    };
  }

  /**
   * 简单的分类猜测
   */
  private guessCategory(text: string): string {
    const keywords = {
      餐饮: ['吃', '饭', '餐', '喝', '菜', '外卖', '早餐', '午餐', '晚餐'],
      交通: ['打车', '滴滴', '地铁', '公交', '出租', '车费'],
      购物: ['买', '购', '淘宝', '京东', '商品'],
      娱乐: ['电影', '游戏', '唱歌', 'KTV'],
      医疗: ['看病', '医院', '药'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some((word) => text.includes(word))) {
        return category;
      }
    }

    return '其他';
  }
}

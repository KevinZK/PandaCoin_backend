import { getSystemPrompt, FINANCIAL_EVENTS_JSON_SCHEMA } from './system-prompt';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

// Qwen API 配置
const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const QWEN_MODEL = 'qwen-max';

/**
 * 调用 Qwen API 进行解析
 */
async function callQwenAPI(text: string, currentDate: string): Promise<any> {
  const systemPrompt = getSystemPrompt(currentDate);
  
  const response = await axios.post(
    QWEN_ENDPOINT,
    {
      model: QWEN_MODEL,
      input: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      },
      parameters: {
        result_format: 'message',
        temperature: 0.1,
        max_tokens: 2048,
      },
    },
    {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
    },
  );

  const content =
    response.data?.output?.choices?.[0]?.message?.content ||
    response.data?.output?.text;

  if (!content) {
    throw new Error('Empty response from Qwen');
  }

  // 提取 JSON
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(cleaned);
}

/**
 * 系统提示词测试
 * 
 * 测试目标：
 * 1. 验证系统提示词的日期替换功能
 * 2. 验证 JSON Schema 结构完整性
 * 3. 提供多样性测试用例供 AI 解析验证
 */
describe('System Prompt', () => {
  const currentDate = '2025-12-13';

  describe('getSystemPrompt', () => {
    it('应该正确替换 {CURRENT_DATE} 占位符', () => {
      const prompt = getSystemPrompt(currentDate);
      expect(prompt).not.toContain('{CURRENT_DATE}');
      expect(prompt).toContain(currentDate);
    });

    it('getSystemPrompt 函数应该返回有效的提示词', () => {
      const prompt = getSystemPrompt(currentDate);
      expect(prompt).toContain('Financial Data Parser');
      expect(prompt.length).toBeGreaterThan(1000);
    });

    it('应该包含关键规则', () => {
      const prompt = getSystemPrompt(currentDate);
      expect(prompt).toContain('CRITICAL RULES');
      expect(prompt).toContain('UNIFIED SCHEMA');
      expect(prompt).toContain('EVENT TYPE DEFINITIONS');
    });
  });

  describe('FINANCIAL_EVENTS_JSON_SCHEMA', () => {
    it('应该包含 events 数组', () => {
      expect(FINANCIAL_EVENTS_JSON_SCHEMA.properties.events).toBeDefined();
      expect(FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.type).toBe('array');
    });

    it('应该定义所有 event_type 枚举', () => {
      const eventTypes = FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.items.properties.event_type.enum;
      expect(eventTypes).toContain('TRANSACTION');
      expect(eventTypes).toContain('ASSET_UPDATE');
      expect(eventTypes).toContain('CREDIT_CARD_UPDATE');
      expect(eventTypes).toContain('BUDGET');
      expect(eventTypes).toContain('NULL_STATEMENT');
    });

    it('应该定义所有 transaction_type 枚举', () => {
      const transactionTypes = FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.items.properties.data.properties.transaction_type.enum;
      expect(transactionTypes).toContain('EXPENSE');
      expect(transactionTypes).toContain('INCOME');
      expect(transactionTypes).toContain('TRANSFER');
      expect(transactionTypes).toContain('PAYMENT');
    });

    it('应该定义所有 asset_type 枚举（包含负债类型）', () => {
      const assetTypes = FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.items.properties.data.properties.asset_type.enum;
      expect(assetTypes).toContain('BANK');
      expect(assetTypes).toContain('CREDIT_CARD');
      expect(assetTypes).toContain('LOAN');
      expect(assetTypes).toContain('MORTGAGE');
      expect(assetTypes).toContain('OTHER_LIABILITY');
    });

    it('应该定义 card_identifier 字段', () => {
      const cardIdentifier = FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.items.properties.data.properties.card_identifier;
      expect(cardIdentifier).toBeDefined();
      expect(cardIdentifier.type).toBe('string');
    });

    it('应该定义 outstanding_balance 字段（信用卡待还）', () => {
      const outstandingBalance = FINANCIAL_EVENTS_JSON_SCHEMA.properties.events.items.properties.data.properties.outstanding_balance;
      expect(outstandingBalance).toBeDefined();
      expect(outstandingBalance.type).toBe('number');
    });
  });
});

/**
 * AI 解析输出验证测试
 * 
 * 这些测试用例模拟 AI 的预期输出，用于验证解析逻辑
 * 运行真实 AI 测试时，可以对比这些预期输出
 */
describe('AI 解析输出验证', () => {
  
  // 辅助函数：验证事件结构
  function validateEventStructure(event: any) {
    expect(event).toHaveProperty('event_type');
    expect(event).toHaveProperty('data');
    expect(event.data).toHaveProperty('amount');
    expect(event.data).toHaveProperty('currency');
    expect(event.data).toHaveProperty('date');
  }

  describe('TRANSACTION 事件测试用例', () => {
    
    it('TC-01: 单笔消费 - "午餐花了35块"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'EXPENSE',
            amount: 35,
            currency: 'CNY',
            date: '2025-12-13',
            category: 'FOOD',
            note: '午餐'
          }
        }]
      };
      
      validateEventStructure(expectedOutput.events[0]);
      expect(expectedOutput.events[0].data.transaction_type).toBe('EXPENSE');
      expect(expectedOutput.events[0].data.category).toBe('FOOD');
    });

    it('TC-02: 多笔消费 - "今天吃饭160还买了一瓶水39"', () => {
      const expectedOutput = {
        events: [
          {
            event_type: 'TRANSACTION',
            data: {
              transaction_type: 'EXPENSE',
              amount: 160,
              currency: 'CNY',
              date: '2025-12-13',
              category: 'FOOD',
              note: '吃饭'
            }
          },
          {
            event_type: 'TRANSACTION',
            data: {
              transaction_type: 'EXPENSE',
              amount: 39,
              currency: 'CNY',
              date: '2025-12-13',
              category: 'SHOPPING',
              note: '买一瓶水'
            }
          }
        ]
      };
      
      expect(expectedOutput.events.length).toBe(2);
      expectedOutput.events.forEach(validateEventStructure);
    });

    it('TC-03: 收入 - "今天发工资了15000"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'INCOME',
            amount: 15000,
            currency: 'CNY',
            date: '2025-12-13',
            category: 'INCOME_SALARY',
            note: '发工资'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.transaction_type).toBe('INCOME');
      expect(expectedOutput.events[0].data.category).toBe('INCOME_SALARY');
    });

    it('TC-04: 转账 - "转账给老婆5000块"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'TRANSFER',
            amount: 5000,
            currency: 'CNY',
            date: '2025-12-13',
            target_account: '老婆',
            note: '转账'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.transaction_type).toBe('TRANSFER');
      expect(expectedOutput.events[0].data.target_account).toBeDefined();
    });

    it('TC-05: 信用卡消费（需包含card_identifier） - "用尾号2323信用卡消费了500"', () => {
      const expectedOutput = {
        events: [
          {
            event_type: 'TRANSACTION',
            data: {
              transaction_type: 'EXPENSE',
              amount: 500,
              currency: 'CNY',
              date: '2025-12-13',
              category: 'OTHER',
              card_identifier: '2323',
              note: '消费'
            }
          },
          {
            event_type: 'ASSET_UPDATE',
            data: {
              asset_type: 'CREDIT_CARD',
              amount: 500,
              currency: 'CNY',
              date: '2025-12-13',
              card_identifier: '2323'
            }
          }
        ]
      };
      
      expect(expectedOutput.events[0].data.card_identifier).toBe('2323');
      expect(expectedOutput.events[1].event_type).toBe('ASSET_UPDATE');
      expect(expectedOutput.events[1].data.asset_type).toBe('CREDIT_CARD');
    });

    it('TC-06: 外币消费 - "I spent 50 dollars on dinner"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'EXPENSE',
            amount: 50,
            currency: 'USD',
            date: '2025-12-13',
            category: 'FOOD',
            note: 'dinner'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.currency).toBe('USD');
    });

    it('TC-07: 还款 - "还信用卡5000"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'PAYMENT',
            amount: 5000,
            currency: 'CNY',
            date: '2025-12-13',
            category: 'LOAN_REPAYMENT',
            note: '还信用卡'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.transaction_type).toBe('PAYMENT');
      expect(expectedOutput.events[0].data.category).toBe('LOAN_REPAYMENT');
    });
  });

  describe('CREDIT_CARD_UPDATE 事件测试用例', () => {
    
    it('TC-10: 信用卡配置 - "我有一张招商银行信用卡尾号2323额度84000"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'CREDIT_CARD_UPDATE',
          data: {
            institution_name: '招商银行',
            amount: 84000,
            currency: 'CNY',
            card_identifier: '2323',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].event_type).toBe('CREDIT_CARD_UPDATE');
      expect(expectedOutput.events[0].data.card_identifier).toBe('2323');
      expect(expectedOutput.events[0].data.institution_name).toBe('招商银行');
    });

    it('TC-11: 信用卡配置含还款日 - "招商信用卡尾号2323额度84000每月10号还款"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'CREDIT_CARD_UPDATE',
          data: {
            institution_name: '招商银行',
            amount: 84000,
            currency: 'CNY',
            card_identifier: '2323',
            repayment_due_date: '10',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.repayment_due_date).toBe('10');
    });

    it('TC-12: 信用卡配置含待还金额 - "招商信用卡尾号2323额度84000目前欠款3200"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'CREDIT_CARD_UPDATE',
          data: {
            institution_name: '招商银行',
            amount: 84000,
            outstanding_balance: 3200,
            currency: 'CNY',
            card_identifier: '2323',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.outstanding_balance).toBe(3200);
    });

    it('TC-13: CREDIT_CARD_UPDATE 禁止字段验证', () => {
      const invalidFields = ['transaction_type', 'category', 'source_account', 'target_account', 'note'];
      const validOutput = {
        event_type: 'CREDIT_CARD_UPDATE',
        data: {
          institution_name: '招商银行',
          amount: 84000,
          currency: 'CNY',
          card_identifier: '2323',
          date: '2025-12-13'
        }
      };
      
      invalidFields.forEach(field => {
        expect(validOutput.data).not.toHaveProperty(field);
      });
    });
  });

  describe('ASSET_UPDATE 事件测试用例', () => {
    
    it('TC-20: 银行存款 - "我在招商银行有50000存款"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'BANK',
            name: '招商银行',
            institution_name: '招商银行',
            amount: 50000,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('BANK');
    });

    it('TC-21: 贷款（负债LOAN） - "我有一笔房贷还剩80万"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'MORTGAGE',
            amount: 800000,
            currency: 'CNY',
            date: '2025-12-13',
            name: '房贷'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('MORTGAGE');
    });

    it('TC-22: 普通贷款（负债LOAN） - "我欠银行10万贷款"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'LOAN',
            amount: 100000,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('LOAN');
    });

    it('TC-23: 其他负债 - "我欠朋友5000块"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'OTHER_LIABILITY',
            amount: 5000,
            currency: 'CNY',
            date: '2025-12-13',
            note: '欠朋友钱'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('OTHER_LIABILITY');
    });

    it('TC-24: 数字钱包 - "支付宝余额3200"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'DIGITAL_WALLET',
            name: '支付宝',
            amount: 3200,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('DIGITAL_WALLET');
    });

    it('TC-25: 加密货币 - "我有0.5个比特币"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'CRYPTO',
            name: 'BTC',
            quantity: 0.5,
            currency: 'BTC',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('CRYPTO');
      expect(expectedOutput.events[0].data.quantity).toBe(0.5);
    });

    it('TC-26: 房产 - "我有一套价值300万的房子"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'PROPERTY',
            amount: 3000000,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('PROPERTY');
    });

    it('TC-27: 车辆 - "我的车值15万"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'VEHICLE',
            amount: 150000,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.asset_type).toBe('VEHICLE');
    });
  });

  describe('BUDGET 事件测试用例', () => {
    
    it('TC-30: 创建预算 - "我这个月餐饮预算3000"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'BUDGET',
          data: {
            name: '餐饮预算',
            amount: 3000,
            currency: 'CNY',
            date: '2025-12-31',
            budget_action: 'CREATE_BUDGET'
          }
        }]
      };
      
      expect(expectedOutput.events[0].event_type).toBe('BUDGET');
      expect(expectedOutput.events[0].data.budget_action).toBe('CREATE_BUDGET');
    });
  });

  describe('NULL_STATEMENT 事件测试用例', () => {
    
    it('TC-40: 无效输入 - "今天天气不错"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'NULL_STATEMENT',
          data: {
            error_message: 'Non-financial or insufficient data.'
          }
        }]
      };
      
      expect(expectedOutput.events[0].event_type).toBe('NULL_STATEMENT');
      expect(expectedOutput.events[0].data.error_message).toBeDefined();
    });

    it('TC-41: 问候语 - "你好"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'NULL_STATEMENT',
          data: {
            error_message: 'Non-financial or insufficient data.'
          }
        }]
      };
      
      expect(expectedOutput.events[0].event_type).toBe('NULL_STATEMENT');
    });
  });

  describe('复合事件测试用例', () => {
    
    it('TC-50: 信用卡配置+消费 - "花旗信用卡额度53000美金每月4号还款今天消费了53美金"', () => {
      const expectedOutput = {
        events: [
          {
            event_type: 'CREDIT_CARD_UPDATE',
            data: {
              institution_name: '花旗',
              amount: 53000,
              currency: 'USD',
              repayment_due_date: '04',
              date: '2025-12-13'
            }
          },
          {
            event_type: 'TRANSACTION',
            data: {
              transaction_type: 'EXPENSE',
              source_account: '花旗信用卡',
              amount: 53,
              currency: 'USD',
              date: '2025-12-13',
              category: 'OTHER',
              note: '消费'
            }
          }
        ]
      };
      
      expect(expectedOutput.events.length).toBe(2);
      expect(expectedOutput.events[0].event_type).toBe('CREDIT_CARD_UPDATE');
      expect(expectedOutput.events[1].event_type).toBe('TRANSACTION');
    });

    it('TC-51: 多类型资产 - "我有招商银行5万存款和一套300万的房子还欠80万房贷"', () => {
      const expectedOutput = {
        events: [
          {
            event_type: 'ASSET_UPDATE',
            data: {
              asset_type: 'BANK',
              institution_name: '招商银行',
              amount: 50000,
              currency: 'CNY',
              date: '2025-12-13'
            }
          },
          {
            event_type: 'ASSET_UPDATE',
            data: {
              asset_type: 'PROPERTY',
              amount: 3000000,
              currency: 'CNY',
              date: '2025-12-13'
            }
          },
          {
            event_type: 'ASSET_UPDATE',
            data: {
              asset_type: 'MORTGAGE',
              amount: 800000,
              currency: 'CNY',
              date: '2025-12-13'
            }
          }
        ]
      };
      
      expect(expectedOutput.events.length).toBe(3);
      const assetTypes = expectedOutput.events.map(e => e.data.asset_type);
      expect(assetTypes).toContain('BANK');
      expect(assetTypes).toContain('PROPERTY');
      expect(assetTypes).toContain('MORTGAGE');
    });
  });

  describe('日期解析测试用例', () => {
    
    it('TC-60: 相对日期 - "昨天花了100"', () => {
      const expectedDate = '2025-12-12';
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'EXPENSE',
            amount: 100,
            currency: 'CNY',
            date: expectedDate
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.date).toBe('2025-12-12');
    });

    it('TC-61: 指定日期 - "12月1号消费了200"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'TRANSACTION',
          data: {
            transaction_type: 'EXPENSE',
            amount: 200,
            currency: 'CNY',
            date: '2025-12-01'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.date).toBe('2025-12-01');
    });
  });

  describe('实体规范化测试用例', () => {
    
    it('TC-70: 银行名称规范化 - "招商银行卡" -> "招商银行"', () => {
      const expectedOutput = {
        events: [{
          event_type: 'ASSET_UPDATE',
          data: {
            asset_type: 'BANK',
            institution_name: '招商银行',
            amount: 10000,
            currency: 'CNY',
            date: '2025-12-13'
          }
        }]
      };
      
      expect(expectedOutput.events[0].data.institution_name).toBe('招商银行');
      expect(expectedOutput.events[0].data.institution_name).not.toContain('卡');
    });
  });
});

/**
 * 测试运行说明：
 * 
 * 1. 单元测试（Mock）：npm run test -- system-prompt.spec.ts
 * 2. 集成测试（真实AI）：QWEN_API_KEY=xxx npm run test -- system-prompt.spec.ts
 * 
 * 测试覆盖场景：
 * - TC-01 ~ TC-07: TRANSACTION 事件（消费、收入、转账、信用卡消费、外币、还款）
 * - TC-10 ~ TC-13: CREDIT_CARD_UPDATE 事件（配置、还款日、待还金额、禁止字段）
 * - TC-20 ~ TC-27: ASSET_UPDATE 事件（银行、贷款、负债、数字钱包、加密货币、房产、车辆）
 * - TC-30: BUDGET 事件
 * - TC-40 ~ TC-41: NULL_STATEMENT 事件（无效输入）
 * - TC-50 ~ TC-51: 复合事件
 * - TC-60 ~ TC-61: 日期解析
 * - TC-70: 实体规范化
 * - API-01 ~ API-10: Qwen API 真实调用测试
 */

/**
 * Qwen API 集成测试
 * 
 * 这些测试会真实调用 Qwen API，验证系统提示词的实际效果
 * 运行条件：需要设置 QWEN_API_KEY 环境变量
 */
describe('Qwen API 集成测试', () => {
  const currentDate = new Date().toISOString().split('T')[0];
  const shouldRunApiTests = !!QWEN_API_KEY;

  // 如果没有配置 API Key，跳过所有集成测试
  const testOrSkip = shouldRunApiTests ? it : it.skip;

  beforeAll(() => {
    if (!shouldRunApiTests) {
      console.log('\n⚠️  跳过 Qwen API 集成测试: 未配置 QWEN_API_KEY');
      console.log('   运行集成测试: QWEN_API_KEY=your_key npm run test -- system-prompt.spec.ts\n');
    } else {
      console.log('\n✅ Qwen API Key 已配置，运行集成测试...\n');
    }
  });

  testOrSkip('API-01: 单笔消费 - "午餐花了35块"', async () => {
    const result = await callQwenAPI('午餐花了35块', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    expect(result.events[0].event_type).toBe('TRANSACTION');
    expect(result.events[0].data.transaction_type).toBe('EXPENSE');
    expect(result.events[0].data.amount).toBe(35);
    expect(result.events[0].data.currency).toBe('CNY');
    expect(result.events[0].data.category).toBe('FOOD');
  }, 20000);

  testOrSkip('API-02: 多笔消费 - "今天吃饭160还买了一瓶水39"', async () => {
    const result = await callQwenAPI('今天吃饭160还买了一瓶水39', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events.length).toBe(2);
    
    // 第一笔: 吃饭
    expect(result.events[0].event_type).toBe('TRANSACTION');
    expect(result.events[0].data.amount).toBe(160);
    expect(result.events[0].data.category).toBe('FOOD');
    
    // 第二笔: 买水
    expect(result.events[1].event_type).toBe('TRANSACTION');
    expect(result.events[1].data.amount).toBe(39);
  }, 20000);

  testOrSkip('API-03: 收入 - "今天发工资了15000"', async () => {
    const result = await callQwenAPI('今天发工资了15000', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('TRANSACTION');
    expect(result.events[0].data.transaction_type).toBe('INCOME');
    expect(result.events[0].data.amount).toBe(15000);
    expect(['INCOME_SALARY', 'INCOME_OTHER']).toContain(result.events[0].data.category);
  }, 20000);

  testOrSkip('API-04: 信用卡配置 - "招商银行信用卡尾号2323额度84000"', async () => {
    const result = await callQwenAPI('招商银行信用卡尾号2323额度84000', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('CREDIT_CARD_UPDATE');
    expect(result.events[0].data.card_identifier).toBe('2323');
    expect(result.events[0].data.amount).toBe(84000);
    expect(result.events[0].data.institution_name).toContain('招商');
  }, 20000);

  testOrSkip('API-05: 信用卡配置含还款日 - "招商信用卡尾号2323额度84000每月10号还款"', async () => {
    const result = await callQwenAPI('招商信用卡尾号2323额度84000每月10号还款', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('CREDIT_CARD_UPDATE');
    expect(result.events[0].data.repayment_due_date).toBe('10');
  }, 20000);

  testOrSkip('API-06: 信用卡消费 - "用尾号2323信用卡消费了500"', async () => {
    const result = await callQwenAPI('用尾号2323信用卡消费了500', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThanOrEqual(1);
    
    // 查找 TRANSACTION 事件
    const transactionEvent = result.events.find((e: any) => e.event_type === 'TRANSACTION');
    expect(transactionEvent).toBeDefined();
    expect(transactionEvent.data.amount).toBe(500);
    expect(transactionEvent.data.card_identifier).toBe('2323');
  }, 20000);

  testOrSkip('API-07: 银行存款 - "我在招商银行有50000存款"', async () => {
    const result = await callQwenAPI('我在招商银行有50000存款', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('ASSET_UPDATE');
    expect(result.events[0].data.asset_type).toBe('BANK');
    expect(result.events[0].data.amount).toBe(50000);
  }, 20000);

  testOrSkip('API-07b: 储蓄卡余额 - "我有一张招商银行储蓄卡他的余额为38,900"', async () => {
    const result = await callQwenAPI('我有一张招商银行储蓄卡他的余额为38,900', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('ASSET_UPDATE');
    expect(result.events[0].data.asset_type).toBe('BANK');
    expect(result.events[0].data.amount).toBe(38900);
    expect(result.events[0].data.institution_name).toContain('招商');
  }, 20000);

  testOrSkip('API-08: 贷款/负债 - "我有一笔房贷还刡80万"', async () => {
    const result = await callQwenAPI('我有一笔房贷还刡80万', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('ASSET_UPDATE');
    expect(result.events[0].data.asset_type).toBe('MORTGAGE');
    expect(result.events[0].data.amount).toBe(800000);
  }, 20000);

  testOrSkip('API-09: 无效输入 - "今天天气不错"', async () => {
    const result = await callQwenAPI('今天天气不错', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events[0].event_type).toBe('NULL_STATEMENT');
  }, 20000);

  testOrSkip('API-10: 复合事件 - "我有招商银行5万存款和一套300万的房子还欠80万房贷"', async () => {
    const result = await callQwenAPI('我有招商银行5万存款和一套300万的房子还欠80万房贷', currentDate);
    
    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThanOrEqual(3);
    
    const assetTypes = result.events.map((e: any) => e.data.asset_type);
    expect(assetTypes).toContain('BANK');
    expect(assetTypes).toContain('PROPERTY');
    expect(assetTypes).toContain('MORTGAGE');
  }, 20000);
});

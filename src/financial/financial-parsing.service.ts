import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RegionService, RegionCode } from '../common/region/region.service';
import { AIServiceRouter } from './providers/ai-service.router';
import { FinancialParsingProvider } from './providers/financial-parsing.provider.interface';
import { FinancialEventsResponseDto } from './dtos/financial-events.dto';
import { SkillExecutorService } from '../skills/skill-executor.service';
import { SkillRouterService } from '../skills/skill-router.service';

/**
 * 财务解析服务
 * 提供统一的财务语句解析入口，支持区域路由和故障转移
 * 支持两种模式：Skill 系统 或 传统 Provider
 */
@Injectable()
export class FinancialParsingService {
  private readonly useSkillSystem: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly regionService: RegionService,
    private readonly aiRouter: AIServiceRouter,
    private readonly skillExecutor: SkillExecutorService,
    private readonly skillRouter: SkillRouterService,
    private readonly configService: ConfigService,
  ) {
    // 通过环境变量控制是否使用 Skill 系统，默认开启
    this.useSkillSystem = this.configService.get<string>('USE_SKILL_SYSTEM', 'true') === 'true';
    this.logger.log(`财务解析模式: ${this.useSkillSystem ? 'Skill 系统' : '传统 Provider'}`, 'FinancialParsingService');
  }

  /**
   * 解析财务语句
   * @param text 用户输入的自然语言文本
   * @param userId 用户ID
   * @param headers HTTP请求头
   */
  async parseFinancialStatement(
    text: string,
    userId: string,
    headers: Record<string, string>,
  ): Promise<FinancialEventsResponseDto> {
    const startTime = Date.now();
    const currentDate = this.getCurrentDate();

    // 检测用户区域
    const region = await this.regionService.detectUserRegion(userId, headers);
    this.logger.log(
      `Parsing financial statement for user ${userId}, region: ${region}, mode: ${this.useSkillSystem ? 'Skill' : 'Provider'}`,
      'FinancialParsingService',
    );

    // 使用 Skill 系统
    if (this.useSkillSystem) {
      return this.parseWithSkillSystem(text, userId, region, currentDate);
    }

    // 使用传统 Provider 链
    const providerChain = this.aiRouter.getProviderChain(region);

    // 遍历 Provider 链，尝试解析
    for (const provider of providerChain) {
      const providerStartTime = Date.now();

      try {
        const result = await this.withTimeout(
          provider.parse(text, currentDate),
          8000,
        );

        const duration = Date.now() - providerStartTime;

        // 记录成功日志
        await this.logAudit(
          userId,
          region,
          provider.name,
          'SUCCESS',
          duration,
          null,
        );

        this.logger.log(
          `Successfully parsed with ${provider.name} in ${duration}ms`,
          'FinancialParsingService',
        );

        return result;
      } catch (error) {
        const duration = Date.now() - providerStartTime;

        // 记录失败日志
        await this.logAudit(
          userId,
          region,
          provider.name,
          'FAILURE',
          duration,
          error.message,
        );

        this.logger.warn(
          `Provider ${provider.name} failed: ${error.message}`,
          'FinancialParsingService',
        );

        // 继续尝试下一个 Provider
      }
    }

    // 所有 Provider 都失败
    const totalDuration = Date.now() - startTime;
    this.logger.error(
      `All providers failed after ${totalDuration}ms`,
      undefined,
      'FinancialParsingService',
    );

    throw new Error('All AI providers failed to parse the financial statement');
  }

  /**
   * 检测是否为查询类输入（而非记账输入）
   */
  private isQueryInput(text: string): { isQuery: boolean; skillName?: string } {
    const queryPatterns = [
      // 账单分析查询
      { pattern: /(花了多少|消费了多少|消费情况|账单|统计|分析|这个月.*花|上个月.*花)/, skill: 'bill-analysis' },
      // 预算查询
      { pattern: /(预算.*(剩|多少|还有|够不够)|超支|还能花)/, skill: 'budget-advisor' },
      // 投资查询
      { pattern: /(股票|基金|持仓|收益|投资.*(怎么样|如何))/, skill: 'investment' },
      // 贷款查询
      { pattern: /(贷款|还款|负债|欠款).*(多少|还有|还要|怎么样)/, skill: 'loan-advisor' },
    ];

    for (const { pattern, skill } of queryPatterns) {
      if (pattern.test(text)) {
        return { isQuery: true, skillName: skill };
      }
    }

    return { isQuery: false };
  }

  /**
   * 使用 Skill 系统解析财务语句
   */
  private async parseWithSkillSystem(
    text: string,
    userId: string,
    region: RegionCode,
    currentDate: string,
  ): Promise<FinancialEventsResponseDto> {
    const startTime = Date.now();

    // 检测是否为查询类输入
    const queryCheck = this.isQueryInput(text);
    if (queryCheck.isQuery && queryCheck.skillName) {
      this.logger.log(
        `Detected query input, routing to ${queryCheck.skillName}`,
        'FinancialParsingService',
      );
      return this.handleQueryWithSkill(text, userId, queryCheck.skillName, currentDate);
    }

    try {
      const result = await this.skillExecutor.execute({
        userMessage: text,
        skillName: 'accounting',  // 指定使用记账技能
        context: {
          userId,
          currentDate,
          daysInMonth: new Date(currentDate.slice(0, 7) + '-01').getDate(),
        },
      });

      const duration = Date.now() - startTime;

      if (result.success && result.response) {
        // 记录成功日志
        await this.logAudit(userId, region, 'SKILL_ACCOUNTING', 'SUCCESS', duration, null);

        this.logger.log(
          `Successfully parsed with Skill system in ${duration}ms`,
          'FinancialParsingService',
        );

        // 转换 Skill 响应为 FinancialEventsResponseDto 格式
        return this.convertSkillResponseToEvents(result.response, currentDate);
      }

      // Skill 执行失败
      await this.logAudit(userId, region, 'SKILL_ACCOUNTING', 'FAILURE', duration, result.error || 'Unknown error');
      throw new Error(result.error || 'Skill execution failed');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Skill system failed after ${duration}ms: ${error.message}`,
        error.stack,
        'FinancialParsingService',
      );
      throw error;
    }
  }

  /**
   * 处理查询类输入，返回分析结果
   */
  private async handleQueryWithSkill(
    text: string,
    userId: string,
    skillName: string,
    currentDate: string,
  ): Promise<FinancialEventsResponseDto> {
    // 构建完整的上下文（包含用户数据）
    const context = await this.buildQueryContext(userId, currentDate);

    const result = await this.skillExecutor.execute({
      userMessage: text,
      skillName,
      context,
    });

    if (result.success && result.response) {
      // 将分析结果包装为 QUERY_RESPONSE 事件
      return {
        events: [
          {
            event_type: 'QUERY_RESPONSE',
            data: {
              skill_used: skillName,
              summary: result.response.summary || '',
              ...result.response,
            },
          },
        ],
      } as FinancialEventsResponseDto;
    }

    // 查询失败，返回错误
    return {
      events: [
        {
          event_type: 'NULL_STATEMENT',
          data: {
            error_message: result.error || '无法处理该查询',
          },
        },
      ],
    } as FinancialEventsResponseDto;
  }

  /**
   * 构建查询上下文（包含用户的账户、记录、预算等数据）
   */
  private async buildQueryContext(userId: string, currentDate: string) {
    const now = new Date(currentDate);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [accounts, creditCards, records, budgets, holdings] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, type: true, balance: true },
      }),
      this.prisma.creditCard.findMany({
        where: { userId },
        select: { id: true, name: true, creditLimit: true, currentBalance: true },
      }),
      this.prisma.record.findMany({
        where: {
          userId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { id: true, type: true, amount: true, category: true, description: true, date: true },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      this.prisma.budget.findMany({
        where: { userId },
        select: { id: true, category: true, amount: true, month: true, isRecurring: true },
      }),
      this.prisma.holding.findMany({
        where: { account: { userId } },
        select: { id: true, tickerCode: true, name: true, quantity: true, avgCostPrice: true, currentPrice: true },
      }),
    ]);

    // 计算分类消费统计
    const categoryStats = records.reduce((acc: any, r: any) => {
      if (r.type === 'EXPENSE') {
        const cat = r.category || '其他';
        acc[cat] = (acc[cat] || 0) + Number(r.amount);
      }
      return acc;
    }, {});

    const categories = Object.entries(categoryStats).map(([category, amount]) => ({
      category,
      amount,
    }));

    return {
      userId,
      accounts,
      creditCards,
      records,
      categories,
      budgets,
      holdings,
      currentDate,
      daysInMonth: endOfMonth.getDate(),
      daysPassed: now.getDate(),
      daysRemaining: endOfMonth.getDate() - now.getDate(),
    };
  }

  /**
   * 将 Skill 响应转换为 FinancialEventsResponseDto 格式
   */
  private convertSkillResponseToEvents(
    skillResponse: any,
    currentDate: string,
  ): FinancialEventsResponseDto {
    // 如果已经是 events 格式，直接返回
    if (skillResponse.events && Array.isArray(skillResponse.events)) {
      // 检查是否有 NEED_MORE_INFO 类型需要特殊处理
      const events = skillResponse.events.map((event: any) => {
        // 保留原有的事件类型，不做转换
        if (['TRANSACTION', 'ASSET_UPDATE', 'CREDIT_CARD_UPDATE', 'HOLDING_UPDATE', 'BUDGET', 'NEED_MORE_INFO', 'NULL_STATEMENT'].includes(event.event_type)) {
          return event;
        }
        return event;
      });
      return { events } as FinancialEventsResponseDto;
    }

    // 转换旧格式（success/data）为新格式（events）
    if (skillResponse.success !== undefined && skillResponse.data) {
      const data = skillResponse.data;
      
      // 检查是否是资产/负债类型
      if (data.asset_type || this.isAssetDeclaration(data)) {
        return this.convertToAssetUpdate(data, currentDate);
      }
      
      // 映射分类
      const categoryMap: Record<string, string> = {
        '餐饮': 'FOOD',
        '交通': 'TRANSPORT',
        '交通出行': 'TRANSPORT',
        '购物': 'SHOPPING',
        '居家': 'HOUSING',
        '娱乐': 'ENTERTAINMENT',
        '健康': 'HEALTH',
        '教育': 'EDUCATION',
        '通讯': 'COMMUNICATION',
        '运动': 'SPORTS',
        '美容': 'BEAUTY',
        '旅行': 'TRAVEL',
        '宠物': 'PETS',
        '订阅': 'SUBSCRIPTION',
        '税费': 'FEES_AND_TAXES',
        '还贷': 'LOAN_REPAYMENT',
        '其他': 'OTHER',
        '收入': 'INCOME_SALARY',
        '工资': 'INCOME_SALARY',
        '奖金': 'INCOME_BONUS',
        '投资收益': 'INCOME_INVESTMENT',
        '兼职': 'INCOME_FREELANCE',
        '红包': 'INCOME_GIFT',
        '其他收入': 'INCOME_OTHER',
      };

      // 映射交易类型
      const transactionTypeMap: Record<string, string> = {
        'EXPENSE': 'EXPENSE',
        'INCOME': 'INCOME',
        'TRANSFER': 'TRANSFER',
        'PAYMENT': 'PAYMENT',
      };

      const category = categoryMap[data.category] || categoryMap[data.subcategory] || 'OTHER';
      const transactionType = transactionTypeMap[data.type] || 'EXPENSE';

      return {
        events: [
          {
            event_type: 'TRANSACTION' as any,
            data: {
              transaction_type: transactionType as any,
              amount: data.amount,
              currency: data.currency || 'CNY',
              category: category as any,
              note: data.merchant || data.subcategory || skillResponse.message,
              date: data.date || currentDate,
            },
          },
        ],
      };
    }

    // 无法解析，返回空事件
    this.logger.warn('无法转换 Skill 响应格式', 'FinancialParsingService');
    return { events: [] };
  }

  /**
   * 判断是否为资产/负债声明
   */
  private isAssetDeclaration(data: any): boolean {
    const keywords = ['车贷', '房贷', '贷款', '存款', '余额', '储蓄'];
    const note = data.note || data.merchant || data.subcategory || '';
    return keywords.some(k => note.includes(k));
  }

  /**
   * 转换为 ASSET_UPDATE 事件
   */
  private convertToAssetUpdate(data: any, currentDate: string): FinancialEventsResponseDto {
    // 映射资产类型
    const assetTypeMap: Record<string, string> = {
      '车贷': 'LOAN',
      '房贷': 'MORTGAGE',
      '贷款': 'LOAN',
      '存款': 'BANK',
      '储蓄': 'SAVINGS',
      '余额': 'DIGITAL_WALLET',
    };

    const note = data.note || data.merchant || data.subcategory || '';
    let assetType = data.asset_type || 'OTHER_LIABILITY';
    let name = data.name || note;

    // 根据关键词推断资产类型
    for (const [keyword, type] of Object.entries(assetTypeMap)) {
      if (note.includes(keyword)) {
        assetType = type;
        name = name || keyword;
        break;
      }
    }

    return {
      events: [
        {
          event_type: 'ASSET_UPDATE' as any,
          data: {
            name: name,
            asset_type: assetType as any,
            amount: data.amount,
            currency: data.currency || 'CNY',
            date: data.date || currentDate,
            institution_name: data.institution_name,
            loan_term_months: data.loan_term_months,
            interest_rate: data.interest_rate,
            monthly_payment: data.monthly_payment,
            repayment_day: data.repayment_day,
          },
        },
      ],
    };
  }

  /**
   * 带超时的 Promise 包装器
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 记录审计日志
   */
  private async logAudit(
    userId: string,
    userRegion: RegionCode,
    provider: string,
    status: 'SUCCESS' | 'FAILURE',
    durationMs: number,
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.prisma.aIAuditLog.create({
        data: {
          userId,
          userRegion,
          provider,
          status,
          durationMs,
          errorMessage,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log audit: ${error.message}`,
        'FinancialParsingService',
      );
    }
  }

  /**
   * 获取当前日期 (YYYY-MM-DD 格式)
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

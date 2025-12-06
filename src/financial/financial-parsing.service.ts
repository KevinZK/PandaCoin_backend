import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RegionService, RegionCode } from '../common/region/region.service';
import { AIServiceRouter } from './providers/ai-service.router';
import { FinancialParsingProvider } from './providers/financial-parsing.provider.interface';
import { FinancialEventsResponseDto } from './dtos/financial-events.dto';

/**
 * 财务解析服务
 * 提供统一的财务语句解析入口，支持区域路由和故障转移
 */
@Injectable()
export class FinancialParsingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly regionService: RegionService,
    private readonly aiRouter: AIServiceRouter,
  ) {}

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
      `Parsing financial statement for user ${userId}, region: ${region}`,
      'FinancialParsingService',
    );

    // 获取 Provider 链
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

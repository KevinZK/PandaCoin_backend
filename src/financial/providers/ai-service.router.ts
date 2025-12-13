import { Injectable } from '@nestjs/common';
import { FinancialParsingProvider } from './financial-parsing.provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { QwenProvider } from './qwen.provider';
import { RegionCode } from '../../common/region/region.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * 路由配置类型
 */
interface RouteConfig {
  primary: FinancialParsingProvider;
  fallbacks: FinancialParsingProvider[];
}

/**
 * AI 服务路由器
 * 根据用户区域选择合适的 AI Provider
 */
@Injectable()
export class AIServiceRouter {
  private readonly providers: Map<string, FinancialParsingProvider>;

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenAIProvider,
    private readonly qwenProvider: QwenProvider,
    private readonly logger: LoggerService,
  ) {
    this.providers = new Map<string, FinancialParsingProvider>([
      ['Gemini', geminiProvider],
      ['OpenAI', openaiProvider],
      ['Qwen', qwenProvider],
    ]);
  }

  /**
   * 获取指定区域的首选 Provider
   */
  getPrimaryProvider(region: RegionCode): FinancialParsingProvider {
    const config = this.getRouteConfig(region);
    this.logger.debug(
      `Primary provider for ${region}: ${config.primary.name}`,
      'AIServiceRouter',
    );
    return config.primary;
  }

  /**
   * 获取指定区域的备选 Provider 列表
   */
  getFallbackProviders(region: RegionCode): FinancialParsingProvider[] {
    const config = this.getRouteConfig(region);
    this.logger.debug(
      `Fallback providers for ${region}: ${config.fallbacks.map((p) => p.name).join(', ')}`,
      'AIServiceRouter',
    );
    return config.fallbacks;
  }

  /**
   * 获取完整的 Provider 链（首选 + 备选）
   */
  getProviderChain(region: RegionCode): FinancialParsingProvider[] {
    const config = this.getRouteConfig(region);
    return [config.primary, ...config.fallbacks];
  }

  /**
   * 根据区域获取路由配置
   * 
   * 路由规则：
   * - CN: Qwen → [OpenAI]
   * - HK, MO, TW: Qwen → [Gemini, OpenAI]
   * - US, CA: Gemini → [OpenAI, Qwen]
   * - EU: Gemini → [OpenAI]
   * - OTHER: Gemini → [OpenAI, Qwen]
   */
  private getRouteConfig(region: RegionCode): RouteConfig {
    // 当前统一使用 Qwen 作为主 Provider
    return {
      primary: this.qwenProvider,
      fallbacks: [this.geminiProvider, this.openaiProvider],
    };

    // 原区域路由配置（暂时禁用）
    /*
    switch (region) {
      case 'CN':
        return {
          primary: this.qwenProvider,
          fallbacks: [this.openaiProvider],
        };

      case 'HK':
      case 'MO':
      case 'TW':
        return {
          primary: this.qwenProvider,
          fallbacks: [this.geminiProvider, this.openaiProvider],
        };

      case 'US':
      case 'CA':
        return {
          primary: this.geminiProvider,
          fallbacks: [this.openaiProvider, this.qwenProvider],
        };

      case 'EU':
        return {
          primary: this.geminiProvider,
          fallbacks: [this.openaiProvider],
        };

      case 'OTHER':
      default:
        return {
          primary: this.geminiProvider,
          fallbacks: [this.openaiProvider, this.qwenProvider],
        };
    }
    */
  }

  /**
   * 获取所有可用的 Provider
   */
  getAllProviders(): FinancialParsingProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 根据名称获取 Provider
   */
  getProviderByName(name: string): FinancialParsingProvider | undefined {
    return this.providers.get(name);
  }
}

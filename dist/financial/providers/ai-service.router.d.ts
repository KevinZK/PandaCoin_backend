import { FinancialParsingProvider } from './financial-parsing.provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';
import { QwenProvider } from './qwen.provider';
import { RegionCode } from '../../common/region/region.service';
import { LoggerService } from '../../common/logger/logger.service';
export declare class AIServiceRouter {
    private readonly geminiProvider;
    private readonly openaiProvider;
    private readonly qwenProvider;
    private readonly logger;
    private readonly providers;
    constructor(geminiProvider: GeminiProvider, openaiProvider: OpenAIProvider, qwenProvider: QwenProvider, logger: LoggerService);
    getPrimaryProvider(region: RegionCode): FinancialParsingProvider;
    getFallbackProviders(region: RegionCode): FinancialParsingProvider[];
    getProviderChain(region: RegionCode): FinancialParsingProvider[];
    private getRouteConfig;
    getAllProviders(): FinancialParsingProvider[];
    getProviderByName(name: string): FinancialParsingProvider | undefined;
}

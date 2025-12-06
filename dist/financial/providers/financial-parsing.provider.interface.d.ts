import { FinancialEventsResponseDto } from '../dtos/financial-events.dto';
export interface FinancialParsingProvider {
    readonly name: string;
    parse(text: string, currentDate: string): Promise<FinancialEventsResponseDto>;
}
export interface ProviderConfig {
    apiKey: string;
    endpoint?: string;
    model?: string;
    timeout?: number;
}
export declare const PROVIDER_NAMES: {
    readonly GEMINI: "Gemini";
    readonly OPENAI: "OpenAI";
    readonly QWEN: "Qwen";
};
export type ProviderName = (typeof PROVIDER_NAMES)[keyof typeof PROVIDER_NAMES];

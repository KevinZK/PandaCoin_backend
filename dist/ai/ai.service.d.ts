import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../common/logger/logger.service';
export interface ParsedTransaction {
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    amount: number;
    category: string;
    accountName: string;
    description: string;
    date?: string;
    confidence?: number;
}
export declare class AiService {
    private configService;
    private logger;
    constructor(configService: ConfigService, logger: LoggerService);
    parseVoiceToRecords(text: string, userAccounts: string[]): Promise<{
        records: ParsedTransaction[];
        rawResponse: string;
    }>;
    private buildPrompt;
    private mockParse;
    private guessCategory;
}

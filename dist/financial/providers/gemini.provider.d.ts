import { ConfigService } from '@nestjs/config';
import { FinancialParsingProvider } from './financial-parsing.provider.interface';
import { FinancialEventsResponseDto } from '../dtos/financial-events.dto';
import { LoggerService } from '../../common/logger/logger.service';
export declare class GeminiProvider implements FinancialParsingProvider {
    private readonly configService;
    private readonly logger;
    readonly name: "Gemini";
    private readonly apiKey;
    private readonly endpoint;
    private readonly timeout;
    constructor(configService: ConfigService, logger: LoggerService);
    parse(text: string, currentDate: string): Promise<FinancialEventsResponseDto>;
}

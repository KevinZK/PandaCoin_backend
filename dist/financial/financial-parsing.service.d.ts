import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RegionService } from '../common/region/region.service';
import { AIServiceRouter } from './providers/ai-service.router';
import { FinancialEventsResponseDto } from './dtos/financial-events.dto';
export declare class FinancialParsingService {
    private readonly prisma;
    private readonly logger;
    private readonly regionService;
    private readonly aiRouter;
    constructor(prisma: PrismaService, logger: LoggerService, regionService: RegionService, aiRouter: AIServiceRouter);
    parseFinancialStatement(text: string, userId: string, headers: Record<string, string>): Promise<FinancialEventsResponseDto>;
    private withTimeout;
    private logAudit;
    private getCurrentDate;
}

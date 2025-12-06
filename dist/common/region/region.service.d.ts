import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
export declare const EU_COUNTRIES: string[];
export type RegionCode = 'CN' | 'HK' | 'MO' | 'TW' | 'US' | 'CA' | 'EU' | 'OTHER';
export declare class RegionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService, logger: LoggerService);
    detectUserRegion(userId: string, headers: Record<string, string>): Promise<RegionCode>;
    private mapCountryToRegion;
}

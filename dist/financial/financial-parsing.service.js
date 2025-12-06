"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialParsingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const region_service_1 = require("../common/region/region.service");
const ai_service_router_1 = require("./providers/ai-service.router");
let FinancialParsingService = class FinancialParsingService {
    prisma;
    logger;
    regionService;
    aiRouter;
    constructor(prisma, logger, regionService, aiRouter) {
        this.prisma = prisma;
        this.logger = logger;
        this.regionService = regionService;
        this.aiRouter = aiRouter;
    }
    async parseFinancialStatement(text, userId, headers) {
        const startTime = Date.now();
        const currentDate = this.getCurrentDate();
        const region = await this.regionService.detectUserRegion(userId, headers);
        this.logger.log(`Parsing financial statement for user ${userId}, region: ${region}`, 'FinancialParsingService');
        const providerChain = this.aiRouter.getProviderChain(region);
        for (const provider of providerChain) {
            const providerStartTime = Date.now();
            try {
                const result = await this.withTimeout(provider.parse(text, currentDate), 8000);
                const duration = Date.now() - providerStartTime;
                await this.logAudit(userId, region, provider.name, 'SUCCESS', duration, null);
                this.logger.log(`Successfully parsed with ${provider.name} in ${duration}ms`, 'FinancialParsingService');
                return result;
            }
            catch (error) {
                const duration = Date.now() - providerStartTime;
                await this.logAudit(userId, region, provider.name, 'FAILURE', duration, error.message);
                this.logger.warn(`Provider ${provider.name} failed: ${error.message}`, 'FinancialParsingService');
            }
        }
        const totalDuration = Date.now() - startTime;
        this.logger.error(`All providers failed after ${totalDuration}ms`, undefined, 'FinancialParsingService');
        throw new Error('All AI providers failed to parse the financial statement');
    }
    withTimeout(promise, timeoutMs) {
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
    async logAudit(userId, userRegion, provider, status, durationMs, errorMessage) {
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
        }
        catch (error) {
            this.logger.warn(`Failed to log audit: ${error.message}`, 'FinancialParsingService');
        }
    }
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }
};
exports.FinancialParsingService = FinancialParsingService;
exports.FinancialParsingService = FinancialParsingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService,
        region_service_1.RegionService,
        ai_service_router_1.AIServiceRouter])
], FinancialParsingService);
//# sourceMappingURL=financial-parsing.service.js.map
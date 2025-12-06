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
exports.RegionService = exports.EU_COUNTRIES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const logger_service_1 = require("../logger/logger.service");
exports.EU_COUNTRIES = [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
];
let RegionService = class RegionService {
    prisma;
    logger;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async detectUserRegion(userId, headers) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { country: true },
            });
            if (user?.country) {
                const region = this.mapCountryToRegion(user.country);
                this.logger.debug(`Region from user profile: ${user.country} -> ${region}`, 'RegionService');
                return region;
            }
            const headerRegion = headers['x-region'] || headers['X-Region'] || headers['X-REGION'];
            if (headerRegion) {
                const region = this.mapCountryToRegion(headerRegion.toUpperCase());
                this.logger.debug(`Region from header: ${headerRegion} -> ${region}`, 'RegionService');
                return region;
            }
            this.logger.debug('Region defaulted to OTHER', 'RegionService');
            return 'OTHER';
        }
        catch (error) {
            this.logger.warn(`Failed to detect region: ${error.message}`, 'RegionService');
            return 'OTHER';
        }
    }
    mapCountryToRegion(countryCode) {
        const code = countryCode.toUpperCase();
        if (code === 'CN')
            return 'CN';
        if (code === 'HK')
            return 'HK';
        if (code === 'MO')
            return 'MO';
        if (code === 'TW')
            return 'TW';
        if (code === 'US')
            return 'US';
        if (code === 'CA')
            return 'CA';
        if (exports.EU_COUNTRIES.includes(code))
            return 'EU';
        return 'OTHER';
    }
};
exports.RegionService = RegionService;
exports.RegionService = RegionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], RegionService);
//# sourceMappingURL=region.service.js.map
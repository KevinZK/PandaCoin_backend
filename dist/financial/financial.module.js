"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const financial_controller_1 = require("./financial.controller");
const financial_parsing_service_1 = require("./financial-parsing.service");
const gemini_provider_1 = require("./providers/gemini.provider");
const openai_provider_1 = require("./providers/openai.provider");
const qwen_provider_1 = require("./providers/qwen.provider");
const ai_service_router_1 = require("./providers/ai-service.router");
const prisma_module_1 = require("../prisma/prisma.module");
const logger_module_1 = require("../common/logger/logger.module");
const region_module_1 = require("../common/region/region.module");
let FinancialModule = class FinancialModule {
};
exports.FinancialModule = FinancialModule;
exports.FinancialModule = FinancialModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, logger_module_1.LoggerModule, region_module_1.RegionModule],
        controllers: [financial_controller_1.FinancialController],
        providers: [
            financial_parsing_service_1.FinancialParsingService,
            gemini_provider_1.GeminiProvider,
            openai_provider_1.OpenAIProvider,
            qwen_provider_1.QwenProvider,
            ai_service_router_1.AIServiceRouter,
        ],
        exports: [financial_parsing_service_1.FinancialParsingService],
    })
], FinancialModule);
//# sourceMappingURL=financial.module.js.map
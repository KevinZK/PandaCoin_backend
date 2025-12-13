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
exports.AIServiceRouter = void 0;
const common_1 = require("@nestjs/common");
const gemini_provider_1 = require("./gemini.provider");
const openai_provider_1 = require("./openai.provider");
const qwen_provider_1 = require("./qwen.provider");
const logger_service_1 = require("../../common/logger/logger.service");
let AIServiceRouter = class AIServiceRouter {
    geminiProvider;
    openaiProvider;
    qwenProvider;
    logger;
    providers;
    constructor(geminiProvider, openaiProvider, qwenProvider, logger) {
        this.geminiProvider = geminiProvider;
        this.openaiProvider = openaiProvider;
        this.qwenProvider = qwenProvider;
        this.logger = logger;
        this.providers = new Map([
            ['Gemini', geminiProvider],
            ['OpenAI', openaiProvider],
            ['Qwen', qwenProvider],
        ]);
    }
    getPrimaryProvider(region) {
        const config = this.getRouteConfig(region);
        this.logger.debug(`Primary provider for ${region}: ${config.primary.name}`, 'AIServiceRouter');
        return config.primary;
    }
    getFallbackProviders(region) {
        const config = this.getRouteConfig(region);
        this.logger.debug(`Fallback providers for ${region}: ${config.fallbacks.map((p) => p.name).join(', ')}`, 'AIServiceRouter');
        return config.fallbacks;
    }
    getProviderChain(region) {
        const config = this.getRouteConfig(region);
        return [config.primary, ...config.fallbacks];
    }
    getRouteConfig(region) {
        return {
            primary: this.qwenProvider,
            fallbacks: [this.geminiProvider, this.openaiProvider],
        };
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    getProviderByName(name) {
        return this.providers.get(name);
    }
};
exports.AIServiceRouter = AIServiceRouter;
exports.AIServiceRouter = AIServiceRouter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_provider_1.GeminiProvider,
        openai_provider_1.OpenAIProvider,
        qwen_provider_1.QwenProvider,
        logger_service_1.LoggerService])
], AIServiceRouter);
//# sourceMappingURL=ai-service.router.js.map
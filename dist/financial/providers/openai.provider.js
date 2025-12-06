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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const financial_parsing_provider_interface_1 = require("./financial-parsing.provider.interface");
const system_prompt_1 = require("./system-prompt");
const logger_service_1 = require("../../common/logger/logger.service");
let OpenAIProvider = class OpenAIProvider {
    configService;
    logger;
    name = financial_parsing_provider_interface_1.PROVIDER_NAMES.OPENAI;
    apiKey;
    endpoint = 'https://api.openai.com/v1/chat/completions';
    model = 'gpt-4o-mini';
    timeout = 8000;
    constructor(configService, logger) {
        this.configService = configService;
        this.logger = logger;
        this.apiKey = this.configService.get('OPENAI_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('OPENAI_API_KEY not configured', 'OpenAIProvider');
        }
    }
    async parse(text, currentDate) {
        const systemPrompt = (0, system_prompt_1.getSystemPrompt)(currentDate);
        try {
            this.logger.debug(`OpenAI parsing: "${text.substring(0, 50)}..."`, 'OpenAIProvider');
            const response = await axios_1.default.post(this.endpoint, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: text,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 2048,
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }
            const cleanedContent = this.cleanJsonResponse(content);
            const parsed = JSON.parse(cleanedContent);
            this.logger.debug(`OpenAI parsed ${parsed.events.length} events`, 'OpenAIProvider');
            return parsed;
        }
        catch (error) {
            this.logger.error(`OpenAI parse failed: ${error.message}`, error.stack, 'OpenAIProvider');
            throw error;
        }
    }
    cleanJsonResponse(content) {
        let cleaned = content.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        }
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        return cleaned.trim();
    }
};
exports.OpenAIProvider = OpenAIProvider;
exports.OpenAIProvider = OpenAIProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], OpenAIProvider);
//# sourceMappingURL=openai.provider.js.map
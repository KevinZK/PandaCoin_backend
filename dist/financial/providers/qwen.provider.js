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
exports.QwenProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const financial_parsing_provider_interface_1 = require("./financial-parsing.provider.interface");
const system_prompt_1 = require("./system-prompt");
const logger_service_1 = require("../../common/logger/logger.service");
let QwenProvider = class QwenProvider {
    configService;
    logger;
    name = financial_parsing_provider_interface_1.PROVIDER_NAMES.QWEN;
    apiKey;
    endpoint = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    model = 'qwen-max';
    timeout = 10000;
    constructor(configService, logger) {
        this.configService = configService;
        this.logger = logger;
        this.apiKey = this.configService.get('QWEN_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('QWEN_API_KEY not configured', 'QwenProvider');
        }
    }
    async parse(text, currentDate) {
        const systemPrompt = (0, system_prompt_1.getSystemPrompt)(currentDate);
        try {
            this.logger.debug(`Qwen parsing: "${text.substring(0, 50)}..."`, 'QwenProvider');
            const response = await axios_1.default.post(this.endpoint, {
                model: this.model,
                input: {
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
                },
                parameters: {
                    result_format: 'message',
                    temperature: 0.1,
                    max_tokens: 2048,
                },
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            const content = response.data?.output?.choices?.[0]?.message?.content ||
                response.data?.output?.text;
            if (!content) {
                throw new Error('Empty response from Qwen');
            }
            const cleanedContent = this.extractJson(content);
            const parsed = JSON.parse(cleanedContent);
            this.logger.debug(`Qwen parsed ${parsed.events.length} events`, 'QwenProvider');
            return parsed;
        }
        catch (error) {
            this.logger.error(`Qwen parse failed: ${error.message}`, error.stack, 'QwenProvider');
            throw error;
        }
    }
    extractJson(content) {
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
        cleaned = cleaned.trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        return cleaned;
    }
};
exports.QwenProvider = QwenProvider;
exports.QwenProvider = QwenProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], QwenProvider);
//# sourceMappingURL=qwen.provider.js.map
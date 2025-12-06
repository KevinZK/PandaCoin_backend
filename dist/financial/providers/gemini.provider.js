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
exports.GeminiProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const financial_parsing_provider_interface_1 = require("./financial-parsing.provider.interface");
const system_prompt_1 = require("./system-prompt");
const logger_service_1 = require("../../common/logger/logger.service");
let GeminiProvider = class GeminiProvider {
    configService;
    logger;
    name = financial_parsing_provider_interface_1.PROVIDER_NAMES.GEMINI;
    apiKey;
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent';
    timeout = 8000;
    constructor(configService, logger) {
        this.configService = configService;
        this.logger = logger;
        this.apiKey = this.configService.get('GEMINI_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('GEMINI_API_KEY not configured', 'GeminiProvider');
        }
    }
    async parse(text, currentDate) {
        const systemPrompt = (0, system_prompt_1.getSystemPrompt)(currentDate);
        try {
            this.logger.debug(`Gemini parsing: "${text.substring(0, 50)}..."`, 'GeminiProvider');
            const response = await axios_1.default.post(`${this.endpoint}?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [
                            {
                                text: `${systemPrompt}\n\nUser input: ${text}`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: system_prompt_1.FINANCIAL_EVENTS_JSON_SCHEMA,
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_NONE',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_NONE',
                    },
                ],
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) {
                throw new Error('Empty response from Gemini');
            }
            const parsed = JSON.parse(content);
            this.logger.debug(`Gemini parsed ${parsed.events.length} events`, 'GeminiProvider');
            return parsed;
        }
        catch (error) {
            this.logger.error(`Gemini parse failed: ${error.message}`, error.stack, 'GeminiProvider');
            throw error;
        }
    }
};
exports.GeminiProvider = GeminiProvider;
exports.GeminiProvider = GeminiProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], GeminiProvider);
//# sourceMappingURL=gemini.provider.js.map
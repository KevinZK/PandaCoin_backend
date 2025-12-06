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
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
let LoggerService = class LoggerService {
    logger;
    constructor() {
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'debug',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf((info) => {
                        const { timestamp, level, message, context, trace, ...meta } = info;
                        const ctx = context ? `[${context}]` : '';
                        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                        return `${timestamp} ${level} ${ctx} ${message} ${metaStr} ${trace || ''}`;
                    })),
                }),
                new winston_daily_rotate_file_1.default({
                    filename: 'logs/combined-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
                }),
                new winston_daily_rotate_file_1.default({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: '20m',
                    maxFiles: '30d',
                }),
                new winston_daily_rotate_file_1.default({
                    filename: 'logs/http-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '20m',
                    maxFiles: '7d',
                }),
            ],
        });
    }
    log(message, context) {
        if (context) {
            this.logger.info(message, { context });
        }
        else {
            this.logger.info(message);
        }
    }
    error(message, trace, context) {
        const logData = {};
        if (context)
            logData.context = context;
        if (trace)
            logData.trace = trace;
        this.logger.error(message, logData);
    }
    warn(message, context) {
        if (context) {
            this.logger.warn(message, { context });
        }
        else {
            this.logger.warn(message);
        }
    }
    debug(message, context) {
        if (context) {
            this.logger.debug(message, { context });
        }
        else {
            this.logger.debug(message);
        }
    }
    verbose(message, context) {
        if (context) {
            this.logger.verbose(message, { context });
        }
        else {
            this.logger.verbose(message);
        }
    }
    logHttp(req, res, responseTime) {
        const { method, originalUrl, ip, headers } = req;
        const { statusCode } = res;
        const logData = {
            timestamp: new Date().toISOString(),
            method,
            url: originalUrl,
            statusCode,
            responseTime: `${responseTime}ms`,
            ip,
            userAgent: headers['user-agent'],
            userId: req.user?.id || 'anonymous',
        };
        this.logger.info('HTTP Request', logData);
    }
    logApiCall(endpoint, method, params, response, error) {
        const logData = {
            endpoint,
            method,
            params: params ? this.sanitizeData(params) : undefined,
            response: response ? this.sanitizeData(response) : undefined,
            error: error ? this.sanitizeError(error) : undefined,
            timestamp: new Date().toISOString(),
        };
        if (error) {
            this.logger.error('API Error', logData);
        }
        else {
            this.logger.debug('API Call', logData);
        }
    }
    logDbQuery(query, params, duration) {
        this.logger.debug('Database Query', {
            query,
            params: this.sanitizeData(params),
            duration: duration ? `${duration}ms` : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    logAiCall(provider, model, input, output, error) {
        const logData = {
            provider,
            model,
            input: input.substring(0, 200),
            output: output ? output.substring(0, 500) : undefined,
            error: error ? this.sanitizeError(error) : undefined,
            timestamp: new Date().toISOString(),
        };
        if (error) {
            this.logger.error('AI Call Failed', logData);
        }
        else {
            this.logger.info('AI Call Success', logData);
        }
    }
    sanitizeData(data) {
        if (!data)
            return data;
        const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'apiKey'];
        const sanitized = JSON.parse(JSON.stringify(data));
        const cleanObject = (obj) => {
            for (const key in obj) {
                if (sensitiveFields.includes(key)) {
                    obj[key] = '***REDACTED***';
                }
                else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    cleanObject(obj[key]);
                }
            }
        };
        cleanObject(sanitized);
        return sanitized;
    }
    sanitizeError(error) {
        return {
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.status,
        };
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LoggerService);
//# sourceMappingURL=logger.service.js.map
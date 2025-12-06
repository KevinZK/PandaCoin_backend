import { LoggerService as NestLoggerService } from '@nestjs/common';
export declare class LoggerService implements NestLoggerService {
    private logger;
    constructor();
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    logHttp(req: any, res: any, responseTime: number): void;
    logApiCall(endpoint: string, method: string, params?: any, response?: any, error?: any): void;
    logDbQuery(query: string, params?: any, duration?: number): void;
    logAiCall(provider: string, model: string, input: string, output?: string, error?: any): void;
    private sanitizeData;
    private sanitizeError;
}

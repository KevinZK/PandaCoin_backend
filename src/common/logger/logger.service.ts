import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      transports: [
        // 控制台输出 - 彩色格式
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => {
              const { timestamp, level, message, context, trace, ...meta } = info;
              const ctx = context ? `[${context}]` : '';
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} ${level} ${ctx} ${message} ${metaStr} ${trace || ''}`;
            }),
          ),
        }),
        
        // 所有日志 - 按日期轮转
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        
        // 错误日志单独记录
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
        }),
        
        // HTTP请求日志
        new DailyRotateFile({
          filename: 'logs/http-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    if (context) {
      this.logger.info(message, { context });
    } else {
      this.logger.info(message);
    }
  }

  error(message: string, trace?: string, context?: string) {
    const logData: any = {};
    if (context) logData.context = context;
    if (trace) logData.trace = trace;
    this.logger.error(message, logData);
  }

  warn(message: string, context?: string) {
    if (context) {
      this.logger.warn(message, { context });
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string, context?: string) {
    if (context) {
      this.logger.debug(message, { context });
    } else {
      this.logger.debug(message);
    }
  }

  verbose(message: string, context?: string) {
    if (context) {
      this.logger.verbose(message, { context });
    } else {
      this.logger.verbose(message);
    }
  }

  // HTTP请求日志
  logHttp(req: any, res: any, responseTime: number) {
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

  // API调用日志
  logApiCall(endpoint: string, method: string, params?: any, response?: any, error?: any) {
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
    } else {
      this.logger.debug('API Call', logData);
    }
  }

  // 数据库查询日志
  logDbQuery(query: string, params?: any, duration?: number) {
    this.logger.debug('Database Query', {
      query,
      params: this.sanitizeData(params),
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  // AI调用日志
  logAiCall(provider: string, model: string, input: string, output?: string, error?: any) {
    const logData = {
      provider,
      model,
      input: input.substring(0, 200), // 限制输入长度
      output: output ? output.substring(0, 500) : undefined,
      error: error ? this.sanitizeError(error) : undefined,
      timestamp: new Date().toISOString(),
    };

    if (error) {
      this.logger.error('AI Call Failed', logData);
    } else {
      this.logger.info('AI Call Success', logData);
    }
  }

  // 清理敏感数据
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'apiKey'];
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const cleanObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.includes(key)) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          cleanObject(obj[key]);
        }
      }
    };
    
    cleanObject(sanitized);
    return sanitized;
  }

  // 格式化错误信息
  private sanitizeError(error: any): any {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
    };
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, params, headers } = request;

    // 记录请求开始
    this.logger.debug(`📥 Incoming Request: ${method} ${url}`, 'HTTP');
    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`Body: ${JSON.stringify(this.sanitizeBody(body))}`, 'HTTP');
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          
          // 记录成功响应
          this.logger.debug(`📤 Response: ${method} ${url} - ${response.statusCode} (${responseTime}ms)`, 'HTTP');

          // 记录HTTP请求
          this.logger.logHttp(request, response, responseTime);
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          
          // 记录错误响应
          this.logger.error(
            `❌ Error Response: ${method} ${url} - ${error.status || 500} (${responseTime}ms)`,
            error.stack,
            'HTTP'
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });
    
    return sanitized;
  }
}

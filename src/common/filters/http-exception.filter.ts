import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseDto, ResponseCode } from '../dto/response.dto';
import { LoggerService } from '../logger/logger.service';

/**
 * HTTP异常过滤器 - 统一处理异常响应
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = ResponseCode.SERVER_ERROR;

    // 处理HTTP异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || message;
        
        // 处理验证错误（class-validator返回的是数组）
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      }

      // 根据HTTP状态码映射响应码
      switch (status) {
        case HttpStatus.UNAUTHORIZED:
          code = ResponseCode.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          code = ResponseCode.FORBIDDEN;
          break;
        case HttpStatus.NOT_FOUND:
          code = ResponseCode.NOT_FOUND;
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
        case HttpStatus.BAD_REQUEST:
          code = ResponseCode.VALIDATION_ERROR;
          break;
        default:
          code = ResponseCode.FAILED;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 记录错误日志
    this.logger.error(
      `HTTP异常: ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // 返回统一格式的错误响应
    const errorResponse = new ResponseDto(
      code,
      message,
      null,
      request.url,
    );

    response.status(status).json(errorResponse);
  }
}

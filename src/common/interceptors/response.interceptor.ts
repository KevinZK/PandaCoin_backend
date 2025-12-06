import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto, ResponseCode } from '../dto/response.dto';

/**
 * 响应拦截器 - 统一包装响应格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => {
        // 如果返回的已经是ResponseDto格式，直接返回
        if (data instanceof ResponseDto) {
          data.path = path;
          return data;
        }

        // 否则包装成标准格式
        return new ResponseDto(
          ResponseCode.SUCCESS,
          '操作成功',
          data,
          path,
        );
      }),
    );
  }
}

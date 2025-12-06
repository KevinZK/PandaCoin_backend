/**
 * 通用响应格式DTO
 */

// 响应状态码枚举
export enum ResponseCode {
  SUCCESS = 0,
  FAILED = -1,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
  SERVER_ERROR = 500,
}

// 通用响应接口
export interface IResponse<T = any> {
  code: ResponseCode;
  message: string;
  data?: T;
  timestamp: number;
  path?: string;
}

// 分页数据接口
export interface IPaginationData<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 通用响应类
export class ResponseDto<T = any> implements IResponse<T> {
  code: ResponseCode;
  message: string;
  data?: T;
  timestamp: number;
  path?: string;

  constructor(code: ResponseCode, message: string, data?: T, path?: string) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = Date.now();
    this.path = path;
  }

  // 成功响应
  static success<T>(data?: T, message = '操作成功'): ResponseDto<T> {
    return new ResponseDto(ResponseCode.SUCCESS, message, data);
  }

  // 失败响应
  static failed(message = '操作失败', code = ResponseCode.FAILED): ResponseDto<null> {
    return new ResponseDto(code, message, null);
  }

  // 分页成功响应
  static paginate<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
    message = '查询成功',
  ): ResponseDto<IPaginationData<T>> {
    const totalPages = Math.ceil(total / pageSize);
    const paginationData: IPaginationData<T> = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return new ResponseDto(ResponseCode.SUCCESS, message, paginationData);
  }

  // 验证错误响应
  static validationError(message = '数据验证失败'): ResponseDto<null> {
    return new ResponseDto(ResponseCode.VALIDATION_ERROR, message, null);
  }

  // 未授权响应
  static unauthorized(message = '未授权访问'): ResponseDto<null> {
    return new ResponseDto(ResponseCode.UNAUTHORIZED, message, null);
  }

  // 禁止访问响应
  static forbidden(message = '没有权限访问'): ResponseDto<null> {
    return new ResponseDto(ResponseCode.FORBIDDEN, message, null);
  }

  // 资源不存在响应
  static notFound(message = '资源不存在'): ResponseDto<null> {
    return new ResponseDto(ResponseCode.NOT_FOUND, message, null);
  }

  // 服务器错误响应
  static serverError(message = '服务器内部错误'): ResponseDto<null> {
    return new ResponseDto(ResponseCode.SERVER_ERROR, message, null);
  }
}

// 分页查询DTO
export class PaginationDto {
  page?: number = 1;
  pageSize?: number = 10;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
}

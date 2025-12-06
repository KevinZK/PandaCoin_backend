export declare enum ResponseCode {
    SUCCESS = 0,
    FAILED = -1,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    VALIDATION_ERROR = 422,
    SERVER_ERROR = 500
}
export interface IResponse<T = any> {
    code: ResponseCode;
    message: string;
    data?: T;
    timestamp: number;
    path?: string;
}
export interface IPaginationData<T = any> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export declare class ResponseDto<T = any> implements IResponse<T> {
    code: ResponseCode;
    message: string;
    data?: T;
    timestamp: number;
    path?: string;
    constructor(code: ResponseCode, message: string, data?: T, path?: string);
    static success<T>(data?: T, message?: string): ResponseDto<T>;
    static failed(message?: string, code?: ResponseCode): ResponseDto<null>;
    static paginate<T>(items: T[], total: number, page: number, pageSize: number, message?: string): ResponseDto<IPaginationData<T>>;
    static validationError(message?: string): ResponseDto<null>;
    static unauthorized(message?: string): ResponseDto<null>;
    static forbidden(message?: string): ResponseDto<null>;
    static notFound(message?: string): ResponseDto<null>;
    static serverError(message?: string): ResponseDto<null>;
}
export declare class PaginationDto {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationDto = exports.ResponseDto = exports.ResponseCode = void 0;
var ResponseCode;
(function (ResponseCode) {
    ResponseCode[ResponseCode["SUCCESS"] = 0] = "SUCCESS";
    ResponseCode[ResponseCode["FAILED"] = -1] = "FAILED";
    ResponseCode[ResponseCode["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    ResponseCode[ResponseCode["FORBIDDEN"] = 403] = "FORBIDDEN";
    ResponseCode[ResponseCode["NOT_FOUND"] = 404] = "NOT_FOUND";
    ResponseCode[ResponseCode["VALIDATION_ERROR"] = 422] = "VALIDATION_ERROR";
    ResponseCode[ResponseCode["SERVER_ERROR"] = 500] = "SERVER_ERROR";
})(ResponseCode || (exports.ResponseCode = ResponseCode = {}));
class ResponseDto {
    code;
    message;
    data;
    timestamp;
    path;
    constructor(code, message, data, path) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.timestamp = Date.now();
        this.path = path;
    }
    static success(data, message = '操作成功') {
        return new ResponseDto(ResponseCode.SUCCESS, message, data);
    }
    static failed(message = '操作失败', code = ResponseCode.FAILED) {
        return new ResponseDto(code, message, null);
    }
    static paginate(items, total, page, pageSize, message = '查询成功') {
        const totalPages = Math.ceil(total / pageSize);
        const paginationData = {
            items,
            total,
            page,
            pageSize,
            totalPages,
        };
        return new ResponseDto(ResponseCode.SUCCESS, message, paginationData);
    }
    static validationError(message = '数据验证失败') {
        return new ResponseDto(ResponseCode.VALIDATION_ERROR, message, null);
    }
    static unauthorized(message = '未授权访问') {
        return new ResponseDto(ResponseCode.UNAUTHORIZED, message, null);
    }
    static forbidden(message = '没有权限访问') {
        return new ResponseDto(ResponseCode.FORBIDDEN, message, null);
    }
    static notFound(message = '资源不存在') {
        return new ResponseDto(ResponseCode.NOT_FOUND, message, null);
    }
    static serverError(message = '服务器内部错误') {
        return new ResponseDto(ResponseCode.SERVER_ERROR, message, null);
    }
}
exports.ResponseDto = ResponseDto;
class PaginationDto {
    page = 1;
    pageSize = 10;
    sortBy;
    sortOrder = 'desc';
}
exports.PaginationDto = PaginationDto;
//# sourceMappingURL=response.dto.js.map
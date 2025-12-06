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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const response_dto_1 = require("../dto/response.dto");
const logger_service_1 = require("../logger/logger.service");
let HttpExceptionFilter = class HttpExceptionFilter {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = '服务器内部错误';
        let code = response_dto_1.ResponseCode.SERVER_ERROR;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse;
                message = responseObj.message || responseObj.error || message;
                if (Array.isArray(message)) {
                    message = message.join(', ');
                }
            }
            switch (status) {
                case common_1.HttpStatus.UNAUTHORIZED:
                    code = response_dto_1.ResponseCode.UNAUTHORIZED;
                    break;
                case common_1.HttpStatus.FORBIDDEN:
                    code = response_dto_1.ResponseCode.FORBIDDEN;
                    break;
                case common_1.HttpStatus.NOT_FOUND:
                    code = response_dto_1.ResponseCode.NOT_FOUND;
                    break;
                case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
                case common_1.HttpStatus.BAD_REQUEST:
                    code = response_dto_1.ResponseCode.VALIDATION_ERROR;
                    break;
                default:
                    code = response_dto_1.ResponseCode.FAILED;
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        this.logger.error(`HTTP异常: ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
        const errorResponse = new response_dto_1.ResponseDto(code, message, null, request.url);
        response.status(status).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map
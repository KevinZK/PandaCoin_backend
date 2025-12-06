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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const financial_parsing_service_1 = require("./financial-parsing.service");
const financial_events_dto_1 = require("./dtos/financial-events.dto");
const response_dto_1 = require("../common/dto/response.dto");
let FinancialController = class FinancialController {
    financialParsingService;
    constructor(financialParsingService) {
        this.financialParsingService = financialParsingService;
    }
    async parseFinancial(body, req) {
        const userId = req.user?.sub || req.user?.id;
        const headers = req.headers;
        const result = await this.financialParsingService.parseFinancialStatement(body.text, userId, headers);
        return response_dto_1.ResponseDto.success(result, '解析成功');
    }
    async healthCheck() {
        return response_dto_1.ResponseDto.success({ status: 'ok' }, 'Financial service is healthy');
    }
};
exports.FinancialController = FinancialController;
__decorate([
    (0, common_1.Post)('parse'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [financial_events_dto_1.ParseFinancialRequestDto, Object]),
    __metadata("design:returntype", Promise)
], FinancialController.prototype, "parseFinancial", null);
__decorate([
    (0, common_1.Post)('health'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinancialController.prototype, "healthCheck", null);
exports.FinancialController = FinancialController = __decorate([
    (0, common_1.Controller)('financial'),
    __metadata("design:paramtypes", [financial_parsing_service_1.FinancialParsingService])
], FinancialController);
//# sourceMappingURL=financial.controller.js.map
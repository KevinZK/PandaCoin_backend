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
exports.BudgetsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const budgets_service_1 = require("./budgets.service");
const budget_dto_1 = require("./dto/budget.dto");
const response_dto_1 = require("../common/dto/response.dto");
let BudgetsController = class BudgetsController {
    budgetsService;
    constructor(budgetsService) {
        this.budgetsService = budgetsService;
    }
    async create(dto, req) {
        const userId = req.user?.sub || req.user?.id;
        const budget = await this.budgetsService.create(userId, dto);
        return response_dto_1.ResponseDto.success(budget, '预算创建成功');
    }
    async findAll(req) {
        const userId = req.user?.sub || req.user?.id;
        const budgets = await this.budgetsService.findAll(userId);
        return response_dto_1.ResponseDto.success(budgets);
    }
    async findByMonth(month, req) {
        const userId = req.user?.sub || req.user?.id;
        const budgets = await this.budgetsService.findByMonth(userId, month);
        return response_dto_1.ResponseDto.success(budgets);
    }
    async getCurrentProgress(req) {
        const userId = req.user?.sub || req.user?.id;
        const progress = await this.budgetsService.getCurrentMonthProgress(userId);
        return response_dto_1.ResponseDto.success(progress);
    }
    async getProgress(month, req) {
        const userId = req.user?.sub || req.user?.id;
        const progress = await this.budgetsService.getMonthlyProgress(userId, month);
        return response_dto_1.ResponseDto.success(progress);
    }
    async copyFromPrevious(req) {
        const userId = req.user?.sub || req.user?.id;
        const count = await this.budgetsService.copyFromPreviousMonth(userId);
        return response_dto_1.ResponseDto.success({ copiedCount: count }, count > 0 ? `成功复制 ${count} 个预算` : '上月没有可复制的预算');
    }
    async findOne(id, req) {
        const userId = req.user?.sub || req.user?.id;
        const budget = await this.budgetsService.findOne(userId, id);
        return response_dto_1.ResponseDto.success(budget);
    }
    async update(id, dto, req) {
        const userId = req.user?.sub || req.user?.id;
        const budget = await this.budgetsService.update(userId, id, dto);
        return response_dto_1.ResponseDto.success(budget, '预算更新成功');
    }
    async remove(id, req) {
        const userId = req.user?.sub || req.user?.id;
        await this.budgetsService.remove(userId, id);
        return response_dto_1.ResponseDto.success(null, '预算已删除');
    }
};
exports.BudgetsController = BudgetsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [budget_dto_1.CreateBudgetDto, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('month/:month'),
    __param(0, (0, common_1.Param)('month')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "findByMonth", null);
__decorate([
    (0, common_1.Get)('progress/current'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "getCurrentProgress", null);
__decorate([
    (0, common_1.Get)('progress/:month'),
    __param(0, (0, common_1.Param)('month')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Post)('copy-from-previous'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "copyFromPrevious", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, budget_dto_1.UpdateBudgetDto, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetsController.prototype, "remove", null);
exports.BudgetsController = BudgetsController = __decorate([
    (0, common_1.Controller)('budgets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [budgets_service_1.BudgetsService])
], BudgetsController);
//# sourceMappingURL=budgets.controller.js.map
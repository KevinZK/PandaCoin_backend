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
exports.MonthlyBudgetSummaryDto = exports.BudgetProgressDto = exports.UpdateBudgetDto = exports.CreateBudgetDto = void 0;
const class_validator_1 = require("class-validator");
class CreateBudgetDto {
    month;
    category;
    amount;
}
exports.CreateBudgetDto = CreateBudgetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}$/, { message: 'month 格式必须为 YYYY-MM' }),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "amount", void 0);
class UpdateBudgetDto {
    amount;
}
exports.UpdateBudgetDto = UpdateBudgetDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateBudgetDto.prototype, "amount", void 0);
class BudgetProgressDto {
    id;
    month;
    category;
    budgetAmount;
    spentAmount;
    remainingAmount;
    usagePercent;
    isOverBudget;
}
exports.BudgetProgressDto = BudgetProgressDto;
class MonthlyBudgetSummaryDto {
    month;
    totalBudget;
    totalSpent;
    totalRemaining;
    overallUsagePercent;
    categoryBudgets;
}
exports.MonthlyBudgetSummaryDto = MonthlyBudgetSummaryDto;
//# sourceMappingURL=budget.dto.js.map
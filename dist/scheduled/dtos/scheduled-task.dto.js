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
exports.UpdateScheduledTaskDto = exports.CreateScheduledTaskDto = exports.TaskFrequency = exports.TaskType = void 0;
const class_validator_1 = require("class-validator");
var TaskType;
(function (TaskType) {
    TaskType["INCOME"] = "INCOME";
    TaskType["EXPENSE"] = "EXPENSE";
    TaskType["TRANSFER"] = "TRANSFER";
})(TaskType || (exports.TaskType = TaskType = {}));
var TaskFrequency;
(function (TaskFrequency) {
    TaskFrequency["DAILY"] = "DAILY";
    TaskFrequency["WEEKLY"] = "WEEKLY";
    TaskFrequency["MONTHLY"] = "MONTHLY";
    TaskFrequency["YEARLY"] = "YEARLY";
})(TaskFrequency || (exports.TaskFrequency = TaskFrequency = {}));
class CreateScheduledTaskDto {
    name;
    type;
    amount;
    category;
    accountId;
    frequency;
    dayOfMonth;
    dayOfWeek;
    monthOfYear;
    executeTime;
    startDate;
    endDate;
    isEnabled;
    description;
}
exports.CreateScheduledTaskDto = CreateScheduledTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TaskType),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateScheduledTaskDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "accountId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TaskFrequency),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(31),
    __metadata("design:type", Number)
], CreateScheduledTaskDto.prototype, "dayOfMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], CreateScheduledTaskDto.prototype, "dayOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateScheduledTaskDto.prototype, "monthOfYear", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'executeTime must be in HH:mm format',
    }),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "executeTime", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateScheduledTaskDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateScheduledTaskDto.prototype, "description", void 0);
class UpdateScheduledTaskDto {
    name;
    type;
    amount;
    category;
    accountId;
    frequency;
    dayOfMonth;
    dayOfWeek;
    monthOfYear;
    executeTime;
    startDate;
    endDate;
    isEnabled;
    description;
}
exports.UpdateScheduledTaskDto = UpdateScheduledTaskDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TaskType),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], UpdateScheduledTaskDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "accountId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TaskFrequency),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(31),
    __metadata("design:type", Number)
], UpdateScheduledTaskDto.prototype, "dayOfMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], UpdateScheduledTaskDto.prototype, "dayOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], UpdateScheduledTaskDto.prototype, "monthOfYear", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'executeTime must be in HH:mm format',
    }),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "executeTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateScheduledTaskDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateScheduledTaskDto.prototype, "description", void 0);
//# sourceMappingURL=scheduled-task.dto.js.map
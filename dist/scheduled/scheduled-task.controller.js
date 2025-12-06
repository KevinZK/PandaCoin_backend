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
exports.ScheduledTaskController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const scheduled_task_service_1 = require("./scheduled-task.service");
const scheduled_task_dto_1 = require("./dtos/scheduled-task.dto");
const response_dto_1 = require("../common/dto/response.dto");
let ScheduledTaskController = class ScheduledTaskController {
    taskService;
    constructor(taskService) {
        this.taskService = taskService;
    }
    async create(dto, req) {
        const userId = req.user?.sub || req.user?.id;
        const task = await this.taskService.create(userId, dto);
        return response_dto_1.ResponseDto.success(task, '定时任务创建成功');
    }
    async findAll(req) {
        const userId = req.user?.sub || req.user?.id;
        const tasks = await this.taskService.findAll(userId);
        return response_dto_1.ResponseDto.success(tasks);
    }
    async findOne(id, req) {
        const userId = req.user?.sub || req.user?.id;
        const task = await this.taskService.findOne(userId, id);
        return response_dto_1.ResponseDto.success(task);
    }
    async update(id, dto, req) {
        const userId = req.user?.sub || req.user?.id;
        const task = await this.taskService.update(userId, id, dto);
        return response_dto_1.ResponseDto.success(task, '定时任务更新成功');
    }
    async delete(id, req) {
        const userId = req.user?.sub || req.user?.id;
        await this.taskService.delete(userId, id);
        return response_dto_1.ResponseDto.success(null, '定时任务已删除');
    }
    async toggle(id, req) {
        const userId = req.user?.sub || req.user?.id;
        const task = await this.taskService.toggle(userId, id);
        return response_dto_1.ResponseDto.success(task, task.isEnabled ? '任务已启用' : '任务已停用');
    }
    async execute(id, req) {
        const userId = req.user?.sub || req.user?.id;
        await this.taskService.findOne(userId, id);
        const result = await this.taskService.executeTask(id);
        return response_dto_1.ResponseDto.success(result, '任务执行成功');
    }
    async getLogs(id, limit, req) {
        const userId = req.user?.sub || req.user?.id;
        const logs = await this.taskService.getTaskLogs(userId, id, limit ? parseInt(limit) : 20);
        return response_dto_1.ResponseDto.success(logs);
    }
};
exports.ScheduledTaskController = ScheduledTaskController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scheduled_task_dto_1.CreateScheduledTaskDto, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, scheduled_task_dto_1.UpdateScheduledTaskDto, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "toggle", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "execute", null);
__decorate([
    (0, common_1.Get)(':id/logs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ScheduledTaskController.prototype, "getLogs", null);
exports.ScheduledTaskController = ScheduledTaskController = __decorate([
    (0, common_1.Controller)('scheduled-tasks'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [scheduled_task_service_1.ScheduledTaskService])
], ScheduledTaskController);
//# sourceMappingURL=scheduled-task.controller.js.map
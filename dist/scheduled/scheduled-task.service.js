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
exports.ScheduledTaskService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const scheduled_task_dto_1 = require("./dtos/scheduled-task.dto");
let ScheduledTaskService = class ScheduledTaskService {
    prisma;
    logger;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    async create(userId, dto) {
        const nextRunAt = this.calculateNextRunTime(dto);
        const task = await this.prisma.scheduledTask.create({
            data: {
                name: dto.name,
                type: dto.type,
                amount: dto.amount,
                category: dto.category,
                accountId: dto.accountId,
                userId,
                frequency: dto.frequency,
                dayOfMonth: dto.dayOfMonth,
                dayOfWeek: dto.dayOfWeek,
                monthOfYear: dto.monthOfYear,
                executeTime: dto.executeTime || '09:00',
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                isEnabled: dto.isEnabled ?? true,
                nextRunAt,
                description: dto.description,
            },
        });
        this.logger.log(`Created scheduled task: ${task.name} (${task.id})`, 'ScheduledTaskService');
        return task;
    }
    async findAll(userId) {
        return this.prisma.scheduledTask.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(userId, id) {
        const task = await this.prisma.scheduledTask.findFirst({
            where: { id, userId },
        });
        if (!task) {
            throw new common_1.NotFoundException('定时任务不存在');
        }
        return task;
    }
    async update(userId, id, dto) {
        await this.findOne(userId, id);
        const updateData = { ...dto };
        if (dto.startDate) {
            updateData.startDate = new Date(dto.startDate);
        }
        if (dto.endDate) {
            updateData.endDate = new Date(dto.endDate);
        }
        if (dto.frequency ||
            dto.dayOfMonth ||
            dto.dayOfWeek ||
            dto.monthOfYear ||
            dto.executeTime ||
            dto.startDate) {
            const task = await this.findOne(userId, id);
            const mergedDto = {
                ...task,
                ...dto,
                startDate: dto.startDate || task.startDate.toISOString(),
            };
            updateData.nextRunAt = this.calculateNextRunTime(mergedDto);
        }
        const task = await this.prisma.scheduledTask.update({
            where: { id },
            data: updateData,
        });
        this.logger.log(`Updated scheduled task: ${task.name} (${task.id})`, 'ScheduledTaskService');
        return task;
    }
    async delete(userId, id) {
        await this.findOne(userId, id);
        await this.prisma.scheduledTask.delete({
            where: { id },
        });
        this.logger.log(`Deleted scheduled task: ${id}`, 'ScheduledTaskService');
        return { success: true };
    }
    async toggle(userId, id) {
        const task = await this.findOne(userId, id);
        const updated = await this.prisma.scheduledTask.update({
            where: { id },
            data: { isEnabled: !task.isEnabled },
        });
        this.logger.log(`Toggled scheduled task: ${task.name} -> ${updated.isEnabled ? 'enabled' : 'disabled'}`, 'ScheduledTaskService');
        return updated;
    }
    async getPendingTasks() {
        const now = new Date();
        return this.prisma.scheduledTask.findMany({
            where: {
                isEnabled: true,
                nextRunAt: {
                    lte: now,
                },
                OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
        });
    }
    async executeTask(taskId) {
        const task = await this.prisma.scheduledTask.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('任务不存在');
        }
        try {
            const record = await this.prisma.record.create({
                data: {
                    amount: task.amount,
                    type: task.type,
                    category: task.category,
                    description: `[自动] ${task.name}`,
                    accountId: task.accountId,
                    userId: task.userId,
                    date: new Date(),
                    isConfirmed: true,
                },
            });
            const balanceChange = task.type === 'INCOME' ? task.amount : -task.amount;
            await this.prisma.account.update({
                where: { id: task.accountId },
                data: {
                    balance: {
                        increment: balanceChange,
                    },
                },
            });
            const nextRunAt = this.calculateNextRunTimeFromTask(task);
            await this.prisma.scheduledTask.update({
                where: { id: taskId },
                data: {
                    lastRunAt: new Date(),
                    nextRunAt,
                    runCount: { increment: 1 },
                },
            });
            await this.prisma.scheduledTaskLog.create({
                data: {
                    taskId,
                    recordId: record.id,
                    status: 'SUCCESS',
                    message: `成功创建 ${task.type} 记录: ¥${task.amount}`,
                },
            });
            this.logger.log(`Executed task ${task.name}: created record ${record.id}`, 'ScheduledTaskService');
            return { success: true, recordId: record.id };
        }
        catch (error) {
            await this.prisma.scheduledTaskLog.create({
                data: {
                    taskId,
                    status: 'FAILED',
                    message: error.message,
                },
            });
            this.logger.error(`Failed to execute task ${task.name}: ${error.message}`, error.stack, 'ScheduledTaskService');
            throw error;
        }
    }
    async getTaskLogs(userId, taskId, limit = 20) {
        await this.findOne(userId, taskId);
        return this.prisma.scheduledTaskLog.findMany({
            where: { taskId },
            orderBy: { executedAt: 'desc' },
            take: limit,
        });
    }
    calculateNextRunTime(dto) {
        const startDate = new Date(dto.startDate);
        const [hours, minutes] = (dto.executeTime || '09:00').split(':').map(Number);
        const now = new Date();
        let nextRun = new Date(startDate);
        nextRun.setHours(hours, minutes, 0, 0);
        if (nextRun > now) {
            return this.adjustToFrequency(nextRun, dto);
        }
        return this.calculateNextFromNow(now, dto);
    }
    calculateNextRunTimeFromTask(task) {
        const now = new Date();
        const [hours, minutes] = task.executeTime.split(':').map(Number);
        return this.calculateNextFromNow(now, {
            frequency: task.frequency,
            dayOfMonth: task.dayOfMonth,
            dayOfWeek: task.dayOfWeek,
            monthOfYear: task.monthOfYear,
            executeTime: task.executeTime,
            startDate: task.startDate.toISOString(),
        });
    }
    calculateNextFromNow(now, dto) {
        const [hours, minutes] = (dto.executeTime || '09:00').split(':').map(Number);
        let next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        switch (dto.frequency) {
            case scheduled_task_dto_1.TaskFrequency.DAILY:
                if (next <= now) {
                    next.setDate(next.getDate() + 1);
                }
                break;
            case scheduled_task_dto_1.TaskFrequency.WEEKLY:
                const targetDay = dto.dayOfWeek ?? 1;
                const currentDay = next.getDay();
                let daysUntil = targetDay - currentDay;
                if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
                    daysUntil += 7;
                }
                next.setDate(next.getDate() + daysUntil);
                break;
            case scheduled_task_dto_1.TaskFrequency.MONTHLY:
                const targetDate = dto.dayOfMonth ?? 1;
                next.setDate(targetDate);
                if (next <= now) {
                    next.setMonth(next.getMonth() + 1);
                }
                if (next.getDate() !== targetDate) {
                    next.setDate(0);
                }
                break;
            case scheduled_task_dto_1.TaskFrequency.YEARLY:
                const targetMonth = (dto.monthOfYear ?? 1) - 1;
                const targetDay2 = dto.dayOfMonth ?? 1;
                next.setMonth(targetMonth, targetDay2);
                if (next <= now) {
                    next.setFullYear(next.getFullYear() + 1);
                }
                break;
        }
        return next;
    }
    adjustToFrequency(date, dto) {
        switch (dto.frequency) {
            case scheduled_task_dto_1.TaskFrequency.WEEKLY:
                const targetDay = dto.dayOfWeek ?? 1;
                const currentDay = date.getDay();
                const diff = targetDay - currentDay;
                date.setDate(date.getDate() + diff);
                break;
            case scheduled_task_dto_1.TaskFrequency.MONTHLY:
                if (dto.dayOfMonth) {
                    date.setDate(dto.dayOfMonth);
                }
                break;
            case scheduled_task_dto_1.TaskFrequency.YEARLY:
                if (dto.monthOfYear) {
                    date.setMonth(dto.monthOfYear - 1);
                }
                if (dto.dayOfMonth) {
                    date.setDate(dto.dayOfMonth);
                }
                break;
        }
        return date;
    }
};
exports.ScheduledTaskService = ScheduledTaskService;
exports.ScheduledTaskService = ScheduledTaskService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], ScheduledTaskService);
//# sourceMappingURL=scheduled-task.service.js.map
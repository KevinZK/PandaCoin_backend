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
exports.ScheduledTaskExecutor = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const scheduled_task_service_1 = require("./scheduled-task.service");
const logger_service_1 = require("../common/logger/logger.service");
let ScheduledTaskExecutor = class ScheduledTaskExecutor {
    taskService;
    logger;
    isRunning = false;
    constructor(taskService, logger) {
        this.taskService = taskService;
        this.logger = logger;
    }
    async handleCron() {
        if (this.isRunning) {
            this.logger.debug('Task executor is already running, skipping...', 'ScheduledTaskExecutor');
            return;
        }
        this.isRunning = true;
        try {
            const pendingTasks = await this.taskService.getPendingTasks();
            if (pendingTasks.length === 0) {
                return;
            }
            this.logger.log(`Found ${pendingTasks.length} pending scheduled tasks`, 'ScheduledTaskExecutor');
            for (const task of pendingTasks) {
                try {
                    await this.taskService.executeTask(task.id);
                    this.logger.log(`Successfully executed task: ${task.name}`, 'ScheduledTaskExecutor');
                }
                catch (error) {
                    this.logger.error(`Failed to execute task ${task.name}: ${error.message}`, error.stack, 'ScheduledTaskExecutor');
                }
            }
        }
        catch (error) {
            this.logger.error(`Error in scheduled task executor: ${error.message}`, error.stack, 'ScheduledTaskExecutor');
        }
        finally {
            this.isRunning = false;
        }
    }
    async cleanupOldLogs() {
        this.logger.log('Starting cleanup of old task logs', 'ScheduledTaskExecutor');
    }
};
exports.ScheduledTaskExecutor = ScheduledTaskExecutor;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledTaskExecutor.prototype, "handleCron", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledTaskExecutor.prototype, "cleanupOldLogs", null);
exports.ScheduledTaskExecutor = ScheduledTaskExecutor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [scheduled_task_service_1.ScheduledTaskService,
        logger_service_1.LoggerService])
], ScheduledTaskExecutor);
//# sourceMappingURL=scheduled-task.executor.js.map
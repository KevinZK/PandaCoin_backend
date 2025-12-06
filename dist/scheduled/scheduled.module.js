"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const scheduled_task_controller_1 = require("./scheduled-task.controller");
const scheduled_task_service_1 = require("./scheduled-task.service");
const scheduled_task_executor_1 = require("./scheduled-task.executor");
const prisma_module_1 = require("../prisma/prisma.module");
const logger_module_1 = require("../common/logger/logger.module");
let ScheduledModule = class ScheduledModule {
};
exports.ScheduledModule = ScheduledModule;
exports.ScheduledModule = ScheduledModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule.forRoot(), prisma_module_1.PrismaModule, logger_module_1.LoggerModule],
        controllers: [scheduled_task_controller_1.ScheduledTaskController],
        providers: [scheduled_task_service_1.ScheduledTaskService, scheduled_task_executor_1.ScheduledTaskExecutor],
        exports: [scheduled_task_service_1.ScheduledTaskService],
    })
], ScheduledModule);
//# sourceMappingURL=scheduled.module.js.map
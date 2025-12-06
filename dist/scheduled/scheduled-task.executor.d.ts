import { ScheduledTaskService } from './scheduled-task.service';
import { LoggerService } from '../common/logger/logger.service';
export declare class ScheduledTaskExecutor {
    private readonly taskService;
    private readonly logger;
    private isRunning;
    constructor(taskService: ScheduledTaskService, logger: LoggerService);
    handleCron(): Promise<void>;
    cleanupOldLogs(): Promise<void>;
}

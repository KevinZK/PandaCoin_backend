import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';
import { LoggerService } from '../common/logger/logger.service';

/**
 * 定时任务执行器
 * 使用 Cron 定期检查并执行到期的任务
 */
@Injectable()
export class ScheduledTaskExecutor {
  private isRunning = false;

  constructor(
    private readonly taskService: ScheduledTaskService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 每分钟检查一次待执行的任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
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

      this.logger.log(
        `Found ${pendingTasks.length} pending scheduled tasks`,
        'ScheduledTaskExecutor',
      );

      for (const task of pendingTasks) {
        try {
          await this.taskService.executeTask(task.id);
          this.logger.log(
            `Successfully executed task: ${task.name}`,
            'ScheduledTaskExecutor',
          );
        } catch (error) {
          this.logger.error(
            `Failed to execute task ${task.name}: ${error.message}`,
            error.stack,
            'ScheduledTaskExecutor',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in scheduled task executor: ${error.message}`,
        error.stack,
        'ScheduledTaskExecutor',
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 每天凌晨清理过期任务的日志 (保留30天)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldLogs() {
    this.logger.log('Starting cleanup of old task logs', 'ScheduledTaskExecutor');
    
    // 这里可以添加清理逻辑
    // 例如删除30天前的日志
  }
}

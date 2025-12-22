import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';
import { BudgetsService } from '../budgets/budgets.service';
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
    private readonly budgetsService: BudgetsService,
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

  /**
   * 每月1日凌晨1点自动创建循环预算
   * 将上个月 isRecurring=true 的预算复制到当月
   */
  @Cron('0 1 1 * *') // 每月1日 01:00
  async autoCreateRecurringBudgets() {
    this.logger.log('Starting auto-creation of recurring budgets', 'ScheduledTaskExecutor');

    try {
      const createdCount = await this.budgetsService.autoCreateRecurringBudgets();
      this.logger.log(
        `Auto-created ${createdCount} recurring budgets`,
        'ScheduledTaskExecutor',
      );
    } catch (error) {
      this.logger.error(
        `Failed to auto-create recurring budgets: ${error.message}`,
        error.stack,
        'ScheduledTaskExecutor',
      );
    }
  }
}

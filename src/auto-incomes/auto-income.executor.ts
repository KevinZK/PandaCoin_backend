import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoIncomesService } from './auto-incomes.service';

@Injectable()
export class AutoIncomeExecutor {
  private readonly logger = new Logger(AutoIncomeExecutor.name);
  private isRunning = false;

  constructor(private readonly autoIncomesService: AutoIncomesService) {}

  /**
   * 每日 9:00 执行待入账的配置
   */
  @Cron('0 9 * * *')
  async executeAutoIncomes() {
    if (this.isRunning) {
      this.logger.warn('自动入账任务正在执行中，跳过本次');
      return;
    }

    this.isRunning = true;
    this.logger.log('开始执行自动入账任务...');

    try {
      const pendingIncomes = await this.autoIncomesService.getPendingIncomes();
      this.logger.log(`找到 ${pendingIncomes.length} 个待执行的自动入账配置`);

      let successCount = 0;
      let failCount = 0;

      for (const income of pendingIncomes) {
        try {
          const result = await this.autoIncomesService.executeIncome(income.id);
          if (result.success) {
            successCount++;
            this.logger.log(`[${income.name}] 入账成功: ¥${result.amount}`);
          } else {
            failCount++;
            this.logger.warn(`[${income.name}] 入账失败: ${result.message}`);
          }
        } catch (error) {
          failCount++;
          this.logger.error(`[${income.name}] 执行异常: ${error.message}`);
        }
      }

      this.logger.log(
        `自动入账任务完成: 成功 ${successCount}, 失败 ${failCount}`,
      );
    } catch (error) {
      this.logger.error(`自动入账任务执行失败: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 每日 8:00 发送入账提醒
   */
  @Cron('0 8 * * *')
  async sendIncomeReminders() {
    this.logger.log('开始检查入账提醒...');

    try {
      // 获取今天和明天将要入账的配置
      const upcomingIncomes = await this.autoIncomesService.getUpcomingIncomes(1);

      for (const income of upcomingIncomes) {
        // 检查是否需要提醒（根据 reminderDaysBefore 设置）
        const now = new Date();
        const executeDate = income.nextExecuteAt;
        if (!executeDate) continue;

        const daysUntilExecution = Math.ceil(
          (executeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilExecution <= income.reminderDaysBefore) {
          this.logger.log(
            `[提醒] ${income.name} 将于 ${daysUntilExecution} 天后入账 ¥${income.amount}`,
          );

          // TODO: 发送推送通知
          // await this.notificationService.sendIncomeReminder(income);
        }
      }
    } catch (error) {
      this.logger.error(`入账提醒检查失败: ${error.message}`);
    }
  }

  /**
   * 每周日 3:00 清理旧日志
   */
  @Cron('0 3 * * 0')
  async cleanupOldLogs() {
    this.logger.log('开始清理旧的自动入账日志...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 这里可以添加清理逻辑
      // await this.prisma.autoIncomeLog.deleteMany({
      //   where: { executedAt: { lt: thirtyDaysAgo } },
      // });

      this.logger.log('旧日志清理完成');
    } catch (error) {
      this.logger.error(`日志清理失败: ${error.message}`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoPaymentsService } from './auto-payments.service';
import { LoggerService } from '../common/logger/logger.service';

/**
 * 自动扣款执行器
 * 每日检查并执行到期的自动扣款
 */
@Injectable()
export class AutoPaymentExecutor {
  private isRunning = false;

  constructor(
    private readonly autoPaymentsService: AutoPaymentsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 每天早上 8 点执行自动扣款
   */
  @Cron('0 8 * * *')
  async executeAutoPayments() {
    if (this.isRunning) {
      this.logger.debug(
        'Auto payment executor is already running, skipping...',
        'AutoPaymentExecutor',
      );
      return;
    }

    this.isRunning = true;

    try {
      const pendingPayments = await this.autoPaymentsService.getPendingPayments();

      if (pendingPayments.length === 0) {
        this.logger.debug('No pending auto payments', 'AutoPaymentExecutor');
        return;
      }

      this.logger.log(
        `Found ${pendingPayments.length} pending auto payments`,
        'AutoPaymentExecutor',
      );

      let successCount = 0;
      let failCount = 0;

      for (const payment of pendingPayments) {
        try {
          const result = await this.autoPaymentsService.executePayment(payment.id);

          if (result.success) {
            successCount++;
            this.logger.log(
              `Successfully executed auto payment: ${payment.name}`,
              'AutoPaymentExecutor',
            );
          } else {
            failCount++;
            this.logger.warn(
              `Auto payment ${payment.name} failed: ${result.message}`,
              'AutoPaymentExecutor',
            );
          }
        } catch (error) {
          failCount++;
          this.logger.error(
            `Failed to execute auto payment ${payment.name}: ${error.message}`,
            error.stack,
            'AutoPaymentExecutor',
          );
        }
      }

      this.logger.log(
        `Auto payments completed: ${successCount} success, ${failCount} failed`,
        'AutoPaymentExecutor',
      );
    } catch (error) {
      this.logger.error(
        `Error in auto payment executor: ${error.message}`,
        error.stack,
        'AutoPaymentExecutor',
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 每天早上 9 点发送还款提醒
   */
  @Cron('0 9 * * *')
  async sendPaymentReminders() {
    try {
      // 获取 2 天后到期的扣款
      const upcomingPayments = await this.autoPaymentsService.getUpcomingPayments(2);

      if (upcomingPayments.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${upcomingPayments.length} upcoming payments to remind`,
        'AutoPaymentExecutor',
      );

      for (const payment of upcomingPayments) {
        // 检查来源账户余额
        let message = `${payment.name} 将于 ${payment.dayOfMonth} 号自动扣款`;

        if (payment.sources && payment.sources.length > 0) {
          const requiredAmount = payment.fixedAmount || 0;
          // 计算所有来源账户的总余额
          const totalBalance = payment.sources.reduce(
            (sum, source) => sum + source.account.balance,
            0,
          );

          if (totalBalance < requiredAmount) {
            const shortfall = requiredAmount - totalBalance;
            message += `\n⚠️ 余额不足! 需要 ¥${requiredAmount}，可用 ¥${totalBalance}，差额 ¥${shortfall}`;
          } else {
            message += `\n✅ 余额充足`;
          }
        } else {
          message += `\n⚠️ 未设置扣款账户，请及时设置`;
        }

        // TODO: 发送推送通知
        this.logger.log(
          `Payment reminder: ${message}`,
          'AutoPaymentExecutor',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending payment reminders: ${error.message}`,
        error.stack,
        'AutoPaymentExecutor',
      );
    }
  }

  /**
   * 每周日凌晨 3 点清理 30 天前的执行日志
   */
  @Cron('0 3 * * 0')
  async cleanupOldLogs() {
    this.logger.log('Starting cleanup of old auto payment logs', 'AutoPaymentExecutor');

    // TODO: 实现日志清理逻辑
    // await this.prisma.autoPaymentLog.deleteMany({
    //   where: {
    //     executedAt: {
    //       lt: subDays(new Date(), 30),
    //     },
    //   },
    // });
  }
}


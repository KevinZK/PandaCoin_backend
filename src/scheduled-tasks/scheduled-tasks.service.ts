import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
  TaskFrequency,
} from './dto/scheduled-task.dto';

@Injectable()
export class ScheduledTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 每分钟检查并执行到期的定时任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executeScheduledTasks() {
    const now = new Date();
    this.logger.debug(`检查定时任务: ${now.toISOString()}`, 'ScheduledTasks');

    // 查找需要执行的任务
    const tasks = await this.prisma.scheduledTask.findMany({
      where: {
        isEnabled: true,
        nextRunAt: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    for (const task of tasks) {
      await this.executeTask(task);
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: any) {
    const startTime = Date.now();

    try {
      // 创建记账记录
      const record = await this.prisma.record.create({
        data: {
          amount: task.amount,
          type: task.type,
          category: task.category,
          description: `[定时] ${task.name}`,
          date: new Date(),
          accountId: task.accountId,
          userId: task.userId,
          isConfirmed: true,
        },
      });

      // 更新账户余额
      const balanceChange =
        task.type === 'INCOME' ? task.amount : -task.amount;
      await this.prisma.account.update({
        where: { id: task.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // 计算下次执行时间
      const nextRunAt = this.calculateNextRunTime(task);

      // 更新任务状态
      await this.prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          runCount: { increment: 1 },
        },
      });

      // 记录执行日志
      await this.prisma.scheduledTaskLog.create({
        data: {
          taskId: task.id,
          recordId: record.id,
          status: 'SUCCESS',
          message: `成功创建记录: ${task.amount} ${task.category}`,
        },
      });

      this.logger.log(
        `定时任务执行成功: ${task.name}, 耗时 ${Date.now() - startTime}ms`,
        'ScheduledTasks',
      );
    } catch (error) {
      // 记录失败日志
      await this.prisma.scheduledTaskLog.create({
        data: {
          taskId: task.id,
          status: 'FAILED',
          message: error.message,
        },
      });

      this.logger.error(
        `定时任务执行失败: ${task.name}`,
        error.stack,
        'ScheduledTasks',
      );
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(task: any): Date {
    const now = new Date();
    const [hours, minutes] = (task.executeTime || '09:00')
      .split(':')
      .map(Number);
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (task.frequency) {
      case TaskFrequency.DAILY:
        if (next <= now) next.setDate(next.getDate() + 1);
        break;

      case TaskFrequency.WEEKLY:
        const targetDay = task.dayOfWeek ?? 1; // 默认周一
        let daysUntil = targetDay - now.getDay();
        if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
          daysUntil += 7;
        }
        next.setDate(now.getDate() + daysUntil);
        break;

      case TaskFrequency.MONTHLY:
        const targetDate = task.dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        // 处理月末边界
        if (next.getDate() !== targetDate) {
          next.setDate(0); // 上月最后一天
        }
        break;

      case TaskFrequency.YEARLY:
        const targetMonth = (task.monthOfYear ?? 1) - 1;
        const targetDay2 = task.dayOfMonth ?? 1;
        next.setMonth(targetMonth, targetDay2);
        if (next <= now) {
          next.setFullYear(next.getFullYear() + 1);
        }
        break;
    }

    return next;
  }

  // ==================== CRUD 操作 ====================

  /**
   * 创建定时任务
   */
  async create(userId: string, dto: CreateScheduledTaskDto) {
    // 验证账户归属
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new Error('账户不存在或无权访问');
    }

    // 计算首次执行时间
    const startDate = new Date(dto.startDate);
    const tempTask = {
      ...dto,
      startDate,
    };
    const nextRunAt = this.calculateNextRunTime(tempTask);

    return this.prisma.scheduledTask.create({
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
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextRunAt,
        description: dto.description,
      },
    });
  }

  /**
   * 获取用户的所有定时任务
   */
  async findAll(userId: string) {
    return this.prisma.scheduledTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个任务详情
   */
  async findOne(userId: string, taskId: string) {
    const task = await this.prisma.scheduledTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new Error('任务不存在');
    }
    return task;
  }

  /**
   * 更新定时任务
   */
  async update(userId: string, taskId: string, dto: UpdateScheduledTaskDto) {
    const task = await this.findOne(userId, taskId);

    // 如果更改了账户，验证新账户归属
    if (dto.accountId && dto.accountId !== task.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
      });
      if (!account) {
        throw new Error('账户不存在或无权访问');
      }
    }

    // 重新计算下次执行时间
    const updatedTask = { ...task, ...dto };
    const nextRunAt = this.calculateNextRunTime(updatedTask);

    return this.prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        nextRunAt,
      },
    });
  }

  /**
   * 删除定时任务
   */
  async remove(userId: string, taskId: string) {
    await this.findOne(userId, taskId);
    return this.prisma.scheduledTask.delete({
      where: { id: taskId },
    });
  }

  /**
   * 启用/禁用任务
   */
  async toggleEnabled(userId: string, taskId: string) {
    const task = await this.findOne(userId, taskId);
    return this.prisma.scheduledTask.update({
      where: { id: taskId },
      data: { isEnabled: !task.isEnabled },
    });
  }

  /**
   * 获取任务执行日志
   */
  async getTaskLogs(userId: string, taskId: string, limit = 20) {
    await this.findOne(userId, taskId);
    return this.prisma.scheduledTaskLog.findMany({
      where: { taskId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }
}

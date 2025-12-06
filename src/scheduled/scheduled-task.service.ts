import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
  TaskFrequency,
} from './dtos/scheduled-task.dto';

@Injectable()
export class ScheduledTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 创建定时任务
   */
  async create(userId: string, dto: CreateScheduledTaskDto) {
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

    this.logger.log(
      `Created scheduled task: ${task.name} (${task.id})`,
      'ScheduledTaskService',
    );

    return task;
  }

  /**
   * 获取用户所有定时任务
   */
  async findAll(userId: string) {
    return this.prisma.scheduledTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取单个定时任务
   */
  async findOne(userId: string, id: string) {
    const task = await this.prisma.scheduledTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('定时任务不存在');
    }

    return task;
  }

  /**
   * 更新定时任务
   */
  async update(userId: string, id: string, dto: UpdateScheduledTaskDto) {
    await this.findOne(userId, id);

    const updateData: any = { ...dto };

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    // 如果更改了调度相关字段，重新计算下次执行时间
    if (
      dto.frequency ||
      dto.dayOfMonth ||
      dto.dayOfWeek ||
      dto.monthOfYear ||
      dto.executeTime ||
      dto.startDate
    ) {
      const task = await this.findOne(userId, id);
      const mergedDto = {
        ...task,
        ...dto,
        startDate: dto.startDate || task.startDate.toISOString(),
      };
      updateData.nextRunAt = this.calculateNextRunTime(mergedDto as any);
    }

    const task = await this.prisma.scheduledTask.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Updated scheduled task: ${task.name} (${task.id})`,
      'ScheduledTaskService',
    );

    return task;
  }

  /**
   * 删除定时任务
   */
  async delete(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.scheduledTask.delete({
      where: { id },
    });

    this.logger.log(`Deleted scheduled task: ${id}`, 'ScheduledTaskService');

    return { success: true };
  }

  /**
   * 切换任务启用状态
   */
  async toggle(userId: string, id: string) {
    const task = await this.findOne(userId, id);

    const updated = await this.prisma.scheduledTask.update({
      where: { id },
      data: { isEnabled: !task.isEnabled },
    });

    this.logger.log(
      `Toggled scheduled task: ${task.name} -> ${updated.isEnabled ? 'enabled' : 'disabled'}`,
      'ScheduledTaskService',
    );

    return updated;
  }

  /**
   * 获取需要执行的任务
   */
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

  /**
   * 执行单个任务
   */
  async executeTask(taskId: string) {
    const task = await this.prisma.scheduledTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    try {
      // 创建记账记录
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

      // 更新账户余额
      const balanceChange =
        task.type === 'INCOME' ? task.amount : -task.amount;
      await this.prisma.account.update({
        where: { id: task.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // 计算下次执行时间
      const nextRunAt = this.calculateNextRunTimeFromTask(task);

      // 更新任务状态
      await this.prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          runCount: { increment: 1 },
        },
      });

      // 记录执行日志
      await this.prisma.scheduledTaskLog.create({
        data: {
          taskId,
          recordId: record.id,
          status: 'SUCCESS',
          message: `成功创建 ${task.type} 记录: ¥${task.amount}`,
        },
      });

      this.logger.log(
        `Executed task ${task.name}: created record ${record.id}`,
        'ScheduledTaskService',
      );

      return { success: true, recordId: record.id };
    } catch (error) {
      // 记录失败日志
      await this.prisma.scheduledTaskLog.create({
        data: {
          taskId,
          status: 'FAILED',
          message: error.message,
        },
      });

      this.logger.error(
        `Failed to execute task ${task.name}: ${error.message}`,
        error.stack,
        'ScheduledTaskService',
      );

      throw error;
    }
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

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(dto: CreateScheduledTaskDto): Date {
    const startDate = new Date(dto.startDate);
    const [hours, minutes] = (dto.executeTime || '09:00').split(':').map(Number);
    const now = new Date();

    let nextRun = new Date(startDate);
    nextRun.setHours(hours, minutes, 0, 0);

    // 如果开始日期在未来，直接返回
    if (nextRun > now) {
      return this.adjustToFrequency(nextRun, dto);
    }

    // 否则计算下一个执行时间点
    return this.calculateNextFromNow(now, dto);
  }

  /**
   * 从现有任务计算下次执行时间
   */
  private calculateNextRunTimeFromTask(task: any): Date {
    const now = new Date();
    const [hours, minutes] = task.executeTime.split(':').map(Number);

    return this.calculateNextFromNow(now, {
      frequency: task.frequency as TaskFrequency,
      dayOfMonth: task.dayOfMonth,
      dayOfWeek: task.dayOfWeek,
      monthOfYear: task.monthOfYear,
      executeTime: task.executeTime,
      startDate: task.startDate.toISOString(),
    });
  }

  /**
   * 从当前时间计算下次执行时间
   */
  private calculateNextFromNow(
    now: Date,
    dto: Partial<CreateScheduledTaskDto>,
  ): Date {
    const [hours, minutes] = (dto.executeTime || '09:00').split(':').map(Number);
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (dto.frequency) {
      case TaskFrequency.DAILY:
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case TaskFrequency.WEEKLY:
        const targetDay = dto.dayOfWeek ?? 1; // 默认周一
        const currentDay = next.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
          daysUntil += 7;
        }
        next.setDate(next.getDate() + daysUntil);
        break;

      case TaskFrequency.MONTHLY:
        const targetDate = dto.dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        // 处理月末情况
        if (next.getDate() !== targetDate) {
          next.setDate(0); // 设为上月最后一天
        }
        break;

      case TaskFrequency.YEARLY:
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

  /**
   * 根据频率调整日期
   */
  private adjustToFrequency(date: Date, dto: CreateScheduledTaskDto): Date {
    switch (dto.frequency) {
      case TaskFrequency.WEEKLY:
        const targetDay = dto.dayOfWeek ?? 1;
        const currentDay = date.getDay();
        const diff = targetDay - currentDay;
        date.setDate(date.getDate() + diff);
        break;

      case TaskFrequency.MONTHLY:
        if (dto.dayOfMonth) {
          date.setDate(dto.dayOfMonth);
        }
        break;

      case TaskFrequency.YEARLY:
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
}

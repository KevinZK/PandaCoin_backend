import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRecordDto, UpdateRecordDto, VoiceRecordDto } from './dto/record.dto';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  // 创建记账记录
  async create(userId: string, dto: CreateRecordDto) {
    // 查找账户
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    // 创建记录
    const record = await this.prisma.record.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        rawText: dto.rawText,
        date: dto.date ? new Date(dto.date) : new Date(),
        isConfirmed: dto.isConfirmed ?? true,
        confidence: dto.confidence,
        accountId: dto.accountId,
        userId,
      },
    });

    // 更新账户余额
    await this.updateAccountBalance(account.id, dto.type, dto.amount);

    return record;
  }

  // 语音记账 - 核心功能
  async createFromVoice(userId: string, dto: VoiceRecordDto) {
    // 获取用户的账户列表
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { name: true },
    });

    const accountNames = accounts.map(a => a.name);

    // 调用AI解析
    const { records: parsedRecords } = await this.aiService.parseVoiceToRecords(
      dto.text,
      accountNames,
    );

    // 批量创建记录
    const createdRecords = [];
    for (const parsed of parsedRecords) {
      // 根据账户名查找账户ID
      const account = await this.prisma.account.findFirst({
        where: {
          userId,
          name: parsed.accountName,
        },
      });

      if (!account) {
        continue; // 跳过找不到的账户
      }

      const record = await this.create(userId, {
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        description: parsed.description,
        rawText: dto.text,
        date: parsed.date,
        isConfirmed: false, // AI解析的需要用户确认
        confidence: parsed.confidence,
        accountId: account.id,
      });

      createdRecords.push(record);
    }

    return {
      records: createdRecords,
      originalText: dto.text,
    };
  }

  // 查询记录列表
  async findAll(userId: string, filters?: {
    type?: string;
    category?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { userId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.record.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // 获取单条记录
  async findOne(id: string, userId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, userId },
      include: { account: true },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    return record;
  }

  // 更新记录
  async update(id: string, userId: string, dto: UpdateRecordDto) {
    const record = await this.findOne(id, userId);

    // 如果修改了金额或类型,需要回滚并重新计算余额
    if (dto.amount !== undefined || dto.type !== undefined) {
      // 回滚原余额
      await this.updateAccountBalance(
        record.accountId,
        record.type,
        -Number(record.amount),
      );

      // 应用新余额
      await this.updateAccountBalance(
        dto.accountId || record.accountId,
        dto.type || record.type,
        dto.amount || Number(record.amount),
      );
    }

    return this.prisma.record.update({
      where: { id },
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        accountId: dto.accountId,
      },
    });
  }

  // 删除记录
  async remove(id: string, userId: string) {
    const record = await this.findOne(id, userId);

    // 回滚账户余额
    await this.updateAccountBalance(
      record.accountId,
      record.type,
      -Number(record.amount),
    );

    return this.prisma.record.delete({
      where: { id },
    });
  }

  // 更新账户余额的辅助方法
  private async updateAccountBalance(
    accountId: string,
    type: string,
    amount: number,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) return;

    let balanceChange = 0;
    if (type === 'INCOME') {
      balanceChange = amount;
    } else if (type === 'EXPENSE') {
      balanceChange = -amount;
    }
    // TRANSFER 不影响总余额(在同一用户内部)

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        balance: Number(account.balance) + balanceChange,
      },
    });
  }

  // 统计数据
  async getStatistics(userId: string, period: 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'month') {
      startDate.setMonth(now.getMonth());
      startDate.setDate(1);
    } else {
      startDate.setFullYear(now.getFullYear());
      startDate.setMonth(0);
      startDate.setDate(1);
    }
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.record.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
    });

    // 计算总收入和总支出
    const totalIncome = records
      .filter(r => r.type === 'INCOME')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpense = records
      .filter(r => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    // 按分类统计
    const categoryStats: Record<string, number> = {};
    records
      .filter(r => r.type === 'EXPENSE')
      .forEach(r => {
        categoryStats[r.category] = (categoryStats[r.category] || 0) + Number(r.amount);
      });

    return {
      period,
      startDate,
      endDate: now,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categoryStats,
      recordCount: records.length,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    // 使用事务确保账户创建和记账记录原子性
    return this.prisma.$transaction(async (tx) => {
      // 1. 创建账户
      const account = await tx.account.create({
        data: {
          name: dto.name,
          type: dto.type,
          balance: dto.balance,
          currency: dto.currency || 'CNY',
          userId,
        },
      });

      // 2. 如果有初始余额，自动生成期初余额记账记录
      if (dto.balance !== 0) {
        const isLiability = ['CREDIT_CARD', 'LOAN', 'MORTGAGE', 'OTHER_LIABILITY'].includes(dto.type);
        const recordType = dto.balance > 0 ? 'INCOME' : 'EXPENSE';
        
        await tx.record.create({
          data: {
            amount: Math.abs(dto.balance),
            type: isLiability && dto.balance < 0 ? 'EXPENSE' : recordType,
            category: 'INITIAL_BALANCE',
            description: `${dto.name} 期初余额`,
            date: new Date(),
            accountId: account.id,
            userId,
            isConfirmed: true,
          },
        });
      }

      return account;
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('资产不存在');
    }

    return account;
  }

  async update(id: string, userId: string, dto: UpdateAccountDto) {
    await this.findOne(id, userId); // 检查权限

    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.balance !== undefined && { balance: dto.balance }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // 检查权限

    return this.prisma.account.delete({
      where: { id },
    });
  }

  // 计算总资产
  async getTotalAssets(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    const total = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);
    return { total, accounts };
  }
}

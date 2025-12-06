import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: dto.name,
        type: dto.type,
        balance: dto.balance,
        currency: dto.currency || 'CNY',
        userId,
      },
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
      throw new NotFoundException('账户不存在');
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

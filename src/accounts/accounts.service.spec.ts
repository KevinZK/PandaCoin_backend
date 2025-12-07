import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: PrismaService;
  let testUserId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountsService, PrismaService],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-accounts@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('应该创建银行账户', async () => {
      const account = await service.create(testUserId, {
        name: '招商银行',
        type: 'BANK',
        balance: 10000,
        currency: 'CNY',
      });

      testAccountId = account.id;

      expect(account.name).toBe('招商银行');
      expect(account.type).toBe('BANK');
      expect(account.balance).toBe(10000);
      expect(account.userId).toBe(testUserId);
    });

    it('应该创建信用卡账户（负余额）', async () => {
      const account = await service.create(testUserId, {
        name: '信用卡',
        type: 'CREDIT_CARD',
        balance: -5000,
      });

      expect(account.type).toBe('CREDIT_CARD');
      expect(account.balance).toBe(-5000);
    });
  });

  describe('findAll', () => {
    it('应该返回用户所有账户', async () => {
      const accounts = await service.findAll(testUserId);

      expect(accounts.length).toBeGreaterThanOrEqual(2);
      expect(accounts.every((a) => a.userId === testUserId)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('应该返回指定账户', async () => {
      const account = await service.findOne(testAccountId, testUserId);

      expect(account.id).toBe(testAccountId);
      expect(account.name).toBe('招商银行');
    });

    it('账户不存在时应抛出异常', async () => {
      await expect(
        service.findOne('non-existent-id', testUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('其他用户不能访问', async () => {
      await expect(
        service.findOne(testAccountId, 'other-user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该更新账户名称', async () => {
      const updated = await service.update(testAccountId, testUserId, {
        name: '招商银行储蓄卡',
      });

      expect(updated.name).toBe('招商银行储蓄卡');
    });

    it('应该更新账户余额', async () => {
      const updated = await service.update(testAccountId, testUserId, {
        balance: 15000,
      });

      expect(updated.balance).toBe(15000);
    });
  });

  describe('getTotalAssets', () => {
    it('应该正确计算总资产', async () => {
      const result = await service.getTotalAssets(testUserId);

      expect(result.total).toBeDefined();
      expect(result.accounts.length).toBeGreaterThan(0);
      
      // 总资产 = 所有账户余额之和
      const manualTotal = result.accounts.reduce(
        (sum: number, a: any) => sum + a.balance,
        0,
      );
      expect(result.total).toBe(manualTotal);
    });
  });

  describe('remove', () => {
    it('应该删除账户', async () => {
      // 先创建一个临时账户
      const tempAccount = await service.create(testUserId, {
        name: '临时账户',
        type: 'CASH',
        balance: 100,
      });

      await service.remove(tempAccount.id, testUserId);

      await expect(
        service.findOne(tempAccount.id, testUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

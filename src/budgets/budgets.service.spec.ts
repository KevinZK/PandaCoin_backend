import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { NotFoundException } from '@nestjs/common';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;
  let testUserId: string;
  let testBudgetId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        PrismaService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-budgets@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // 创建测试账户（用于记录关联）
    const account = await prisma.account.create({
      data: {
        name: '测试账户',
        type: 'BANK',
        balance: 10000,
        userId: testUserId,
      },
    });
    testAccountId = account.id;
  });

  afterAll(async () => {
    await prisma.record.deleteMany({ where: { userId: testUserId } });
    await prisma.budget.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('应该创建分类预算', async () => {
      const budget = await service.create(testUserId, {
        month: '2024-12',
        category: '餐饮',
        amount: 3000,
      });

      testBudgetId = budget.id;

      expect(budget.month).toBe('2024-12');
      expect(budget.category).toBe('餐饮');
      expect(budget.amount).toBe(3000);
    });

    it('应该创建总预算（无分类）', async () => {
      const budget = await service.create(testUserId, {
        month: '2024-12',
        amount: 10000,
      });

      expect(budget.category).toBeNull();
      expect(budget.amount).toBe(10000);
    });
  });

  describe('findByMonth', () => {
    it('应该返回指定月份的所有预算', async () => {
      const budgets = await service.findByMonth(testUserId, '2024-12');

      expect(budgets.length).toBeGreaterThanOrEqual(1);
      expect(budgets.every((b) => b.month === '2024-12')).toBe(true);
    });

    it('没有预算时返回空数组', async () => {
      const budgets = await service.findByMonth(testUserId, '2020-01');

      expect(budgets).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('应该返回指定预算', async () => {
      const budget = await service.findOne(testUserId, testBudgetId);

      expect(budget.id).toBe(testBudgetId);
    });

    it('预算不存在时应抛出异常', async () => {
      await expect(
        service.findOne(testUserId, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该更新预算金额', async () => {
      const updated = await service.update(testUserId, testBudgetId, {
        amount: 3500,
      });

      expect(updated.amount).toBe(3500);
    });
  });

  describe('getMonthlyProgress', () => {
    it('应该返回预算进度', async () => {
      // 先创建一些支出记录
      await prisma.record.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          category: '餐饮',
          accountId: testAccountId,
          userId: testUserId,
          date: new Date('2024-12-15'),
        },
      });

      const progress = await service.getMonthlyProgress(testUserId, '2024-12');

      expect(progress.month).toBe('2024-12');
      expect(progress.totalBudget).toBeGreaterThan(0);
      expect(progress.categoryBudgets).toBeDefined();
    });
  });

  describe('remove', () => {
    it('应该删除预算', async () => {
      const tempBudget = await service.create(testUserId, {
        month: '2024-11',
        category: '交通',
        amount: 500,
      });

      await service.remove(testUserId, tempBudget.id);

      await expect(
        service.findOne(testUserId, tempBudget.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

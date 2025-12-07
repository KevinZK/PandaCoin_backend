import { Test, TestingModule } from '@nestjs/testing';
import { RecordsService } from './records.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotFoundException } from '@nestjs/common';

describe('RecordsService', () => {
  let service: RecordsService;
  let prisma: PrismaService;
  let testUserId: string;
  let testAccountId: string;
  let testRecordId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordsService,
        PrismaService,
        {
          provide: AiService,
          useValue: {
            parseVoiceToRecords: jest.fn().mockResolvedValue({
              records: [
                {
                  amount: 50,
                  type: 'EXPENSE',
                  category: '餐饮',
                  description: '午餐',
                  accountName: '测试银行卡',
                  date: new Date().toISOString(),
                  confidence: 0.9,
                },
              ],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RecordsService>(RecordsService);
    prisma = module.get<PrismaService>(PrismaService);

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-records@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // 创建测试账户
    const account = await prisma.account.create({
      data: {
        name: '测试银行卡',
        type: 'BANK',
        balance: 10000,
        userId: testUserId,
      },
    });
    testAccountId = account.id;
  });

  afterAll(async () => {
    await prisma.record.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('应该创建支出记录并扣减余额', async () => {
      const balanceBefore = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      const record = await service.create(testUserId, {
        amount: 100,
        type: 'EXPENSE',
        category: '餐饮',
        description: '晚餐',
        accountId: testAccountId,
      });

      testRecordId = record.id;

      expect(record.amount).toBe(100);
      expect(record.type).toBe('EXPENSE');
      expect(record.category).toBe('餐饮');

      // 验证余额扣减
      const balanceAfter = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;
      expect(balanceAfter).toBe(balanceBefore - 100);
    });

    it('应该创建收入记录并增加余额', async () => {
      const balanceBefore = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      const record = await service.create(testUserId, {
        amount: 5000,
        type: 'INCOME',
        category: '工资',
        accountId: testAccountId,
      });

      expect(record.type).toBe('INCOME');

      const balanceAfter = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;
      expect(balanceAfter).toBe(balanceBefore + 5000);
    });

    it('账户不存在时应抛出异常', async () => {
      await expect(
        service.create(testUserId, {
          amount: 100,
          type: 'EXPENSE',
          category: '其他',
          accountId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromVoice', () => {
    it('应该通过AI解析创建记录', async () => {
      const result = await service.createFromVoice(testUserId, {
        text: '午餐花了50块',
      });

      expect(result.originalText).toBe('午餐花了50块');
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0].isConfirmed).toBe(false); // AI解析需确认
    });
  });

  describe('findAll', () => {
    it('应该返回用户所有记录', async () => {
      const records = await service.findAll(testUserId);

      expect(records.length).toBeGreaterThan(0);
      expect(records.every((r) => r.userId === testUserId)).toBe(true);
    });

    it('应该支持按类型过滤', async () => {
      const records = await service.findAll(testUserId, { type: 'EXPENSE' });

      expect(records.every((r) => r.type === 'EXPENSE')).toBe(true);
    });

    it('应该支持按分类过滤', async () => {
      const records = await service.findAll(testUserId, { category: '餐饮' });

      expect(records.every((r) => r.category === '餐饮')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('应该返回指定记录', async () => {
      const record = await service.findOne(testRecordId, testUserId);

      expect(record.id).toBe(testRecordId);
    });

    it('记录不存在时应抛出异常', async () => {
      await expect(
        service.findOne('non-existent-id', testUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该更新记录描述', async () => {
      const updated = await service.update(testRecordId, testUserId, {
        description: '更新后的描述',
      });

      expect(updated.description).toBe('更新后的描述');
    });

    it('修改金额时应更新账户余额', async () => {
      const balanceBefore = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      // 原记录是100支出，改为200支出
      await service.update(testRecordId, testUserId, {
        amount: 200,
      });

      const balanceAfter = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      // 应该多扣100
      expect(balanceAfter).toBe(balanceBefore - 100);
    });
  });

  describe('getStatistics', () => {
    it('应该返回月度统计', async () => {
      const stats = await service.getStatistics(testUserId, 'month');

      expect(stats.period).toBe('month');
      expect(stats.totalIncome).toBeDefined();
      expect(stats.totalExpense).toBeDefined();
      expect(stats.categoryStats).toBeDefined();
    });

    it('应该返回年度统计', async () => {
      const stats = await service.getStatistics(testUserId, 'year');

      expect(stats.period).toBe('year');
    });
  });

  describe('remove', () => {
    it('应该删除记录并回滚余额', async () => {
      // 创建临时记录
      const tempRecord = await service.create(testUserId, {
        amount: 300,
        type: 'EXPENSE',
        category: '交通',
        accountId: testAccountId,
      });

      const balanceAfterCreate = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      await service.remove(tempRecord.id, testUserId);

      const balanceAfterDelete = (await prisma.account.findUnique({
        where: { id: testAccountId },
      }))!.balance;

      // 余额应该恢复
      expect(balanceAfterDelete).toBe(balanceAfterCreate + 300);
    });
  });
});

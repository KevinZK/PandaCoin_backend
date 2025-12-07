import { Test, TestingModule } from '@nestjs/testing';
import { TransactionEngineService } from './transaction-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { TransactionType } from './dto/transaction.dto';

describe('TransactionEngineService', () => {
  let service: TransactionEngineService;
  let prisma: PrismaService;

  // 测试用户和账户
  let testUserId: string;
  let bankAccountId: string;
  let cashAccountId: string;
  let creditCardId: string;
  let investmentId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionEngineService,
        PrismaService,
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionEngineService>(TransactionEngineService);
    prisma = module.get<PrismaService>(PrismaService);

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-transaction@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // 创建测试账户
    const bankAccount = await prisma.account.create({
      data: {
        name: '招商银行',
        type: 'BANK',
        balance: 50000,
        userId: testUserId,
      },
    });
    bankAccountId = bankAccount.id;

    const cashAccount = await prisma.account.create({
      data: {
        name: '微信钱包',
        type: 'CASH',
        balance: 2000,
        userId: testUserId,
      },
    });
    cashAccountId = cashAccount.id;

    const creditCard = await prisma.account.create({
      data: {
        name: '招行信用卡',
        type: 'CREDIT_CARD',
        balance: -5000, // 欠款5000
        userId: testUserId,
      },
    });
    creditCardId = creditCard.id;

    // 创建测试投资
    const investment = await prisma.investment.create({
      data: {
        name: '茅台股票',
        type: 'STOCK',
        code: '600519',
        costPrice: 1800,
        quantity: 10,
        userId: testUserId,
      },
    });
    investmentId = investment.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.record.deleteMany({ where: { userId: testUserId } });
    await prisma.investment.deleteMany({ where: { userId: testUserId } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('EXPENSE - 支出', () => {
    it('应该正确扣减账户余额', async () => {
      const initialBalance = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.EXPENSE,
        amount: 100,
        accountId: bankAccountId,
        category: '餐饮',
        description: '午餐',
      });

      expect(result.record.type).toBe('EXPENSE');
      expect(result.record.amount).toBe(100);
      expect(result.accountChanges).toHaveLength(1);
      expect(result.accountChanges[0].change).toBe(-100);
      expect(result.accountChanges[0].newBalance).toBe(initialBalance - 100);

      // 验证数据库
      const account = await prisma.account.findUnique({
        where: { id: bankAccountId },
      });
      expect(account!.balance).toBe(initialBalance - 100);
    });
  });

  describe('INCOME - 收入', () => {
    it('应该正确增加账户余额', async () => {
      const initialBalance = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.INCOME,
        amount: 8000,
        accountId: bankAccountId,
        category: '工资',
        description: '12月工资',
      });

      expect(result.record.type).toBe('INCOME');
      expect(result.accountChanges[0].change).toBe(8000);
      expect(result.accountChanges[0].newBalance).toBe(initialBalance + 8000);

      // 验证数据库
      const account = await prisma.account.findUnique({
        where: { id: bankAccountId },
      });
      expect(account!.balance).toBe(initialBalance + 8000);
    });
  });

  describe('TRANSFER - 转账', () => {
    it('应该正确双向更新账户余额', async () => {
      const bankBefore = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;
      const cashBefore = (await prisma.account.findUnique({
        where: { id: cashAccountId },
      }))!.balance;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.TRANSFER,
        amount: 1000,
        accountId: bankAccountId,
        targetAccountId: cashAccountId,
        category: '转账',
        description: '转入微信',
      });

      expect(result.record.type).toBe('TRANSFER');
      expect(result.accountChanges).toHaveLength(2);

      // 源账户扣款
      const sourceChange = result.accountChanges.find(
        (c) => c.accountId === bankAccountId,
      );
      expect(sourceChange!.change).toBe(-1000);
      expect(sourceChange!.newBalance).toBe(bankBefore - 1000);

      // 目标账户入账
      const targetChange = result.accountChanges.find(
        (c) => c.accountId === cashAccountId,
      );
      expect(targetChange!.change).toBe(1000);
      expect(targetChange!.newBalance).toBe(cashBefore + 1000);

      // 验证数据库
      const bankAfter = await prisma.account.findUnique({
        where: { id: bankAccountId },
      });
      const cashAfter = await prisma.account.findUnique({
        where: { id: cashAccountId },
      });
      expect(bankAfter!.balance).toBe(bankBefore - 1000);
      expect(cashAfter!.balance).toBe(cashBefore + 1000);
    });
  });

  describe('REPAYMENT - 信用卡还款', () => {
    it('应该正确扣减银行卡并增加信用卡余额', async () => {
      const bankBefore = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;
      const creditBefore = (await prisma.account.findUnique({
        where: { id: creditCardId },
      }))!.balance;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.REPAYMENT,
        amount: 2000,
        accountId: bankAccountId,
        targetAccountId: creditCardId,
        category: '还款',
      });

      expect(result.record.type).toBe('REPAYMENT');

      // 银行卡扣款
      const bankChange = result.accountChanges.find(
        (c) => c.accountId === bankAccountId,
      );
      expect(bankChange!.change).toBe(-2000);

      // 信用卡欠款减少（余额增加）
      const creditChange = result.accountChanges.find(
        (c) => c.accountId === creditCardId,
      );
      expect(creditChange!.change).toBe(2000);
      expect(creditChange!.newBalance).toBe(creditBefore + 2000); // -5000 + 2000 = -3000

      // 验证数据库
      const creditAfter = await prisma.account.findUnique({
        where: { id: creditCardId },
      });
      expect(creditAfter!.balance).toBe(creditBefore + 2000);
    });
  });

  describe('INVEST_BUY - 投资买入', () => {
    it('应该正确扣减现金并增加持仓', async () => {
      const bankBefore = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;
      const investmentBefore = (await prisma.investment.findUnique({
        where: { id: investmentId },
      }))!;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.INVEST_BUY,
        amount: 9000,
        accountId: bankAccountId,
        investmentId: investmentId,
        quantity: 5,
        unitPrice: 1800,
        category: '投资买入',
      });

      expect(result.record.type).toBe('INVEST_BUY');

      // 银行卡扣款
      expect(result.accountChanges[0].change).toBe(-9000);

      // 持仓增加
      expect(result.investmentChanges).toBeDefined();
      expect(result.investmentChanges!.change).toBe(5);
      expect(result.investmentChanges!.newQuantity).toBe(
        investmentBefore.quantity + 5,
      );

      // 验证数据库
      const investmentAfter = await prisma.investment.findUnique({
        where: { id: investmentId },
      });
      expect(investmentAfter!.quantity).toBe(investmentBefore.quantity + 5);
    });
  });

  describe('INVEST_SELL - 投资卖出', () => {
    it('应该正确增加现金并减少持仓', async () => {
      const bankBefore = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;
      const investmentBefore = (await prisma.investment.findUnique({
        where: { id: investmentId },
      }))!;

      const result = await service.createTransaction(testUserId, {
        type: TransactionType.INVEST_SELL,
        amount: 5000,
        accountId: bankAccountId,
        investmentId: investmentId,
        quantity: 2,
        unitPrice: 2500,
        category: '投资卖出',
      });

      expect(result.record.type).toBe('INVEST_SELL');

      // 银行卡入账
      expect(result.accountChanges[0].change).toBe(5000);

      // 持仓减少
      expect(result.investmentChanges!.change).toBe(-2);
      expect(result.investmentChanges!.newQuantity).toBe(
        investmentBefore.quantity - 2,
      );

      // 验证数据库
      const investmentAfter = await prisma.investment.findUnique({
        where: { id: investmentId },
      });
      expect(investmentAfter!.quantity).toBe(investmentBefore.quantity - 2);
    });
  });

  describe('calculateNetWorth - 净资产计算', () => {
    it('应该正确计算净资产', async () => {
      const result = await service.calculateNetWorth(testUserId);

      expect(result.netWorth).toBeDefined();
      expect(result.totalAssets).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.accounts).toHaveLength(3);
      expect(result.investments).toHaveLength(1);

      // 净资产 = 总资产 - 总负债
      expect(result.netWorth).toBe(
        result.totalAssets - result.totalLiabilities,
      );
    });
  });

  describe('deleteTransaction - 删除并回滚', () => {
    it('应该正确删除记录并回滚余额', async () => {
      // 先创建一笔交易
      const bankBefore = (await prisma.account.findUnique({
        where: { id: bankAccountId },
      }))!.balance;

      const createResult = await service.createTransaction(testUserId, {
        type: TransactionType.EXPENSE,
        amount: 500,
        accountId: bankAccountId,
        category: '测试',
      });

      const recordId = createResult.record.id;

      // 确认余额已扣减
      const bankAfterCreate = await prisma.account.findUnique({
        where: { id: bankAccountId },
      });
      expect(bankAfterCreate!.balance).toBe(bankBefore - 500);

      // 删除交易
      await service.deleteTransaction(testUserId, recordId);

      // 确认余额已回滚
      const bankAfterDelete = await prisma.account.findUnique({
        where: { id: bankAccountId },
      });
      expect(bankAfterDelete!.balance).toBe(bankBefore);

      // 确认记录已删除
      const record = await prisma.record.findUnique({
        where: { id: recordId },
      });
      expect(record).toBeNull();
    });
  });
});

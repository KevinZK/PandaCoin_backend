import { Test, TestingModule } from '@nestjs/testing';
import { FinancialParsingService } from './financial-parsing.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RegionService } from '../common/region/region.service';
import { AIServiceRouter } from './providers/ai-service.router';

describe('FinancialParsingService', () => {
  let service: FinancialParsingService;
  let mockProvider: any;
  let testUserId: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    mockProvider = {
      name: 'MockProvider',
      parse: jest.fn().mockResolvedValue({
        events: [
          {
            event_type: 'TRANSACTION',
            data: {
              transaction_type: 'EXPENSE',
              amount: 100,
              currency: 'CNY',
              category: '餐饮',
              date: '2024-12-06',
              description: '午餐',
            },
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialParsingService,
        PrismaService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: RegionService,
          useValue: {
            detectUserRegion: jest.fn().mockResolvedValue('CN'),
          },
        },
        {
          provide: AIServiceRouter,
          useValue: {
            getProviderChain: jest.fn().mockReturnValue([mockProvider]),
          },
        },
      ],
    }).compile();

    service = module.get<FinancialParsingService>(FinancialParsingService);
    prisma = module.get<PrismaService>(PrismaService);

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-financial@example.com',
        password: 'hashed_password',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.aIAuditLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('parseFinancialStatement', () => {
    it('应该成功解析财务语句', async () => {
      const result = await service.parseFinancialStatement(
        '午餐花了100块',
        testUserId,
        {},
      );

      expect(result.events).toBeDefined();
      expect(result.events.length).toBe(1);
      expect(result.events[0].event_type).toBe('TRANSACTION');
      expect((result.events[0].data as any).amount).toBe(100);
    });

    it('应该调用区域检测服务', async () => {
      const regionService = (service as any).regionService;

      await service.parseFinancialStatement('测试', testUserId, {
        'accept-language': 'zh-CN',
      });

      expect(regionService.detectUserRegion).toHaveBeenCalled();
    });

    it('应该记录审计日志', async () => {
      await service.parseFinancialStatement('记录测试', testUserId, {});

      const logs = await prisma.aIAuditLog.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].status).toBe('SUCCESS');
    });

    it('所有Provider失败时应抛出异常', async () => {
      const failingProvider = {
        name: 'FailingProvider',
        parse: jest.fn().mockRejectedValue(new Error('API Error')),
      };

      const aiRouter = (service as any).aiRouter;
      aiRouter.getProviderChain = jest.fn().mockReturnValue([failingProvider]);

      await expect(
        service.parseFinancialStatement('测试', testUserId, {}),
      ).rejects.toThrow('All AI providers failed');
    });
  });

  describe('故障转移', () => {
    it('应该在第一个Provider失败时尝试下一个', async () => {
      const failingProvider = {
        name: 'FailingProvider',
        parse: jest.fn().mockRejectedValue(new Error('First failed')),
      };

      const successProvider = {
        name: 'SuccessProvider',
        parse: jest.fn().mockResolvedValue({
          events: [
            {
              event_type: 'TRANSACTION',
              data: {
                transaction_type: 'INCOME',
                amount: 500,
                currency: 'CNY',
                category: '工资',
                date: '2024-12-06',
              },
            },
          ],
        }),
      };

      const aiRouter = (service as any).aiRouter;
      aiRouter.getProviderChain = jest
        .fn()
        .mockReturnValue([failingProvider, successProvider]);

      const result = await service.parseFinancialStatement(
        '工资500',
        testUserId,
        {},
      );

      expect(failingProvider.parse).toHaveBeenCalled();
      expect(successProvider.parse).toHaveBeenCalled();
      expect((result.events[0].data as any).amount).toBe(500);
    });
  });
});

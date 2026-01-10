import { Test, TestingModule } from '@nestjs/testing';
import { FinancialParsingService } from './financial-parsing.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RegionService } from '../common/region/region.service';
import { SkillExecutorService } from '../skills/skill-executor.service';
import { SkillRouterService } from '../skills/skill-router.service';

describe('FinancialParsingService', () => {
  let service: FinancialParsingService;
  let testUserId: string;
  let prisma: PrismaService;
  let mockSkillExecutor: any;

  beforeAll(async () => {
    mockSkillExecutor = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        response: {
          events: [
            {
              event_type: 'TRANSACTION',
              data: {
                transaction_type: 'EXPENSE',
                amount: 100,
                currency: 'CNY',
                category: 'FOOD',
                date: '2024-12-06',
                note: '午餐',
              },
            },
          ],
        },
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
            debug: jest.fn(),
          },
        },
        {
          provide: RegionService,
          useValue: {
            detectUserRegion: jest.fn().mockResolvedValue('CN'),
          },
        },
        {
          provide: SkillExecutorService,
          useValue: mockSkillExecutor,
        },
        {
          provide: SkillRouterService,
          useValue: {
            route: jest.fn(),
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

    it('应该调用 Skill 执行器', async () => {
      await service.parseFinancialStatement('午餐花了50块', testUserId, {});

      expect(mockSkillExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: '午餐花了50块',
          skillName: 'accounting',
        }),
      );
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
      expect(logs[0].provider).toBe('SKILL_ACCOUNTING');
    });

    it('Skill 执行失败时应抛出异常', async () => {
      mockSkillExecutor.execute = jest.fn().mockResolvedValue({
        success: false,
        error: 'Skill execution failed',
      });

      await expect(
        service.parseFinancialStatement('测试', testUserId, {}),
      ).rejects.toThrow('Skill execution failed');

      // 恢复 mock
      mockSkillExecutor.execute = jest.fn().mockResolvedValue({
        success: true,
        response: { events: [] },
      });
    });
  });

  describe('查询类输入检测', () => {
    it('应该检测账单分析查询', async () => {
      mockSkillExecutor.execute = jest.fn().mockResolvedValue({
        success: true,
        response: {
          summary: '本月消费统计',
        },
      });

      const result = await service.parseFinancialStatement(
        '这个月花了多少钱',
        testUserId,
        {},
      );

      expect(mockSkillExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          skillName: 'bill-analysis',
        }),
      );
      expect(result.events[0].event_type).toBe('QUERY_RESPONSE');
    });
  });
});

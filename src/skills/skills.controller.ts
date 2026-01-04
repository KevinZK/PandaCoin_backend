import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkillExecutorService } from './skill-executor.service';
import { SkillLoaderService } from './skill-loader.service';
import { SkillRouterService } from './skill-router.service';
import { SkillContext, SkillExecuteResult } from './skills.types';
import { PrismaService } from '../prisma/prisma.service';

// 请求 DTO
class ExecuteSkillDto {
  message: string;
  skillName?: string;
}

/**
 * Skills API 控制器
 */
@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(
    private executor: SkillExecutorService,
    private loader: SkillLoaderService,
    private router: SkillRouterService,
    private prisma: PrismaService,
  ) {}

  /**
   * 获取可用技能列表
   */
  @Get()
  async getSkills() {
    const skills = this.loader.getSkillsSummary();
    return {
      success: true,
      data: skills,
    };
  }

  /**
   * 执行技能
   */
  @Post('execute')
  async executeSkill(
    @Request() req: any,
    @Body() dto: ExecuteSkillDto,
  ): Promise<{ success: boolean; data: SkillExecuteResult }> {
    const userId = req.user.userId;

    // 构建上下文
    const context = await this.buildContext(userId);

    // 执行技能
    const result = await this.executor.execute({
      userMessage: dto.message,
      skillName: dto.skillName,
      context,
    });

    return {
      success: result.success,
      data: result,
    };
  }

  /**
   * 路由消息（仅返回应该使用的技能，不执行）
   */
  @Post('route')
  async routeMessage(@Body() dto: { message: string }) {
    const result = await this.router.routeMessage(dto.message);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 构建技能上下文
   */
  private async buildContext(userId: string): Promise<SkillContext> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 并行获取所有需要的数据
    const [accounts, creditCards, records, budgets, holdings, loans, autoPayments] =
      await Promise.all([
        // 账户
        this.prisma.account.findMany({
          where: { userId },
          select: { id: true, name: true, type: true, balance: true },
        }),
        // 信用卡
        this.prisma.creditCard.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            creditLimit: true,
            currentBalance: true,
            repaymentDueDate: true,
          },
        }),
        // 本月记录
        this.prisma.record.findMany({
          where: {
            userId,
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            id: true,
            type: true,
            amount: true,
            category: true,
            description: true,
            date: true,
          },
          orderBy: { date: 'desc' },
          take: 100,
        }),
        // 预算
        this.prisma.budget.findMany({
          where: { userId },
          select: {
            id: true,
            category: true,
            amount: true,
            month: true,
            isRecurring: true,
          },
        }),
        // 持仓
        this.prisma.holding.findMany({
          where: {
            account: { userId },
          },
          select: {
            id: true,
            tickerCode: true,
            name: true,
            quantity: true,
            avgCostPrice: true,
            currentPrice: true,
          },
        }),
        // 贷款账户（负资产）
        this.prisma.account.findMany({
          where: {
            userId,
            type: { in: ['LOAN', 'LIABILITY'] },
          },
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
          },
        }),
        // 自动还款
        this.prisma.autoPayment.findMany({
          where: { userId, isEnabled: true },
          select: {
            id: true,
            name: true,
            fixedAmount: true,
            dayOfMonth: true,
          },
        }),
      ]);

    // 计算分类消费统计
    const categoryStats = records.reduce((acc: any, r: any) => {
      if (r.type === 'EXPENSE') {
        const cat = r.category || '其他';
        acc[cat] = (acc[cat] || 0) + r.amount;
      }
      return acc;
    }, {});

    const categories = Object.entries(categoryStats).map(([category, amount]) => ({
      category,
      amount,
    }));

    return {
      userId,
      accounts,
      creditCards,
      records,
      categories,
      budgets,
      holdings,
      loans,
      autoPayments,
      currentDate: now.toISOString().split('T')[0],
      daysInMonth: endOfMonth.getDate(),
      daysPassed: now.getDate(),
      daysRemaining: endOfMonth.getDate() - now.getDate(),
    };
  }
}

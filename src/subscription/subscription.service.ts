import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto, SubscriptionStatus } from './subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  // 获取用户订阅状态
  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!subscription) {
      // 如果没有订阅记录，返回默认状态
      return {
        userId,
        status: 'NONE',
        isProMember: false,
        isInTrialPeriod: false,
      };
    }

    const now = new Date();
    const isProMember = this.checkIsProMember(subscription, now);
    const isInTrialPeriod = this.checkIsInTrialPeriod(subscription, now);

    return {
      ...subscription,
      isProMember,
      isInTrialPeriod,
    };
  }

  // 检查用户是否为 Pro 会员
  private checkIsProMember(subscription: any, now: Date): boolean {
    if (subscription.status === 'ACTIVE') {
      if (subscription.subscriptionEndDate && new Date(subscription.subscriptionEndDate) > now) {
        return true;
      }
    }
    if (subscription.status === 'TRIAL') {
      if (subscription.trialEndDate && new Date(subscription.trialEndDate) > now) {
        return true;
      }
    }
    return false;
  }

  // 检查是否在试用期
  private checkIsInTrialPeriod(subscription: any, now: Date): boolean {
    if (subscription.status === 'TRIAL') {
      if (subscription.trialEndDate && new Date(subscription.trialEndDate) > now) {
        return true;
      }
    }
    return false;
  }

  // 更新订阅状态（管理员使用）
  async updateSubscription(userId: string, dto: UpdateSubscriptionDto) {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 创建或更新订阅记录
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: dto.status,
        plan: dto.plan,
        trialStartDate: dto.trialStartDate,
        trialEndDate: dto.trialEndDate,
        subscriptionStartDate: dto.subscriptionStartDate,
        subscriptionEndDate: dto.subscriptionEndDate,
        autoRenew: dto.autoRenew ?? true,
      },
      update: {
        status: dto.status,
        plan: dto.plan,
        trialStartDate: dto.trialStartDate,
        trialEndDate: dto.trialEndDate,
        subscriptionStartDate: dto.subscriptionStartDate,
        subscriptionEndDate: dto.subscriptionEndDate,
        autoRenew: dto.autoRenew,
      },
    });

    return subscription;
  }

  // 开始试用（为用户开启试用期）
  async startTrial(userId: string, durationDays: number = 30) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const now = new Date();
    const trialEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: 'TRIAL',
        trialStartDate: now,
        trialEndDate: trialEndDate,
      },
      update: {
        status: 'TRIAL',
        trialStartDate: now,
        trialEndDate: trialEndDate,
      },
    });

    return subscription;
  }

  // 取消订阅
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('订阅记录不存在');
    }

    return await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        autoRenew: false,
      },
    });
  }

  // 重置订阅（清除所有订阅数据，用于测试）
  async resetSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return { message: '无订阅记录' };
    }

    await this.prisma.subscription.delete({
      where: { userId },
    });

    return { message: '订阅已重置' };
  }

  // 获取所有用户的订阅列表（管理员使用）
  async getAllSubscriptions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.subscription.count(),
    ]);

    // 获取所有用户（包括没有订阅的）
    const allUsers = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const subscriptionsWithStatus = subscriptions.map((sub) => ({
      ...sub,
      isProMember: this.checkIsProMember(sub, now),
      isInTrialPeriod: this.checkIsInTrialPeriod(sub, now),
    }));

    return {
      subscriptions: subscriptionsWithStatus,
      allUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 同步 Apple 订阅状态
  async syncAppleSubscription(
    userId: string,
    appleProductId: string,
    appleTransactionId: string,
    isInTrial: boolean,
    expirationDate: Date,
  ) {
    // 根据产品 ID 判断计划类型
    const plan = appleProductId.includes('pay2') ? 'YEARLY' : 'MONTHLY';
    const status = isInTrial ? 'TRIAL' : 'ACTIVE';
    const now = new Date();

    console.log(`[Subscription] syncAppleSubscription: userId=${userId}, productId=${appleProductId}, isInTrial=${isInTrial}, expirationDate=${expirationDate.toISOString()}`);

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status,
        plan,
        appleProductId,
        appleTransactionId,
        trialStartDate: isInTrial ? now : null,
        trialEndDate: isInTrial ? expirationDate : null,
        subscriptionStartDate: isInTrial ? null : now,
        subscriptionEndDate: isInTrial ? null : expirationDate,
      },
      update: {
        status,
        plan,
        appleProductId,
        appleTransactionId,
        // 关键修复：update 时也要设置开始日期和结束日期
        trialStartDate: isInTrial ? now : null,
        trialEndDate: isInTrial ? expirationDate : null,
        subscriptionStartDate: isInTrial ? null : now,
        subscriptionEndDate: isInTrial ? null : expirationDate,
      },
    });

    console.log(`[Subscription] syncAppleSubscription success: status=${subscription.status}, subscriptionEndDate=${subscription.subscriptionEndDate}, trialEndDate=${subscription.trialEndDate}`);

    return subscription;
  }
}

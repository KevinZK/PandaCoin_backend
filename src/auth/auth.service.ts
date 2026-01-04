import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import verifyAppleToken from 'verify-apple-id-token';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';

// Apple App Bundle ID
const APPLE_CLIENT_ID = 'kevin.zuo.PandaCoin';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 生成JWT
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // Apple 用户没有密码，不能使用邮箱密码登录
    if (!user.password) {
      throw new UnauthorizedException('该账号使用 Apple 登录，请使用 Apple Sign In');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成JWT
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  /**
   * Apple Sign In 登录/注册
   * 如果用户存在则登录，否则创建新用户
   */
  async appleLogin(dto: AppleLoginDto) {
    // 使用 Apple 公钥验证 identity token
    let jwtClaims: any;
    try {
      jwtClaims = await verifyAppleToken({
        idToken: dto.identityToken,
        clientId: APPLE_CLIENT_ID,
      });

      if (!jwtClaims || !jwtClaims.sub) {
        throw new UnauthorizedException('无效的 Apple identity token');
      }
    } catch (error) {
      console.error('Apple token verification failed:', error);
      throw new UnauthorizedException('Apple 登录验证失败: ' + (error.message || '未知错误'));
    }

    const appleUserId = jwtClaims.sub;
    const tokenEmail = jwtClaims.email;

    // 查找是否存在已绑定此 Apple ID 的用户
    let user = await this.prisma.user.findUnique({
      where: { appleId: appleUserId },
    });

    if (user) {
      // 已存在用户，直接登录
      const tokens = await this.generateTokens(user.id, user.email);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        ...tokens,
        isNewUser: false,
      };
    }

    // 新用户注册
    const email = dto.email || tokenEmail || `${appleUserId}@privaterelay.appleid.com`;

    // 检查邮箱是否已被其他账号使用
    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      // 邮箱已存在但未绑定 Apple ID，绑定到此账号
      user = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          appleId: appleUserId,
          authType: 'apple',
        },
      });
    } else {
      // 创建新用户
      user = await this.prisma.user.create({
        data: {
          email,
          appleId: appleUserId,
          authType: 'apple',
          name: dto.fullName || null,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
      isNewUser: !existingEmailUser,
    };
  }

  /**
   * 删除用户账号及所有关联数据
   */
  async deleteAccount(userId: string) {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 删除用户及所有关联数据
    await this.prisma.$transaction(async (tx) => {
      // 删除记录
      await tx.record.deleteMany({ where: { userId } });
      // 删除账户
      await tx.account.deleteMany({ where: { userId } });
      // 删除信用卡
      await tx.creditCard.deleteMany({ where: { userId } });
      // 删除预算
      await tx.budget.deleteMany({ where: { userId } });
      // 删除自动还款
      await tx.autoPayment.deleteMany({ where: { userId } });
      // 删除自动入账
      await tx.autoIncome.deleteMany({ where: { userId } });
      // 删除订阅记录
      await tx.subscription.deleteMany({ where: { userId } });
      // 最后删除用户
      await tx.user.delete({ where: { id: userId } });
    });

    return { deleted: true };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        defaultExpenseAccountId: true,
        defaultExpenseAccountType: true,
        defaultIncomeAccountId: true,
        defaultIncomeAccountType: true,
      },
    });

    if (!user) return null;

    // 获取订阅状态
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const now = new Date();
    let isProMember = false;
    let isInTrialPeriod = false;

    if (subscription) {
      if (subscription.status === 'ACTIVE' && subscription.subscriptionEndDate) {
        isProMember = new Date(subscription.subscriptionEndDate) > now;
      }
      if (subscription.status === 'TRIAL' && subscription.trialEndDate) {
        isProMember = new Date(subscription.trialEndDate) > now;
        isInTrialPeriod = isProMember;
      }
    }

    return {
      ...user,
      isProMember,
      isInTrialPeriod,
    };
  }

  /**
   * 设置默认支出账户
   */
  async setDefaultExpenseAccount(
    userId: string,
    accountId: string,
    accountType: 'ACCOUNT' | 'CREDIT_CARD',
  ) {
    // 验证账户存在
    if (accountType === 'ACCOUNT') {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new NotFoundException('账户不存在');
      }
    } else {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: accountId, userId },
      });
      if (!card) {
        throw new NotFoundException('信用卡不存在');
      }
    }

    // 更新用户默认账户
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultExpenseAccountId: accountId,
        defaultExpenseAccountType: accountType,
      },
    });

    return { accountId, accountType };
  }

  /**
   * 清除默认支出账户
   */
  async clearDefaultExpenseAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultExpenseAccountId: null,
        defaultExpenseAccountType: null,
      },
    });

    return { cleared: true };
  }

  /**
   * 获取默认支出账户详情
   */
  async getDefaultExpenseAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultExpenseAccountId: true,
        defaultExpenseAccountType: true,
      },
    });

    if (!user?.defaultExpenseAccountId || !user?.defaultExpenseAccountType) {
      return null;
    }

    if (user.defaultExpenseAccountType === 'ACCOUNT') {
      const account = await this.prisma.account.findUnique({
        where: { id: user.defaultExpenseAccountId },
      });
      return account ? { type: 'ACCOUNT', account } : null;
    } else {
      const creditCard = await this.prisma.creditCard.findUnique({
        where: { id: user.defaultExpenseAccountId },
      });
      return creditCard ? { type: 'CREDIT_CARD', creditCard } : null;
    }
  }

  /**
   * 设置默认收入账户（收入只能进入账户，不能进入信用卡）
   */
  async setDefaultIncomeAccount(
    userId: string,
    accountId: string,
  ) {
    // 验证账户存在
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('账户不存在');
    }

    // 更新用户默认收入账户
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultIncomeAccountId: accountId,
        defaultIncomeAccountType: 'ACCOUNT',
      },
    });

    return { accountId, accountType: 'ACCOUNT' };
  }

  /**
   * 清除默认收入账户
   */
  async clearDefaultIncomeAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultIncomeAccountId: null,
        defaultIncomeAccountType: null,
      },
    });

    return { cleared: true };
  }

  /**
   * 获取默认收入账户详情
   */
  async getDefaultIncomeAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultIncomeAccountId: true,
        defaultIncomeAccountType: true,
      },
    });

    if (!user?.defaultIncomeAccountId) {
      return null;
    }

    const account = await this.prisma.account.findUnique({
      where: { id: user.defaultIncomeAccountId },
    });
    return account ? { type: 'ACCOUNT', account } : null;
  }

  /**
   * 获取推荐账户（基于机构名称和最近使用记录）
   */
  async getRecommendedAccount(userId: string, institutionName: string) {
    // 先在信用卡中查找匹配机构名称的卡片
    const matchingCards = await this.prisma.creditCard.findMany({
      where: {
        userId,
        institutionName: { contains: institutionName },
      },
    });

    if (matchingCards.length === 0) {
      return { matches: [], recommended: null };
    }

    if (matchingCards.length === 1) {
      return { matches: matchingCards, recommended: matchingCards[0] };
    }

    // 多张卡时，查找最近使用的那张
    const recentRecord = await this.prisma.record.findFirst({
      where: {
        userId,
        creditCardId: { in: matchingCards.map(c => c.id) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recommended = recentRecord
      ? matchingCards.find(c => c.id === recentRecord.creditCardId)
      : matchingCards[0];

    return { matches: matchingCards, recommended };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }
}

import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
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
      },
    });
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

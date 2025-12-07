import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  const testEmail = 'test-auth@example.com';
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PrismaService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // 清理测试用户
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test-auth' } },
    });
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const result = await service.register({
        email: testEmail,
        password: testPassword,
        name: '测试用户',
      });

      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe('测试用户');
      expect(result.accessToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
    });

    it('重复邮箱应抛出异常', async () => {
      await expect(
        service.register({
          email: testEmail,
          password: testPassword,
          name: '另一个用户',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('应该成功登录', async () => {
      const result = await service.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user.email).toBe(testEmail);
      expect(result.accessToken).toBeDefined();
    });

    it('邮箱不存在应抛出异常', async () => {
      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: testPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('密码错误应抛出异常', async () => {
      await expect(
        service.login({
          email: testEmail,
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('应该返回用户信息', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      const result = await service.validateUser(user!.id);

      expect(result).toBeDefined();
      expect(result!.email).toBe(testEmail);
    });

    it('用户不存在应返回 null', async () => {
      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });
  });
});

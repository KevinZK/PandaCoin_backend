import { Controller, Post, Body, Get, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return ResponseDto.success(result, '注册成功');
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return ResponseDto.success(result, '登录成功');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.authService.validateUser(user.sub);
    return ResponseDto.success(fullUser, '获取用户信息成功');
  }

  /**
   * 设置默认支出账户
   * PUT /api/auth/default-expense-account
   */
  @Put('default-expense-account')
  @UseGuards(JwtAuthGuard)
  async setDefaultExpenseAccount(
    @CurrentUser() user: any,
    @Body() dto: { accountId: string; accountType: 'ACCOUNT' | 'CREDIT_CARD' },
  ) {
    const result = await this.authService.setDefaultExpenseAccount(
      user.sub,
      dto.accountId,
      dto.accountType,
    );
    return ResponseDto.success(result, '默认支出账户设置成功');
  }

  /**
   * 获取默认支出账户
   * GET /api/auth/default-expense-account
   */
  @Get('default-expense-account')
  @UseGuards(JwtAuthGuard)
  async getDefaultExpenseAccount(@CurrentUser() user: any) {
    const result = await this.authService.getDefaultExpenseAccount(user.sub);
    return ResponseDto.success(result);
  }

  /**
   * 清除默认支出账户
   * DELETE /api/auth/default-expense-account
   */
  @Delete('default-expense-account')
  @UseGuards(JwtAuthGuard)
  async clearDefaultExpenseAccount(@CurrentUser() user: any) {
    const result = await this.authService.clearDefaultExpenseAccount(user.sub);
    return ResponseDto.success(result, '默认支出账户已清除');
  }

  /**
   * 获取推荐账户（基于机构名称）
   * GET /api/auth/recommended-account?institutionName=招商
   */
  @Get('recommended-account')
  @UseGuards(JwtAuthGuard)
  async getRecommendedAccount(
    @CurrentUser() user: any,
    @Query('institutionName') institutionName: string,
  ) {
    if (!institutionName) {
      return ResponseDto.success({ matches: [], recommended: null });
    }
    const result = await this.authService.getRecommendedAccount(user.sub, institutionName);
    return ResponseDto.success(result);
  }
}

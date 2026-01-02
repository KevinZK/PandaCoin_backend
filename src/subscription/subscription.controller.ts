import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import {
  UpdateSubscriptionDto,
  StartTrialDto,
  SyncAppleSubscriptionDto,
} from './subscription.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // 获取当前用户的订阅状态
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  // 同步 Apple 订阅（iOS 端调用）
  @Post('sync-apple')
  @UseGuards(JwtAuthGuard)
  async syncAppleSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncAppleSubscriptionDto,
  ) {
    return this.subscriptionService.syncAppleSubscription(
      userId,
      dto.appleProductId,
      dto.appleTransactionId,
      dto.isInTrial,
      new Date(dto.expirationDate),
    );
  }

  // ==================== 管理员接口 ====================

  // 获取所有用户订阅列表（管理员）
  @Get('admin/list')
  async getAllSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.subscriptionService.getAllSubscriptions(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  // 获取指定用户的订阅状态（管理员）
  @Get('admin/user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  // 更新用户订阅状态（管理员）
  @Put('admin/user/:userId')
  async updateUserSubscription(
    @Param('userId') userId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscription(userId, dto);
  }

  // 为用户开启试用（管理员）
  @Post('admin/user/:userId/start-trial')
  async startUserTrial(
    @Param('userId') userId: string,
    @Body() dto: StartTrialDto,
  ) {
    return this.subscriptionService.startTrial(userId, dto.durationDays || 30);
  }

  // 取消用户订阅（管理员）
  @Post('admin/user/:userId/cancel')
  async cancelUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  // 重置用户订阅（管理员，用于测试）
  @Delete('admin/user/:userId/reset')
  async resetUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.resetSubscription(userId);
  }
}

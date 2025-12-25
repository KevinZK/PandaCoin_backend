import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AutoPaymentsService } from './auto-payments.service';
import { CreateAutoPaymentDto, UpdateAutoPaymentDto } from './dto/auto-payment.dto';

@Controller('auto-payments')
@UseGuards(JwtAuthGuard)
export class AutoPaymentsController {
  constructor(private readonly autoPaymentsService: AutoPaymentsService) {}

  /**
   * 创建自动扣款配置
   */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutoPaymentDto,
  ) {
    return this.autoPaymentsService.create(userId, dto);
  }

  /**
   * 获取所有自动扣款配置
   */
  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.autoPaymentsService.findAll(userId);
  }

  /**
   * 获取单个自动扣款配置
   */
  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.autoPaymentsService.findOne(userId, id);
  }

  /**
   * 更新自动扣款配置
   */
  @Put(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAutoPaymentDto,
  ) {
    return this.autoPaymentsService.update(userId, id, dto);
  }

  /**
   * 删除自动扣款配置
   */
  @Delete(':id')
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.autoPaymentsService.delete(userId, id);
  }

  /**
   * 切换启用状态
   */
  @Patch(':id/toggle')
  async toggle(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.autoPaymentsService.toggle(userId, id);
  }

  /**
   * 获取执行日志
   */
  @Get(':id/logs')
  async getLogs(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.autoPaymentsService.getLogs(userId, id, limit || 20);
  }

  /**
   * 手动执行一次扣款
   */
  @Post(':id/execute')
  async execute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    // 验证权限
    await this.autoPaymentsService.findOne(userId, id);
    return this.autoPaymentsService.executePayment(id);
  }

  /**
   * 计算月供 (工具接口)
   */
  @Get('utils/calculate-monthly-payment')
  async calculateMonthlyPayment(
    @Query('principal') principal: number,
    @Query('annualRate') annualRate: number,
    @Query('termMonths') termMonths: number,
  ) {
    const monthlyPayment = AutoPaymentsService.calculateMonthlyPayment(
      Number(principal),
      Number(annualRate),
      Number(termMonths),
    );

    const totalPayment = monthlyPayment * Number(termMonths);
    const totalInterest = totalPayment - Number(principal);

    return {
      monthlyPayment,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
    };
  }
}


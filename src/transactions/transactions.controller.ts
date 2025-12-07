import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TransactionEngineService } from './transaction-engine.service';
import { CreateTransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * 交易聚合 API
 * 统一处理所有记账操作，自动联动账户余额
 */
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionEngine: TransactionEngineService) {}

  /**
   * 创建交易记录
   * 支持：支出、收入、转账、投资买卖、信用卡还款
   * 自动联动更新账户余额和投资持仓
   */
  @Post()
  async createTransaction(
    @CurrentUser() user: any,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionEngine.createTransaction(user.id, dto);
  }

  /**
   * 获取净资产概览
   * 包含：总资产、总负债、净资产、各账户余额、投资市值
   */
  @Get('net-worth')
  async getNetWorth(@CurrentUser() user: any) {
    return this.transactionEngine.calculateNetWorth(user.id);
  }

  /**
   * 删除交易记录
   * 自动回滚账户余额和投资持仓
   */
  @Delete(':id')
  async deleteTransaction(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.transactionEngine.deleteTransaction(user.id, id);
    return { success: true, message: '交易已删除并回滚' };
  }
}

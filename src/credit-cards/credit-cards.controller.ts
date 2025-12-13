import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { CreateCreditCardTransactionDto, CreditCardTransactionsQueryDto } from './dto/create-transaction.dto';
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto, UpdateCreditCardDto } from './dto/credit-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('credit-cards')
@UseGuards(JwtAuthGuard)
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateCreditCardDto) {
    const result = await this.creditCardsService.create(user.id, dto);
    return ResponseDto.success(result, '创建信用卡成功');
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const result = await this.creditCardsService.findAll(user.id);
    return ResponseDto.success(result, '获取信用卡列表成功');
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.creditCardsService.findOne(id, user.id);
    return ResponseDto.success(result, '获取信用卡详情成功');
  }

  @Patch(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCreditCardDto) {
    const result = await this.creditCardsService.update(id, user.id, dto);
    return ResponseDto.success(result, '更新信用卡成功');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.creditCardsService.remove(id, user.id);
    return ResponseDto.success(result, '删除信用卡成功');
  }

  @Patch('balance/update')
  async updateBalance(@CurrentUser() user: any, @Body() dto: UpdateBalanceDto) {
    const result = await this.creditCardsService.updateBalance(
      dto.cardIdentifier,
      user.id,
      dto.amount,
      dto.transactionType,
    );
    return ResponseDto.success(result, '更新信用卡余额成功');
  }

  @Post('transactions')
  async createTransaction(@CurrentUser() user: any, @Body() dto: CreateCreditCardTransactionDto) {
    const result = await this.creditCardsService.createTransaction(user.id, dto);
    return ResponseDto.success(result, '创建信用卡消费记录成功');
  }

  @Get(':id/transactions')
  async getTransactions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: CreditCardTransactionsQueryDto,
  ) {
    const result = await this.creditCardsService.getTransactions(id, user.id, query.month);
    return ResponseDto.success(result, '获取信用卡消费记录成功');
  }
}

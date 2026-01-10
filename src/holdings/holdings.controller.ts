import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { HoldingsService } from './holdings.service';
import {
  CreateHoldingDto,
  UpdateHoldingDto,
  CreateHoldingTransactionDto,
  BuyNewHoldingDto,
  UpdatePricesDto,
} from './dto/holding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('holdings')
@UseGuards(JwtAuthGuard)
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

  /**
   * 创建持仓（不含交易）
   */
  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateHoldingDto) {
    const result = await this.holdingsService.create(user.id, dto);
    return ResponseDto.success(result, '创建持仓成功');
  }

  /**
   * 买入新资产（创建持仓 + 首次买入）
   */
  @Post('buy-new')
  async buyNew(@CurrentUser() user: any, @Body() dto: BuyNewHoldingDto) {
    const result = await this.holdingsService.buyNewHolding(user.id, dto);
    return ResponseDto.success(result, '买入成功');
  }

  /**
   * 买入（增加持仓）
   */
  @Post('buy')
  async buy(@CurrentUser() user: any, @Body() dto: CreateHoldingTransactionDto) {
    const result = await this.holdingsService.buy(user.id, dto);
    return ResponseDto.success(result, '买入成功');
  }

  /**
   * 卖出（减少持仓）
   */
  @Post('sell')
  async sell(@CurrentUser() user: any, @Body() dto: CreateHoldingTransactionDto) {
    const result = await this.holdingsService.sell(user.id, dto);
    return ResponseDto.success(result, '卖出成功');
  }

  /**
   * 获取用户所有持仓
   */
  @Get()
  async findAll(@CurrentUser() user: any) {
    const result = await this.holdingsService.findAll(user.id);
    return ResponseDto.success(result, '获取持仓列表成功');
  }

  /**
   * 获取用户持仓总市值
   */
  @Get('summary')
  async getSummary(@CurrentUser() user: any) {
    const result = await this.holdingsService.getTotalHoldingsValue(user.id);
    return ResponseDto.success(result, '获取持仓汇总成功');
  }

  /**
   * 获取指定账户下的持仓
   */
  @Get('investment/:investmentId')
  async findByInvestment(
    @CurrentUser() user: any,
    @Param('investmentId') investmentId: string,
  ) {
    const result = await this.holdingsService.findByInvestment(user.id, investmentId);
    return ResponseDto.success(result, '获取投资账户持仓成功');
  }

  /**
   * 获取交易记录
   */
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: any,
    @Query('holdingId') holdingId?: string,
    @Query('accountId') accountId?: string,
  ) {
    const result = await this.holdingsService.getTransactions(
      user.id,
      holdingId,
      accountId,
    );
    return ResponseDto.success(result, '获取交易记录成功');
  }

  /**
   * 获取单个持仓详情
   */
  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.holdingsService.findOne(id, user.id);
    return ResponseDto.success(result, '获取持仓详情成功');
  }

  /**
   * 更新持仓信息
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateHoldingDto,
  ) {
    const result = await this.holdingsService.update(id, user.id, dto);
    return ResponseDto.success(result, '更新持仓成功');
  }

  /**
   * 批量更新价格
   */
  @Patch('prices/batch')
  async updatePrices(@CurrentUser() user: any, @Body() dto: UpdatePricesDto) {
    const result = await this.holdingsService.updatePrices(user.id, dto.prices);
    return ResponseDto.success(result, '更新价格成功');
  }

  /**
   * 删除持仓
   */
  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.holdingsService.remove(id, user.id);
    return ResponseDto.success(result, '删除持仓成功');
  }
}

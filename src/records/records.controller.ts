import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto, UpdateRecordDto, VoiceRecordDto } from './dto/record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  // 手动创建记账
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(user.id, dto);
  }

  // AI语音记账 - 核心接口
  @Post('voice')
  createFromVoice(@CurrentUser() user: any, @Body() dto: VoiceRecordDto) {
    return this.recordsService.createFromVoice(user.id, dto);
  }

  // 查询记录列表
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recordsService.findAll(user.id, {
      type,
      category,
      accountId,
      startDate,
      endDate,
    });
  }

  // 获取统计数据
  @Get('statistics')
  getStatistics(
    @CurrentUser() user: any,
    @Query('period') period?: 'month' | 'year',
  ) {
    return this.recordsService.getStatistics(user.id, period);
  }

  // 获取趋势统计
  @Get('statistics/trend')
  getTrendStatistics(
    @CurrentUser() user: any,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recordsService.getTrendStatistics(user.id, period, startDate, endDate);
  }

  // 获取环比对比统计
  @Get('statistics/comparison')
  getComparisonStatistics(
    @CurrentUser() user: any,
    @Query('month') month?: string,
  ) {
    return this.recordsService.getComparisonStatistics(user.id, month);
  }

  // 获取收入分析
  @Get('statistics/income')
  getIncomeAnalysis(
    @CurrentUser() user: any,
    @Query('period') period?: 'month' | 'year',
  ) {
    return this.recordsService.getIncomeAnalysis(user.id, period);
  }

  // 获取财务健康度
  @Get('statistics/health')
  getFinancialHealth(@CurrentUser() user: any) {
    return this.recordsService.getFinancialHealth(user.id);
  }

  // 获取分类趋势
  @Get('statistics/category-trend')
  getCategoryTrend(
    @CurrentUser() user: any,
    @Query('category') category: string,
    @Query('months') months?: string,
  ) {
    return this.recordsService.getCategoryTrend(user.id, category, months ? parseInt(months) : 6);
  }

  // 获取单条记录
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recordsService.findOne(id, user.id);
  }

  // 更新记录
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(id, user.id, dto);
  }

  // 删除记录
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recordsService.remove(id, user.id);
  }
}

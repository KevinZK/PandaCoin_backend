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
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  /**
   * 创建预算
   * POST /api/budgets
   */
  @Post()
  async create(@Body() dto: CreateBudgetDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const budget = await this.budgetsService.create(userId, dto);
    return ResponseDto.success(budget, '预算创建成功');
  }

  /**
   * 获取所有预算
   * GET /api/budgets
   */
  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const budgets = await this.budgetsService.findAll(userId);
    return ResponseDto.success(budgets);
  }

  /**
   * 获取指定月份预算
   * GET /api/budgets/month/:month
   */
  @Get('month/:month')
  async findByMonth(@Param('month') month: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const budgets = await this.budgetsService.findByMonth(userId, month);
    return ResponseDto.success(budgets);
  }

  /**
   * 获取当前月份预算进度
   * GET /api/budgets/progress/current
   */
  @Get('progress/current')
  async getCurrentProgress(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const progress = await this.budgetsService.getCurrentMonthProgress(userId);
    return ResponseDto.success(progress);
  }

  /**
   * 获取指定月份预算进度
   * GET /api/budgets/progress/:month
   */
  @Get('progress/:month')
  async getProgress(@Param('month') month: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const progress = await this.budgetsService.getMonthlyProgress(userId, month);
    return ResponseDto.success(progress);
  }

  /**
   * 复制上月预算到当月
   * POST /api/budgets/copy-from-previous
   */
  @Post('copy-from-previous')
  async copyFromPrevious(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const count = await this.budgetsService.copyFromPreviousMonth(userId);
    return ResponseDto.success(
      { copiedCount: count },
      count > 0 ? `成功复制 ${count} 个预算` : '上月没有可复制的预算',
    );
  }

  /**
   * 获取单个预算
   * GET /api/budgets/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const budget = await this.budgetsService.findOne(userId, id);
    return ResponseDto.success(budget);
  }

  /**
   * 更新预算
   * PUT /api/budgets/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const budget = await this.budgetsService.update(userId, id, dto);
    return ResponseDto.success(budget, '预算更新成功');
  }

  /**
   * 删除预算（仅删除当月）
   * DELETE /api/budgets/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    await this.budgetsService.remove(userId, id);
    return ResponseDto.success(null, '预算已删除');
  }

  /**
   * 取消循环预算（删除当月及所有未来月份的相同分类循环预算）
   * DELETE /api/budgets/:id/cancel-recurring
   */
  @Delete(':id/cancel-recurring')
  async cancelRecurring(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const result = await this.budgetsService.cancelRecurring(userId, id);
    return ResponseDto.success(result, '循环预算已取消');
  }
}

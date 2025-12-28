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
import { AutoIncomesService } from './auto-incomes.service';
import { CreateAutoIncomeDto, UpdateAutoIncomeDto } from './dto/auto-income.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('auto-incomes')
@UseGuards(JwtAuthGuard)
export class AutoIncomesController {
  constructor(private readonly autoIncomesService: AutoIncomesService) {}

  /**
   * 创建自动入账配置
   * POST /api/auto-incomes
   */
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateAutoIncomeDto,
  ) {
    const result = await this.autoIncomesService.create(user.id, dto);
    return ResponseDto.success(result, '自动入账配置创建成功');
  }

  /**
   * 获取所有自动入账配置
   * GET /api/auto-incomes
   */
  @Get()
  async findAll(@CurrentUser() user: any) {
    const result = await this.autoIncomesService.findAll(user.id);
    return ResponseDto.success(result);
  }

  /**
   * 获取单个自动入账配置
   * GET /api/auto-incomes/:id
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const result = await this.autoIncomesService.findOne(id, user.id);
    return ResponseDto.success(result);
  }

  /**
   * 更新自动入账配置
   * PUT /api/auto-incomes/:id
   */
  @Put(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutoIncomeDto,
  ) {
    const result = await this.autoIncomesService.update(id, user.id, dto);
    return ResponseDto.success(result, '自动入账配置更新成功');
  }

  /**
   * 删除自动入账配置
   * DELETE /api/auto-incomes/:id
   */
  @Delete(':id')
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const result = await this.autoIncomesService.delete(id, user.id);
    return ResponseDto.success(result, '自动入账配置已删除');
  }

  /**
   * 切换启用/禁用状态
   * PATCH /api/auto-incomes/:id/toggle
   */
  @Patch(':id/toggle')
  async toggle(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const result = await this.autoIncomesService.toggle(id, user.id);
    return ResponseDto.success(result, result.isEnabled ? '已启用' : '已禁用');
  }

  /**
   * 获取执行日志
   * GET /api/auto-incomes/:id/logs
   */
  @Get(':id/logs')
  async getLogs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.autoIncomesService.getLogs(
      id,
      user.id,
      limit ? parseInt(limit, 10) : 20,
    );
    return ResponseDto.success(result);
  }

  /**
   * 手动执行入账
   * POST /api/auto-incomes/:id/execute
   */
  @Post(':id/execute')
  async execute(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    // 先验证配置属于用户
    await this.autoIncomesService.findOne(id, user.id);
    const result = await this.autoIncomesService.executeIncome(id);
    return ResponseDto.success(result, result.success ? '入账成功' : result.message);
  }
}

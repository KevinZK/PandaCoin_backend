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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScheduledTasksService } from './scheduled-tasks.service';
import {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
} from './dto/scheduled-task.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('scheduled-tasks')
@UseGuards(AuthGuard('jwt'))
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  /**
   * 创建定时任务
   * POST /api/scheduled-tasks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() dto: CreateScheduledTaskDto) {
    const userId = req.user.sub;
    const task = await this.scheduledTasksService.create(userId, dto);
    return ResponseDto.success(task, '定时任务创建成功');
  }

  /**
   * 获取所有定时任务
   * GET /api/scheduled-tasks
   */
  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user.sub;
    const tasks = await this.scheduledTasksService.findAll(userId);
    return ResponseDto.success(tasks);
  }

  /**
   * 获取单个任务详情
   * GET /api/scheduled-tasks/:id
   */
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const task = await this.scheduledTasksService.findOne(userId, id);
    return ResponseDto.success(task);
  }

  /**
   * 更新定时任务
   * PUT /api/scheduled-tasks/:id
   */
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledTaskDto,
  ) {
    const userId = req.user.sub;
    const task = await this.scheduledTasksService.update(userId, id, dto);
    return ResponseDto.success(task, '定时任务更新成功');
  }

  /**
   * 删除定时任务
   * DELETE /api/scheduled-tasks/:id
   */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.scheduledTasksService.remove(userId, id);
    return ResponseDto.success(null, '定时任务已删除');
  }

  /**
   * 启用/禁用任务
   * PATCH /api/scheduled-tasks/:id/toggle
   */
  @Patch(':id/toggle')
  async toggleEnabled(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const task = await this.scheduledTasksService.toggleEnabled(userId, id);
    return ResponseDto.success(task, task.isEnabled ? '任务已启用' : '任务已禁用');
  }

  /**
   * 获取任务执行日志
   * GET /api/scheduled-tasks/:id/logs
   */
  @Get(':id/logs')
  async getTaskLogs(
    @Req() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const logs = await this.scheduledTasksService.getTaskLogs(
      userId,
      id,
      limit ? parseInt(limit) : 20,
    );
    return ResponseDto.success(logs);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScheduledTaskService } from './scheduled-task.service';
import {
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
} from './dtos/scheduled-task.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('scheduled-tasks')
@UseGuards(AuthGuard('jwt'))
export class ScheduledTaskController {
  constructor(private readonly taskService: ScheduledTaskService) {}

  /**
   * 创建定时任务
   * POST /api/scheduled-tasks
   */
  @Post()
  async create(@Body() dto: CreateScheduledTaskDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const task = await this.taskService.create(userId, dto);
    return ResponseDto.success(task, '定时任务创建成功');
  }

  /**
   * 获取所有定时任务
   * GET /api/scheduled-tasks
   */
  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const tasks = await this.taskService.findAll(userId);
    return ResponseDto.success(tasks);
  }

  /**
   * 获取单个定时任务
   * GET /api/scheduled-tasks/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const task = await this.taskService.findOne(userId, id);
    return ResponseDto.success(task);
  }

  /**
   * 更新定时任务
   * PUT /api/scheduled-tasks/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledTaskDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const task = await this.taskService.update(userId, id, dto);
    return ResponseDto.success(task, '定时任务更新成功');
  }

  /**
   * 删除定时任务
   * DELETE /api/scheduled-tasks/:id
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    await this.taskService.delete(userId, id);
    return ResponseDto.success(null, '定时任务已删除');
  }

  /**
   * 切换任务启用状态
   * POST /api/scheduled-tasks/:id/toggle
   */
  @Post(':id/toggle')
  async toggle(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const task = await this.taskService.toggle(userId, id);
    return ResponseDto.success(task, task.isEnabled ? '任务已启用' : '任务已停用');
  }

  /**
   * 手动执行任务
   * POST /api/scheduled-tasks/:id/execute
   */
  @Post(':id/execute')
  async execute(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    // 验证任务归属
    await this.taskService.findOne(userId, id);
    const result = await this.taskService.executeTask(id);
    return ResponseDto.success(result, '任务执行成功');
  }

  /**
   * 获取任务执行日志
   * GET /api/scheduled-tasks/:id/logs
   */
  @Get(':id/logs')
  async getLogs(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const logs = await this.taskService.getTaskLogs(
      userId,
      id,
      limit ? parseInt(limit) : 20,
    );
    return ResponseDto.success(logs);
  }
}

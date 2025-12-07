import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateAccountDto) {
    const result = await this.accountsService.create(user.id, dto);
    return ResponseDto.success(result, '创建资产成功');
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const result = await this.accountsService.findAll(user.id);
    return ResponseDto.success(result, '获取资产列表成功');
  }

  @Get('total')
  async getTotalAssets(@CurrentUser() user: any) {
    const result = await this.accountsService.getTotalAssets(user.id);
    return ResponseDto.success(result, '获取总资产成功');
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.accountsService.findOne(id, user.id);
    return ResponseDto.success(result, '获取资产详情成功');
  }

  @Patch(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const result = await this.accountsService.update(id, user.id, dto);
    return ResponseDto.success(result, '更新资产成功');
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.accountsService.remove(id, user.id);
    return ResponseDto.success(result, '删除资产成功');
  }
}

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinancialParsingService } from './financial-parsing.service';
import {
  ParseFinancialRequestDto,
  FinancialEventsResponseDto,
} from './dtos/financial-events.dto';
import { ResponseDto } from '../common/dto/response.dto';

/**
 * 财务解析控制器
 * 提供财务语句解析 API
 */
@Controller('financial')
export class FinancialController {
  constructor(
    private readonly financialParsingService: FinancialParsingService,
  ) {}

  /**
   * 解析财务语句
   * POST /api/financial/parse
   *
   * @param body 包含 text 字段的请求体
   * @param req Express 请求对象
   * @returns 结构化的财务事件
   */
  @Post('parse')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async parseFinancial(
    @Body() body: ParseFinancialRequestDto,
    @Req() req: any,
  ): Promise<ResponseDto<FinancialEventsResponseDto>> {
    const userId = req.user?.sub || req.user?.id;
    const headers = req.headers as Record<string, string>;

    const result = await this.financialParsingService.parseFinancialStatement(
      body.text,
      userId,
      headers,
      body.conversationHistory,  // 传递对话历史
    );

    return ResponseDto.success(result, '解析成功');
  }

  /**
   * 健康检查端点
   * GET /api/financial/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<ResponseDto<{ status: string }>> {
    return ResponseDto.success({ status: 'ok' }, 'Financial service is healthy');
  }
}

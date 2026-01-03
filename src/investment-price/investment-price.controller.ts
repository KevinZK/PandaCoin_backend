import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvestmentPriceService } from './investment-price.service';
import { InvestmentCodeService } from './investment-code.service';
import { YFinanceProvider } from './providers/yfinance.provider';

@Controller('investment-price')
@UseGuards(JwtAuthGuard)
export class InvestmentPriceController {
  constructor(
    private readonly priceService: InvestmentPriceService,
    private readonly codeService: InvestmentCodeService,
    private readonly yfinance: YFinanceProvider,
  ) {}

  /**
   * 获取单个资产的当前价格
   * GET /api/investment-price/quote/:ticker
   */
  @Get('quote/:ticker')
  async getQuote(@Param('ticker') ticker: string) {
    const price = await this.yfinance.getPrice(ticker);
    if (!price) {
      return { success: false, error: '无法获取价格' };
    }
    return { success: true, data: price };
  }

  /**
   * 搜索资产代码
   * GET /api/investment-price/search?query=苹果&market=US
   */
  @Get('search')
  async searchAsset(
    @Query('query') query: string,
    @Query('market') market?: string,
  ) {
    const results = await this.codeService.searchAssets(query, market);
    return { success: true, data: results };
  }

  /**
   * 更新单个持仓的价格
   * POST /api/investment-price/update/:holdingId
   */
  @Post('update/:holdingId')
  async updateHoldingPrice(
    @Param('holdingId') holdingId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.priceService.updateHoldingPrice(holdingId);
    return { success: result.success, data: result };
  }

  /**
   * 批量更新所有持仓价格
   * POST /api/investment-price/update-all
   */
  @Post('update-all')
  async updateAllPrices(
    @CurrentUser('id') userId: string,
    @Query('market') market?: string,
  ) {
    const stats = await this.priceService.updateAllPrices(market);
    return { success: true, data: stats };
  }

  /**
   * 获取价格更新日志
   * GET /api/investment-price/logs
   */
  @Get('logs')
  async getUpdateLogs(@Query('limit') limit?: string) {
    const logs = await this.priceService.getUpdateLogs(
      limit ? parseInt(limit, 10) : 10,
    );
    return { success: true, data: logs };
  }

  /**
   * 获取持仓价格历史
   * GET /api/investment-price/history/:holdingId
   */
  @Get('history/:holdingId')
  async getPriceHistory(
    @Param('holdingId') holdingId: string,
    @Query('days') days?: string,
  ) {
    const history = await this.priceService.getPriceHistory(
      holdingId,
      days ? parseInt(days, 10) : 30,
    );
    return { success: true, data: history };
  }
}


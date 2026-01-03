import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YFinanceProvider } from './providers/yfinance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { PriceData, PriceUpdateResult, BatchUpdateStats } from './dto/price.dto';

@Injectable()
export class InvestmentPriceService {
  private readonly logger = new Logger(InvestmentPriceService.name);

  constructor(
    private prisma: PrismaService,
    private yfinance: YFinanceProvider,
    private coingecko: CoinGeckoProvider,
  ) {}

  /**
   * 获取单个资产的最新价格
   */
  async getPrice(tickerCode: string, market: string): Promise<PriceData | null> {
    try {
      if (market === 'CRYPTO') {
        return await this.coingecko.getPrice(tickerCode);
      }
      return await this.yfinance.getPrice(tickerCode);
    } catch (error) {
      this.logger.error(`获取价格失败: ${tickerCode}`, error);
      return null;
    }
  }

  /**
   * 批量获取价格
   */
  async getPrices(tickerCodes: string[], market: string): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    if (market === 'CRYPTO') {
      const prices = await this.coingecko.getPrices(tickerCodes);
      prices.forEach((price, code) => results.set(code, price));
    } else {
      const prices = await this.yfinance.getPrices(tickerCodes);
      prices.forEach((price, code) => results.set(code, price));
    }

    return results;
  }

  /**
   * 更新单个持仓的价格
   */
  async updateHoldingPrice(holdingId: string): Promise<PriceUpdateResult> {
    const holding = await this.prisma.holding.findUnique({
      where: { id: holdingId },
    });

    if (!holding || !holding.tickerCode) {
      return {
        holdingId,
        tickerCode: holding?.tickerCode || 'UNKNOWN',
        success: false,
        error: '持仓不存在或无代码',
      };
    }

    const priceData = await this.getPrice(holding.tickerCode, holding.market);

    if (!priceData) {
      return {
        holdingId,
        tickerCode: holding.tickerCode,
        success: false,
        error: '获取价格失败',
      };
    }

    // 计算盈亏
    const currentValue = holding.quantity * priceData.currentPrice;
    const costBasis = holding.quantity * holding.avgCostPrice;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    // 更新数据库
    await this.prisma.holding.update({
      where: { id: holdingId },
      data: {
        currentPrice: priceData.currentPrice,
        previousClose: priceData.previousClose,
        priceChange: priceData.priceChange,
        priceChangePercent: priceData.priceChangePercent,
        lastPriceAt: new Date(),
        priceSource: priceData.source,
        currentValue,
        profitLoss,
        profitLossPercent,
      },
    });

    // 记录价格历史
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.priceHistory.upsert({
      where: {
        holdingId_date: {
          holdingId,
          date: today,
        },
      },
      create: {
        holdingId,
        tickerCode: holding.tickerCode,
        date: today,
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.currentPrice,
        volume: priceData.volume,
        source: priceData.source,
      },
      update: {
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.currentPrice,
        volume: priceData.volume,
        source: priceData.source,
      },
    });

    return {
      holdingId,
      tickerCode: holding.tickerCode,
      success: true,
      price: priceData.currentPrice,
    };
  }

  /**
   * 批量更新所有持仓价格
   */
  async updateAllPrices(market?: string): Promise<BatchUpdateStats> {
    const startTime = Date.now();
    const errors: { holdingId: string; error: string }[] = [];

    // 获取需要更新的持仓
    const where: any = {
      codeVerified: true,
      tickerCode: { not: null },
    };
    if (market) {
      where.market = market;
    }

    const holdings = await this.prisma.holding.findMany({
      where,
      select: { id: true, tickerCode: true, market: true },
    });

    this.logger.log(`开始更新 ${holdings.length} 个持仓的价格`);

    let successCount = 0;
    let failCount = 0;

    // 按市场分组批量处理
    const marketGroups = new Map<string, typeof holdings>();
    holdings.forEach((h) => {
      const group = marketGroups.get(h.market) || [];
      group.push(h);
      marketGroups.set(h.market, group);
    });

    for (const [mkt, group] of marketGroups) {
      const tickerCodes = group.map((h) => h.tickerCode!);
      const prices = await this.getPrices(tickerCodes, mkt);

      for (const holding of group) {
        const priceData = prices.get(holding.tickerCode!);
        if (priceData) {
          try {
            await this.updateHoldingWithPrice(holding.id, priceData);
            successCount++;
          } catch (error) {
            failCount++;
            errors.push({
              holdingId: holding.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } else {
          failCount++;
          errors.push({
            holdingId: holding.id,
            error: '未获取到价格数据',
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    // 记录日志
    await this.prisma.priceUpdateLog.create({
      data: {
        totalAssets: holdings.length,
        successCount,
        failCount,
        skipCount: 0,
        duration,
        source: market ? `CRON_${market}` : 'CRON_ALL',
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    this.logger.log(
      `价格更新完成: 成功 ${successCount}/${holdings.length}, 耗时 ${duration}ms`,
    );

    return {
      totalAssets: holdings.length,
      successCount,
      failCount,
      skipCount: 0,
      duration,
      errors,
    };
  }

  /**
   * 使用价格数据更新持仓
   */
  private async updateHoldingWithPrice(holdingId: string, priceData: PriceData) {
    const holding = await this.prisma.holding.findUnique({
      where: { id: holdingId },
    });

    if (!holding) return;

    const currentValue = holding.quantity * priceData.currentPrice;
    const costBasis = holding.quantity * holding.avgCostPrice;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

    await this.prisma.holding.update({
      where: { id: holdingId },
      data: {
        currentPrice: priceData.currentPrice,
        previousClose: priceData.previousClose,
        priceChange: priceData.priceChange,
        priceChangePercent: priceData.priceChangePercent,
        lastPriceAt: new Date(),
        priceSource: priceData.source,
        currentValue,
        profitLoss,
        profitLossPercent,
      },
    });

    // 记录价格历史
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.priceHistory.upsert({
      where: {
        holdingId_date: {
          holdingId,
          date: today,
        },
      },
      create: {
        holdingId,
        tickerCode: holding.tickerCode!,
        date: today,
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.currentPrice,
        volume: priceData.volume,
        source: priceData.source,
      },
      update: {
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.currentPrice,
        volume: priceData.volume,
        source: priceData.source,
      },
    });
  }

  /**
   * 获取价格历史
   */
  async getPriceHistory(holdingId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.priceHistory.findMany({
      where: {
        holdingId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * 获取更新日志
   */
  async getUpdateLogs(limit: number = 10) {
    return this.prisma.priceUpdateLog.findMany({
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YFinanceProvider } from './providers/yfinance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { CodeSearchResult } from './dto/price.dto';

@Injectable()
export class InvestmentCodeService {
  private readonly logger = new Logger(InvestmentCodeService.name);

  constructor(
    private prisma: PrismaService,
    private yfinance: YFinanceProvider,
    private coingecko: CoinGeckoProvider,
  ) {}

  /**
   * 验证并解析资产代码
   * 1. 先查缓存
   * 2. 如果缓存没有，调用 API 搜索
   * 3. 更新缓存
   */
  async resolveCode(
    inputName: string,
    type: string,
    market: string,
  ): Promise<CodeSearchResult | null> {
    // 1. 查询缓存
    const cached = await this.prisma.assetCodeMapping.findFirst({
      where: {
        inputName: inputName.toLowerCase(),
        type,
        market,
      },
    });

    if (cached) {
      // 更新使用次数
      await this.prisma.assetCodeMapping.update({
        where: { id: cached.id },
        data: {
          hitCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return {
        tickerCode: cached.standardCode,
        name: cached.standardName || inputName,
        type: cached.type,
        market: cached.market,
        confidence: cached.confidence,
      };
    }

    // 2. 调用 API 搜索
    let searchResults: CodeSearchResult[] = [];

    if (market === 'CRYPTO') {
      searchResults = await this.coingecko.searchAsset(inputName);
    } else {
      searchResults = await this.yfinance.searchAsset(inputName, market);
    }

    if (searchResults.length === 0) {
      this.logger.warn(`未找到资产代码: ${inputName} (${type}/${market})`);
      return null;
    }

    const bestMatch = searchResults[0];

    // 3. 缓存结果
    await this.prisma.assetCodeMapping.upsert({
      where: {
        inputName_type_market: {
          inputName: inputName.toLowerCase(),
          type,
          market,
        },
      },
      create: {
        inputName: inputName.toLowerCase(),
        standardCode: bestMatch.tickerCode,
        standardName: bestMatch.name,
        type: bestMatch.type,
        market: bestMatch.market,
        confidence: bestMatch.confidence,
      },
      update: {
        standardCode: bestMatch.tickerCode,
        standardName: bestMatch.name,
        confidence: bestMatch.confidence,
        hitCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(
      `解析代码成功: ${inputName} -> ${bestMatch.tickerCode} (${bestMatch.name})`,
    );

    return bestMatch;
  }

  /**
   * 验证代码是否有效
   */
  async verifyCode(tickerCode: string, market: string): Promise<boolean> {
    try {
      if (market === 'CRYPTO') {
        const price = await this.coingecko.getPrice(tickerCode);
        return price !== null;
      } else {
        const price = await this.yfinance.getPrice(tickerCode);
        return price !== null;
      }
    } catch {
      return false;
    }
  }

  /**
   * 验证并更新持仓的代码
   */
  async verifyAndUpdateHolding(holdingId: string): Promise<boolean> {
    const holding = await this.prisma.holding.findUnique({
      where: { id: holdingId },
    });

    if (!holding) {
      return false;
    }

    // 如果已有代码，验证有效性
    if (holding.tickerCode) {
      const isValid = await this.verifyCode(holding.tickerCode, holding.market);
      if (isValid) {
        await this.prisma.holding.update({
          where: { id: holdingId },
          data: { codeVerified: true },
        });
        return true;
      }
    }

    // 尝试解析代码
    const result = await this.resolveCode(
      holding.name,
      holding.type,
      holding.market,
    );

    if (result) {
      await this.prisma.holding.update({
        where: { id: holdingId },
        data: {
          tickerCode: result.tickerCode,
          displayName: result.name,
          codeVerified: true,
          codeSource: 'YFINANCE',
        },
      });
      return true;
    }

    return false;
  }

  /**
   * 批量验证未验证的持仓
   */
  async verifyUnverifiedHoldings(): Promise<{
    total: number;
    verified: number;
    failed: number;
  }> {
    const unverified = await this.prisma.holding.findMany({
      where: { codeVerified: false },
    });

    let verified = 0;
    let failed = 0;

    for (const holding of unverified) {
      const success = await this.verifyAndUpdateHolding(holding.id);
      if (success) {
        verified++;
      } else {
        failed++;
      }
    }

    this.logger.log(
      `验证完成: ${verified}/${unverified.length} 成功, ${failed} 失败`,
    );

    return {
      total: unverified.length,
      verified,
      failed,
    };
  }

  /**
   * 搜索资产（用于前端自动完成）
   */
  async searchAssets(
    query: string,
    type?: string,
    market?: string,
  ): Promise<CodeSearchResult[]> {
    if (market === 'CRYPTO') {
      return this.coingecko.searchAsset(query);
    }
    return this.yfinance.searchAsset(query, market);
  }
}


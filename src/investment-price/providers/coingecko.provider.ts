import { Injectable, Logger } from '@nestjs/common';
import { PriceData, CodeSearchResult } from '../dto/price.dto';

/**
 * CoinGecko Provider
 * 用于获取数字货币价格
 * API: https://api.coingecko.com/api/v3
 * 免费额度: 30次/分钟
 */
@Injectable()
export class CoinGeckoProvider {
  private readonly logger = new Logger(CoinGeckoProvider.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  
  // 常见加密货币 ID 映射
  private readonly cryptoIdMap: Record<string, string> = {
    'BTC-USD': 'bitcoin',
    'ETH-USD': 'ethereum',
    'DOGE-USD': 'dogecoin',
    'XRP-USD': 'ripple',
    'LTC-USD': 'litecoin',
    'SOL-USD': 'solana',
    'ADA-USD': 'cardano',
    'DOT-USD': 'polkadot',
    'AVAX-USD': 'avalanche-2',
    'MATIC-USD': 'matic-network',
    'LINK-USD': 'chainlink',
    'UNI-USD': 'uniswap',
    'ATOM-USD': 'cosmos',
    'XLM-USD': 'stellar',
    'ALGO-USD': 'algorand',
  };

  /**
   * 获取单个加密货币价格
   */
  async getPrice(tickerCode: string): Promise<PriceData | null> {
    try {
      const coinId = this.getCoinId(tickerCode);
      if (!coinId) {
        this.logger.warn(`未知的加密货币: ${tickerCode}`);
        return null;
      }

      const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const coinData = data[coinId];

      if (!coinData) {
        return null;
      }

      const currentPrice = coinData.usd;
      const priceChangePercent = coinData.usd_24h_change || 0;
      const previousClose = currentPrice / (1 + priceChangePercent / 100);

      return {
        tickerCode,
        currentPrice,
        previousClose,
        priceChange: currentPrice - previousClose,
        priceChangePercent,
        volume: coinData.usd_24h_vol,
        currency: 'USD',
        source: 'COINGECKO',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`CoinGecko 获取价格异常: ${tickerCode}`, error);
      return null;
    }
  }

  /**
   * 批量获取价格
   */
  async getPrices(tickerCodes: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    try {
      // 转换为 CoinGecko ID
      const coinIds = tickerCodes
        .map((code) => this.getCoinId(code))
        .filter(Boolean);

      if (coinIds.length === 0) return results;

      const url = `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 映射回 ticker code
      for (const tickerCode of tickerCodes) {
        const coinId = this.getCoinId(tickerCode);
        if (!coinId || !data[coinId]) continue;

        const coinData = data[coinId];
        const currentPrice = coinData.usd;
        const priceChangePercent = coinData.usd_24h_change || 0;
        const previousClose = currentPrice / (1 + priceChangePercent / 100);

        results.set(tickerCode, {
          tickerCode,
          currentPrice,
          previousClose,
          priceChange: currentPrice - previousClose,
          priceChangePercent,
          volume: coinData.usd_24h_vol,
          currency: 'USD',
          source: 'COINGECKO',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('CoinGecko 批量获取价格异常', error);
    }

    return results;
  }

  /**
   * 搜索加密货币
   */
  async searchAsset(query: string): Promise<CodeSearchResult[]> {
    try {
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const coins = data.coins || [];

      return coins.slice(0, 10).map((coin: any) => ({
        tickerCode: `${coin.symbol.toUpperCase()}-USD`,
        name: coin.name,
        type: 'CRYPTO',
        market: 'CRYPTO',
        confidence: coin.market_cap_rank ? 1 / coin.market_cap_rank : 0.5,
      }));
    } catch (error) {
      this.logger.error(`CoinGecko 搜索异常: ${query}`, error);
      return [];
    }
  }

  /**
   * 获取 CoinGecko ID
   */
  private getCoinId(tickerCode: string): string | null {
    // 优先查找映射
    if (this.cryptoIdMap[tickerCode]) {
      return this.cryptoIdMap[tickerCode];
    }

    // 尝试从 ticker code 推断
    // 例如: BTC-USD -> bitcoin
    const symbol = tickerCode.replace('-USD', '').toLowerCase();
    
    // 常见映射
    const symbolMap: Record<string, string> = {
      btc: 'bitcoin',
      eth: 'ethereum',
      doge: 'dogecoin',
      xrp: 'ripple',
      ltc: 'litecoin',
      sol: 'solana',
      ada: 'cardano',
      dot: 'polkadot',
      avax: 'avalanche-2',
      matic: 'matic-network',
      link: 'chainlink',
      uni: 'uniswap',
      atom: 'cosmos',
      xlm: 'stellar',
      algo: 'algorand',
      near: 'near',
      ftm: 'fantom',
      sand: 'the-sandbox',
      mana: 'decentraland',
      aave: 'aave',
      crv: 'curve-dao-token',
      ldo: 'lido-dao',
      apt: 'aptos',
      arb: 'arbitrum',
      op: 'optimism',
    };

    return symbolMap[symbol] || null;
  }
}


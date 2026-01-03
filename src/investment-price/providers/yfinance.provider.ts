import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { PriceData, CodeSearchResult } from '../dto/price.dto';

/**
 * yfinance Provider
 * 通过 Python 脚本调用 yfinance 库获取股票/ETF/基金价格
 */
@Injectable()
export class YFinanceProvider {
  private readonly logger = new Logger(YFinanceProvider.name);
  private readonly pythonScript = 'scripts/yfinance_bridge.py';

  /**
   * 获取单个资产价格
   */
  async getPrice(tickerCode: string): Promise<PriceData | null> {
    try {
      const result = await this.executePython('get_price', { ticker: tickerCode });
      
      if (!result || result.error) {
        this.logger.warn(`yfinance 获取价格失败: ${tickerCode} - ${result?.error}`);
        return null;
      }

      return {
        tickerCode,
        currentPrice: result.price,
        previousClose: result.previousClose,
        priceChange: result.price - (result.previousClose || result.price),
        priceChangePercent: result.previousClose
          ? ((result.price - result.previousClose) / result.previousClose) * 100
          : 0,
        open: result.open,
        high: result.high,
        low: result.low,
        volume: result.volume,
        currency: result.currency || 'USD',
        source: 'YFINANCE',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`yfinance 获取价格异常: ${tickerCode}`, error);
      return null;
    }
  }

  /**
   * 批量获取价格
   */
  async getPrices(tickerCodes: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    try {
      const result = await this.executePython('get_prices', {
        tickers: tickerCodes.join(','),
      });

      if (result && result.prices) {
        for (const [ticker, data] of Object.entries(result.prices)) {
          const priceInfo = data as any;
          if (priceInfo && !priceInfo.error) {
            results.set(ticker, {
              tickerCode: ticker,
              currentPrice: priceInfo.price,
              previousClose: priceInfo.previousClose,
              priceChange: priceInfo.price - (priceInfo.previousClose || priceInfo.price),
              priceChangePercent: priceInfo.previousClose
                ? ((priceInfo.price - priceInfo.previousClose) / priceInfo.previousClose) * 100
                : 0,
              open: priceInfo.open,
              high: priceInfo.high,
              low: priceInfo.low,
              volume: priceInfo.volume,
              currency: priceInfo.currency || 'USD',
              source: 'YFINANCE',
              timestamp: new Date(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('yfinance 批量获取价格异常', error);
    }

    return results;
  }

  /**
   * 搜索资产代码
   */
  async searchAsset(query: string, market?: string): Promise<CodeSearchResult[]> {
    try {
      const result = await this.executePython('search', {
        query,
        market: market || '',
      });

      if (!result || result.error || !result.results) {
        return [];
      }

      return result.results.map((r: any) => ({
        tickerCode: r.symbol,
        name: r.name || r.longName || r.shortName,
        type: this.mapAssetType(r.quoteType),
        market: this.mapMarket(r.exchange),
        exchange: r.exchange,
        confidence: r.score || 1.0,
      }));
    } catch (error) {
      this.logger.error(`yfinance 搜索异常: ${query}`, error);
      return [];
    }
  }

  /**
   * 执行 Python 脚本
   */
  private executePython(action: string, params: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        this.pythonScript,
        action,
        ...Object.entries(params).flatMap(([k, v]) => [`--${k}`, v]),
      ];

      const python = spawn('python3', args, {
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python 脚本执行失败: ${stderr}`);
          resolve({ error: stderr || 'Unknown error' });
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          this.logger.error(`Python 输出解析失败: ${stdout}`);
          resolve({ error: 'Parse error' });
        }
      });

      python.on('error', (err) => {
        this.logger.error('Python 进程启动失败', err);
        reject(err);
      });
    });
  }

  /**
   * 映射资产类型
   */
  private mapAssetType(quoteType: string): string {
    const typeMap: Record<string, string> = {
      EQUITY: 'STOCK',
      ETF: 'ETF',
      MUTUALFUND: 'FUND',
      CRYPTOCURRENCY: 'CRYPTO',
      INDEX: 'INDEX',
    };
    return typeMap[quoteType?.toUpperCase()] || 'OTHER';
  }

  /**
   * 映射市场
   */
  private mapMarket(exchange: string): string {
    if (!exchange) return 'US';
    
    const ex = exchange.toUpperCase();
    if (ex.includes('HK') || ex.includes('HKSE')) return 'HK';
    if (ex.includes('SS') || ex.includes('SZ') || ex.includes('SHE') || ex.includes('SHA')) return 'CN';
    if (ex.includes('NAS') || ex.includes('NYQ') || ex.includes('NYSE')) return 'US';
    
    return 'GLOBAL';
  }
}


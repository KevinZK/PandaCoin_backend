/**
 * 价格数据 DTO
 */
export interface PriceData {
  tickerCode: string;
  currentPrice: number;
  previousClose?: number;
  priceChange?: number;
  priceChangePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  currency: string;
  source: string;
  timestamp: Date;
}

/**
 * 代码搜索结果
 */
export interface CodeSearchResult {
  tickerCode: string;
  name: string;
  type: string; // STOCK, ETF, FUND, CRYPTO
  market: string; // US, HK, CN, CRYPTO
  exchange?: string;
  confidence: number;
}

/**
 * 价格更新结果
 */
export interface PriceUpdateResult {
  holdingId: string;
  tickerCode: string;
  success: boolean;
  price?: number;
  error?: string;
}

/**
 * 批量更新统计
 */
export interface BatchUpdateStats {
  totalAssets: number;
  successCount: number;
  failCount: number;
  skipCount: number;
  duration: number;
  errors: { holdingId: string; error: string }[];
}


import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// 持仓类型
export const HoldingType = {
  STOCK: 'STOCK',
  ETF: 'ETF',
  FUND: 'FUND',
  BOND: 'BOND',
  CRYPTO: 'CRYPTO',
  OPTION: 'OPTION',
  OTHER: 'OTHER',
} as const;

// 市场类型
export const MarketType = {
  US: 'US',
  HK: 'HK',
  CN: 'CN',
  CRYPTO: 'CRYPTO',
  GLOBAL: 'GLOBAL',
} as const;

// 交易类型
export const HoldingTransactionType = {
  BUY: 'BUY',
  SELL: 'SELL',
  DIVIDEND: 'DIVIDEND',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
} as const;

/**
 * 创建持仓 DTO
 */
export class CreateHoldingDto {
  @IsString()
  @IsNotEmpty({ message: '投资账户 ID 不能为空' })
  investmentId: string;

  @IsString()
  @IsNotEmpty({ message: '资产名称不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsEnum(Object.values(HoldingType))
  type: string;

  @IsOptional()
  @IsEnum(Object.values(MarketType))
  market?: string;

  @IsOptional()
  @IsString()
  tickerCode?: string;

  @IsOptional()
  @IsBoolean()
  codeVerified?: boolean;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  avgCostPrice: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

/**
 * 更新持仓 DTO
 */
export class UpdateHoldingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  tickerCode?: string;

  @IsOptional()
  @IsBoolean()
  codeVerified?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  avgCostPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentPrice?: number;

  @IsOptional()
  @IsString()
  market?: string;
}

/**
 * 创建持仓交易 DTO (买入/卖出)
 */
export class CreateHoldingTransactionDto {
  @IsString()
  @IsNotEmpty()
  holdingId: string;

  @IsEnum(Object.values(HoldingTransactionType))
  type: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fee?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  rawText?: string;
}

/**
 * 买入新资产 DTO (创建持仓 + 首次买入交易)
 */
export class BuyNewHoldingDto {
  @IsString()
  @IsNotEmpty({ message: '投资账户 ID 不能为空' })
  investmentId: string;

  @IsString()
  @IsNotEmpty({ message: '资产名称不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsEnum(Object.values(HoldingType))
  type: string;

  @IsOptional()
  @IsEnum(Object.values(MarketType))
  market?: string;

  @IsOptional()
  @IsString()
  tickerCode?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fee?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

/**
 * 批量更新价格 DTO
 */
export class UpdatePricesDto {
  prices: {
    holdingId: string;
    currentPrice: number;
  }[];
}

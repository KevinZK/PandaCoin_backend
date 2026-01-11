import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = 'EXPENSE',           // 支出
  INCOME = 'INCOME',             // 收入
  TRANSFER = 'TRANSFER',         // 转账
  INVEST_BUY = 'INVEST_BUY',     // 投资买入
  INVEST_SELL = 'INVEST_SELL',   // 投资卖出
  REPAYMENT = 'REPAYMENT',       // 信用卡还款
}

/**
 * 统一交易请求 DTO
 * 所有记账操作都通过这个 DTO
 */
export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  amount: number;

  @IsUUID()
  accountId: string;  // 源账户ID

  @IsOptional()
  @IsUUID()
  targetAccountId?: string;  // 目标账户ID (转账/还款时必填)

  @IsOptional()
  @IsUUID()
  holdingId?: string;  // 持仓ID (投资买卖时必填)

  @IsOptional()
  @IsNumber()
  quantity?: number;  // 投资数量

  @IsOptional()
  @IsNumber()
  unitPrice?: number;  // 投资单价

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rawText?: string;  // AI语音原文

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;  // AI置信度
}

/**
 * 交易结果响应
 */
export class TransactionResultDto {
  record: {
    id: string;
    type: string;
    amount: number;
    category: string;
    description?: string;
    date: Date;
  };

  accountChanges: {
    accountId: string;
    accountName: string;
    previousBalance: number;
    newBalance: number;
    change: number;
  }[];

  holdingChanges?: {
    holdingId: string;
    holdingName: string;
    previousQuantity: number;
    newQuantity: number;
    change: number;
    avgCostPrice?: number;
  };
}

/**
 * 净资产响应
 */
export class NetWorthDto {
  totalAssets: number;      // 总资产(正余额账户+投资市值)
  totalLiabilities: number; // 总负债
  netWorth: number;         // 净资产

  breakdown: {
    bankAccounts: number;          // 银行卡总额
    cashAccounts: number;          // 现金总额
    digitalWalletAccounts: number; // 电子钱包总额
    savingsAccounts: number;       // 储蓄账户总额
    retirementAccounts: number;    // 养老金总额
    cryptoAccounts: number;        // 加密货币总额
    propertyValue: number;         // 房产价值
    vehicleValue: number;          // 车辆价值
    otherAssets: number;           // 其他资产
    investmentValue: number;       // 投资市值
    creditCardDebt: number;        // 信用卡欠款
    loanDebt: number;              // 贷款
    mortgageDebt: number;          // 房贷
    otherLiabilities: number;      // 其他负债
  };

  accounts: {
    id: string;
    name: string;
    type: string;
    balance: number;
  }[];

  investmentAccounts?: {
    id: string;
    name: string;
    type: string;
    cashBalance: number;
  }[];

  investments: {
    id: string;
    name: string;
    type: string;
    quantity: number;
    costPrice: number;
    currentPrice: number;
    marketValue: number;
    profitLoss: number;
  }[];
}

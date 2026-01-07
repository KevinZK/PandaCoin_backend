import { IsString, IsEnum, IsNumber, IsOptional, IsNotEmpty, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty({ message: '资产名称不能为空' })
  name: string;

  @IsEnum(['BANK', 'INVESTMENT', 'CASH', 'CREDIT_CARD', 'DIGITAL_WALLET', 'LOAN', 'MORTGAGE', 'SAVINGS', 'RETIREMENT', 'CRYPTO', 'PROPERTY', 'VEHICLE', 'OTHER_ASSET', 'OTHER_LIABILITY'])
  type: 'BANK' | 'INVESTMENT' | 'CASH' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'RETIREMENT' | 'CRYPTO' | 'PROPERTY' | 'VEHICLE' | 'OTHER_ASSET' | 'OTHER_LIABILITY';

  @IsNumber()
  @Type(() => Number)
  balance: number;

  @IsOptional()
  @IsString()
  currency?: string;

  // 贷款专用字段
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  loanTermMonths?: number; // 贷款期限(月)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  interestRate?: number; // 年利率 (%)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyPayment?: number; // 月供金额

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  @Type(() => Number)
  repaymentDay?: number; // 还款日 (1-28)

  @IsOptional()
  @IsString()
  loanStartDate?: string; // 贷款开始日期 (ISO 8601)

  @IsOptional()
  @IsString()
  institutionName?: string; // 贷款机构

  // 银行卡/账户标识（尾号）
  @IsOptional()
  @IsString()
  cardIdentifier?: string;

  // 自动扣款配置
  @IsOptional()
  @IsBoolean()
  autoRepayment?: boolean; // 是否启用自动扣款

  @IsOptional()
  @IsString()
  sourceAccountId?: string; // 扣款来源账户 ID

  @IsOptional()
  @IsString()
  sourceAccountName?: string; // 扣款来源账户名称 (用于 AI 解析)
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  balance?: number;

  // 贷款专用字段
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  loanTermMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  interestRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyPayment?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  @Type(() => Number)
  repaymentDay?: number;

  @IsOptional()
  @IsString()
  loanStartDate?: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  // 银行卡/账户标识（尾号）
  @IsOptional()
  @IsString()
  cardIdentifier?: string;

  // 自动扣款配置
  @IsOptional()
  @IsBoolean()
  autoRepayment?: boolean;

  @IsOptional()
  @IsString()
  sourceAccountId?: string;
}

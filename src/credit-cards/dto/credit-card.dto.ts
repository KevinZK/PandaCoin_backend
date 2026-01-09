import { IsString, IsNumber, IsOptional, Min, IsBoolean, IsEnum } from 'class-validator';

export class CreateCreditCardDto {
  @IsString()
  name: string;

  @IsString()
  institutionName: string;

  @IsString()
  cardIdentifier: string;

  @IsNumber()
  @Min(0)
  creditLimit: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentBalance?: number;  // 待还金额

  @IsOptional()
  @IsString()
  repaymentDueDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // 自动扣款配置
  @IsOptional()
  @IsBoolean()
  autoRepayment?: boolean;

  @IsOptional()
  @IsEnum(['FULL', 'MIN'])
  repaymentType?: 'FULL' | 'MIN'; // 全额还款 / 最低还款

  @IsOptional()
  @IsString()
  sourceAccountId?: string; // 扣款来源账户 ID

  @IsOptional()
  @IsString()
  sourceAccountName?: string; // 扣款来源账户名称 (用于 AI 解析)
}

export class UpdateCreditCardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  cardIdentifier?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @IsOptional()
  @IsString()
  repaymentDueDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // 自动扣款配置
  @IsOptional()
  @IsBoolean()
  autoRepayment?: boolean;

  @IsOptional()
  @IsEnum(['FULL', 'MIN'])
  repaymentType?: 'FULL' | 'MIN';

  @IsOptional()
  @IsString()
  sourceAccountId?: string;
}

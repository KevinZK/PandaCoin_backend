import { IsString, IsEnum, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
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
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  balance?: number;
}

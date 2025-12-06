import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(['BANK', 'INVESTMENT', 'CASH', 'CREDIT_CARD'])
  type: 'BANK' | 'INVESTMENT' | 'CASH' | 'CREDIT_CARD';

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

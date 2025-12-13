import { IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum CreditCardTransactionType {
  EXPENSE = 'EXPENSE',
  PAYMENT = 'PAYMENT',
}

export class CreateCreditCardTransactionDto {
  @IsString()
  cardIdentifier: string;

  @IsNumber()
  amount: number;

  @IsEnum(CreditCardTransactionType)
  type: 'EXPENSE' | 'PAYMENT';

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreditCardTransactionResponseDto {
  transaction: any;
  creditCard: any;
  record?: any;
}

export class CreditCardTransactionsQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // 格式: YYYY-MM
}

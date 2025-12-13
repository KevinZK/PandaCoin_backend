import { IsString, IsNumber, IsEnum } from 'class-validator';

export enum CreditCardTransactionType {
  EXPENSE = 'EXPENSE',
  PAYMENT = 'PAYMENT',
}

export class UpdateBalanceDto {
  @IsString()
  cardIdentifier: string;

  @IsNumber()
  amount: number;

  @IsEnum(CreditCardTransactionType)
  transactionType: 'EXPENSE' | 'PAYMENT';
}

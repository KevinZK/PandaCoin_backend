import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

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
  @IsString()
  repaymentDueDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;
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
}

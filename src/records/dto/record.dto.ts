import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecordDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsEnum(['EXPENSE', 'INCOME', 'TRANSFER'])
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;

  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class UpdateRecordDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsEnum(['EXPENSE', 'INCOME', 'TRANSFER'])
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

// AI语音记账DTO
export class VoiceRecordDto {
  @IsString()
  text: string; // 语音转换的文本
}

// 批量创建记账记录
export class BatchCreateRecordsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecordDto)
  records: CreateRecordDto[];
}

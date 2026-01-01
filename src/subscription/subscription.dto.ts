import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsNumber } from 'class-validator';

export enum SubscriptionStatus {
  NONE = 'NONE',
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsDateString()
  trialStartDate?: string;

  @IsOptional()
  @IsDateString()
  trialEndDate?: string;

  @IsOptional()
  @IsDateString()
  subscriptionStartDate?: string;

  @IsOptional()
  @IsDateString()
  subscriptionEndDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class StartTrialDto {
  @IsOptional()
  @IsNumber()
  durationDays?: number;
}

export class SyncAppleSubscriptionDto {
  @IsString()
  appleProductId: string;

  @IsString()
  appleTransactionId: string;

  @IsBoolean()
  isInTrial: boolean;

  @IsDateString()
  expirationDate: string;
}

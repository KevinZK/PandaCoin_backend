import { Module } from '@nestjs/common';
import { HoldingsController } from './holdings.controller';
import { HoldingsService } from './holdings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InvestmentPriceModule } from '../investment-price/investment-price.module';

@Module({
  imports: [PrismaModule, InvestmentPriceModule],
  controllers: [HoldingsController],
  providers: [HoldingsService],
  exports: [HoldingsService],
})
export class HoldingsModule {}

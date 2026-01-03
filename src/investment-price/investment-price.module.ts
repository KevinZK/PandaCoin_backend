import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { InvestmentPriceController } from './investment-price.controller';
import { InvestmentPriceService } from './investment-price.service';
import { InvestmentCodeService } from './investment-code.service';
import { InvestmentPriceExecutor } from './investment-price.executor';
import { YFinanceProvider } from './providers/yfinance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [InvestmentPriceController],
  providers: [
    InvestmentPriceService,
    InvestmentCodeService,
    InvestmentPriceExecutor,
    YFinanceProvider,
    CoinGeckoProvider,
  ],
  exports: [InvestmentPriceService, InvestmentCodeService],
})
export class InvestmentPriceModule {}


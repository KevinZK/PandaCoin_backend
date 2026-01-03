import { Module } from '@nestjs/common';
import { HoldingsController } from './holdings.controller';
import { HoldingsService } from './holdings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HoldingsController],
  providers: [HoldingsService],
  exports: [HoldingsService],
})
export class HoldingsModule {}

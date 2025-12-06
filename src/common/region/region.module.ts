import { Module } from '@nestjs/common';
import { RegionService } from './region.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {}

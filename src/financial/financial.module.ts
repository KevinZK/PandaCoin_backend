import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FinancialController } from './financial.controller';
import { FinancialParsingService } from './financial-parsing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { RegionModule } from '../common/region/region.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [ConfigModule, PrismaModule, LoggerModule, RegionModule, SkillsModule],
  controllers: [FinancialController],
  providers: [FinancialParsingService],
  exports: [FinancialParsingService],
})
export class FinancialModule {}

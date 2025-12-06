import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FinancialController } from './financial.controller';
import { FinancialParsingService } from './financial-parsing.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { QwenProvider } from './providers/qwen.provider';
import { AIServiceRouter } from './providers/ai-service.router';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { RegionModule } from '../common/region/region.module';

@Module({
  imports: [ConfigModule, PrismaModule, LoggerModule, RegionModule],
  controllers: [FinancialController],
  providers: [
    FinancialParsingService,
    GeminiProvider,
    OpenAIProvider,
    QwenProvider,
    AIServiceRouter,
  ],
  exports: [FinancialParsingService],
})
export class FinancialModule {}

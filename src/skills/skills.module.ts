import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillLoaderService } from './skill-loader.service';
import { SkillRouterService } from './skill-router.service';
import { SkillExecutorService } from './skill-executor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [SkillsController],
  providers: [
    SkillLoaderService,
    SkillRouterService,
    SkillExecutorService,
  ],
  exports: [
    SkillLoaderService,
    SkillRouterService,
    SkillExecutorService,
  ],
})
export class SkillsModule {}

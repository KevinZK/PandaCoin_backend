import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTaskController } from './scheduled-task.controller';
import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskExecutor } from './scheduled-task.executor';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggerModule,
    forwardRef(() => BudgetsModule),
  ],
  controllers: [ScheduledTaskController],
  providers: [ScheduledTaskService, ScheduledTaskExecutor],
  exports: [ScheduledTaskService],
})
export class ScheduledModule {}

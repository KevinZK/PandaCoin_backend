import { Module } from '@nestjs/common';
import { AutoIncomesController } from './auto-incomes.controller';
import { AutoIncomesService } from './auto-incomes.service';
import { AutoIncomeExecutor } from './auto-income.executor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoIncomesController],
  providers: [AutoIncomesService, AutoIncomeExecutor],
  exports: [AutoIncomesService],
})
export class AutoIncomesModule {}

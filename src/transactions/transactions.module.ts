import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionEngineService } from './transaction-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [TransactionsController],
  providers: [TransactionEngineService],
  exports: [TransactionEngineService],
})
export class TransactionsModule {}

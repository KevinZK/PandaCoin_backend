import { Module } from '@nestjs/common';
import { AutoPaymentsController } from './auto-payments.controller';
import { AutoPaymentsService } from './auto-payments.service';
import { AutoPaymentExecutor } from './auto-payment.executor';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [AutoPaymentsController],
  providers: [AutoPaymentsService, AutoPaymentExecutor],
  exports: [AutoPaymentsService],
})
export class AutoPaymentsModule {}


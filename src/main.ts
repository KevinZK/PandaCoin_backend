import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  
  // 使用自定义Logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  
  // 全局响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  
  // 启用CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // 全局前缀
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // 监听所有网络接口，允许真机访问
  await app.listen(port, host);
  
  logger.log(`\n🚀 PandaCoin API running on:`, 'Bootstrap');
  logger.log(`   Local:   http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`   Network: http://${host}:${port}/api`, 'Bootstrap');
  logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
  logger.log(`📝 Log Level: ${process.env.LOG_LEVEL || 'debug'}\n`, 'Bootstrap');
}
bootstrap();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const logger_service_1 = require("./common/logger/logger.service");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logger = app.get(logger_service_1.LoggerService);
    app.useLogger(logger);
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter(logger));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    logger.log(`\n🚀 PandaCoin API running on:`, 'Bootstrap');
    logger.log(`   Local:   http://localhost:${port}/api`, 'Bootstrap');
    logger.log(`   Network: http://${host}:${port}/api`, 'Bootstrap');
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
    logger.log(`📝 Log Level: ${process.env.LOG_LEVEL || 'debug'}\n`, 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map
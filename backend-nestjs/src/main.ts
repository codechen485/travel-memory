import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 性能优化：gzip/deflate 压缩响应体（JSON 列表、统计、手帐 HTML 等大文本体积可减 60%~80%）
  app.use(compression());

  // 启用 CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 静态资源服务：/uploads → 项目根目录 uploads 文件夹（照片原图与缩略图）
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 监听端口：优先读环境变量 PORT（Render / Railway / Fly 等 PaaS 会注入），
  // 本地/传统 VPS 无 PORT 时回退 3000
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

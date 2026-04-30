import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody needed for Paystack webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: [
      config.get('FRONTEND_URL', 'http://localhost:3000'),
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // allow extra fields gracefully
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AdharaEdu Bootcamp API')
      .setDescription('Full API for the AdharaEdu Bootcamp platform')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3002);
  await app.listen(port);
  console.log(`\n🚀  AdharaEdu Bootcamp API  →  http://localhost:${port}/api/v1`);
  console.log(`📖  Swagger docs           →  http://localhost:${port}/api/docs\n`);
}

bootstrap();

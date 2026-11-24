import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupSecurity } from './common/security/setup-security.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  setupSecurity(app);

  // Timeouts contra ataques Slowloris / sockets colgados detrás de Railway proxy
  const httpServer = app.getHttpServer() as {
    requestTimeout?: number;
    headersTimeout?: number;
    keepAliveTimeout?: number;
  };
  httpServer.requestTimeout = 30_000;
  httpServer.headersTimeout = 10_000;
  httpServer.keepAliveTimeout = 65_000;

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EcoMisti API')
      .setDescription(
        'Documentación interactiva de la API de EcoMisti para gestión de reciclaje, ecopuntos y canjes.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log('EcoMisti API escuchando en http://0.0.0.0:' + port + '/api');
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'Swagger UI disponible en http://localhost:' + port + '/api/docs',
    );
  }
}
void bootstrap();

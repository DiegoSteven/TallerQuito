import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { carpetaFotos } from './landing/fotos';

/**
 * Orígenes que pueden leer la API desde otro dominio (solo la landing pública, que está en
 * Cloudflare Pages). El sistema del taller no lo necesita: Caddy lo sirve en el mismo dominio.
 */
function origenesPermitidos(): string[] {
  const valor = process.env.CORS_ORIGENES ?? 'http://localhost:4321,http://localhost:5173';
  return valor
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Las fotos de la landing llegan en base64 (ya reducidas en el navegador).
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  app.enableCors({ origin: origenesPermitidos(), methods: ['GET'] });

  // Fotos subidas desde "Mantenimiento web". Van bajo /api para que Caddy las enrute sin cambios.
  // Se permiten desde otro dominio (la landing), por eso la cabecera Cross-Origin-Resource-Policy.
  app.use(
    '/api/uploads',
    (_req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(carpetaFotos(), { maxAge: '30d', immutable: true, index: false, fallthrough: false }),
  );

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Mecánica Automotriz Sánchez — API')
    .setDescription('Fase 1: órdenes de trabajo, clientes, vehículos, catálogo, recordatorios y landing.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API escuchando en :${port} · documentación en /api/docs`, 'Bootstrap');
}

void bootstrap();

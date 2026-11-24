import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DEFAULT_CORS_ORIGINS } from '../../config/security.config.js';
import { securityHeadersMiddleware } from '../middleware/security-headers.middleware.js';
import { SanitizePipe } from '../pipes/sanitize.pipe.js';

export function getAllowedCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || !raw.trim()) {
    return DEFAULT_CORS_ORIGINS;
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Aplica defensas globales HTTP a la instancia de NestJS:
 * - Configura trust proxy (1 salto) para leer IP real detrás de Railway/Nginx/Cloudflare
 * - Oculta X-Powered-By
 * - Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) + límite 100KB
 * - CORS con lista blanca estricta (nunca '*' en rutas autenticadas)
 * - Sanitización anti-XSS + ValidationPipe estricto
 */
export function setupSecurity(app: INestApplication): void {
  const expressInstance = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
    set?: (setting: string, val: unknown) => void;
  };
  if (typeof expressInstance.disable === 'function') {
    expressInstance.disable('x-powered-by');
  }
  if (typeof expressInstance.set === 'function') {
    expressInstance.set('trust proxy', 1);
  }

  app.use(securityHeadersMiddleware);

  const allowedOrigins = getAllowedCorsOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, origin?: boolean | string) => void,
    ) => {
      // Peticiones sin cabecera Origin (apps móviles nativas, servidor a servidor):
      // permitir sin emitir Access-Control-Allow-Origin: *
      if (!origin) {
        callback(null, false);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
        return;
      }
      // Origen no autorizado (ej. https://sitio-malicioso.com): no emitir cabecera CORS
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

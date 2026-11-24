import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MAX_PAYLOAD_BYTES = 100 * 1024; // 100 KB

/**
 * Middleware de cabeceras de defensa HTTP (OWASP A02:2025 / ZAP Passive Scan).
 * Configura CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
 * Permissions-Policy, limita tamaño de payload y desactiva caché en rutas de auth.
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.removeHeader('X-Powered-By');

  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (req.path.startsWith('/api/auth')) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
  }

  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'El tamaño de la petición excede el límite permitido (100 KB)',
      error: 'Payload Too Large',
    });
    return;
  }

  next();
}

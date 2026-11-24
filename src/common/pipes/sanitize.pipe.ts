import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Campos sensibles cuyos caracteres no deben alterarse ni recortarse
 * (contraseñas y tokens firmados).
 */
const RAW_FIELDS = new Set([
  'password',
  'passwordActual',
  'passwordNueva',
  'refreshToken',
  'pin',
]);

/**
 * Sanea una cadena de texto de entrada:
 * 1. Elimina bytes nulos (\0) que pueden causar errores en PostgreSQL.
 * 2. Recorta espacios al inicio y al final (trim).
 * 3. Neutraliza esquemas de ejecución de scripts (javascript:, vbscript:, data:text/html).
 * 4. Escapa < y > (&lt; / &gt;) para prevenir XSS almacenado y reflejado (WSTG-INPV-02).
 */
export function sanitizeString(value: string): string {
  return value
    .replaceAll('\0', '')
    .trim()
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && RAW_FIELDS.has(key)) {
    return typeof value === 'string' ? value.replaceAll('\0', '') : value;
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      // Prevenir Prototype Pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        continue;
      }
      sanitized[k] = sanitizeValue(v, k);
    }
    return sanitized;
  }
  return value;
}

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (
      metadata.type === 'body' ||
      metadata.type === 'query' ||
      metadata.type === 'param'
    ) {
      return sanitizeValue(value, metadata.data);
    }
    return value;
  }
}

export const SALT_ROUNDS = 10;

// Auth MVP (spec §4): access 15 min, refresh 7 dias, bloqueo tras 5 fallos (15 min).
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_INTENTOS_FALLIDOS = 5;
export const BLOQUEO_MINUTOS = 15;

// Rate limit de autenticación (OWASP A07:2025): máx. 5 intentos por minuto.
export const THROTTLE_AUTH_LIMIT = 5;
export const THROTTLE_AUTH_TTL_MS = 60_000;

// Hash bcrypt dummy para mitigar enumeración de usuarios por timing attack.
export const DUMMY_BCRYPT_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8p4K1.8e8G9C8p6q9V1w2x3y4z5A6B';

// Orígenes permitidos por defecto en entorno local/desarrollo (override vía CORS_ORIGINS).
export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

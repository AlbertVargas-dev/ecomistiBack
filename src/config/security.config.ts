export const SALT_ROUNDS = 10;

// Auth MVP (spec §4): access 15 min, refresh 7 dias, bloqueo tras 5 fallos (15 min).
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const MAX_INTENTOS_FALLIDOS = 5;
export const BLOQUEO_MINUTOS = 15;

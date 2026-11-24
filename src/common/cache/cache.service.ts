import { Injectable } from '@nestjs/common';

type Entrada<T> = { valor: T; expira: number };

const MAX_CACHE_ENTRIES = 200;

/**
 * Caché en memoria acotada con TTL (segura para contenedores con poca RAM como Railway free tier).
 * Evita crecimiento ilimitado en RAM limpiando entradas expiradas y manteniendo un tope máximo.
 */
@Injectable()
export class CacheService {
  private store = new Map<string, Entrada<unknown>>();

  get<T>(clave: string): T | null {
    const entrada = this.store.get(clave);
    if (!entrada) return null;
    if (Date.now() > entrada.expira) {
      this.store.delete(clave);
      return null;
    }
    return entrada.valor as T;
  }

  set<T>(clave: string, valor: T, ttlMs = 30_000): T {
    const ahora = Date.now();
    if (this.store.size >= MAX_CACHE_ENTRIES) {
      for (const [k, v] of this.store.entries()) {
        if (ahora > v.expira) {
          this.store.delete(k);
        }
      }
      while (this.store.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey === undefined) break;
        this.store.delete(oldestKey);
      }
    }
    this.store.set(clave, { valor, expira: ahora + ttlMs });
    return valor;
  }
}

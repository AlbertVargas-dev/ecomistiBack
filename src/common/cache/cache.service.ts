import { Injectable } from '@nestjs/common';

type Entrada<T> = { valor: T; expira: number };

/**
 * Caché en memoria con TTL (suficiente para el MVP: una sola instancia).
 * Evita recomputar agregados del dashboard en cada visita al panel.
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
    this.store.set(clave, { valor, expira: Date.now() + ttlMs });
    return valor;
  }
}

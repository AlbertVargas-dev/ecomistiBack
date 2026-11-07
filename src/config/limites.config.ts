/**
 * Límites de validación de pesaje/sync (spec §5/§7).
 * Configurables por variables de entorno; defaults según la spec.
 */
export const PESO_MIN_BOLSA_KG = Number(process.env.PESO_MIN_BOLSA_KG ?? 0.1);
export const PESO_MAX_BOLSA_KG = Number(process.env.PESO_MAX_BOLSA_KG ?? 50);
export const PESO_MAX_ENTREGA_KG = Number(
  process.env.PESO_MAX_ENTREGA_KG ?? 200,
);
export const MAX_DETALLES_POR_ENTREGA = Number(
  process.env.MAX_DETALLES_POR_ENTREGA ?? 20,
);
export const MAX_ENTREGAS_POR_DIA = Number(
  process.env.MAX_ENTREGAS_POR_DIA ?? 5,
);
export const FECHA_CAPTURA_TOLERANCIA_MIN = Number(
  process.env.FECHA_CAPTURA_TOLERANCIA_MIN ?? 5,
);
export const FECHA_CAPTURA_MAX_DIAS = Number(
  process.env.FECHA_CAPTURA_MAX_DIAS ?? 7,
);

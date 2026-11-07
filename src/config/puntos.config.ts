import { TipoResiduo } from '@prisma/client';

/**
 * EcoPuntos por kg según tipo de residuo (spec §5: RECICLABLE 10, ORGANICO 5).
 * NOTA: con la tabla ConfigFactorResiduo versionada, el factor vigente en
 * fechaCaptura debe leerse de BD; esta constante queda como fallback/seed.
 */
export const PUNTOS_POR_KG: Record<TipoResiduo, number> = {
  RECICLABLE: 10,
  ORGANICO: 5,
};

export function calcularPuntos(tipo: TipoResiduo, pesoKg: number): number {
  return Math.floor(pesoKg * PUNTOS_POR_KG[tipo]);
}

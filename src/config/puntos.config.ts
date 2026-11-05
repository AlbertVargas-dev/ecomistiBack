import { TipoResiduo } from '@prisma/client';

/** EcoPuntos otorgados por kilogramo según el tipo de residuo. Ajustable. */
export const PUNTOS_POR_KG: Record<TipoResiduo, number> = {
  PLASTICO: 10,
  CARTON: 5,
  VIDRIO: 4,
  METAL: 15,
};

export function calcularPuntos(tipo: TipoResiduo, pesoKg: number): number {
  return Math.floor(pesoKg * PUNTOS_POR_KG[tipo]);
}

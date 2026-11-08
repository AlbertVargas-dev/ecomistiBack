import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum Granularidad {
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
}

/**
 * Serie temporal del gráfico "Tendencia de Recolección" (diseño).
 * Sin fechas: últimos 7 días, granularidad por día.
 */
export class TendenciaQueryDto {
  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-07T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional({ enum: Granularidad, default: Granularidad.DIA })
  @IsOptional()
  @IsEnum(Granularidad)
  granularidad?: Granularidad;
}

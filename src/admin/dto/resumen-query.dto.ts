import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filtro de fechas del dashboard (diseño: "Hoy 12/05/2025 - 18/05/2025").
 * Sin parámetros: últimos 7 días (incluye hoy).
 */
export class ResumenQueryDto {
  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-07T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}

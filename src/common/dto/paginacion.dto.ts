import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Paginación genérica para listados (P1).
 * Uso: `?skip=0&take=20` (take por defecto 20, máximo 100).
 */
export class PaginacionDto {
  @ApiPropertyOptional({ example: 0, description: 'Registros a saltar' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20, description: 'Máximo 100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export function paginacion(q: PaginacionDto): { skip: number; take: number } {
  return { skip: q.skip ?? 0, take: q.take ?? 20 };
}

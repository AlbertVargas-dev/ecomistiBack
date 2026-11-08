import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoEntrega, TipoResiduo } from '@prisma/client';
import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

/**
 * Listado de entregas para la tabla "Recolecciones Recientes" (diseño).
 */
export class EntregasQueryDto extends PaginacionDto {
  @ApiPropertyOptional({ enum: EstadoEntrega })
  @IsOptional()
  @IsEnum(EstadoEntrega)
  estado?: EstadoEntrega;

  @ApiPropertyOptional({ enum: TipoResiduo })
  @IsOptional()
  @IsEnum(TipoResiduo)
  tipoResiduo?: TipoResiduo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional({
    description: 'Busca en id, nombres del usuario o del recolector',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

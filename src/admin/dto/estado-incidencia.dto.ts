import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoIncidencia } from '@prisma/client';

export class EstadoIncidenciaDto {
  @ApiProperty({ enum: EstadoIncidencia })
  @IsEnum(EstadoIncidencia)
  estado: EstadoIncidencia;
}

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoObra } from '@prisma/client';

export class EstadoObraDto {
  @ApiProperty({ enum: EstadoObra })
  @IsEnum(EstadoObra)
  estadoObra: EstadoObra;
}

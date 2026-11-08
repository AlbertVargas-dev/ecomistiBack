import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoRuta } from '@prisma/client';

export class RutaDto {
  @ApiProperty({ example: 'Ruta Sur 1' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Paucarpata' })
  @IsOptional()
  @IsString()
  zona?: string;

  @ApiPropertyOptional({ description: 'userId del recolector asignado' })
  @IsOptional()
  @IsString()
  recolectorId?: string;

  @ApiPropertyOptional({ enum: EstadoRuta, default: EstadoRuta.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoRuta)
  estado?: EstadoRuta;
}

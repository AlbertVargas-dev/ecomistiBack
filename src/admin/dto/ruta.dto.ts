import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoRuta } from '@prisma/client';

export class RutaDto {
  @ApiProperty({ example: 'Ruta Sur 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: 'Paucarpata' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La zona no puede exceder 100 caracteres' })
  zona?: string;

  @ApiPropertyOptional({ description: 'userId del recolector asignado' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recolectorId?: string;

  @ApiPropertyOptional({ enum: EstadoRuta, default: EstadoRuta.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoRuta)
  estado?: EstadoRuta;
}

import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePuntoDto {
  @ApiProperty({ example: 'Parque Bolognesi - Paucarpata' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres' })
  nombre: string;

  @ApiProperty({ example: 'Paucarpata' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'El distrito no puede exceder 100 caracteres' })
  distrito: string;

  @ApiProperty({ example: 'Av. Jesús - 123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250, { message: 'La dirección no puede exceder 250 caracteres' })
  direccion: string;

  @ApiProperty({ example: -16.4 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @ApiProperty({ example: -71.53 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;

  @ApiProperty({ example: 'Martes y Jueves 08:00 - 11:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: 'El horario no puede exceder 150 caracteres' })
  horario: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

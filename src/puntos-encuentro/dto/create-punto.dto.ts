import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePuntoDto {
  @ApiProperty({ example: 'Parque Bolognesi - Paucarpata' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Paucarpata' })
  @IsString()
  @IsNotEmpty()
  distrito: string;

  @ApiProperty({ example: 'Av. Jesús - 123' })
  @IsString()
  @IsNotEmpty()
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
  horario: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

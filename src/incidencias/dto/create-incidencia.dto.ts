import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidenciaDto {
  @ApiProperty({ example: 'Punto saturado' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de incidencia es requerido' })
  @MaxLength(100, {
    message: 'El tipo de incidencia no puede exceder 100 caracteres',
  })
  tipo: string;

  @ApiProperty({ example: 'Contenedor desbordado en la esquina' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MaxLength(1000, {
    message: 'La descripción no puede exceder 1000 caracteres',
  })
  descripcion: string;

  @ApiPropertyOptional({ example: 'https://ecomisti.pe/fotos/incidencia.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La URL de la foto no puede exceder 500 caracteres',
  })
  @Matches(/^https?:\/\/[^\s<>"]+$/i, {
    message: 'La URL de la foto debe usar http o https válido',
  })
  fotoUrl?: string;

  @ApiPropertyOptional({ example: -16.4 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ example: -71.53 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;
}

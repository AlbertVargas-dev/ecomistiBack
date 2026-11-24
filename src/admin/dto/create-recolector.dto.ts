import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecolectorDto {
  @ApiProperty({ example: '72882624' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Los nombres no pueden exceder 100 caracteres' })
  nombres: string;

  @ApiProperty({ example: 'Quispe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Los apellidos no pueden exceder 100 caracteres' })
  apellidos: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({ example: 'Camión 03 - Zona Norte' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La zona/camión no puede exceder 100 caracteres' })
  zonaCamion?: string;

  @ApiPropertyOptional({
    description: 'Cooperativa a la que pertenece (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cooperativaId?: string;

  @ApiPropertyOptional({
    example: '123456',
    description:
      'PIN inicial de 6 dígitos. Si se omite, el servidor genera uno y lo devuelve una sola vez.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El PIN debe tener exactamente 6 dígitos' })
  pin?: string;
}

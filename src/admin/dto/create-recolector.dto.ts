import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecolectorDto {
  @ApiProperty({ example: '72882624' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Quispe' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'Camión 03 - Zona Norte' })
  @IsOptional()
  @IsString()
  zonaCamion?: string;

  @ApiPropertyOptional({
    description: 'Cooperativa a la que pertenece (opcional)',
  })
  @IsOptional()
  @IsString()
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

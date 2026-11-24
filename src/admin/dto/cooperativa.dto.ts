import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CooperativaDto {
  @ApiProperty({ example: 'Cooperativa Recicladores Arequipa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    example: '20123456789',
    description: 'RUC: 11 dígitos',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{11})$/, { message: 'El RUC debe tener 11 dígitos' })
  ruc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'La dirección no puede exceder 250 caracteres' })
  direccion?: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

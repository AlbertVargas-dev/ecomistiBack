import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CooperativaDto {
  @ApiProperty({ example: 'Cooperativa Recicladores Arequipa' })
  @IsString()
  @IsNotEmpty()
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
  direccion?: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

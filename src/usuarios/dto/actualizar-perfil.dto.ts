import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los nombres no pueden estar vacíos' })
  @MaxLength(100, { message: 'Los nombres no pueden exceder 100 caracteres' })
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos no pueden estar vacíos' })
  @MaxLength(100, { message: 'Los apellidos no pueden exceder 100 caracteres' })
  apellidos?: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  @Matches(/^9\d{8}$/, {
    message: 'El teléfono debe tener 9 dígitos y comenzar con 9',
  })
  telefono?: string;
}

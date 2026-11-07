import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsOptional()
  @IsString()
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez Gómez' })
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  @Matches(/^9\d{8}$/, {
    message: 'El teléfono debe tener 9 dígitos y comenzar con 9',
  })
  telefono?: string;
}

import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoResiduo } from '@prisma/client';

export class CreateFactorDto {
  @ApiProperty({ enum: TipoResiduo, example: 'RECICLABLE' })
  @IsEnum(TipoResiduo)
  tipoResiduo: TipoResiduo;

  @ApiProperty({
    example: 10,
    description:
      'Puntos por kg (>0, máx. 2 decimales). Nunca se edita: se inserta fila nueva (spec §5).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  factor: number;

  @ApiPropertyOptional({
    example: '2026-11-07T00:00:00.000Z',
    description: 'Desde cuándo rige. Por defecto: ahora.',
  })
  @IsOptional()
  @IsDateString()
  vigenteDesde?: string;
}

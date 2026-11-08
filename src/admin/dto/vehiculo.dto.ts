import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehiculoDto {
  @ApiProperty({ example: 'ABC-123' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  placa: string;

  @ApiProperty({ example: 'Camion' })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  capacidadKg: number;

  @ApiPropertyOptional({ description: 'userId del recolector asignado' })
  @IsOptional()
  @IsString()
  recolectorId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

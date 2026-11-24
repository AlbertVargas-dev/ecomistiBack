import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @MaxLength(20, { message: 'La placa no puede exceder 20 caracteres' })
  placa: string;

  @ApiProperty({ example: 'Camion' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'El tipo no puede exceder 50 caracteres' })
  tipo: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  @Max(50_000)
  capacidadKg: number;

  @ApiPropertyOptional({ description: 'userId del recolector asignado' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recolectorId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

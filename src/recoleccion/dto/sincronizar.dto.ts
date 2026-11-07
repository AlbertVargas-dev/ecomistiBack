import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoResiduo } from '@prisma/client';

export class DetalleSyncDto {
  @ApiProperty({ enum: TipoResiduo, example: 'RECICLABLE' })
  @IsEnum(TipoResiduo)
  tipoResiduo: TipoResiduo;

  @ApiProperty({
    example: 2.5,
    description: 'kg (0.1 a 50 por bolsa, spec §5)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  pesoKg: number;
}

export class EntregaSyncDto {
  @ApiProperty({ format: 'uuid', description: 'Clave de idempotencia (§7)' })
  @IsUUID('4', { message: 'idempotencyKey debe ser UUID v4' })
  idempotencyKey: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qrCode: string;

  @ApiProperty({ example: '2026-11-07T10:00:00.000Z' })
  @IsDateString()
  fechaCaptura: string;

  @ApiProperty({ type: [DetalleSyncDto] })
  @ValidateNested({ each: true })
  @Type(() => DetalleSyncDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20, { message: 'Máximo 20 detalles por entrega' })
  detalles: DetalleSyncDto[];
}

export class SincronizarDto {
  @ApiPropertyOptional({ example: 'device-001' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ type: [EntregaSyncDto] })
  @ValidateNested({ each: true })
  @Type(() => EntregaSyncDto)
  @ArrayMinSize(1, { message: 'El lote debe tener al menos 1 entrega' })
  entregas: EntregaSyncDto[];
}

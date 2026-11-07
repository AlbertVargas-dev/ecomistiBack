import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateOfertaDto {
  @ApiProperty({ example: 'Vale de mercado' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({ example: 'Vale canjeable en mercados afiliados' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  costoPuntos: number;

  @ApiProperty({ enum: [Role.CIUDADANO, Role.URBANIZACION] })
  @IsEnum([Role.CIUDADANO, Role.URBANIZACION])
  dirigidoA: Role;

  @ApiPropertyOptional({ example: 50, description: 'null = ilimitado' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockDisponible?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ example: 2, description: 'null = sin límite' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limitePorUsuario?: number | null;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  diasVigenciaVoucher?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

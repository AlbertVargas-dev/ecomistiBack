import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarCooperativaDto {
  @ApiPropertyOptional({
    description: 'ID de la cooperativa (null para quitar al recolector)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  cooperativaId?: string | null;
}

import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EstadoRecolectorDto {
  @ApiProperty({
    example: false,
    description: 'false = revocar (setea desactivadoAt)',
  })
  @IsBoolean()
  activo: boolean;
}

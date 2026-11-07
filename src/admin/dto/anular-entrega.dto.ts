import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnularEntregaDto {
  @ApiProperty({ example: 'Pesaje duplicado detectado' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  motivo: string;
}

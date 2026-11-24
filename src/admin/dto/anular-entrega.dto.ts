import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnularEntregaDto {
  @ApiProperty({ example: 'Pesaje duplicado detectado' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  @MaxLength(500, { message: 'El motivo no puede exceder 500 caracteres' })
  motivo: string;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelarVoucherDto {
  @ApiProperty({ example: 'Oferta retirada por el comercio' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  @MaxLength(500, { message: 'El motivo no puede exceder 500 caracteres' })
  motivo: string;
}

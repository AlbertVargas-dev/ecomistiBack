import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelarVoucherDto {
  @ApiProperty({ example: 'Oferta retirada por el comercio' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  motivo: string;
}

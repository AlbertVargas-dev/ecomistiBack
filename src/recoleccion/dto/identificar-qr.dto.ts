import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdentificarQrDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty({ message: 'El qrCode es requerido' })
  @MaxLength(100, { message: 'El qrCode no puede exceder 100 caracteres' })
  qrCode: string;
}

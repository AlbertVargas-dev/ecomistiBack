import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdentificarDniDto {
  @ApiProperty({ example: '72882624' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;
}

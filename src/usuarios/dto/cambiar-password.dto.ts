import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarPasswordDto {
  @ApiProperty({ example: 'Secreto123' })
  @IsString()
  passwordActual: string;

  @ApiProperty({ example: 'NuevaClave456', minLength: 8 })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La nueva contraseña debe incluir letras y números',
  })
  passwordNueva: string;
}

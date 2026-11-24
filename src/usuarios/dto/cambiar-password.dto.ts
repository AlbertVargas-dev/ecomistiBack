import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarPasswordDto {
  @ApiProperty({ example: 'Secreto123' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @MaxLength(72, {
    message: 'La contraseña actual no puede exceder 72 caracteres',
  })
  passwordActual: string;

  @ApiProperty({ example: 'NuevaClave456', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(72, {
    message: 'La nueva contraseña no puede exceder 72 caracteres',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La nueva contraseña debe incluir letras y números',
  })
  passwordNueva: string;
}

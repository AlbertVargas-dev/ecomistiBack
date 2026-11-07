import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Registro público (spec §4/§11): SOLO CIUDADANO o URBANIZACION segun el endpoint.
 * El rol NUNCA viene del body (antes aceptaba `rol` — corregido por seguridad).
 */
export class RegisterDto {
  @ApiProperty({
    example: 'juan.perez@continental.edu.pe',
    description: 'Correo electrónico (se guarda en minúsculas)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    example: 'Secreto123',
    minLength: 8,
    description:
      'Contraseña: mínimo 8 caracteres, con letras y números (spec §11)',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password: string;

  @ApiProperty({ example: 'Juan Carlos', description: 'Nombres completos' })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son requeridos' })
  nombres: string;

  @ApiProperty({ example: 'Pérez Gómez', description: 'Apellidos completos' })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  apellidos: string;

  @ApiProperty({
    example: '72882624',
    description: 'DNI: exactamente 8 dígitos (spec §11)',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni: string;

  @ApiPropertyOptional({
    example: '954123456',
    description: 'Teléfono: 9 dígitos comenzando con 9 (spec §11)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^9\d{8}$/, {
    message: 'El teléfono debe tener 9 dígitos y comenzar con 9',
  })
  telefono?: string;

  @ApiProperty({
    example: true,
    description:
      'Aceptación del tratamiento de datos personales (Ley 29733, spec §11)',
  })
  @IsBoolean({ message: 'Debe aceptar los términos' })
  @Equals(true, { message: 'Debe aceptar el tratamiento de datos personales' })
  aceptoTerminos: boolean;
}

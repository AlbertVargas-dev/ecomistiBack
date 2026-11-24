import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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
  @MaxLength(254, {
    message: 'El correo electrónico no puede exceder 254 caracteres',
  })
  email: string;

  @ApiProperty({
    example: 'Secreto123',
    minLength: 8,
    maxLength: 72,
    description:
      'Contraseña: mínimo 8 y máximo 72 caracteres, con letras y números (spec §11)',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password: string;

  @ApiProperty({ example: 'Juan Carlos', description: 'Nombres completos' })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son requeridos' })
  @MaxLength(100, {
    message: 'Los nombres no pueden exceder 100 caracteres',
  })
  nombres: string;

  @ApiProperty({ example: 'Pérez Gómez', description: 'Apellidos completos' })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  @MaxLength(100, {
    message: 'Los apellidos no pueden exceder 100 caracteres',
  })
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

  // Solo URBANIZACION: a qué urbanización pertenece el representante legal.
  @ApiPropertyOptional({ description: 'ID de una urbanización existente' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  urbanizacionId?: string;

  @ApiPropertyOptional({ example: 'Urb. Los Jardines de Paucarpata' })
  @IsOptional()
  @IsString()
  @MaxLength(150, {
    message: 'El nombre de la urbanización no puede exceder 150 caracteres',
  })
  nombreUrbanizacion?: string;

  @ApiPropertyOptional({ example: 'Av. Jesús 123, Paucarpata' })
  @IsOptional()
  @IsString()
  @MaxLength(250, {
    message: 'La dirección de la urbanización no puede exceder 250 caracteres',
  })
  direccionUrbanizacion?: string;
}

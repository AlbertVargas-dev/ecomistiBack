import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'juan.perez@continental.edu.pe',
    description: 'Correo electrónico institucional o personal',
  })
  @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @ApiProperty({
    example: 'Secret123!',
    minLength: 6,
    description: 'Contraseña de la cuenta (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    example: 'Juan Carlos',
    description: 'Nombres completos del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son requeridos' })
  nombres: string;

  @ApiProperty({
    example: 'Pérez Gómez',
    description: 'Apellidos completos del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  apellidos: string;

  @ApiProperty({
    example: '72882624',
    description: 'Documento Nacional de Identidad (8 dígitos)',
  })
  @IsString()
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  dni: string;

  @ApiPropertyOptional({
    example: '954123456',
    description: 'Número de teléfono o celular de contacto',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.CIUDADANO,
    description: 'Rol asignado al usuario',
  })
  @IsOptional()
  @IsEnum(Role, { message: 'El rol debe ser ADMIN, RECOLECTOR o CIUDADANO' })
  rol?: Role;
}

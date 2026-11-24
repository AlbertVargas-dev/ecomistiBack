import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Login unificado (spec §4):
 * - CIUDADANO / URBANIZACION / ADMIN / RENTAS: email + password
 * - RECOLECTOR: dni + pin (6 dígitos, hasheado en PerfilRecolector.pinHash)
 * Al menos una pareja es obligatoria; lo valida AuthService.
 */
export class LoginDto {
  @ApiPropertyOptional({
    example: 'juan.perez@continental.edu.pe',
    description: 'Correo electrónico registrado (no recolectores)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(254, {
    message: 'El correo electrónico no puede exceder 254 caracteres',
  })
  email?: string;

  @ApiPropertyOptional({ example: 'Secreto123', description: 'Contraseña' })
  @IsOptional()
  @IsString()
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres',
  })
  password?: string;

  @ApiPropertyOptional({
    example: '72882624',
    description: 'DNI del recolector',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos' })
  dni?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'PIN numérico de 6 dígitos del recolector',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El PIN debe tener exactamente 6 dígitos' })
  pin?: string;
}

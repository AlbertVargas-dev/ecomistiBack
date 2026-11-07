import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'admin@ecomisti.pe' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secreto123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Torres' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: '72882624' })
  @IsString()
  @Matches(/^\d{8}$/)
  dni: string;

  @ApiPropertyOptional({ example: '954123456' })
  @IsOptional()
  @IsString()
  telefono?: string;
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario (Ciudadano, Recolector o Admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario registrado exitosamente. Retorna token y datos del usuario.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El correo o DNI ya se encuentran registrados.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Autenticación exitosa. Retorna el token JWT y datos del usuario.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información del perfil actual junto con el balance de ecopuntos.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token no proporcionado o inválido.',
  })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Alias para obtener el perfil del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información del perfil actual junto con el balance de ecopuntos.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token no proporcionado o inválido.',
  })
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }
}

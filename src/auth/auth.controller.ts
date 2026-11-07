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
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('register-ciudadano')
  @ApiOperation({
    summary: 'Registrar un ciudadano (rol fijado por el endpoint)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Registro exitoso. Retorna access + refresh token y el usuario.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El correo o DNI ya se encuentran registrados.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos (password, DNI, teléfono o términos).',
  })
  registerCiudadano(@Body() dto: RegisterDto) {
    return this.authService.registerCiudadano(dto);
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('register-urbanizacion')
  @ApiOperation({
    summary: 'Registrar una urbanización (rol fijado por el endpoint)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Registro exitoso. Retorna access + refresh token y el usuario.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El correo o DNI ya se encuentran registrados.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos.',
  })
  registerUrbanizacion(@Body() dto: RegisterDto) {
    return this.authService.registerUrbanizacion(dto);
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Alias legacy de register-ciudadano',
    deprecated: true,
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login email+password, o DNI+PIN para recolectores',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retorna access (15 min) + refresh (7 días) y el usuario.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas, cuenta bloqueada o desactivada.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Obtener un nuevo access token con el refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nuevo par access + refresh.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh inválido, expirado o usuario desactivado.',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil + balance de ecopuntos.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token inválido o usuario desactivado.',
  })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Alias para obtener el perfil del usuario autenticado',
  })
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }
}

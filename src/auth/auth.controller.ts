import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  THROTTLE_AUTH_LIMIT,
  THROTTLE_AUTH_TTL_MS,
} from '../config/security.config.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { extractCookie } from './strategies/jwt.strategy.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
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
  async registerCiudadano(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.registerCiudadano(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
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
  async registerUrbanizacion(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.registerUrbanizacion(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
  @Post('register')
  @ApiOperation({
    summary: 'Alias legacy de register-ciudadano',
    deprecated: true,
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
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
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiados intentos de inicio de sesión (máx. 5/min).',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
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
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token =
      dto.refreshToken ?? extractCookie(req?.headers?.cookie, 'refresh_token');
    if (!token) {
      throw new UnauthorizedException('El refresh token es requerido');
    }
    const result = await this.authService.refresh({ refreshToken: token });
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesión y limpiar cookies HttpOnly de autenticación',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cookies de sesión invalidadas.',
  })
  logout(@Res({ passthrough: true }) res?: Response) {
    this.clearAuthCookies(res);
    return { message: 'Sesión cerrada exitosamente' };
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

  /**
   * Emite cookies de sesión seguras (OWASP A07:2025):
   * HttpOnly; Secure; SameSite=Lax con expiración corta (15m access, 7d refresh).
   */
  private setAuthCookies(
    res: Response | undefined,
    accessToken?: string,
    refreshToken?: string,
  ) {
    if (!res || typeof res.cookie !== 'function') return;
    if (accessToken) {
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      });
    }
    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
      });
    }
  }

  private clearAuthCookies(res: Response | undefined) {
    if (!res || typeof res.cookie !== 'function') return;
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 0,
    });
  }
}

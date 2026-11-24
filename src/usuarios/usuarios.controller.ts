import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import {
  THROTTLE_AUTH_LIMIT,
  THROTTLE_AUTH_TTL_MS,
} from '../config/security.config.js';
import { UsuariosService } from './usuarios.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { CambiarPasswordDto } from './dto/cambiar-password.dto.js';
import { PaginacionDto } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: rutas de usuario autenticado (CIUDADANO / URBANIZACION).
@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles(Role.CIUDADANO, Role.URBANIZACION)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil propio (incluye qrCode y balance)' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario autenticado.' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usuariosService.getMe(user);
  }

  @Post('me/regenerar-qr')
  @ApiOperation({ summary: 'Regenerar QR (el anterior queda inválido)' })
  @ApiResponse({ status: 201, description: 'Nuevo qrCode.' })
  regenerarQr(@CurrentUser() user: AuthUser) {
    return this.usuariosService.regenerarQr(user);
  }

  @Get('me/panel')
  @ApiOperation({
    summary:
      'Panel del usuario: puntos, kg acumulados y recompensas disponibles',
  })
  getPanel(@CurrentUser() user: AuthUser) {
    return this.usuariosService.getPanel(user);
  }

  @Patch('me')
  @Roles(
    Role.ADMIN,
    Role.RECOLECTOR,
    Role.CIUDADANO,
    Role.URBANIZACION,
    Role.RENTAS,
  )
  @ApiOperation({
    summary: 'Actualizar mis datos (nombres, apellidos, teléfono)',
  })
  actualizarPerfil(
    @CurrentUser() user: AuthUser,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(user, dto);
  }

  @Patch('me/cambiar-password')
  @Throttle({
    short: { limit: THROTTLE_AUTH_LIMIT, ttl: THROTTLE_AUTH_TTL_MS },
  })
  @Roles(
    Role.ADMIN,
    Role.RECOLECTOR,
    Role.CIUDADANO,
    Role.URBANIZACION,
    Role.RENTAS,
  )
  @ApiOperation({ summary: 'Cambiar mi contraseña (verifica la actual)' })
  cambiarPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.usuariosService.cambiarPassword(user, dto);
  }

  @Get('me/notificaciones')
  @ApiOperation({ summary: 'Mis notificaciones (hitos de recompensa)' })
  getNotificaciones(@CurrentUser() user: AuthUser) {
    return this.usuariosService.getNotificaciones(user);
  }

  @Patch('me/notificaciones/:id/leida')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  marcarNotificacionLeida(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.usuariosService.marcarNotificacionLeida(user, id);
  }

  @Get('me/movimientos')
  @ApiOperation({ summary: 'Ledger de puntos propios (más reciente primero)' })
  getMovimientos(@CurrentUser() user: AuthUser, @Query() q: PaginacionDto) {
    return this.usuariosService.getMovimientos(user, q);
  }

  @Get('me/entregas')
  @ApiOperation({ summary: 'Entregas propias con sus detalles' })
  getEntregas(@CurrentUser() user: AuthUser, @Query() q: PaginacionDto) {
    return this.usuariosService.getEntregas(user, q);
  }

  @Get('me/entregas/:id')
  @ApiOperation({
    summary: 'Detalle de una entrega propia por ID (protegido contra IDOR)',
  })
  @ApiResponse({ status: 200, description: 'Detalle de la entrega.' })
  @ApiResponse({
    status: 403,
    description: 'La entrega pertenece a otro usuario (IDOR bloqueado).',
  })
  @ApiResponse({ status: 404, description: 'Entrega no encontrada.' })
  getEntregaPorId(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usuariosService.getEntregaPorId(user, id);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.RECOLECTOR,
    Role.CIUDADANO,
    Role.URBANIZACION,
    Role.RENTAS,
  )
  @ApiOperation({
    summary: 'Obtener perfil por ID (solo el propio usuario o ADMIN)',
  })
  @ApiResponse({ status: 200, description: 'Perfil del usuario.' })
  @ApiResponse({
    status: 403,
    description: 'Intento de acceder al perfil de otro usuario (IDOR).',
  })
  getUsuarioPorId(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usuariosService.getUsuarioPorId(user, id);
  }
}

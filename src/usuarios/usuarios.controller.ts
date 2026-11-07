import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsuariosService } from './usuarios.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
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
}

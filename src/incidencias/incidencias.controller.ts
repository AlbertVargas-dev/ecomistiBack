import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IncidenciasService } from './incidencias.service.js';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Diseño: "Reportar Incidencia" (ciudadanos y recolectores).
@ApiTags('Incidencias')
@ApiBearerAuth()
@Roles(Role.CIUDADANO, Role.URBANIZACION, Role.RECOLECTOR)
@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Post()
  @ApiOperation({ summary: 'Reportar una incidencia' })
  crear(@CurrentUser() user: AuthUser, @Body() dto: CreateIncidenciaDto) {
    return this.incidenciasService.crear(user, dto);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Mis incidencias reportadas' })
  misIncidencias(@CurrentUser() user: AuthUser) {
    return this.incidenciasService.misIncidencias(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de una incidencia propia (protegido contra IDOR)',
  })
  @ApiResponse({ status: 200, description: 'Detalle de la incidencia.' })
  @ApiResponse({
    status: 403,
    description: 'La incidencia pertenece a otro usuario (IDOR bloqueado).',
  })
  @ApiResponse({ status: 404, description: 'Incidencia no encontrada.' })
  obtenerPorId(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.incidenciasService.obtenerPorId(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una incidencia propia ABIERTA (protegido contra IDOR)',
  })
  @ApiResponse({ status: 200, description: 'Incidencia actualizada.' })
  @ApiResponse({
    status: 403,
    description: 'La incidencia pertenece a otro usuario (IDOR bloqueado).',
  })
  actualizar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateIncidenciaDto,
  ) {
    return this.incidenciasService.actualizarPropia(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una incidencia propia ABIERTA (protegido contra IDOR)',
  })
  @ApiResponse({ status: 200, description: 'Incidencia eliminada.' })
  @ApiResponse({
    status: 403,
    description: 'La incidencia pertenece a otro usuario (IDOR bloqueado).',
  })
  eliminar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.incidenciasService.eliminarPropia(user, id);
  }
}

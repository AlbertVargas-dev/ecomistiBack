import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
}

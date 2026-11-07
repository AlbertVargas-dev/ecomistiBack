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
import { Role } from '@prisma/client';
import { RecoleccionService } from './recoleccion.service.js';
import { IdentificarDniDto } from './dto/identificar-dni.dto.js';
import { IdentificarQrDto } from './dto/identificar-qr.dto.js';
import { SincronizarDto } from './dto/sincronizar.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: solo RECOLECTOR. El recolector del token es quien registra (§7).
@ApiTags('Recolección')
@ApiBearerAuth()
@Roles(Role.RECOLECTOR)
@Controller('recoleccion')
export class RecoleccionController {
  constructor(private readonly recoleccionService: RecoleccionService) {}

  @Get('mis-entregas')
  @ApiOperation({ summary: 'Entregas registradas por este recolector' })
  misEntregas(@CurrentUser() user: AuthUser) {
    return this.recoleccionService.misEntregas(user.id);
  }

  @Post('identificar-qr')
  @ApiOperation({
    summary: 'Identificar un QR (nombre parcial + tipo de cuenta)',
  })
  @ApiResponse({ status: 200, description: 'Datos parciales de la cuenta.' })
  @ApiResponse({ status: 404, description: 'QR no encontrado.' })
  identificarQr(@Body() dto: IdentificarQrDto) {
    return this.recoleccionService.identificarQr(dto);
  }

  @Post('identificar-dni')
  @ApiOperation({ summary: 'Identificar por DNI (alternativa al escaneo)' })
  @ApiResponse({
    status: 200,
    description: 'Nombre parcial, tipo de cuenta y qrCode.',
  })
  @ApiResponse({ status: 404, description: 'DNI no encontrado.' })
  identificarDni(@Body() dto: IdentificarDniDto) {
    return this.recoleccionService.identificarDni(dto.dni);
  }

  @Post('sincronizar-entrega')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sincronizar lote de entregas offline (resultado por ítem)',
  })
  @ApiResponse({
    status: 200,
    description: 'Un resultado ACEPTADA/DUPLICADA/RECHAZADA por entrega.',
  })
  sincronizarEntrega(
    @CurrentUser() user: AuthUser,
    @Body() dto: SincronizarDto,
  ) {
    return this.recoleccionService.sincronizarEntrega(user, dto);
  }
}

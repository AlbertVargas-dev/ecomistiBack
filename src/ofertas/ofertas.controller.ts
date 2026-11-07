import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OfertasService } from './ofertas.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginacionDto } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: solo CIUDADANO/URBANIZACION, cada uno ve/canjea las suyas.
@ApiTags('Ofertas')
@ApiBearerAuth()
@Roles(Role.CIUDADANO, Role.URBANIZACION)
@Controller('ofertas')
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  @Get()
  @ApiOperation({ summary: 'Ofertas dirigidas al rol del usuario' })
  listar(@CurrentUser() user: AuthUser, @Query() q: PaginacionDto) {
    return this.ofertasService.listar(user, q);
  }

  @Post(':id/canjear')
  @ApiOperation({ summary: 'Canjear una oferta (emite voucher)' })
  @ApiResponse({ status: 201, description: 'Voucher EMITIDO.' })
  @ApiResponse({ status: 400, description: 'Saldo/stock/límite/vigencia/rol.' })
  canjear(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ofertasService.canjear(user, id);
  }
}

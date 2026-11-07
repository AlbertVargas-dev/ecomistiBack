import { Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VouchersService } from '../vouchers/vouchers.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: RENTAS y ADMIN consultan/aplican vouchers por código.
@ApiTags('Rentas')
@ApiBearerAuth()
@Roles(Role.RENTAS, Role.ADMIN)
@Controller('rentas')
export class RentasController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('vouchers/:codigo')
  @ApiOperation({ summary: 'Consultar voucher por código' })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado.' })
  consultar(@CurrentUser() user: AuthUser, @Param('codigo') codigo: string) {
    return this.vouchersService.consultarPorCodigo(user, codigo);
  }

  @Patch('vouchers/:codigo/aplicar')
  @ApiOperation({ summary: 'Marcar voucher como APLICADO (no vencido)' })
  @ApiResponse({
    status: 400,
    description: 'Vencido, ya aplicado/cancelado o rol no permitido.',
  })
  aplicar(@CurrentUser() user: AuthUser, @Param('codigo') codigo: string) {
    return this.vouchersService.aplicar(user, codigo);
  }
}

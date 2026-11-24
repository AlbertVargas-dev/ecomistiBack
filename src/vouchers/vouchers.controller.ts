import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: mis vouchers (CIUDADANO/URBANIZACION).
@ApiTags('Vouchers')
@ApiBearerAuth()
@Roles(Role.CIUDADANO, Role.URBANIZACION)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('mis-vouchers')
  @ApiOperation({ summary: 'Mis vouchers (con vencimiento perezoso)' })
  misVouchers(@CurrentUser() user: AuthUser) {
    return this.vouchersService.misVouchers(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de un voucher propio por ID (protegido contra IDOR)',
  })
  @ApiResponse({ status: 200, description: 'Detalle del voucher.' })
  @ApiResponse({
    status: 403,
    description: 'El voucher pertenece a otro usuario (IDOR bloqueado).',
  })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado.' })
  obtenerPorId(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vouchersService.obtenerMiVoucherPorId(user, id);
  }
}

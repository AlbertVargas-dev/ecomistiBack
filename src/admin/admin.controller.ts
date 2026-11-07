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
import { Role } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { CreateRecolectorDto } from './dto/create-recolector.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { AnularEntregaDto } from './dto/anular-entrega.dto.js';
import { CancelarVoucherDto } from './dto/cancelar-voucher.dto.js';
import { CreateFactorDto } from './dto/create-factor.dto.js';
import { CreateOfertaDto } from './dto/create-oferta.dto.js';
import { EstadoObraDto } from './dto/estado-obra.dto.js';
import { EstadoRecolectorDto } from './dto/estado-recolector.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginacionDto } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Spec §14: todo /admin es solo ADMIN.
@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('factores')
  @ApiOperation({
    summary: 'Crear factor versionado (nunca se edita, se inserta fila nueva)',
  })
  @ApiResponse({ status: 201, description: 'Factor creado.' })
  crearFactor(@CurrentUser() admin: AuthUser, @Body() dto: CreateFactorDto) {
    return this.adminService.crearFactor(admin, dto);
  }

  @Get('factores')
  @ApiOperation({ summary: 'Listar factores versionados' })
  listarFactores() {
    return this.adminService.listarFactores();
  }

  @Post('recolectores')
  @ApiOperation({
    summary: 'Crear recolector (PIN inicial hasheado, devuelto una sola vez)',
  })
  @ApiResponse({ status: 201, description: 'Recolector creado + pinInicial.' })
  crearRecolector(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateRecolectorDto,
  ) {
    return this.adminService.crearRecolector(admin, dto);
  }

  @Patch('recolectores/:id/estado')
  @ApiOperation({ summary: 'Activar/desactivar recolector (revocación)' })
  cambiarEstado(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: EstadoRecolectorDto,
  ) {
    return this.adminService.cambiarEstadoRecolector(admin, id, dto);
  }

  @Post('usuarios-admin')
  @ApiOperation({ summary: 'Crear otro ADMIN' })
  crearAdmin(@CurrentUser() admin: AuthUser, @Body() dto: CreateStaffDto) {
    return this.adminService.crearStaff(admin, dto, Role.ADMIN);
  }

  @Post('rentas')
  @ApiOperation({ summary: 'Crear personal de RENTAS' })
  crearRentas(@CurrentUser() admin: AuthUser, @Body() dto: CreateStaffDto) {
    return this.adminService.crearStaff(admin, dto, Role.RENTAS);
  }

  @Post('ofertas')
  @ApiOperation({ summary: 'Publicar oferta' })
  crearOferta(@CurrentUser() admin: AuthUser, @Body() dto: CreateOfertaDto) {
    return this.adminService.crearOferta(admin, dto);
  }

  @Patch('ofertas/:id')
  @ApiOperation({ summary: 'Modificar oferta' })
  actualizarOferta(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateOfertaDto,
  ) {
    return this.adminService.actualizarOferta(admin, id, dto);
  }

  @Post('entregas/:id/anular')
  @ApiOperation({
    summary: 'Anular entrega (motivo obligatorio, genera REVERSA_ENTREGA)',
  })
  anularEntrega(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AnularEntregaDto,
  ) {
    return this.adminService.anularEntrega(admin, id, dto);
  }

  @Post('vouchers/:id/cancelar')
  @ApiOperation({
    summary: 'Cancelar voucher EMITIDO (devuelve puntos y stock)',
  })
  cancelarVoucher(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelarVoucherDto,
  ) {
    return this.adminService.cancelarVoucher(admin, id, dto);
  }

  @Patch('vouchers/:id/estado-obra')
  @ApiOperation({ summary: 'Actualizar estado de obra (urbanizaciones)' })
  estadoObra(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: EstadoObraDto,
  ) {
    return this.adminService.actualizarEstadoObra(admin, id, dto);
  }

  @Get('reportes/residuos')
  @ApiOperation({ summary: 'Reporte: kg/puntos por tipo y top recolectores' })
  reporteResiduos() {
    return this.adminService.reporteResiduos();
  }

  @Get('auditoria')
  @ApiOperation({ summary: 'Últimas 100 acciones auditadas' })
  auditoria(@Query() q: PaginacionDto) {
    return this.adminService.listarAuditoria(q);
  }

  @Get('dashboard/resumen')
  @ApiOperation({
    summary:
      'Resumen: clientes, kg totales, puntos emitidos, vouchers y ofertas',
  })
  dashboardResumen() {
    return this.adminService.dashboardResumen();
  }

  @Get('dashboard/clientes')
  @ApiOperation({
    summary: 'Clientes con puntos, kg acumulados y conteos (paginado)',
  })
  dashboardClientes(@Query() q: PaginacionDto) {
    return this.adminService.dashboardClientes(q);
  }

  @Get('dashboard/clientes/:id')
  @ApiOperation({
    summary:
      'Detalle de un cliente: kg por tipo, entregas, vouchers y movimientos',
  })
  dashboardCliente(@Param('id') id: string) {
    return this.adminService.dashboardCliente(id);
  }

  @Post('usuarios/:id/regenerar-qr')
  @ApiOperation({ summary: 'Regenerar el QR de cualquier usuario' })
  regenerarQr(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.adminService.regenerarQr(admin, id);
  }
}

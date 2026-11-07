import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { EstadoIncidenciaDto } from './dto/estado-incidencia.dto.js';
import { EstadoObraDto } from './dto/estado-obra.dto.js';
import { ResumenQueryDto } from './dto/resumen-query.dto.js';
import { EntregasQueryDto } from './dto/entregas-query.dto.js';
import { CreatePuntoDto } from '../puntos-encuentro/dto/create-punto.dto.js';
import { RutaDto } from './dto/ruta.dto.js';
import { VehiculoDto } from './dto/vehiculo.dto.js';
import { TendenciaQueryDto } from './dto/tendencia-query.dto.js';
import { AsignarCooperativaDto } from './dto/asignar-cooperativa.dto.js';
import { CooperativaDto } from './dto/cooperativa.dto.js';
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
  dashboardResumen(@Query() q: ResumenQueryDto) {
    return this.adminService.dashboardResumen(q);
  }

  @Get('estadisticas/tendencia')
  @ApiOperation({
    summary: 'Serie temporal de recolección (gráfico del Panel General)',
  })
  tendencia(@Query() q: TendenciaQueryDto) {
    return this.adminService.tendencia(q);
  }

  @Get('estadisticas/mapa-calor')
  @ApiOperation({
    summary:
      'Kg por punto de encuentro con nivel alta/media/baja (pins del mapa)',
  })
  mapaCalor() {
    return this.adminService.mapaCalor();
  }

  @Get('entregas')
  @ApiOperation({ summary: 'Tabla de entregas con filtros y paginación' })
  listarEntregas(@Query() q: EntregasQueryDto) {
    return this.adminService.listarEntregas(q);
  }

  @Get('rutas')
  @ApiOperation({ summary: 'Listar rutas con recolector y conteo de entregas' })
  listarRutas() {
    return this.adminService.listarRutas();
  }

  @Post('rutas')
  @ApiOperation({ summary: 'Crear ruta' })
  crearRuta(@CurrentUser() admin: AuthUser, @Body() dto: RutaDto) {
    return this.adminService.crearRuta(admin, dto);
  }

  @Patch('rutas/:id')
  @ApiOperation({ summary: 'Modificar ruta (asignar recolector, estado)' })
  actualizarRuta(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RutaDto,
  ) {
    return this.adminService.actualizarRuta(admin, id, dto);
  }

  @Post('puntos-encuentro')
  @ApiOperation({ summary: 'Crear punto de EcoReciclaje' })
  crearPunto(@CurrentUser() admin: AuthUser, @Body() dto: CreatePuntoDto) {
    return this.adminService.crearPunto(admin, dto);
  }

  @Patch('puntos-encuentro/:id')
  @ApiOperation({ summary: 'Modificar punto (activar/desactivar)' })
  actualizarPunto(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePuntoDto,
  ) {
    return this.adminService.actualizarPunto(admin, id, dto);
  }

  @Get('vehiculos')
  @ApiOperation({ summary: 'Listar vehículos con recolector asignado' })
  listarVehiculos() {
    return this.adminService.listarVehiculos();
  }

  @Post('vehiculos')
  @ApiOperation({ summary: 'Crear vehículo' })
  crearVehiculo(@CurrentUser() admin: AuthUser, @Body() dto: VehiculoDto) {
    return this.adminService.crearVehiculo(admin, dto);
  }

  @Patch('vehiculos/:id')
  @ApiOperation({ summary: 'Modificar vehículo' })
  actualizarVehiculo(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: VehiculoDto,
  ) {
    return this.adminService.actualizarVehiculo(admin, id, dto);
  }

  @Get('recolectores')
  @ApiOperation({
    summary: 'Personal: recolectores con total y última entrega',
  })
  listarRecolectores() {
    return this.adminService.listarRecolectores();
  }

  @Get('incidencias')
  @ApiOperation({ summary: 'Listar incidencias reportadas (paginado)' })
  listarIncidencias(@Query() q: PaginacionDto) {
    return this.adminService.listarIncidencias(q);
  }

  @Patch('incidencias/:id/estado')
  @ApiOperation({ summary: 'Cambiar estado de una incidencia' })
  cambiarEstadoIncidencia(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: EstadoIncidenciaDto,
  ) {
    return this.adminService.cambiarEstadoIncidencia(admin, id, dto.estado);
  }

  @Get('cooperativas')
  @ApiOperation({ summary: 'Listar cooperativas (Copaff)' })
  listarCooperativas() {
    return this.adminService.listarCooperativas();
  }

  @Post('cooperativas')
  @ApiOperation({ summary: 'Crear cooperativa' })
  crearCooperativa(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CooperativaDto,
  ) {
    return this.adminService.crearCooperativa(admin, dto);
  }

  @Patch('cooperativas/:id')
  @ApiOperation({ summary: 'Modificar cooperativa' })
  actualizarCooperativa(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: CooperativaDto,
  ) {
    return this.adminService.actualizarCooperativa(admin, id, dto);
  }

  @Get('reportes/exportar')
  @ApiOperation({ summary: 'Exportar reporte de recolecciones (csv|xlsx)' })
  async exportarReporte(
    @Query('formato') formato: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    const { contentType, filename, body } =
      await this.adminService.exportarReporte(
        formato === 'xlsx' ? 'xlsx' : 'csv',
      );
    res
      .status(200)
      .setHeader('Content-Type', contentType)
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body);
  }

  @Get('buscar')
  @ApiOperation({
    summary: 'Búsqueda global (usuarios, entregas, vouchers, puntos)',
  })
  buscar(@Query('q') q: string) {
    return this.adminService.buscar(q ?? '');
  }

  @Get('cooperativas/:id/miembros')
  @ApiOperation({ summary: 'Miembros (recolectores) de una cooperativa' })
  miembrosCooperativa(@Param('id') id: string) {
    return this.adminService.miembrosCooperativa(id);
  }

  @Patch('recolectores/:id/cooperativa')
  @ApiOperation({
    summary: 'Asignar (o quitar) un recolector a su cooperativa',
  })
  asignarCooperativa(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AsignarCooperativaDto,
  ) {
    return this.adminService.asignarCooperativa(
      admin,
      id,
      dto.cooperativaId ?? null,
    );
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

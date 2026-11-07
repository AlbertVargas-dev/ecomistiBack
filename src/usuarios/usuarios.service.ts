import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginacionDto, paginacion } from '../common/dto/paginacion.dto.js';
import { OfertasService } from '../ofertas/ofertas.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ofertasService: OfertasService,
  ) {}

  async getMe(user: AuthUser) {
    this.assertActive(user);
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { puntosBalance: true },
    });
    if (!me) throw new NotFoundException('Usuario no encontrado');
    // Nunca exponer passwordHash (spec §11).
    const { passwordHash: _passwordHash, ...sanitized } = me;
    return sanitized;
  }

  /**
   * Regenera el QR (spec §4): el anterior queda inválido al instante porque
   * la sincronización busca por qrCode. Solo CIUDADANO/URBANIZACION (el rol
   * lo valida el guard con @Roles en el controller).
   */
  async regenerarQr(user: AuthUser) {
    this.assertActive(user);
    const qrCode = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { qrCode },
    });
    return { qrCode };
  }

  async getMovimientos(user: AuthUser, q: PaginacionDto = {}) {
    this.assertActive(user);
    return this.prisma.movimientoPuntos.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
      ...paginacion(q),
    });
  }

  async getEntregas(user: AuthUser, q: PaginacionDto = {}) {
    this.assertActive(user);
    return this.prisma.entrega.findMany({
      where: { usuarioId: user.id },
      include: { detalles: true },
      orderBy: { fechaCaptura: 'desc' },
      ...paginacion(q),
    });
  }

  /**
   * Panel del usuario: puntos, kg acumulados (total y por tipo) y
   * recompensas disponibles para su rol (caso dashboard §15 complementario).
   */
  async getPanel(user: AuthUser) {
    this.assertActive(user);
    const balance = await this.prisma.ecoPuntosBalance.findUnique({
      where: { userId: user.id },
    });

    const kgPorTipoRaw = await this.prisma.detalleEntrega.groupBy({
      by: ['tipoResiduo'],
      where: { entrega: { usuarioId: user.id } },
      _sum: { pesoKg: true, puntosSubtotal: true },
    });
    const kgPorTipo = kgPorTipoRaw.map((r) => ({
      tipoResiduo: r.tipoResiduo,
      kg: Number(r._sum.pesoKg ?? 0),
      puntos: r._sum.puntosSubtotal ?? 0,
    }));
    const totalKg = kgPorTipo.reduce((s, r) => s + r.kg, 0);

    const totalEntregas = await this.prisma.entrega.count({
      where: { usuarioId: user.id },
    });

    const recompensasDisponibles = await this.ofertasService.listar(user);

    return {
      puntosActuales: balance?.puntosActuales ?? 0,
      puntosHistoricos: balance?.puntosHistoricos ?? 0,
      totalKg,
      kgPorTipo,
      totalEntregas,
      recompensasDisponibles,
    };
  }

  async getNotificaciones(user: AuthUser) {
    this.assertActive(user);
    return this.prisma.notificacion.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async marcarNotificacionLeida(user: AuthUser, id: string) {
    this.assertActive(user);
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
    });
    if (!notificacion || notificacion.usuarioId !== user.id) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return this.prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    });
  }

  private assertActive(user: AuthUser & { activo?: boolean }) {
    if (user.activo === false) {
      throw new UnauthorizedException('Cuenta desactivada');
    }
    if (user.rol === Role.RECOLECTOR) {
      throw new UnauthorizedException('No autorizado para este recurso');
    }
  }
}

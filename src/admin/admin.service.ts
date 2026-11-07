import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { SALT_ROUNDS } from '../config/security.config.js';
import { AnularEntregaDto } from './dto/anular-entrega.dto.js';
import { CancelarVoucherDto } from './dto/cancelar-voucher.dto.js';
import { CreateFactorDto } from './dto/create-factor.dto.js';
import { CreateOfertaDto } from './dto/create-oferta.dto.js';
import { EstadoObraDto } from './dto/estado-obra.dto.js';
import { CreateRecolectorDto } from './dto/create-recolector.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { EstadoRecolectorDto } from './dto/estado-recolector.dto.js';
import { PaginacionDto, paginacion } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de recolector (spec §4): el admin genera/recibe el PIN inicial
   * (6 dígitos, hasheado); el PIN en claro se devuelve UNA sola vez.
   */
  async crearRecolector(admin: AuthUser, dto: CreateRecolectorDto) {
    const existing = await this.prisma.user.findUnique({
      where: { dni: dto.dni },
    });
    if (existing) {
      throw new ConflictException('El DNI ya se encuentra registrado');
    }

    const pin = dto.pin ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: `${dto.dni}@recolector.local`, // placeholder interno (login por DNI+PIN)
        passwordHash: pinHash, // no se usa para login; se guarda hash del PIN
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        dni: dto.dni,
        telefono: dto.telefono,
        rol: Role.RECOLECTOR,
        perfilRecolector: {
          create: {
            dni: dto.dni,
            nombres: dto.nombres,
            telefono: dto.telefono,
            zonaCamion: dto.zonaCamion,
            pinHash,
          },
        },
        puntosBalance: { create: { puntosActuales: 0, puntosHistoricos: 0 } },
      },
      include: { perfilRecolector: true, puntosBalance: true },
    });

    await this.audit(admin.id, 'CREAR_RECOLECTOR', 'User', user.id, {
      dni: dto.dni,
    });

    const { passwordHash: _ph, ...sanitized } = user;
    return { ...sanitized, pinInicial: pin };
  }

  /** Activar/desactivar recolector (spec §4/§7): setea desactivadoAt al revocar. */
  async cambiarEstadoRecolector(
    admin: AuthUser,
    userId: string,
    dto: EstadoRecolectorDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.rol !== Role.RECOLECTOR) {
      throw new NotFoundException('Recolector no encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        activo: dto.activo,
        desactivadoAt: dto.activo ? null : new Date(),
      },
    });

    await this.audit(
      admin.id,
      dto.activo ? 'REACTIVAR_RECOLECTOR' : 'DESACTIVAR_RECOLECTOR',
      'User',
      userId,
    );

    const { passwordHash: _ph, ...sanitized } = updated;
    return sanitized;
  }

  /** Crear ADMIN o RENTAS con email+password (spec §14). */
  async crearStaff(admin: AuthUser, dto: CreateStaffDto, rol: Role) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        dni: dto.dni,
        telefono: dto.telefono,
        rol,
        puntosBalance: { create: { puntosActuales: 0, puntosHistoricos: 0 } },
      },
      include: { puntosBalance: true },
    });
    await this.audit(admin.id, `CREAR_${rol}`, 'User', user.id, { email });
    const { passwordHash: _ph, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Crear factor versionado (spec §5): NUNCA se edita un factor existente,
   * se inserta una fila nueva con creadoPor = admin que lo registra.
   */
  async crearFactor(admin: AuthUser, dto: CreateFactorDto) {
    const factor = await this.prisma.configFactorResiduo.create({
      data: {
        tipoResiduo: dto.tipoResiduo,
        factor: new Prisma.Decimal(dto.factor),
        vigenteDesde: dto.vigenteDesde
          ? new Date(dto.vigenteDesde)
          : new Date(),
        creadoPorId: admin.id,
      },
    });
    await this.audit(
      admin.id,
      'CAMBIAR_FACTOR',
      'ConfigFactorResiduo',
      factor.id,
      {
        tipoResiduo: dto.tipoResiduo,
        factor: dto.factor,
      },
    );
    return factor;
  }

  async listarFactores() {
    return this.prisma.configFactorResiduo.findMany({
      orderBy: [{ tipoResiduo: 'asc' }, { vigenteDesde: 'desc' }],
    });
  }

  // --- Ofertas (spec §8/§14)

  async crearOferta(admin: AuthUser, dto: CreateOfertaDto) {
    const oferta = await this.prisma.ofertaRecompensa.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        costoPuntos: dto.costoPuntos,
        dirigidoA: dto.dirigidoA,
        stockDisponible: dto.stockDisponible ?? null,
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        limitePorUsuario: dto.limitePorUsuario ?? null,
        diasVigenciaVoucher: dto.diasVigenciaVoucher ?? 90,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(
      admin.id,
      'PUBLICAR_OFERTA',
      'OfertaRecompensa',
      oferta.id,
      {
        titulo: dto.titulo,
      },
    );
    return oferta;
  }

  async actualizarOferta(admin: AuthUser, id: string, dto: CreateOfertaDto) {
    const oferta = await this.prisma.ofertaRecompensa.findUnique({
      where: { id },
    });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    const updated = await this.prisma.ofertaRecompensa.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        costoPuntos: dto.costoPuntos,
        dirigidoA: dto.dirigidoA,
        stockDisponible: dto.stockDisponible ?? null,
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        limitePorUsuario: dto.limitePorUsuario ?? null,
        diasVigenciaVoucher: dto.diasVigenciaVoucher ?? 90,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'MODIFICAR_OFERTA', 'OfertaRecompensa', id);
    return updated;
  }

  // --- Anulación de entregas (spec §10): reversa; saldo puede quedar negativo.

  async anularEntrega(admin: AuthUser, id: string, dto: AnularEntregaDto) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id } });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    if (entrega.estado === 'ANULADA') {
      throw new BadRequestException('La entrega ya está anulada');
    }

    return this.prisma.$transaction(async (tx) => {
      const anulada = await tx.entrega.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          motivoAnulacion: dto.motivo,
          anuladoPor: admin.id,
        },
      });

      const balance = await tx.ecoPuntosBalance.findUnique({
        where: { userId: entrega.usuarioId },
      });
      const saldoPosterior =
        (balance?.puntosActuales ?? 0) - entrega.puntosTotales;
      await tx.ecoPuntosBalance.upsert({
        where: { userId: entrega.usuarioId },
        create: {
          userId: entrega.usuarioId,
          puntosActuales: -entrega.puntosTotales,
          puntosHistoricos: 0,
        },
        update: {
          puntosActuales: { decrement: entrega.puntosTotales },
          puntosHistoricos: { decrement: entrega.puntosTotales },
        },
      });
      await tx.movimientoPuntos.create({
        data: {
          usuarioId: entrega.usuarioId,
          tipo: 'REVERSA_ENTREGA',
          monto: -entrega.puntosTotales,
          saldoPosterior,
          entregaId: entrega.id,
          motivo: dto.motivo,
          creadoPor: admin.id,
        },
      });
      await tx.auditLog.create({
        data: {
          usuarioId: admin.id,
          accion: 'ANULAR_ENTREGA',
          entidad: 'Entrega',
          entidadId: entrega.id,
          detalle: { motivo: dto.motivo } as Prisma.InputJsonValue,
        },
      });

      return anulada;
    });
  }

  // --- Cancelación de vouchers (spec §8): EMITIDO -> CANCELADO + reversa.

  async cancelarVoucher(admin: AuthUser, id: string, dto: CancelarVoucherDto) {
    const voucher = await this.prisma.voucherCanje.findUnique({
      where: { id },
      include: { oferta: true },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    if (voucher.estado !== 'EMITIDO') {
      throw new BadRequestException(
        `El voucher está ${voucher.estado} y no puede cancelarse`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const cancelado = await tx.voucherCanje.update({
        where: { id },
        data: {
          estado: 'CANCELADO',
          motivoCancelacion: dto.motivo,
          canceladoPor: admin.id,
        },
      });

      const balance = await tx.ecoPuntosBalance.findUnique({
        where: { userId: voucher.usuarioId },
      });
      const saldoPosterior =
        (balance?.puntosActuales ?? 0) + voucher.puntosUsados;
      await tx.ecoPuntosBalance.upsert({
        where: { userId: voucher.usuarioId },
        create: {
          userId: voucher.usuarioId,
          puntosActuales: voucher.puntosUsados,
          puntosHistoricos: 0,
        },
        update: {
          puntosActuales: { increment: voucher.puntosUsados },
        },
      });
      await tx.movimientoPuntos.create({
        data: {
          usuarioId: voucher.usuarioId,
          tipo: 'REVERSA_CANJE',
          monto: voucher.puntosUsados,
          saldoPosterior,
          voucherId: voucher.id,
          motivo: dto.motivo,
          creadoPor: admin.id,
        },
      });

      // Devolver stock si la oferta era con stock limitado.
      if (voucher.oferta.stockDisponible !== null) {
        await tx.ofertaRecompensa.update({
          where: { id: voucher.ofertaId },
          data: { stockDisponible: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          usuarioId: admin.id,
          accion: 'CANCELAR_VOUCHER',
          entidad: 'VoucherCanje',
          entidadId: voucher.id,
          detalle: { motivo: dto.motivo } as Prisma.InputJsonValue,
        },
      });

      return cancelado;
    });
  }

  /** Seguimiento de obra de urbanizaciones (spec §8): solo ADMIN. */
  async actualizarEstadoObra(admin: AuthUser, id: string, dto: EstadoObraDto) {
    const voucher = await this.prisma.voucherCanje.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    if (voucher.usuario.rol !== Role.URBANIZACION) {
      throw new BadRequestException(
        'El estado de obra solo aplica a vouchers de urbanizaciones',
      );
    }
    return this.prisma.voucherCanje.update({
      where: { id },
      data: { estadoObra: dto.estadoObra },
    });
  }

  // --- Reportes y auditoría (spec §14)

  async reporteResiduos() {
    const porTipo = await this.prisma.detalleEntrega.groupBy({
      by: ['tipoResiduo'],
      _sum: { pesoKg: true, puntosSubtotal: true },
      _count: { _all: true },
    });
    const entregas = await this.prisma.entrega.groupBy({
      by: ['recolectorId'],
      _sum: { puntosTotales: true },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    return { porTipo, topRecolectores: entregas };
  }

  async listarAuditoria(q: PaginacionDto = {}) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      ...paginacion(q),
    });
  }

  // --- Dashboard admin: clientes, recompensas y basura acumulada

  async dashboardResumen() {
    const [totalClientes, totalEntregas, kg, puntos, vouchers, ofertas] =
      await Promise.all([
        this.prisma.user.count({
          where: { rol: { in: [Role.CIUDADANO, Role.URBANIZACION] } },
        }),
        this.prisma.entrega.count(),
        this.prisma.detalleEntrega.aggregate({
          _sum: { pesoKg: true },
        }),
        this.prisma.ecoPuntosBalance.aggregate({
          _sum: { puntosHistoricos: true },
        }),
        this.prisma.voucherCanje.groupBy({
          by: ['estado'],
          _count: { _all: true },
        }),
        this.prisma.ofertaRecompensa.count({ where: { activo: true } }),
      ]);
    return {
      totalClientes,
      totalEntregas,
      totalKg: Number(kg._sum.pesoKg ?? 0),
      totalPuntosEmitidos: puntos._sum.puntosHistoricos ?? 0,
      vouchersPorEstado: vouchers,
      ofertasActivas: ofertas,
    };
  }

  async dashboardClientes(q: PaginacionDto = {}) {
    const clientes = await this.prisma.user.findMany({
      where: { rol: { in: [Role.CIUDADANO, Role.URBANIZACION] } },
      include: {
        puntosBalance: true,
        _count: { select: { entregas: true, vouchers: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...paginacion(q),
    });

    return Promise.all(
      clientes.map(async (c) => {
        const kg = await this.prisma.detalleEntrega.aggregate({
          where: { entrega: { usuarioId: c.id } },
          _sum: { pesoKg: true },
        });
        const { passwordHash: _ph, ...rest } = c;
        return {
          ...rest,
          puntosActuales: c.puntosBalance?.puntosActuales ?? 0,
          puntosHistoricos: c.puntosBalance?.puntosHistoricos ?? 0,
          totalKg: Number(kg._sum.pesoKg ?? 0),
          totalEntregas: c._count.entregas,
          totalVouchers: c._count.vouchers,
        };
      }),
    );
  }

  async dashboardCliente(id: string) {
    const cliente = await this.prisma.user.findUnique({
      where: { id },
      include: { puntosBalance: true },
    });
    if (
      !cliente ||
      (cliente.rol !== Role.CIUDADANO && cliente.rol !== Role.URBANIZACION)
    ) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const kgPorTipoRaw = await this.prisma.detalleEntrega.groupBy({
      by: ['tipoResiduo'],
      where: { entrega: { usuarioId: id } },
      _sum: { pesoKg: true, puntosSubtotal: true },
    });
    const kgPorTipo = kgPorTipoRaw.map((r) => ({
      tipoResiduo: r.tipoResiduo,
      kg: Number(r._sum.pesoKg ?? 0),
      puntos: r._sum.puntosSubtotal ?? 0,
    }));

    const [entregas, vouchers, movimientos] = await Promise.all([
      this.prisma.entrega.findMany({
        where: { usuarioId: id },
        include: { detalles: true },
        orderBy: { fechaCaptura: 'desc' },
        take: 10,
      }),
      this.prisma.voucherCanje.findMany({
        where: { usuarioId: id },
        include: { oferta: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.movimientoPuntos.findMany({
        where: { usuarioId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const { passwordHash: _ph, ...rest } = cliente;
    return {
      ...rest,
      puntosActuales: cliente.puntosBalance?.puntosActuales ?? 0,
      puntosHistoricos: cliente.puntosBalance?.puntosHistoricos ?? 0,
      totalKg: kgPorTipo.reduce((s, r) => s + r.kg, 0),
      kgPorTipo,
      entregas,
      vouchers,
      movimientos,
    };
  }

  /** El admin también puede regenerar el QR de cualquier usuario (spec §4). */
  async regenerarQr(admin: AuthUser, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const qrCode = randomUUID();
    await this.prisma.user.update({ where: { id: userId }, data: { qrCode } });
    await this.audit(admin.id, 'REGENERAR_QR', 'User', userId);
    return { qrCode };
  }

  private async audit(
    usuarioId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    detalle?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId,
        detalle: detalle as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

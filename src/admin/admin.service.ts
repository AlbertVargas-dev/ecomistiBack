import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CacheService } from '../common/cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SALT_ROUNDS } from '../config/security.config.js';
import { AnularEntregaDto } from './dto/anular-entrega.dto.js';
import { CancelarVoucherDto } from './dto/cancelar-voucher.dto.js';
import { CreateFactorDto } from './dto/create-factor.dto.js';
import { CreateOfertaDto } from './dto/create-oferta.dto.js';
import { EstadoObraDto } from './dto/estado-obra.dto.js';
import { CooperativaDto } from './dto/cooperativa.dto.js';
import { EntregasQueryDto } from './dto/entregas-query.dto.js';
import { CreatePuntoDto } from '../puntos-encuentro/dto/create-punto.dto.js';
import { RutaDto } from './dto/ruta.dto.js';
import { VehiculoDto } from './dto/vehiculo.dto.js';
import { Granularidad, TendenciaQueryDto } from './dto/tendencia-query.dto.js';
import { ResumenQueryDto } from './dto/resumen-query.dto.js';
import { CreateRecolectorDto } from './dto/create-recolector.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { EstadoRecolectorDto } from './dto/estado-recolector.dto.js';
import { PaginacionDto, paginacion } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

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

  /**
   * Resumen del Panel General (diseño): tarjetas del período + comparativa
   * vs período anterior de igual duración (deltaPct para "↑ 12.5% vs semana anterior").
   * Sin fechas: últimos 7 días.
   */
  async dashboardResumen(q: ResumenQueryDto = {}) {
    const claveCache = `resumen:${q.desde ?? ''}:${q.hasta ?? ''}:${q.distrito ?? ''}`;
    const enCache = this.cache.get<Record<string, unknown>>(claveCache) as Awaited<ReturnType<AdminService['calcularResumen']>> | null;
    if (enCache) return enCache;
    const resultado = await this.calcularResumen(q);
    return this.cache.set(claveCache, resultado);
  }

  private async calcularResumen(q: ResumenQueryDto = {}) {
    const hasta = q.hasta ? new Date(q.hasta) : new Date();
    const desde = q.desde
      ? new Date(q.desde)
      : new Date(hasta.getTime() - 6 * 24 * 60 * 60 * 1000);
    if (desde > hasta) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a hasta',
      );
    }
    const duracion = hasta.getTime() - desde.getTime();
    const anteriorHasta = desde;
    const anteriorDesde = new Date(desde.getTime() - duracion);

    const rango = (d: Date, h: Date) => ({ gte: d, lte: h });

    const filtroEntrega = (d: Date, h: Date) => ({
      fechaCaptura: rango(d, h),
      ...(q.distrito ? { puntoEncuentro: { distrito: q.distrito } } : {}),
    });

    const metricas = async (d: Date, h: Date) => {
      const [kgTotales, kgReciclable, puntos, entregas, clientesNuevos] =
        await Promise.all([
          this.prisma.detalleEntrega.aggregate({
            where: { entrega: filtroEntrega(d, h) },
            _sum: { pesoKg: true },
          }),
          this.prisma.detalleEntrega.aggregate({
            where: {
              tipoResiduo: 'RECICLABLE',
              entrega: filtroEntrega(d, h),
            },
            _sum: { pesoKg: true },
          }),
          this.prisma.movimientoPuntos.aggregate({
            where: { tipo: 'ACREDITO', createdAt: rango(d, h) },
            _sum: { monto: true },
          }),
          this.prisma.entrega.count({
            where: filtroEntrega(d, h),
          }),
          this.prisma.user.count({
            where: {
              rol: { in: [Role.CIUDADANO, Role.URBANIZACION] },
              createdAt: rango(d, h),
            },
          }),
        ]);
      return {
        residuosKg: Number(kgTotales._sum.pesoKg ?? 0),
        reciclableKg: Number(kgReciclable._sum.pesoKg ?? 0),
        ecoPuntos: puntos._sum.monto ?? 0,
        entregas,
        clientesNuevos,
      };
    };

    const [actual, anterior, totalClientes, vouchers, ofertas] =
      await Promise.all([
        metricas(desde, hasta),
        metricas(anteriorDesde, anteriorHasta),
        this.prisma.user.count({
          where: { rol: { in: [Role.CIUDADANO, Role.URBANIZACION] } },
        }),
        this.prisma.voucherCanje.groupBy({
          by: ['estado'],
          _count: { _all: true },
        }),
        this.prisma.ofertaRecompensa.count({ where: { activo: true } }),
      ]);

    const delta = (a: number, b: number) =>
      b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10;

    return {
      periodo: { desde, hasta },
      anterior: { desde: anteriorDesde, hasta: anteriorHasta },
      totalClientes,
      totalEntregas: actual.entregas,
      totalKg: actual.residuosKg,
      materialReciclableKg: actual.reciclableKg,
      totalPuntosEmitidos: actual.ecoPuntos,
      clientesNuevos: actual.clientesNuevos,
      deltaPct: {
        residuosKg: delta(actual.residuosKg, anterior.residuosKg),
        reciclableKg: delta(actual.reciclableKg, anterior.reciclableKg),
        ecoPuntos: delta(actual.ecoPuntos, anterior.ecoPuntos),
      },
      vouchersPorEstado: vouchers,
      ofertasActivas: ofertas,
    };
  }

  /**
   * Tendencia de recolección (gráfico del Panel General): serie por
   * día/semana/mes con kg reciclables y orgánicos. Huecos en cero.
   */
  async tendencia(q: TendenciaQueryDto = {}) {
    const claveCache = `tendencia:${q.desde ?? ''}:${q.hasta ?? ''}:${q.granularidad ?? 'dia'}`;
    const enCache = this.cache.get<Record<string, unknown>>(claveCache) as Awaited<ReturnType<AdminService['calcularTendencia']>> | null;
    if (enCache) return enCache;
    const resultado = await this.calcularTendencia(q);
    return this.cache.set(claveCache, resultado);
  }

  private async calcularTendencia(q: TendenciaQueryDto = {}) {
    const hasta = q.hasta ? new Date(q.hasta) : new Date();
    const desde = q.desde
      ? new Date(q.desde)
      : new Date(hasta.getTime() - 6 * 24 * 60 * 60 * 1000);
    if (desde > hasta) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a hasta',
      );
    }
    const granularidad = q.granularidad ?? Granularidad.DIA;

    const detalles = await this.prisma.detalleEntrega.findMany({
      where: { entrega: { fechaCaptura: { gte: desde, lte: hasta } } },
      select: {
        tipoResiduo: true,
        pesoKg: true,
        entrega: { select: { fechaCaptura: true } },
      },
    });

    const buckets = new Map<
      string,
      { fecha: string; kgReciclables: number; kgOrganicos: number }
    >();

    // Buckets en UTC (las fechas se guardan en UTC, spec §13).
    const clave = (d: Date): string => {
      const fecha = new Date(d);
      if (granularidad === Granularidad.MES) {
        fecha.setUTCDate(1);
      } else if (granularidad === Granularidad.SEMANA) {
        const dia = (fecha.getUTCDay() + 6) % 7; // lunes = 0
        fecha.setUTCDate(fecha.getUTCDate() - dia);
      }
      fecha.setUTCHours(0, 0, 0, 0);
      return fecha.toISOString().slice(0, 10);
    };

    for (const detalle of detalles) {
      const k = clave(detalle.entrega.fechaCaptura);
      const bucket = buckets.get(k) ?? {
        fecha: k,
        kgReciclables: 0,
        kgOrganicos: 0,
      };
      if (detalle.tipoResiduo === 'RECICLABLE') {
        bucket.kgReciclables += Number(detalle.pesoKg);
      } else {
        bucket.kgOrganicos += Number(detalle.pesoKg);
      }
      buckets.set(k, bucket);
    }

    // Completar huecos con ceros entre desde y hasta.
    const serie: {
      fecha: string;
      kgReciclables: number;
      kgOrganicos: number;
      totalKg: number;
    }[] = [];
    const cursor = new Date(desde);
    cursor.setUTCHours(0, 0, 0, 0);
    const fin = new Date(hasta);
    fin.setUTCHours(0, 0, 0, 0);
    while (cursor <= fin) {
      const k = clave(cursor);
      const b = buckets.get(k) ?? {
        fecha: k,
        kgReciclables: 0,
        kgOrganicos: 0,
      };
      serie.push({
        ...b,
        totalKg: b.kgReciclables + b.kgOrganicos,
      });
      if (granularidad === Granularidad.MES) {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      } else if (granularidad === Granularidad.SEMANA) {
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      } else {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return { granularidad, serie };
  }

  /**
   * Mapa de calor (diseño): kg por punto de encuentro con nivel
   * alta/media/baja según terciles del máximo (para pins del mapa).
   */
  async mapaCalor() {
    const enCache = this.cache.get<Record<string, unknown>>('mapa-calor') as Awaited<ReturnType<AdminService['calcularMapaCalor']>> | null;
    if (enCache) return enCache;
    const resultado = await this.calcularMapaCalor();
    return this.cache.set('mapa-calor', resultado, 60_000);
  }

  private async calcularMapaCalor() {
    const entregas = await this.prisma.entrega.findMany({
      where: { puntoEncuentroId: { not: null } },
      include: {
        puntoEncuentro: true,
        detalles: { select: { pesoKg: true } },
      },
    });

    const porPunto = new Map<
      string,
      {
        puntoId: string;
        nombre: string;
        distrito: string;
        latitud: number;
        longitud: number;
        totalKg: number;
        totalEntregas: number;
      }
    >();

    for (const e of entregas) {
      const punto = e.puntoEncuentro;
      if (!punto) continue;
      const actual = porPunto.get(punto.id) ?? {
        puntoId: punto.id,
        nombre: punto.nombre,
        distrito: punto.distrito,
        latitud: punto.latitud,
        longitud: punto.longitud,
        totalKg: 0,
        totalEntregas: 0,
      };
      actual.totalKg += e.detalles.reduce((s, d) => s + Number(d.pesoKg), 0);
      actual.totalEntregas += 1;
      porPunto.set(punto.id, actual);
    }

    const puntos = [...porPunto.values()].sort((a, b) => b.totalKg - a.totalKg);
    const max = puntos[0]?.totalKg ?? 0;

    return puntos.map((p) => ({
      ...p,
      nivel:
        max > 0 && p.totalKg >= max * 0.66
          ? 'ALTA'
          : max > 0 && p.totalKg >= max * 0.33
            ? 'MEDIA'
            : 'BAJA',
    }));
  }

  /**
   * Tabla "Recolecciones Recientes" (diseño): entregas con filtros y
   * paginación, incluyendo usuario, recolector y punto.
   */
  async listarEntregas(q: EntregasQueryDto = {}) {
    const search = q.search?.trim();
    return this.prisma.entrega.findMany({
      where: {
        estado: q.estado,
        fechaCaptura: {
          gte: q.desde ? new Date(q.desde) : undefined,
          lte: q.hasta ? new Date(q.hasta) : undefined,
        },
        detalles: q.tipoResiduo
          ? { some: { tipoResiduo: q.tipoResiduo } }
          : undefined,
        OR: search
          ? [
              { id: { contains: search } },
              {
                usuario: {
                  OR: [
                    { nombres: { contains: search, mode: 'insensitive' } },
                    { apellidos: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
              {
                recolector: {
                  OR: [
                    { nombres: { contains: search, mode: 'insensitive' } },
                    { apellidos: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ]
          : undefined,
      },
      include: {
        usuario: { select: { nombres: true, apellidos: true } },
        recolector: { select: { nombres: true, apellidos: true } },
        puntoEncuentro: { select: { nombre: true, distrito: true } },
        ruta: { select: { nombre: true } },
        detalles: true,
      },
      orderBy: { fechaCaptura: 'desc' },
      ...paginacion(q),
    });
  }

  // --- Rutas (diseño: menú Rutas + columna Ruta en entregas)

  async listarRutas() {
    return this.prisma.ruta.findMany({
      include: {
        recolector: { select: { nombres: true, apellidos: true } },
        _count: { select: { entregas: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async crearRuta(admin: AuthUser, dto: RutaDto) {
    const ruta = await this.prisma.ruta.create({
      data: {
        nombre: dto.nombre,
        zona: dto.zona,
        recolectorId: dto.recolectorId,
        estado: dto.estado ?? 'ACTIVA',
      },
    });
    await this.audit(admin.id, 'CREAR_RUTA', 'Ruta', ruta.id, {
      nombre: dto.nombre,
    });
    return ruta;
  }

  async actualizarRuta(admin: AuthUser, id: string, dto: RutaDto) {
    const ruta = await this.prisma.ruta.findUnique({ where: { id } });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    const actualizada = await this.prisma.ruta.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        zona: dto.zona,
        recolectorId: dto.recolectorId,
        estado: dto.estado ?? 'ACTIVA',
      },
    });
    await this.audit(admin.id, 'MODIFICAR_RUTA', 'Ruta', id);
    return actualizada;
  }

  // --- Puntos de EcoReciclaje (admin)

  async crearPunto(admin: AuthUser, dto: CreatePuntoDto) {
    const punto = await this.prisma.puntoEncuentro.create({
      data: {
        nombre: dto.nombre,
        distrito: dto.distrito,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        horario: dto.horario,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'CREAR_PUNTO', 'PuntoEncuentro', punto.id, {
      nombre: dto.nombre,
    });
    return punto;
  }

  async actualizarPunto(admin: AuthUser, id: string, dto: CreatePuntoDto) {
    const punto = await this.prisma.puntoEncuentro.findUnique({
      where: { id },
    });
    if (!punto) throw new NotFoundException('Punto no encontrado');
    const actualizado = await this.prisma.puntoEncuentro.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        distrito: dto.distrito,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        horario: dto.horario,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'MODIFICAR_PUNTO', 'PuntoEncuentro', id);
    return actualizado;
  }

  // --- Vehículos (admin)

  async listarVehiculos() {
    return this.prisma.vehiculo.findMany({
      include: {
        recolector: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { placa: 'asc' },
    });
  }

  async crearVehiculo(admin: AuthUser, dto: VehiculoDto) {
    const vehiculo = await this.prisma.vehiculo.create({
      data: {
        placa: dto.placa,
        tipo: dto.tipo,
        capacidadKg: dto.capacidadKg,
        recolectorId: dto.recolectorId,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'CREAR_VEHICULO', 'Vehiculo', vehiculo.id, {
      placa: dto.placa,
    });
    return vehiculo;
  }

  async actualizarVehiculo(admin: AuthUser, id: string, dto: VehiculoDto) {
    const vehiculo = await this.prisma.vehiculo.findUnique({ where: { id } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');
    const actualizado = await this.prisma.vehiculo.update({
      where: { id },
      data: {
        placa: dto.placa,
        tipo: dto.tipo,
        capacidadKg: dto.capacidadKg,
        recolectorId: dto.recolectorId,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'MODIFICAR_VEHICULO', 'Vehiculo', id);
    return actualizado;
  }

  // --- Personal (diseño): recolectores con última actividad

  async listarRecolectores() {
    const recolectores = await this.prisma.user.findMany({
      where: { rol: Role.RECOLECTOR },
      include: {
        perfilRecolector: true,
        _count: { select: { entregasRegistradas: true } },
      },
      orderBy: { nombres: 'asc' },
    });

    return Promise.all(
      recolectores.map(async (r) => {
        const ultima = await this.prisma.entrega.findFirst({
          where: { recolectorId: r.id, estado: 'VALIDA' },
          orderBy: { fechaCaptura: 'desc' },
          select: { fechaCaptura: true },
        });
        const { passwordHash: _ph, ...rest } = r;
        return {
          ...rest,
          zonaCamion: r.perfilRecolector?.zonaCamion ?? null,
          totalEntregas: r._count.entregasRegistradas,
          ultimaEntrega: ultima?.fechaCaptura ?? null,
        };
      }),
    );
  }

  // --- Incidencias (admin)

  async listarIncidencias(q: PaginacionDto = {}) {
    return this.prisma.incidencia.findMany({
      include: {
        usuario: { select: { nombres: true, apellidos: true, rol: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...paginacion(q),
    });
  }

  async cambiarEstadoIncidencia(
    admin: AuthUser,
    id: string,
    estado: 'ABIERTA' | 'EN_REVISION' | 'RESUELTA',
  ) {
    const incidencia = await this.prisma.incidencia.findUnique({
      where: { id },
    });
    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');
    const actualizada = await this.prisma.incidencia.update({
      where: { id },
      data: { estado },
    });
    await this.audit(admin.id, 'GESTIONAR_INCIDENCIA', 'Incidencia', id, {
      estado,
    });
    return actualizada;
  }

  // --- Copaff: cooperativas (menu del diseno)

  async listarCooperativas() {
    return this.prisma.cooperativa.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crearCooperativa(admin: AuthUser, dto: CooperativaDto) {
    const cooperativa = await this.prisma.cooperativa.create({
      data: {
        nombre: dto.nombre,
        ruc: dto.ruc,
        direccion: dto.direccion,
        telefono: dto.telefono,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(
      admin.id,
      'CREAR_COOPERATIVA',
      'Cooperativa',
      cooperativa.id,
      {
        nombre: dto.nombre,
      },
    );
    return cooperativa;
  }

  async actualizarCooperativa(
    admin: AuthUser,
    id: string,
    dto: CooperativaDto,
  ) {
    const cooperativa = await this.prisma.cooperativa.findUnique({
      where: { id },
    });
    if (!cooperativa) throw new NotFoundException('Cooperativa no encontrada');
    const actualizada = await this.prisma.cooperativa.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        ruc: dto.ruc,
        direccion: dto.direccion,
        telefono: dto.telefono,
        activo: dto.activo ?? true,
      },
    });
    await this.audit(admin.id, 'MODIFICAR_COOPERATIVA', 'Cooperativa', id);
    return actualizada;
  }

  // --- Exportar reporte (diseno: boton Exportar Reporte)

  async exportarReporte(formato: 'csv' | 'xlsx') {
    const entregas = await this.prisma.entrega.findMany({
      include: {
        usuario: { select: { nombres: true, apellidos: true } },
        recolector: { select: { nombres: true, apellidos: true } },
        puntoEncuentro: { select: { nombre: true, distrito: true } },
        detalles: true,
      },
      orderBy: { fechaCaptura: 'desc' },
    });

    const filas = entregas.map((e) => ({
      id: e.id,
      fecha: e.fechaCaptura.toISOString(),
      usuario: `${e.usuario.nombres} ${e.usuario.apellidos}`,
      recolector: `${e.recolector.nombres} ${e.recolector.apellidos}`,
      punto: e.puntoEncuentro?.nombre ?? '',
      distrito: e.puntoEncuentro?.distrito ?? '',
      tipos: e.detalles.map((d) => d.tipoResiduo).join(', '),
      pesoKg: e.detalles.reduce((s, d) => s + Number(d.pesoKg), 0),
      volumenM3: e.volumenM3 ?? '',
      puntos: e.puntosTotales,
      estado: e.estado,
    }));

    if (formato === 'csv') {
      const headers = Object.keys(filas[0] ?? { id: '' });
      const csv = [
        headers.join(','),
        ...filas.map((f) =>
          headers
            .map(
              (h) =>
                `"${String(f[h as keyof typeof f]).replaceAll('"', '""')}"`,
            )
            .join(','),
        ),
      ].join('\n');
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: 'reporte-recolecciones.csv',
        body: Buffer.from(csv, 'utf-8'),
      };
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet('Recolecciones');
    hoja.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Fecha', key: 'fecha' },
      { header: 'Usuario', key: 'usuario' },
      { header: 'Recolector', key: 'recolector' },
      { header: 'Punto', key: 'punto' },
      { header: 'Distrito', key: 'distrito' },
      { header: 'Tipos', key: 'tipos' },
      { header: 'Peso (kg)', key: 'pesoKg' },
      { header: 'Volumen (m3)', key: 'volumenM3' },
      { header: 'Puntos', key: 'puntos' },
      { header: 'Estado', key: 'estado' },
    ];
    hoja.addRows(filas);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'reporte-recolecciones.xlsx',
      body: Buffer.from(buffer),
    };
  }

  // --- Busqueda global (header del diseno)

  async buscar(q: string) {
    const term = q.trim();
    if (!term) return { usuarios: [], entregas: [], vouchers: [], puntos: [] };
    const [usuarios, entregas, vouchers, puntos] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { nombres: { contains: term, mode: 'insensitive' } },
            { apellidos: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          email: true,
          rol: true,
        },
        take: 5,
      }),
      this.prisma.entrega.findMany({
        where: { id: { contains: term } },
        select: {
          id: true,
          fechaCaptura: true,
          puntosTotales: true,
          estado: true,
        },
        take: 5,
      }),
      this.prisma.voucherCanje.findMany({
        where: { codigoVoucher: { contains: term } },
        select: { id: true, codigoVoucher: true, estado: true },
        take: 5,
      }),
      this.prisma.puntoEncuentro.findMany({
        where: {
          OR: [
            { nombre: { contains: term, mode: 'insensitive' } },
            { distrito: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, nombre: true, distrito: true },
        take: 5,
      }),
    ]);
    return { usuarios, entregas, vouchers, puntos };
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
        include: { detalles: true, ruta: { select: { nombre: true } } },
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

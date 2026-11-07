import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, TipoResiduo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FECHA_CAPTURA_MAX_DIAS,
  FECHA_CAPTURA_TOLERANCIA_MIN,
  MAX_DETALLES_POR_ENTREGA,
  MAX_ENTREGAS_POR_DIA,
  PESO_MAX_BOLSA_KG,
  PESO_MAX_ENTREGA_KG,
  PESO_MIN_BOLSA_KG,
} from '../config/limites.config.js';
import { PUNTOS_POR_KG } from '../config/puntos.config.js';
import { IdentificarQrDto } from './dto/identificar-qr.dto.js';
import { EntregaSyncDto, SincronizarDto } from './dto/sincronizar.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

type ResultadoItem = {
  idempotencyKey: string;
  estado: 'ACEPTADA' | 'DUPLICADA' | 'RECHAZADA';
  motivo?: string;
  entregaId?: string;
  puntosOtorgados?: number;
};

@Injectable()
export class RecoleccionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identificar QR (spec §4): el recolector solo ve nombre parcial + tipo de
   * cuenta, nunca datos sensibles.
   */
  async identificarQr(dto: IdentificarQrDto) {
    const user = await this.prisma.user.findUnique({
      where: { qrCode: dto.qrCode },
      select: { nombres: true, apellidos: true, rol: true, qrCode: true },
    });
    if (!user) {
      throw new NotFoundException('QR no encontrado');
    }
    return this.resumenIdentificado(user);
  }

  /**
   * Identificar por DNI (alternativa al escaneo): el DNI es único,
   * por lo que identifica a la misma cuenta que el QR.
   */
  async identificarDni(dni: string) {
    const user = await this.prisma.user.findUnique({
      where: { dni },
      select: { nombres: true, apellidos: true, rol: true, qrCode: true },
    });
    if (!user) {
      throw new NotFoundException('DNI no encontrado');
    }
    return this.resumenIdentificado(user);
  }

  private resumenIdentificado(user: {
    nombres: string;
    apellidos: string;
    rol: string;
    qrCode: string;
  }) {
    const primerNombre = user.nombres.split(' ')[0] ?? user.nombres;
    const inicialApellido = user.apellidos.charAt(0);
    return {
      nombreParcial: `${primerNombre} ${inicialApellido}.`,
      tipoCuenta: user.rol,
      // El recolector necesita el qrCode para sincronizar la entrega.
      qrCode: user.qrCode,
    };
  }

  /** Entregas registradas por este recolector (panel/home del recolector). */
  async misEntregas(recolectorId: string) {
    return this.prisma.entrega.findMany({
      where: { recolectorId },
      include: {
        usuario: { select: { nombres: true, apellidos: true } },
        detalles: true,
      },
      orderBy: { fechaCaptura: 'desc' },
      take: 50,
    });
  }

  /**
   * Sincronizar entregas offline (spec §7): responde UN resultado por ítem
   * (HTTP 200 aunque algunas fallen). Cada entrega va en su propia transacción.
   */
  async sincronizarEntrega(
    recolector: AuthUser,
    dto: SincronizarDto,
  ): Promise<{ resultados: ResultadoItem[] }> {
    const resultados: ResultadoItem[] = [];
    for (const entrega of dto.entregas) {
      resultados.push(
        await this.procesarEntrega(recolector, dto.deviceId, entrega),
      );
    }
    return { resultados };
  }

  private async procesarEntrega(
    recolector: AuthUser,
    deviceId: string | undefined,
    item: EntregaSyncDto,
  ): Promise<ResultadoItem> {
    const key = item.idempotencyKey;

    // Idempotencia: si la clave ya existe, devolver el resultado original.
    const existente = await this.prisma.entrega.findUnique({
      where: { idempotencyKey: key },
    });
    if (existente) {
      return {
        idempotencyKey: key,
        estado: 'DUPLICADA',
        entregaId: existente.id,
        puntosOtorgados: existente.puntosTotales,
      };
    }

    const usuario = await this.prisma.user.findUnique({
      where: { qrCode: item.qrCode },
    });
    if (!usuario) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'QR_INVALIDO',
      };
    }
    if (usuario.activo === false) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'USUARIO_INACTIVO',
      };
    }

    const fechaCaptura = new Date(item.fechaCaptura);
    const ahora = Date.now();
    const toleranciaMs = FECHA_CAPTURA_TOLERANCIA_MIN * 60 * 1000;
    const maxDiasMs = FECHA_CAPTURA_MAX_DIAS * 24 * 60 * 60 * 1000;
    if (
      Number.isNaN(fechaCaptura.getTime()) ||
      fechaCaptura.getTime() - ahora > toleranciaMs ||
      ahora - fechaCaptura.getTime() > maxDiasMs
    ) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'FECHA_INVALIDA',
      };
    }

    // Recolector revocado: aceptar capturas previas a desactivadoAt (§7).
    const recolectorDb = await this.prisma.user.findUnique({
      where: { id: recolector.id },
      select: { desactivadoAt: true },
    });
    if (
      recolectorDb?.desactivadoAt &&
      fechaCaptura > recolectorDb.desactivadoAt
    ) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'RECOLECTOR_REVOCADO',
      };
    }

    // Validación de peso/detalles (spec §5).
    const pesoTotal = item.detalles.reduce((s, d) => s + d.pesoKg, 0);
    const pesoInvalido =
      item.detalles.length > MAX_DETALLES_POR_ENTREGA ||
      item.detalles.some(
        (d) => d.pesoKg < PESO_MIN_BOLSA_KG || d.pesoKg > PESO_MAX_BOLSA_KG,
      ) ||
      pesoTotal > PESO_MAX_ENTREGA_KG;
    if (pesoInvalido) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'PESO_INVALIDO',
      };
    }

    // Límite diario por usuario (spec §5).
    const inicioDia = new Date(fechaCaptura);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(inicioDia);
    finDia.setDate(finDia.getDate() + 1);
    const entregasDelDia = await this.prisma.entrega.count({
      where: {
        usuarioId: usuario.id,
        fechaCaptura: { gte: inicioDia, lt: finDia },
      },
    });
    if (entregasDelDia >= MAX_ENTREGAS_POR_DIA) {
      return {
        idempotencyKey: key,
        estado: 'RECHAZADA',
        motivo: 'LIMITE_DIARIO',
      };
    }

    // Factores versionados por fechaCaptura (§5); fallback a constantes si
    // aún no hay filas sembradas en ConfigFactorResiduo.
    const lineas: {
      tipoResiduo: TipoResiduo;
      pesoKg: number;
      factor: number;
      puntosSubtotal: number;
    }[] = [];
    let puntosTotales = 0;
    for (const d of item.detalles) {
      const factorRow = await this.prisma.configFactorResiduo.findFirst({
        where: {
          tipoResiduo: d.tipoResiduo,
          vigenteDesde: { lte: fechaCaptura },
        },
        orderBy: { vigenteDesde: 'desc' },
      });
      const factor = factorRow
        ? Number(factorRow.factor)
        : PUNTOS_POR_KG[d.tipoResiduo];
      const puntosSubtotal = Math.round(d.pesoKg * factor);
      puntosTotales += puntosSubtotal;
      lineas.push({
        tipoResiduo: d.tipoResiduo,
        pesoKg: d.pesoKg,
        factor,
        puntosSubtotal,
      });
    }

    try {
      const entrega = await this.prisma.$transaction(async (tx) => {
        const creada = await tx.entrega.create({
          data: {
            idempotencyKey: key,
            deviceId,
            usuarioId: usuario.id,
            recolectorId: recolector.id,
            qrCode: item.qrCode,
            fechaCaptura,
            puntosTotales,
            // Volumen: del móvil si viene; si no, estimado (2.5 L/kg ≈ 0.0025 m³/kg).
            volumenM3:
              item.volumenM3 ?? Math.round(pesoTotal * 0.0025 * 100) / 100,
            detalles: { create: lineas },
          },
        });

        // Ledger (§6): balance + movimiento en la misma transacción.
        const balance = await tx.ecoPuntosBalance.findUnique({
          where: { userId: usuario.id },
        });
        const saldoPosterior = (balance?.puntosActuales ?? 0) + puntosTotales;
        await tx.ecoPuntosBalance.upsert({
          where: { userId: usuario.id },
          create: {
            userId: usuario.id,
            puntosActuales: puntosTotales,
            puntosHistoricos: puntosTotales,
          },
          update: {
            puntosActuales: { increment: puntosTotales },
            puntosHistoricos: { increment: puntosTotales },
          },
        });
        await tx.movimientoPuntos.create({
          data: {
            usuarioId: usuario.id,
            tipo: 'ACREDITO',
            monto: puntosTotales,
            saldoPosterior,
            entregaId: creada.id,
            creadoPor: recolector.id,
          },
        });

        // Hito de recompensa: notificar las ofertas que el usuario
        // puede pagar AHORA y antes no (saldo cruza el costo).
        const saldoPrevio = balance?.puntosActuales ?? 0;
        const ofertas = await tx.ofertaRecompensa.findMany({
          where: {
            activo: true,
            dirigidoA: usuario.rol,
            costoPuntos: { lte: saldoPosterior, gt: saldoPrevio },
          },
        });
        for (const oferta of ofertas) {
          await tx.notificacion.createMany({
            data: [
              {
                usuarioId: usuario.id,
                tipo: 'HITO_RECOMPENSA',
                titulo: '¡Llegaste al hito de una recompensa!',
                mensaje: `Ya podés canjear "${oferta.titulo}" por ${oferta.costoPuntos} puntos.`,
                ofertaId: oferta.id,
              },
            ],
            skipDuplicates: true,
          });
        }

        return creada;
      });

      return {
        idempotencyKey: key,
        estado: 'ACEPTADA',
        entregaId: entrega.id,
        puntosOtorgados: puntosTotales,
      };
    } catch (error) {
      // Carrera: dos peticiones con la misma clave -> gana una, la otra DUPLICADA.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicada = await this.prisma.entrega.findUnique({
          where: { idempotencyKey: key },
        });
        return {
          idempotencyKey: key,
          estado: 'DUPLICADA',
          entregaId: duplicada?.id,
          puntosOtorgados: duplicada?.puntosTotales,
        };
      }
      throw error;
    }
  }

  // Referencia al rol para alinear con el guard (sin uso directo).
  static readonly ROL_RECOLECTOR = Role.RECOLECTOR;
}

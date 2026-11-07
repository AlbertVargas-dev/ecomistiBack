import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginacionDto, paginacion } from '../common/dto/paginacion.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class OfertasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo ofertas dirigidas al rol del usuario, activas y vigentes (spec §8). */
  async listar(user: AuthUser, q: PaginacionDto = {}) {
    const ahora = new Date();
    return this.prisma.ofertaRecompensa.findMany({
      where: {
        activo: true,
        dirigidoA: user.rol,
        OR: [{ fechaInicio: null }, { fechaInicio: { lte: ahora } }],
        AND: [{ OR: [{ fechaFin: null }, { fechaFin: { gte: ahora } }] }],
      },
      orderBy: { costoPuntos: 'asc' },
      ...paginacion(q),
    });
  }

  /**
   * Canjear (spec §8): todo en una $transaction con updates condicionales
   * para evitar doble gasto ante canjes simultáneos.
   */
  async canjear(user: AuthUser, ofertaId: string) {
    const oferta = await this.prisma.ofertaRecompensa.findUnique({
      where: { id: ofertaId },
    });
    if (!oferta || oferta.activo === false) {
      throw new NotFoundException('Oferta no encontrada');
    }

    const ahora = new Date();
    if (
      (oferta.fechaInicio && oferta.fechaInicio > ahora) ||
      (oferta.fechaFin && oferta.fechaFin < ahora)
    ) {
      throw new BadRequestException('La oferta no está vigente');
    }
    if (oferta.dirigidoA !== user.rol) {
      throw new BadRequestException(
        'Esta oferta no está dirigida a tu tipo de cuenta',
      );
    }
    if (oferta.stockDisponible !== null && oferta.stockDisponible <= 0) {
      throw new BadRequestException('Oferta sin stock disponible');
    }

    if (oferta.limitePorUsuario !== null) {
      const usados = await this.prisma.voucherCanje.count({
        where: {
          usuarioId: user.id,
          ofertaId,
          estado: { not: 'CANCELADO' },
        },
      });
      if (usados >= oferta.limitePorUsuario) {
        throw new BadRequestException('Límite de canjes alcanzado');
      }
    }

    const codigoVoucher = this.generarCodigo();
    const fechaVencimiento = new Date(
      ahora.getTime() + oferta.diasVigenciaVoucher * 24 * 60 * 60 * 1000,
    );

    try {
      const voucher = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.ecoPuntosBalance.findUnique({
          where: { userId: user.id },
        });
        const saldo = balance?.puntosActuales ?? 0;
        if (saldo < oferta.costoPuntos) {
          throw new BadRequestException('Saldo insuficiente');
        }

        // Descuento condicional de puntos: 0 filas = saldo insuficiente.
        const puntos = await tx.ecoPuntosBalance.updateMany({
          where: {
            userId: user.id,
            puntosActuales: { gte: oferta.costoPuntos },
          },
          data: { puntosActuales: { decrement: oferta.costoPuntos } },
        });
        if (puntos.count === 0) {
          throw new BadRequestException('Saldo insuficiente');
        }

        // Descuento condicional de stock (null = ilimitado).
        if (oferta.stockDisponible !== null) {
          const stock = await tx.ofertaRecompensa.updateMany({
            where: { id: ofertaId, stockDisponible: { gt: 0 } },
            data: { stockDisponible: { decrement: 1 } },
          });
          if (stock.count === 0) {
            throw new BadRequestException('Oferta sin stock disponible');
          }
        }

        const creado = await tx.voucherCanje.create({
          data: {
            usuarioId: user.id,
            ofertaId,
            codigoVoucher,
            puntosUsados: oferta.costoPuntos,
            estado: 'EMITIDO',
            fechaVencimiento,
          },
        });

        await tx.movimientoPuntos.create({
          data: {
            usuarioId: user.id,
            tipo: 'CANJE',
            monto: -oferta.costoPuntos,
            saldoPosterior: saldo - oferta.costoPuntos,
            voucherId: creado.id,
            creadoPor: user.id,
          },
        });

        return creado;
      });

      return voucher;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('No se pudo emitir el voucher');
      }
      throw error;
    }
  }

  private generarCodigo(): string {
    return `ECO-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}

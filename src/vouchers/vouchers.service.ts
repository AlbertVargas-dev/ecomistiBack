import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async misVouchers(user: AuthUser) {
    await this.vencerVencidos(user.id);
    return this.prisma.voucherCanje.findMany({
      where: { usuarioId: user.id },
      include: { oferta: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Consulta por código (RENTAS/ADMIN). Vencimiento perezoso: EMITIDO vencido → VENCIDO. */
  async consultarPorCodigo(user: AuthUser, codigo: string) {
    const voucher = await this.prisma.voucherCanje.findUnique({
      where: { codigoVoucher: codigo },
      include: { oferta: true, usuario: true },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    this.assertRentasPuedeVer(user, voucher.usuario.rol);
    await this.vencerVencidos(voucher.usuarioId);
    return this.prisma.voucherCanje.findUnique({
      where: { codigoVoucher: codigo },
      include: { oferta: true, usuario: true },
    });
  }

  /** EMITIDO → APLICADO (no vencido). RENTAS solo ciudadanos; ADMIN cualquiera. */
  async aplicar(user: AuthUser, codigo: string) {
    const voucher = await this.prisma.voucherCanje.findUnique({
      where: { codigoVoucher: codigo },
      include: { usuario: true },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    this.assertRentasPuedeVer(user, voucher.usuario.rol);

    if (voucher.estado !== 'EMITIDO') {
      throw new BadRequestException(
        `El voucher está ${voucher.estado} y no puede aplicarse`,
      );
    }
    if (voucher.fechaVencimiento < new Date()) {
      await this.prisma.voucherCanje.update({
        where: { id: voucher.id },
        data: { estado: 'VENCIDO' },
      });
      throw new BadRequestException('El voucher está vencido');
    }

    const actualizado = await this.prisma.voucherCanje.update({
      where: { id: voucher.id },
      data: {
        estado: 'APLICADO',
        fechaAplicacion: new Date(),
        aplicadoPor: user.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        usuarioId: user.id,
        accion: 'APLICAR_VOUCHER',
        entidad: 'VoucherCanje',
        entidadId: voucher.id,
        detalle: { codigoVoucher: codigo },
      },
    });

    return actualizado;
  }

  private assertRentasPuedeVer(user: AuthUser, rolUsuario: Role) {
    // Spec §3/§8: RENTAS solo vouchers de ciudadanos; ADMIN ve/aplica todos.
    if (user.rol === Role.RENTAS && rolUsuario !== Role.CIUDADANO) {
      throw new BadRequestException(
        'Rentas solo puede gestionar vouchers de ciudadanos',
      );
    }
  }

  /** VENCIDO no devuelve puntos (decisión spec §8, comunicada en la app). */
  private async vencerVencidos(usuarioId: string) {
    await this.prisma.voucherCanje.updateMany({
      where: {
        usuarioId,
        estado: 'EMITIDO',
        fechaVencimiento: { lt: new Date() },
      },
      data: { estado: 'VENCIDO' },
    });
  }
}

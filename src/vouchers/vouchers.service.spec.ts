import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RENTAS = { id: 'rentas-1', email: 'r@test.com', rol: Role.RENTAS };

describe('VouchersService', () => {
  let service: VouchersService;
  let prisma: {
    voucherCanje: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    auditLog: { create: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      voucherCanje: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
  });

  it('caso 9: un voucher vencido no puede aplicarse', async () => {
    prisma.voucherCanje.findUnique.mockResolvedValue({
      id: 'v-1',
      estado: 'EMITIDO',
      fechaVencimiento: new Date(Date.now() - 1000),
      usuario: { rol: Role.CIUDADANO },
    });

    await expect(service.aplicar(RENTAS, 'ECO-1234')).rejects.toThrow(
      BadRequestException,
    );
    // Se marca VENCIDO en el intento.
    expect(prisma.voucherCanje.update).toHaveBeenCalledWith({
      where: { id: 'v-1' },
      data: { estado: 'VENCIDO' },
    });
  });

  it('aplica un voucher EMITIDO vigente y audita', async () => {
    prisma.voucherCanje.findUnique.mockResolvedValue({
      id: 'v-1',
      estado: 'EMITIDO',
      fechaVencimiento: new Date(Date.now() + 86400000),
      usuario: { rol: Role.CIUDADANO },
    });
    prisma.voucherCanje.update.mockResolvedValue({
      id: 'v-1',
      estado: 'APLICADO',
    });

    const res = await service.aplicar(RENTAS, 'ECO-1234');

    expect(res.estado).toBe('APLICADO');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'APLICAR_VOUCHER' }),
      }),
    );
  });

  it('RENTAS no puede aplicar vouchers de urbanizaciones', async () => {
    prisma.voucherCanje.findUnique.mockResolvedValue({
      id: 'v-2',
      estado: 'EMITIDO',
      fechaVencimiento: new Date(Date.now() + 86400000),
      usuario: { rol: Role.URBANIZACION },
    });

    await expect(service.aplicar(RENTAS, 'ECO-5678')).rejects.toThrow(
      BadRequestException,
    );
  });
});

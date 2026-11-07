import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { OfertasService } from './ofertas.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const USER = { id: 'user-1', email: 'c@test.com', rol: Role.CIUDADANO };

describe('OfertasService.canjear', () => {
  let service: OfertasService;
  let prisma: {
    ofertaRecompensa: { findUnique: ReturnType<typeof vi.fn> };
    voucherCanje: { count: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const tx = {
    ecoPuntosBalance: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    ofertaRecompensa: { updateMany: vi.fn() },
    voucherCanje: { create: vi.fn() },
    movimientoPuntos: { create: vi.fn() },
  };

  const oferta = {
    id: 'oferta-1',
    activo: true,
    dirigidoA: Role.CIUDADANO,
    stockDisponible: 5,
    fechaInicio: null,
    fechaFin: null,
    limitePorUsuario: null,
    diasVigenciaVoucher: 90,
    costoPuntos: 100,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = {
      ofertaRecompensa: { findUnique: vi.fn() },
      voucherCanje: { count: vi.fn() },
      $transaction: vi
        .fn()
        .mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OfertasService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<OfertasService>(OfertasService);
  });

  it('canjea con saldo exacto y emite voucher EMITIDO', async () => {
    prisma.ofertaRecompensa.findUnique.mockResolvedValue(oferta);
    tx.ecoPuntosBalance.findUnique.mockResolvedValue({
      puntosActuales: 100,
    });
    tx.ecoPuntosBalance.updateMany.mockResolvedValue({ count: 1 });
    tx.ofertaRecompensa.updateMany.mockResolvedValue({ count: 1 });
    tx.voucherCanje.create.mockResolvedValue({
      id: 'voucher-1',
      estado: 'EMITIDO',
    });

    const voucher = await service.canjear(USER, 'oferta-1');

    expect(voucher.estado).toBe('EMITIDO');
    expect(tx.movimientoPuntos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'CANJE', monto: -100 }),
      }),
    );
  });

  it('rechaza canje con un punto menos de saldo', async () => {
    prisma.ofertaRecompensa.findUnique.mockResolvedValue(oferta);
    tx.ecoPuntosBalance.findUnique.mockResolvedValue({
      puntosActuales: 99,
    });

    await expect(service.canjear(USER, 'oferta-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.voucherCanje.create).not.toHaveBeenCalled();
  });

  it('caso 4: dos canjes simultáneos con saldo para uno => solo uno se aprueba', async () => {
    prisma.ofertaRecompensa.findUnique.mockResolvedValue(oferta);
    tx.ecoPuntosBalance.findUnique.mockResolvedValue({
      puntosActuales: 100,
    });
    // El segundo canje pierde la carrera: el update condicional afecta 0 filas.
    tx.ecoPuntosBalance.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    tx.ofertaRecompensa.updateMany.mockResolvedValue({ count: 1 });
    tx.voucherCanje.create.mockResolvedValue({ id: 'v-1', estado: 'EMITIDO' });

    const primero = await service.canjear(USER, 'oferta-1');
    expect(primero.estado).toBe('EMITIDO');

    await expect(service.canjear(USER, 'oferta-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza oferta dirigida a otro rol', async () => {
    prisma.ofertaRecompensa.findUnique.mockResolvedValue({
      ...oferta,
      dirigidoA: Role.URBANIZACION,
    });

    await expect(service.canjear(USER, 'oferta-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

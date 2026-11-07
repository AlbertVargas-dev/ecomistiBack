import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const ADMIN = { id: 'admin-1', email: 'a@test.com', rol: Role.ADMIN };

describe('AdminService.anularEntrega', () => {
  let service: AdminService;
  let prisma: {
    entrega: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const tx = {
    entrega: { update: vi.fn().mockResolvedValue({ id: 'ent-1' }) },
    ecoPuntosBalance: {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
    movimientoPuntos: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = {
      entrega: { findUnique: vi.fn() },
      $transaction: vi
        .fn()
        .mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('caso 8: anular entrega con puntos ya gastados deja saldo negativo', async () => {
    prisma.entrega.findUnique.mockResolvedValue({
      id: 'ent-1',
      usuarioId: 'user-1',
      puntosTotales: 100,
      estado: 'VALIDA',
    });
    // El usuario ya gastó los puntos: solo le quedan 20.
    tx.ecoPuntosBalance.findUnique.mockResolvedValue({
      puntosActuales: 20,
    });

    await service.anularEntrega(ADMIN, 'ent-1', {
      motivo: 'Pesaje duplicado',
    });

    expect(tx.movimientoPuntos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'REVERSA_ENTREGA',
          monto: -100,
          saldoPosterior: -80, // saldo negativo: canjes bloqueados hasta compensar
        }),
      }),
    );
  });
});

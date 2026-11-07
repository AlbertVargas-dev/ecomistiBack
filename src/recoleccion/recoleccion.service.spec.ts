import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { RecoleccionService } from './recoleccion.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RECOLECTOR = { id: 'reco-1', email: 'r@test.com', rol: Role.RECOLECTOR };
const QR = '550e8400-e29b-41d4-a716-446655440000';

describe('RecoleccionService', () => {
  let service: RecoleccionService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    entrega: {
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    configFactorResiduo: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const tx = {
    entrega: { create: vi.fn().mockResolvedValue({ id: 'ent-1' }) },
    ecoPuntosBalance: {
      findUnique: vi.fn().mockResolvedValue({ puntosActuales: 10 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    movimientoPuntos: { create: vi.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = {
      user: { findUnique: vi.fn() },
      entrega: { findUnique: vi.fn(), count: vi.fn() },
      configFactorResiduo: { findFirst: vi.fn() },
      $transaction: vi
        .fn()
        .mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoleccionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecoleccionService>(RecoleccionService);
  });

  const item = {
    idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    qrCode: QR,
    fechaCaptura: new Date().toISOString(),
    detalles: [{ tipoResiduo: 'RECICLABLE' as const, pesoKg: 2 }],
  };

  function setupHappy() {
    prisma.entrega.findUnique.mockResolvedValue(null);
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', qrCode: QR, activo: true })
      .mockResolvedValueOnce({ desactivadoAt: null });
    prisma.entrega.count.mockResolvedValue(0);
    prisma.configFactorResiduo.findFirst.mockResolvedValue(null);
  }

  it('acepta una entrega y acredita puntos con ledger', async () => {
    setupHappy();
    const { resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      deviceId: 'd1',
      entregas: [item],
    });
    expect(resultados[0].estado).toBe('ACEPTADA');
    expect(resultados[0].puntosOtorgados).toBe(20); // 2 kg x 10
    expect(tx.movimientoPuntos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: 'ACREDITO',
          monto: 20,
          saldoPosterior: 30,
        }),
      }),
    );
  });

  it('responde DUPLICADA si la idempotencyKey ya existe', async () => {
    prisma.entrega.findUnique.mockResolvedValue({
      id: 'ent-1',
      puntosTotales: 20,
    });
    const { resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [item],
    });
    expect(resultados[0].estado).toBe('DUPLICADA');
    expect(tx.entrega.create).not.toHaveBeenCalled();
  });

  it('rechaza QR inválido, fecha futura y peso inválido', async () => {
    prisma.entrega.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    let { resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [item],
    });
    expect(resultados[0]).toMatchObject({
      estado: 'RECHAZADA',
      motivo: 'QR_INVALIDO',
    });

    setupHappy();
    ({ resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [
        {
          ...item,
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174001',
          fechaCaptura: new Date(Date.now() + 60 * 60000).toISOString(),
        },
      ],
    }));
    expect(resultados[0].motivo).toBe('FECHA_INVALIDA');

    setupHappy();
    ({ resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [
        {
          ...item,
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174002',
          detalles: [{ tipoResiduo: 'RECICLABLE' as const, pesoKg: 0.05 }],
        },
      ],
    }));
    expect(resultados[0].motivo).toBe('PESO_INVALIDO');
  });

  // --- Casos de sustentación §15 (1, 2, 6, 7) ---

  it('caso 1: enviar dos veces el mismo lote acredita una sola vez', async () => {
    setupHappy();
    const lote = { deviceId: 'd1', entregas: [item] };
    const primera = await service.sincronizarEntrega(RECOLECTOR, lote);
    // Segunda llamada: la clave ya existe en BD.
    prisma.entrega.findUnique.mockResolvedValue({
      id: 'ent-1',
      puntosTotales: 20,
    });
    const segunda = await service.sincronizarEntrega(RECOLECTOR, lote);
    expect(primera.resultados[0].estado).toBe('ACEPTADA');
    expect(segunda.resultados[0].estado).toBe('DUPLICADA');
    expect(tx.entrega.create).toHaveBeenCalledTimes(1);
  });

  it('caso 2: lote de 3 con 1 QR inválido => 2 ACEPTADAS y 1 RECHAZADA', async () => {
    prisma.entrega.findUnique.mockResolvedValue(null);
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', qrCode: QR, activo: true })
      .mockResolvedValueOnce({ desactivadoAt: null })
      .mockResolvedValueOnce(null) // QR inválido
      .mockResolvedValueOnce({ id: 'user-2', qrCode: QR, activo: true })
      .mockResolvedValueOnce({ desactivadoAt: null });
    prisma.entrega.count.mockResolvedValue(0);
    prisma.configFactorResiduo.findFirst.mockResolvedValue(null);

    const { resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [
        item,
        {
          ...item,
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174010',
          qrCode: '00000000-0000-4000-8000-000000000000',
        },
        {
          ...item,
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174011',
        },
      ],
    });

    expect(resultados.map((r) => r.estado)).toEqual([
      'ACEPTADA',
      'RECHAZADA',
      'ACEPTADA',
    ]);
    expect(resultados[1].motivo).toBe('QR_INVALIDO');
  });

  it('caso 6: recolector desactivado acepta capturas previas y rechaza posteriores', async () => {
    const ahora = Date.now();
    const desactivadoAt = new Date(ahora - 2 * 24 * 60 * 60 * 1000);
    const previaIso = new Date(ahora - 3 * 24 * 60 * 60 * 1000).toISOString();
    prisma.entrega.findUnique.mockResolvedValue(null);
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', qrCode: QR, activo: true })
      .mockResolvedValueOnce({ desactivadoAt })
      .mockResolvedValueOnce({ id: 'user-1', qrCode: QR, activo: true })
      .mockResolvedValueOnce({ desactivadoAt });
    prisma.entrega.count.mockResolvedValue(0);
    prisma.configFactorResiduo.findFirst.mockResolvedValue(null);

    const previa = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [{ ...item, fechaCaptura: previaIso }],
    });
    expect(previa.resultados[0].estado).toBe('ACEPTADA');

    const posterior = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [
        {
          ...item,
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174012',
          fechaCaptura: new Date().toISOString(),
        },
      ],
    });
    expect(posterior.resultados[0]).toMatchObject({
      estado: 'RECHAZADA',
      motivo: 'RECOLECTOR_REVOCADO',
    });
  });

  it('caso 7: la entrega usa el factor vigente en su fechaCaptura', async () => {
    setupHappy();
    // Factor histórico = 8 (antes del cambio a 10).
    prisma.configFactorResiduo.findFirst.mockResolvedValue({ factor: 8 });
    const { resultados } = await service.sincronizarEntrega(RECOLECTOR, {
      entregas: [item],
    });
    expect(resultados[0].puntosOtorgados).toBe(16); // 2 kg x 8
    expect(tx.entrega.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detalles: {
            create: [
              expect.objectContaining({ factor: 8, puntosSubtotal: 16 }),
            ],
          },
        }),
      }),
    );
  });

  it('identificarQr devuelve solo nombre parcial y tipo de cuenta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      nombres: 'Juan Carlos',
      apellidos: 'Pérez',
      rol: Role.CIUDADANO,
    });
    const res = await service.identificarQr({ qrCode: QR });
    expect(res).toEqual({ nombreParcial: 'Juan P.', tipoCuenta: 'CIUDADANO' });
  });
});

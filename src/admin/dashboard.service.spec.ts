import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from './admin.service.js';
import { CacheService } from '../common/cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminService.dashboardResumen (Panel General)', () => {
  let service: AdminService;
  let prisma: {
    detalleEntrega: { aggregate: ReturnType<typeof vi.fn> };
    movimientoPuntos: { aggregate: ReturnType<typeof vi.fn> };
    entrega: { count: ReturnType<typeof vi.fn> };
    user: { count: ReturnType<typeof vi.fn> };
    voucherCanje: { groupBy: ReturnType<typeof vi.fn> };
    ofertaRecompensa: { count: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      detalleEntrega: { aggregate: vi.fn() },
      movimientoPuntos: { aggregate: vi.fn() },
      entrega: { count: vi.fn() },
      user: { count: vi.fn() },
      voucherCanje: { groupBy: vi.fn() },
      ofertaRecompensa: { count: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        CacheService,
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('calcula tarjetas del período y delta vs período anterior', async () => {
    // metricas() llama en orden: kgTotales, kgReciclable, puntos, entregas, clientesNuevos
    // 1ª llamada = período actual, 2ª = anterior.
    prisma.detalleEntrega.aggregate
      .mockResolvedValueOnce({ _sum: { pesoKg: 1245 } }) // kg actual
      .mockResolvedValueOnce({ _sum: { pesoKg: 320 } }) // reciclable actual
      .mockResolvedValueOnce({ _sum: { pesoKg: 1100 } }) // kg anterior
      .mockResolvedValueOnce({ _sum: { pesoKg: 300 } }); // reciclable anterior
    prisma.movimientoPuntos.aggregate
      .mockResolvedValueOnce({ _sum: { monto: 2850 } })
      .mockResolvedValueOnce({ _sum: { monto: 2500 } });
    prisma.entrega.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
    prisma.user.count
      .mockResolvedValueOnce(5) // clientes nuevos actual
      .mockResolvedValueOnce(2) // clientes nuevos anterior
      .mockResolvedValueOnce(120); // total clientes
    prisma.voucherCanje.groupBy.mockResolvedValue([
      { estado: 'EMITIDO', _count: { _all: 7 } },
    ]);
    prisma.ofertaRecompensa.count.mockResolvedValue(4);

    const res = await service.dashboardResumen({
      desde: '2026-11-01T00:00:00.000Z',
      hasta: '2026-11-07T23:59:59.000Z',
    });

    expect(res.totalKg).toBe(1245);
    expect(res.materialReciclableKg).toBe(320);
    expect(res.totalPuntosEmitidos).toBe(2850);
    expect(res.totalEntregas).toBe(10);
    expect(res.totalClientes).toBe(120);
    // delta: (1245-1100)/1100 = 13.2% ; (320-300)/300 = 6.7% ; (2850-2500)/2500 = 14%
    expect(res.deltaPct.residuosKg).toBe(13.2);
    expect(res.deltaPct.reciclableKg).toBe(6.7);
    expect(res.deltaPct.ecoPuntos).toBe(14);
    expect(res.periodo.desde).toEqual(new Date('2026-11-01T00:00:00.000Z'));
  });

  it('delta es null cuando el período anterior no tiene datos', async () => {
    prisma.detalleEntrega.aggregate.mockResolvedValue({
      _sum: { pesoKg: 0 },
    });
    prisma.movimientoPuntos.aggregate.mockResolvedValue({
      _sum: { monto: 0 },
    });
    prisma.entrega.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(0);
    prisma.voucherCanje.groupBy.mockResolvedValue([]);
    prisma.ofertaRecompensa.count.mockResolvedValue(0);

    const res = await service.dashboardResumen({});
    expect(res.deltaPct.residuosKg).toBeNull();
  });
});

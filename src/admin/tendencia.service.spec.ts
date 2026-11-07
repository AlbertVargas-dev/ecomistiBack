import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from './admin.service.js';
import { CacheService } from '../common/cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminService.tendencia', () => {
  let service: AdminService;
  let prisma: {
    detalleEntrega: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = { detalleEntrega: { findMany: vi.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        CacheService,
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it('agrupa por día y completa huecos con ceros', async () => {
    prisma.detalleEntrega.findMany.mockResolvedValue([
      {
        tipoResiduo: 'RECICLABLE',
        pesoKg: 10,
        entrega: { fechaCaptura: new Date('2026-11-01T10:00:00Z') },
      },
      {
        tipoResiduo: 'ORGANICO',
        pesoKg: 5,
        entrega: { fechaCaptura: new Date('2026-11-01T12:00:00Z') },
      },
      {
        tipoResiduo: 'RECICLABLE',
        pesoKg: 7,
        entrega: { fechaCaptura: new Date('2026-11-03T09:00:00Z') },
      },
    ]);

    const res = await service.tendencia({
      desde: '2026-11-01T00:00:00.000Z',
      hasta: '2026-11-03T23:59:59.000Z',
      granularidad: 'dia' as never,
    });

    expect(res.serie).toEqual([
      { fecha: '2026-11-01', kgReciclables: 10, kgOrganicos: 5, totalKg: 15 },
      { fecha: '2026-11-02', kgReciclables: 0, kgOrganicos: 0, totalKg: 0 },
      { fecha: '2026-11-03', kgReciclables: 7, kgOrganicos: 0, totalKg: 7 },
    ]);
  });
});

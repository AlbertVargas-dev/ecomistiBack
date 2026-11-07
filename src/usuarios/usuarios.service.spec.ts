import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { UsuariosService } from './usuarios.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OfertasService } from '../ofertas/ofertas.service.js';

const USER = { id: 'user-1', email: 'c@test.com', rol: Role.CIUDADANO };

describe('UsuariosService.getPanel', () => {
  let service: UsuariosService;
  let prisma: {
    ecoPuntosBalance: { findUnique: ReturnType<typeof vi.fn> };
    detalleEntrega: { groupBy: ReturnType<typeof vi.fn> };
    entrega: { count: ReturnType<typeof vi.fn> };
  };
  let ofertasService: { listar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      ecoPuntosBalance: { findUnique: vi.fn() },
      detalleEntrega: { groupBy: vi.fn() },
      entrega: { count: vi.fn() },
    };
    ofertasService = { listar: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
        { provide: OfertasService, useValue: ofertasService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('devuelve puntos, kg por tipo y recompensas disponibles', async () => {
    prisma.ecoPuntosBalance.findUnique.mockResolvedValue({
      puntosActuales: 150,
      puntosHistoricos: 200,
    });
    prisma.detalleEntrega.groupBy.mockResolvedValue([
      {
        tipoResiduo: 'RECICLABLE',
        _sum: { pesoKg: 10.5, puntosSubtotal: 105 },
      },
      {
        tipoResiduo: 'ORGANICO',
        _sum: { pesoKg: 2, puntosSubtotal: 10 },
      },
    ]);
    prisma.entrega.count.mockResolvedValue(3);
    ofertasService.listar.mockResolvedValue([
      { id: 'oferta-1', titulo: 'Vale de mercado', costoPuntos: 100 },
    ]);

    const panel = await service.getPanel(USER);

    expect(panel.puntosActuales).toBe(150);
    expect(panel.puntosHistoricos).toBe(200);
    expect(panel.totalKg).toBe(12.5);
    expect(panel.kgPorTipo).toHaveLength(2);
    expect(panel.totalEntregas).toBe(3);
    expect(panel.recompensasDisponibles).toHaveLength(1);
    expect(ofertasService.listar).toHaveBeenCalledWith(USER);
  });
});

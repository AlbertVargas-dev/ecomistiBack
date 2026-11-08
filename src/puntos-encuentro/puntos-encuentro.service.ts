import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePuntoDto } from './dto/create-punto.dto.js';

@Injectable()
export class PuntosEncuentroService {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo activos (mapa del front). */
  async listarActivos() {
    return this.prisma.puntoEncuentro.findMany({
      where: { activo: true },
      orderBy: [{ distrito: 'asc' }, { nombre: 'asc' }],
    });
  }

  async crear(dto: CreatePuntoDto) {
    return this.prisma.puntoEncuentro.create({
      data: {
        nombre: dto.nombre,
        distrito: dto.distrito,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        horario: dto.horario,
        activo: dto.activo ?? true,
      },
    });
  }

  async actualizar(id: string, dto: CreatePuntoDto) {
    const punto = await this.prisma.puntoEncuentro.findUnique({
      where: { id },
    });
    if (!punto) throw new NotFoundException('Punto no encontrado');
    return this.prisma.puntoEncuentro.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        distrito: dto.distrito,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        horario: dto.horario,
        activo: dto.activo ?? true,
      },
    });
  }
}

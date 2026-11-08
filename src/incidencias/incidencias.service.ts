import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(user: AuthUser & { activo?: boolean }, dto: CreateIncidenciaDto) {
    if (user.activo === false) {
      throw new UnauthorizedException('Cuenta desactivada');
    }
    return this.prisma.incidencia.create({
      data: {
        usuarioId: user.id,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        fotoUrl: dto.fotoUrl,
        latitud: dto.latitud,
        longitud: dto.longitud,
      },
    });
  }

  async misIncidencias(user: AuthUser) {
    return this.prisma.incidencia.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

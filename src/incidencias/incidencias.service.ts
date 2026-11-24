import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
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

  /**
   * Consulta una incidencia verificando que pertenezca al usuario autenticado (OWASP A01:2025 - Anti-IDOR).
   */
  async obtenerPorId(user: AuthUser, id: string) {
    const incidencia = await this.prisma.incidencia.findUnique({
      where: { id },
    });
    if (!incidencia) {
      throw new NotFoundException('Incidencia no encontrada');
    }
    if (incidencia.usuarioId !== user.id && user.rol !== Role.ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }
    return incidencia;
  }

  /**
   * Edita una incidencia verificando que pertenezca al usuario autenticado (OWASP A01:2025 - Anti-IDOR).
   */
  async actualizarPropia(user: AuthUser, id: string, dto: CreateIncidenciaDto) {
    const incidencia = await this.obtenerPorId(user, id);
    if (incidencia.estado !== 'ABIERTA') {
      throw new BadRequestException(
        'Solo se pueden editar incidencias en estado ABIERTA',
      );
    }
    return this.prisma.incidencia.update({
      where: { id },
      data: {
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        fotoUrl: dto.fotoUrl,
        latitud: dto.latitud,
        longitud: dto.longitud,
      },
    });
  }

  /**
   * Elimina una incidencia verificando que pertenezca al usuario autenticado (OWASP A01:2025 - Anti-IDOR).
   */
  async eliminarPropia(user: AuthUser, id: string) {
    const incidencia = await this.obtenerPorId(user, id);
    if (incidencia.estado !== 'ABIERTA') {
      throw new BadRequestException(
        'Solo se pueden eliminar incidencias en estado ABIERTA',
      );
    }
    await this.prisma.incidencia.delete({ where: { id } });
    return { message: 'Incidencia eliminada correctamente' };
  }
}

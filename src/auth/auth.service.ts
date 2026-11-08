import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ACCESS_TOKEN_TTL,
  BLOQUEO_MINUTOS,
  MAX_INTENTOS_FALLIDOS,
  REFRESH_TOKEN_TTL,
  SALT_ROUNDS,
} from '../config/security.config.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // --- Registro público (spec §4/§11): el rol lo fija el endpoint, nunca el body.

  /** Alias legacy de registerCiudadano (compatibilidad con clientes actuales). */
  register(dto: RegisterDto) {
    return this.registerWithRole(dto, Role.CIUDADANO);
  }

  registerCiudadano(dto: RegisterDto) {
    return this.registerWithRole(dto, Role.CIUDADANO);
  }

  registerUrbanizacion(dto: RegisterDto) {
    return this.registerWithRole(dto, Role.URBANIZACION);
  }

  private async registerWithRole(dto: RegisterDto, rol: Role) {
    const email = dto.email.toLowerCase();

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const existingDni = await this.prisma.user.findUnique({
      where: { dni: dto.dni },
    });
    if (existingDni) {
      throw new ConflictException('El DNI ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // URBANIZACION: el representante legal debe indicar a qué urbanización
    // pertenece (existente por id, o nueva por nombre).
    let urbanizacionId: string | undefined;
    if (rol === Role.URBANIZACION) {
      if (dto.urbanizacionId) {
        const existe = await this.prisma.urbanizacion.findUnique({
          where: { id: dto.urbanizacionId },
        });
        if (!existe) {
          throw new BadRequestException('La urbanización no existe');
        }
        urbanizacionId = existe.id;
      } else if (dto.nombreUrbanizacion) {
        const nueva = await this.prisma.urbanizacion.create({
          data: {
            nombre: dto.nombreUrbanizacion,
            direccion: dto.direccionUrbanizacion,
          },
        });
        urbanizacionId = nueva.id;
      } else {
        throw new BadRequestException(
          'Debe indicar la urbanización (existente o nueva)',
        );
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        dni: dto.dni,
        telefono: dto.telefono,
        rol,
        urbanizacionId,
        aceptoTerminosAt: dto.aceptoTerminos ? new Date() : null,
        puntosBalance: {
          create: { puntosActuales: 0, puntosHistoricos: 0 },
        },
      },
      include: { puntosBalance: true },
    });

    const tokens = await this.issueTokens(user);

    return {
      message: 'Usuario registrado exitosamente',
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  // --- Login unificado (spec §4)

  async login(dto: LoginDto) {
    if (dto.dni || dto.pin) {
      return this.loginRecolector(dto);
    }
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Debe enviar email+password o dni+pin');
    }
    return this.loginWithPassword(dto.email.toLowerCase(), dto.password);
  }

  private async loginWithPassword(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { puntosBalance: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    this.assertCanLogin(user);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.resetFailedAttempts(user);
    const tokens = await this.issueTokens(user);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  private async loginRecolector(dto: LoginDto) {
    if (!dto.dni || !dto.pin) {
      throw new BadRequestException('El recolector debe enviar dni y pin');
    }

    const perfil = await this.prisma.perfilRecolector.findUnique({
      where: { dni: dto.dni },
      include: {
        usuario: { include: { puntosBalance: true } },
      },
    });

    if (!perfil) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const user = perfil.usuario;
    this.assertCanLogin(user);

    const isPinValid = await bcrypt.compare(dto.pin, perfil.pinHash);
    if (!isPinValid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.resetFailedAttempts(user);
    const tokens = await this.issueTokens(user);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // --- Refresh (spec §4): access 15 min + refresh 7 dias, revocable por desactivacion.

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { puntosBalance: true },
    });
    // Revocacion: usuario desactivado => refresh tokens dejan de ser validos (§4).
    if (!user || user.activo === false) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { puntosBalance: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    // Revocacion (spec §4): desactivado no accede a datos (solo sync de
    // capturas previas, que valida RecoleccionService por item).
    if (user.activo === false) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    return this.sanitizeUser(user);
  }

  // --- Helpers

  private async issueTokens(user: { id: string; email: string; rol: Role }) {
    const base = { sub: user.id, email: user.email, rol: user.rol };
    const accessToken = await this.jwtService.signAsync(
      { ...base, type: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...base, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_TTL },
    );
    return { accessToken, refreshToken };
  }

  private assertCanLogin(user: {
    activo?: boolean;
    bloqueadoHasta?: Date | null;
  }) {
    if (user.activo === false) {
      throw new UnauthorizedException('Cuenta desactivada');
    }
    if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por intentos fallidos',
      );
    }
  }

  private async registerFailedAttempt(user: {
    id: string;
    intentosFallidos?: number;
  }) {
    const intentos = (user.intentosFallidos ?? 0) + 1;
    const data: {
      intentosFallidos: number;
      bloqueadoHasta?: Date;
    } = { intentosFallidos: intentos };
    if (intentos >= MAX_INTENTOS_FALLIDOS) {
      data.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000);
    }
    await this.prisma.user.update({ where: { id: user.id }, data });
  }

  private async resetFailedAttempts(user: {
    id: string;
    intentosFallidos?: number;
    bloqueadoHasta?: Date | null;
  }) {
    // Solo escribe si habia fallos/bloqueo (evita updates innecesarios).
    if ((user.intentosFallidos ?? 0) > 0 || user.bloqueadoHasta) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { intentosFallidos: 0, bloqueadoHasta: null },
      });
    }
  }

  private sanitizeUser(user: User & { puntosBalance?: unknown }) {
    // Nunca exponer passwordHash (spec §11). pinHash vive en PerfilRecolector
    // y tampoco se incluye en las respuestas de este servicio.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

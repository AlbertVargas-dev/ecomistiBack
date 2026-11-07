import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: Role;
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    // Spec §4: sin fallback inseguro — el secreto es obligatorio por entorno.
    if (!secret) {
      throw new Error('JWT_SECRET no está definido en el entorno');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Un refresh token nunca sirve como access token.
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Token de acceso inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        rol: true,
        nombres: true,
        apellidos: true,
        activo: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no válido');
    }
    // Revocacion (spec §4/§7): un recolector desactivado conserva acceso SOLO
    // para sincronizar capturas anteriores a desactivadoAt; el servicio de
    // recoleccion valida eso por item. Cualquier otro uso debe rechazarlo
    // (ver assertActivo en AuthService/UsuariosService).
    if (user.activo === false && user.rol !== Role.RECOLECTOR) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    return user;
  }
}

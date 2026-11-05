import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { SALT_ROUNDS } from '../config/security.config.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        dni: dto.dni,
        telefono: dto.telefono,
        rol: dto.rol ?? Role.CIUDADANO,
        puntosBalance: {
          create: {
            puntosActuales: 0,
            puntosHistoricos: 0,
          },
        },
      },
      include: {
        puntosBalance: true,
      },
    });

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Usuario registrado exitosamente',
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        puntosBalance: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        puntosBalance: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User & { puntosBalance?: unknown }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

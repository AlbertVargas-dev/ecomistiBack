import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    perfilRecolector: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      perfilRecolector: {
        findUnique: vi.fn(),
      },
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('test-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'juan@test.com',
      password: 'password123',
      nombres: 'Juan',
      apellidos: 'Perez',
      dni: '12345678',
      telefono: '987654321',
      aceptoTerminos: true,
      rol: Role.CIUDADANO,
    };

    it('debe registrar un usuario exitosamente y retornar token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: registerDto.email,
        passwordHash: 'hashed-password',
        nombres: registerDto.nombres,
        apellidos: registerDto.apellidos,
        dni: registerDto.dni,
        telefono: registerDto.telefono,
        rol: registerDto.rol,
        createdAt: new Date(),
        updatedAt: new Date(),
        puntosBalance: {
          id: 'balance-uuid-1',
          userId: 'user-uuid-1',
          puntosActuales: 0,
          puntosHistoricos: 0,
          updatedAt: new Date(),
        },
      });

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-uuid-1',
          email: registerDto.email,
          rol: registerDto.rol,
          type: 'access',
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing-id' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar ConflictException si el DNI ya existe', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-dni-id' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'juan@test.com',
      password: 'password123',
    };

    it('debe iniciar sesión exitosamente con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: loginDto.email,
        passwordHash,
        nombres: 'Juan',
        apellidos: 'Perez',
        dni: '12345678',
        rol: Role.CIUDADANO,
        puntosBalance: {
          puntosActuales: 100,
          puntosHistoricos: 100,
        },
      });

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      const passwordHash = await bcrypt.hash('otraPassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: loginDto.email,
        passwordHash,
        intentosFallidos: 0,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      // Registra el intento fallido (bloqueo tras 5).
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({ intentosFallidos: 1 }),
      });
    });

    it('debe bloquear la cuenta tras 5 intentos fallidos', async () => {
      const passwordHash = await bcrypt.hash('otraPassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: loginDto.email,
        passwordHash,
        intentosFallidos: 4,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: expect.objectContaining({
          intentosFallidos: 5,
          bloqueadoHasta: expect.any(Date),
        }),
      });
    });
  });

  describe('login recolector (DNI + PIN)', () => {
    it('debe iniciar sesión con PIN válido', async () => {
      const pinHash = await bcrypt.hash('123456', 10);
      prisma.perfilRecolector.findUnique.mockResolvedValue({
        id: 'perfil-1',
        dni: '12345678',
        pinHash,
        usuario: {
          id: 'user-uuid-2',
          email: 'recolector@test.com',
          passwordHash: 'x',
          nombres: 'Reco',
          apellidos: 'Lector',
          dni: '12345678',
          rol: Role.RECOLECTOR,
          activo: true,
          intentosFallidos: 0,
          puntosBalance: { puntosActuales: 0, puntosHistoricos: 0 },
        },
      });

      const result = await service.login({ dni: '12345678', pin: '123456' });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.rol).toBe(Role.RECOLECTOR);
    });

    it('debe rechazar PIN incorrecto', async () => {
      const pinHash = await bcrypt.hash('000000', 10);
      prisma.perfilRecolector.findUnique.mockResolvedValue({
        id: 'perfil-1',
        dni: '12345678',
        pinHash,
        usuario: {
          id: 'user-uuid-2',
          email: 'recolector@test.com',
          passwordHash: 'x',
          rol: Role.RECOLECTOR,
          activo: true,
          intentosFallidos: 0,
        },
      });

      await expect(
        service.login({ dni: '12345678', pin: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

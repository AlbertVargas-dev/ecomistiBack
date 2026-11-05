import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      register: vi.fn(),
      login: vi.fn(),
      getProfile: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('register debe delegar en authService.register', async () => {
    const dto = {
      email: 'test@test.com',
      password: 'password123',
      nombres: 'Test',
      apellidos: 'User',
      dni: '12345678',
    };
    authService.register.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.register(dto);
    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'token' });
  });

  it('login debe delegar en authService.login', async () => {
    const dto = {
      email: 'test@test.com',
      password: 'password123',
    };
    authService.login.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'token' });
  });

  it('getProfile y getMe deben retornar el perfil del usuario autenticado', async () => {
    const user = { id: 'u1', email: 'test@test.com', rol: Role.CIUDADANO };
    authService.getProfile.mockResolvedValue({ id: 'u1', email: 'test@test.com' });

    const profile = await controller.getProfile(user);
    const me = await controller.getMe(user);

    expect(authService.getProfile).toHaveBeenCalledWith('u1');
    expect(profile).toEqual({ id: 'u1', email: 'test@test.com' });
    expect(me).toEqual({ id: 'u1', email: 'test@test.com' });
  });
});

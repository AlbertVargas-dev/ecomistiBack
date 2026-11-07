import { ForbiddenException } from '@nestjs/common';
import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

describe('RolesGuard (caso 10: un ciudadano no accede a datos de otro rol)', () => {
  function contextWith(userRol: Role, required: Role[]) {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(required),
    };
    const guard = new RolesGuard(reflector as never);
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u-1', rol: userRol } }),
      }),
    };
    return { guard, ctx, reflector };
  }

  it('permite si el rol coincide', () => {
    const { guard, ctx } = contextWith(Role.CIUDADANO, [Role.CIUDADANO]);
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('lanza 403 si el rol no coincide', () => {
    const { guard, ctx } = contextWith(Role.CIUDADANO, [Role.URBANIZACION]);
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });

  it('sin roles requeridos permite el acceso', () => {
    const { guard, ctx } = contextWith(Role.CIUDADANO, []);
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('usa la clave ROLES_KEY del decorator', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});

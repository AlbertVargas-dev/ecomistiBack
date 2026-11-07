import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../app.module.js';

/**
 * E2E de autenticación (requiere BD dev levantada + migraciones aplicadas).
 * Flujo: registro → login → perfil protegido → conflicto de duplicado.
 */
describe('Auth E2E', () => {
  let app: INestApplication;
  const suffix = Date.now().toString().slice(-6);
  const email = `e2e-${suffix}@test.com`;
  const dni = `9${suffix.padStart(7, '0')}`.slice(0, 8);

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un ciudadano y devuelve access + refresh', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register-ciudadano')
      .send({
        email,
        password: 'Secreto123',
        nombres: 'E2E',
        apellidos: 'Test',
        dni,
        aceptoTerminos: true,
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.rol).toBe('CIUDADANO');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rechaza registro duplicado con 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register-ciudadano')
      .send({
        email,
        password: 'Secreto123',
        nombres: 'E2E',
        apellidos: 'Test',
        dni,
        aceptoTerminos: true,
      })
      .expect(409);
  });

  it('login con credenciales válidas y acceso al perfil', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Secreto123' })
      .expect(200);
    expect(login.body.accessToken).toBeDefined();

    const profile = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(profile.body.email).toBe(email);
  });

  it('sin token devuelve 401 en ruta protegida', async () => {
    await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
  });
});

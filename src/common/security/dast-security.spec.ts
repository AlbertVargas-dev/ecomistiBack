import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { setupSecurity } from './setup-security.js';

describe('Plan de Ejecución de Pruebas de Seguridad (DAST / Manual)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let passwordHashValido: string;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    perfilRecolector: {
      findUnique: vi.fn(),
    },
    incidencia: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    voucherCanje: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    entrega: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notificacion: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    puntoEncuentro: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-super-seguro-32-chars-min';
    passwordHashValido = await bcrypt.hash('Secreto123', 10);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    setupSecurity(app);
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function issueTestToken(user: {
    id: string;
    email: string;
    rol: Role;
  }): Promise<string> {
    return jwtService.signAsync(
      { sub: user.id, email: user.email, rol: user.rol, type: 'access' },
      { expiresIn: '15m' },
    );
  }

  // =========================================================================
  // 1. Pruebas de Inyección SQL (SQLi) — A05:2025 · WSTG-INPV-05
  // =========================================================================
  describe('1. Pruebas de Inyección SQL (SQLi)', () => {
    it('no permite bypass de autenticación ni lanza SQL syntax error con payloads SQLi en /login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const payloads = [
        "'",
        "' OR 1=1--",
        "' UNION SELECT email,password FROM users--",
        "admin@ecomisti.pe' OR '1'='1",
      ];

      for (const payload of payloads) {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: payload, password: "' OR 1=1--" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Credenciales inválidas');
        expect(JSON.stringify(res.body)).not.toMatch(/sql|syntax|prisma/i);
      }
    });

    it('parametriza y limita búsquedas en /admin/buscar?q= ante payloads UNION SELECT', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@ecomisti.pe',
        rol: Role.ADMIN,
        nombres: 'Admin',
        apellidos: 'Test',
        activo: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.entrega.findMany.mockResolvedValue([]);
      mockPrisma.voucherCanje.findMany.mockResolvedValue([]);
      mockPrisma.puntoEncuentro.findMany.mockResolvedValue([]);

      const token = await issueTestToken(adminUser);

      const res = await request(app.getHttpServer())
        .get('/api/admin/buscar')
        .query({ q: "' UNION SELECT email,password FROM users--" })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({
        usuarios: [],
        entregas: [],
        vouchers: [],
        puntos: [],
      });
    });
  });

  // =========================================================================
  // 2. Pruebas de Cross-Site Scripting (XSS) — A05:2025 · WSTG-INPV-02
  // =========================================================================
  describe('2. Pruebas de Cross-Site Scripting (XSS)', () => {
    it('sanea payloads XSS almacenados (<script> y <img onerror>) antes de guardarlos', async () => {
      const userA = {
        id: 'user-a',
        email: 'usera@ecomisti.pe',
        rol: Role.CIUDADANO,
        nombres: 'Usuario',
        apellidos: 'A',
        activo: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(userA);
      mockPrisma.incidencia.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'inc-1', ...data }),
      );

      const token = await issueTestToken(userA);

      const res = await request(app.getHttpServer())
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: '<script>alert(document.cookie)</script>Punto saturado',
          descripcion: '<img src="x" onerror="alert(\'XSS\')">',
        })
        .expect(201);

      expect(res.body.tipo).not.toContain('<script>');
      expect(res.body.tipo).toContain('&lt;script&gt;');
      expect(res.body.descripcion).not.toContain('<img');
      expect(res.body.descripcion).toContain('&lt;img');
    });

    it('rechaza URLs con esquema javascript: en fotoUrl', async () => {
      const userA = {
        id: 'user-a',
        email: 'usera@ecomisti.pe',
        rol: Role.CIUDADANO,
        nombres: 'Usuario',
        apellidos: 'A',
        activo: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(userA);
      const token = await issueTestToken(userA);

      await request(app.getHttpServer())
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tipo: 'Punto saturado',
          descripcion: 'Basura acumulada',
          fotoUrl: 'javascript:alert(1)',
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 3. Pruebas de Control de Acceso / IDOR — A01:2025 · WSTG-ATHZ-04
  // =========================================================================
  describe('3. Pruebas de Control de Acceso / IDOR', () => {
    it('bloquea con 403 Forbidden que el Usuario B lea, edite o borre recursos del Usuario A', async () => {
      const userB = {
        id: 'user-b',
        email: 'userb@ecomisti.pe',
        rol: Role.CIUDADANO,
        nombres: 'Usuario',
        apellidos: 'B',
        activo: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(userB);
      const tokenB = await issueTestToken(userB);

      // Recurso creado por Usuario A (ID 1042)
      mockPrisma.incidencia.findUnique.mockResolvedValue({
        id: '1042',
        usuarioId: 'user-a',
        tipo: 'Punto saturado',
        descripcion: 'Reporte de Usuario A',
        estado: 'ABIERTA',
      });

      await request(app.getHttpServer())
        .get('/api/incidencias/1042')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch('/api/incidencias/1042')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ tipo: 'Hackeado', descripcion: 'Modificado por B' })
        .expect(403);

      await request(app.getHttpServer())
        .delete('/api/incidencias/1042')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      // Voucher de Usuario A
      mockPrisma.voucherCanje.findUnique.mockResolvedValue({
        id: 'voucher-1042',
        usuarioId: 'user-a',
      });
      await request(app.getHttpServer())
        .get('/api/vouchers/voucher-1042')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      // Entrega de Usuario A
      mockPrisma.entrega.findUnique.mockResolvedValue({
        id: 'entrega-1042',
        usuarioId: 'user-a',
      });
      await request(app.getHttpServer())
        .get('/api/usuarios/me/entregas/entrega-1042')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      // Notificación de Usuario A
      mockPrisma.notificacion.findUnique.mockResolvedValue({
        id: 'notif-1042',
        usuarioId: 'user-a',
        leida: false,
      });
      await request(app.getHttpServer())
        .patch('/api/usuarios/me/notificaciones/notif-1042/leida')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      // Perfil de Usuario A o ID administrativo bajo ('1', '9001')
      await request(app.getHttpServer())
        .get('/api/usuarios/1')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/usuarios/9001')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 4. Pruebas de Autenticación, Sesión y Fuerza Bruta — A07:2025
  // =========================================================================
  describe('4. Pruebas de Autenticación, Sesión y Fuerza Bruta', () => {
    it('emite cookies con flags HttpOnly, Secure y SameSite=Lax y permite autenticar con cookie', async () => {
      const user = {
        id: 'user-cookie',
        email: 'cookie@ecomisti.pe',
        rol: Role.CIUDADANO,
        nombres: 'Cookie',
        apellidos: 'User',
        activo: true,
        passwordHash: passwordHashValido,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      // 5.ª petición a /api/auth/login en esta instancia (las 4 previas fueron en SQLi)
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'cookie@ecomisti.pe', password: 'Secreto123' })
        .expect(200);

      const rawCookies = loginRes.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies)
        ? rawCookies
        : rawCookies
          ? [String(rawCookies)]
          : [];

      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      expect(accessCookie).toBeDefined();
      expect(accessCookie).toContain('HttpOnly');
      expect(accessCookie).toContain('Secure');
      expect(accessCookie).toMatch(/SameSite=Lax/i);
      expect(accessCookie).toContain('Max-Age=900');

      // Verificar que el token tiene claim de expiración (exp)
      const decoded = jwtService.decode(loginRes.body.accessToken) as {
        exp?: number;
        iat?: number;
      };
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp! - decoded.iat!).toBe(900);

      // Verificar que el endpoint protegido acepta la cookie HttpOnly sin header Authorization
      const cookieHeader = accessCookie!.split(';')[0];
      const profileRes = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Cookie', cookieHeader)
        .expect(200);

      expect(profileRes.body.email).toBe('cookie@ecomisti.pe');
      expect(profileRes.body).not.toHaveProperty('passwordHash');
    });

    it('bloquea ataques de fuerza bruta devolviendo 429 Too Many Requests tras 5 intentos seguidos', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .compile();

      const freshApp = moduleRef.createNestApplication({ logger: false });
      freshApp.setGlobalPrefix('api');
      setupSecurity(freshApp);
      await freshApp.init();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        for (let i = 1; i <= 5; i++) {
          const r = await request(freshApp.getHttpServer())
            .post('/api/auth/login')
            .send({ email: 'atacante@test.com', password: 'WrongPassword1' });
          expect(r.status).toBe(401);
        }

        // El 6.º intento seguido recibe 429 Too Many Requests
        const sixth = await request(freshApp.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'atacante@test.com', password: 'WrongPassword1' });
        expect(sixth.status).toBe(429);

        // Con trust proxy activo (ej. Railway), otro usuario con distinta IP real no queda bloqueado
        const anotherUser = await request(freshApp.getHttpServer())
          .post('/api/auth/login')
          .set('X-Forwarded-For', '203.0.113.50')
          .send({ email: 'legitimo@test.com', password: 'WrongPassword1' });
        expect(anotherUser.status).toBe(401);
      } finally {
        await freshApp.close();
      }
    });
  });

  // =========================================================================
  // 5. Escaneo Pasivo de Cabeceras y Configuración — A02:2025
  // =========================================================================
  describe('5. Escaneo Pasivo de Cabeceras y Configuración', () => {
    it('incluye CSP, HSTS, X-Content-Type-Options, X-Frame-Options y oculta X-Powered-By', async () => {
      const res = await request(app.getHttpServer()).get('/api/urbanizaciones');

      expect(res.headers['content-security-policy']).toBe("default-src 'self'");
      expect(res.headers['strict-transport-security']).toContain(
        'max-age=31536000',
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('rechaza orígenes maliciosos en CORS (nunca emite Access-Control-Allow-Origin: *)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/urbanizaciones')
        .set('Origin', 'https://sitio-malicioso.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('no filtra stack traces ni versiones del servidor en errores 404 o 500', async () => {
      const notFound = await request(app.getHttpServer())
        .get('/api/ruta-inexistente-404')
        .expect(404);

      expect(notFound.body).not.toHaveProperty('stack');

      // Forzar un error inesperado de base de datos en un endpoint público
      mockPrisma.user.findUnique.mockRejectedValueOnce(
        new Error('FATAL: password authentication failed for user "postgres"'),
      );

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .compile();
      const errApp = moduleRef.createNestApplication({ logger: false });
      errApp.setGlobalPrefix('api');
      setupSecurity(errApp);
      await errApp.init();

      try {
        const internalErr = await request(errApp.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'Secreto123' })
          .expect(500);

        expect(internalErr.body).toEqual({
          statusCode: 500,
          message: 'Error interno del servidor',
          error: 'Internal Server Error',
        });
        expect(JSON.stringify(internalErr.body)).not.toContain('postgres');
        expect(internalErr.body).not.toHaveProperty('stack');
      } finally {
        await errApp.close();
      }
    });
  });

  // =========================================================================
  // 6. Validación en Backend — A03:2025 / A04:2025
  // =========================================================================
  describe('6. Validación en Backend (Bypass de formulario y textos de 10,000 caracteres)', () => {
    it('rechaza con 400 Bad Request textos de 10,000 caracteres, campos vacíos y tipos erróneos', async () => {
      const textoGigante = 'A'.repeat(10_000);

      const res = await request(app.getHttpServer())
        .post('/api/auth/register-ciudadano')
        .send({
          email: 'valido@test.com',
          password: 'Secreto123',
          nombres: textoGigante,
          apellidos: '   ',
          dni: '12345678',
          aceptoTerminos: true,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});

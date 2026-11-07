import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PuntosEncuentroModule } from './puntos-encuentro/puntos-encuentro.module.js';
import { PesajesModule } from './pesajes/pesajes.module.js';
import { EcopuntosModule } from './ecopuntos/ecopuntos.module.js';
import { BeneficiosModule } from './beneficios/beneficios.module.js';
import { CanjesModule } from './canjes/canjes.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { RecoleccionModule } from './recoleccion/recoleccion.module.js';
import { AdminModule } from './admin/admin.module.js';
import { OfertasModule } from './ofertas/ofertas.module.js';
import { VouchersModule } from './vouchers/vouchers.module.js';
import { RentasModule } from './rentas/rentas.module.js';
import { IncidenciasModule } from './incidencias/incidencias.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PuntosEncuentroModule,
    PesajesModule,
    EcopuntosModule,
    BeneficiosModule,
    CanjesModule,
    UsuariosModule,
    RecoleccionModule,
    AdminModule,
    OfertasModule,
    VouchersModule,
    RentasModule,
    IncidenciasModule,
    // Rate limiting (spec §4): 100 req/min general, 10 req/min en login/registro.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 100),
      },
      {
        name: 'short',
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_LOGIN_LIMIT ?? 10),
      },
    ]),
  ],
  providers: [
    // Primero rate-limit, luego autentica (JWT), luego autoriza (roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}

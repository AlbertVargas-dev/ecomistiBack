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
  ],
  providers: [
    // Primero autentica (JWT), luego autoriza (roles)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}

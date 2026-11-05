rm -f src/app.controller.ts src/app.service.ts src/app.controller.spec.ts
rm -rf test

mkdir -p src/prisma src/common/decorators src/common/guards src/common/filters src/config
mkdir -p src/auth/dto src/auth/strategies src/users/dto src/puntos-encuentro/dto
mkdir -p src/pesajes/dto src/beneficios/dto src/canjes/dto src/ecopuntos

cat > src/main.ts <<'EOF'
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log('EcoMisti API escuchando en http://localhost:' + port + '/api');
}
bootstrap();
EOF

cat > src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PuntosEncuentroModule } from './puntos-encuentro/puntos-encuentro.module';
import { PesajesModule } from './pesajes/pesajes.module';
import { EcopuntosModule } from './ecopuntos/ecopuntos.module';
import { BeneficiosModule } from './beneficios/beneficios.module';
import { CanjesModule } from './canjes/canjes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

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
EOF

cat > src/prisma/prisma.service.ts <<'EOF'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
EOF

cat > src/prisma/prisma.module.ts <<'EOF'
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
EOF

cat > src/common/decorators/public.decorator.ts <<'EOF'
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
EOF

cat > src/common/decorators/roles.decorator.ts <<'EOF'
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
EOF

cat > src/common/decorators/current-user.decorator.ts <<'EOF'
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  rol: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
EOF

cat > src/common/guards/jwt-auth.guard.ts <<'EOF'
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
EOF

cat > src/common/guards/roles.guard.ts <<'EOF'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
EOF

cat > src/common/filters/prisma-exception.filter.ts <<'EOF'
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno de base de datos';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        message =
          'Ya existe un registro con ese valor único' +
          (target ? ' (' + target + ')' : '');
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro no encontrado';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Referencia a un registro inexistente';
        break;
    }
    res.status(status).json({ statusCode: status, message, error: exception.code });
  }
}
EOF

cat > src/config/security.config.ts <<'EOF'
export const SALT_ROUNDS = 10;
EOF

cat > src/config/puntos.config.ts <<'EOF'
import { TipoResiduo } from '@prisma/client';

/** EcoPuntos otorgados por kilogramo según el tipo de residuo. Ajustable. */
export const PUNTOS_POR_KG: Record<TipoResiduo, number> = {
  PLASTICO: 10,
  CARTON: 5,
  VIDRIO: 4,
  METAL: 15,
};

export function calcularPuntos(tipo: TipoResiduo, pesoKg: number): number {
  return Math.floor(pesoKg * PUNTOS_POR_KG[tipo]);
}
EOF
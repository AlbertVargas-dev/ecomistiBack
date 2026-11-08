# EcoMisti Backend

Backend de la plataforma social universitaria **EcoMisti** (gestión de reciclaje, EcoPuntos y recompensas), desarrollado con **NestJS 12 + TypeScript + Prisma 6 + PostgreSQL 16**.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | NestJS 12 (módulos / controladores / servicios) |
| Lenguaje | TypeScript 6 (ESM, `nodenext`) |
| Base de datos | PostgreSQL 16 (Docker) vía Prisma ORM |
| Auth | JWT + Passport, bcrypt, roles (`ADMIN, RECOLECTOR, CIUDADANO, URBANIZACION, RENTAS`) |
| Validación | class-validator (DTOs) + `ValidationPipe` global estricto |
| Docs | Swagger/OpenAPI en `/api/docs` |
| Tests | Vitest (unitarios + e2e) |
| Paquetes | pnpm |

## Funcionalidades

- Autenticación: registro separado ciudadano/urbanización, login email+password o **DNI+PIN** (recolector), access 15 min + refresh 7 días, bloqueo tras 5 fallos, rate-limit.
- Recolección offline: sincronización idempotente por ítem (ACEPTADA/DUPLICADA/RECHAZADA), factores versionados por fecha de captura, ledger inmutable de puntos.
- Canjes y vouchers: transacción atómica con descuento condicional, ciclo EMITIDO→APLICADO/VENCIDO/CANCELADO, Rentas, notificaciones de hito.
- Administración: dashboard con comparativas, tendencia, mapa de calor, CRUD de ofertas/rutas/puntos/vehículos/cooperativas/factores, anulación de entregas, reportes y exportar CSV/XLSX, auditoría.
- Documentación de negocio: `docs/02_Reglas_de_Negocio_y_Seguridad.md` (spec MVP/Fase 2).

## Instalación y ejecución

```bash
pnpm install
docker compose up -d                 # PostgreSQL 16
cp .env.example .env                 # completar DATABASE_URL y JWT_SECRET
pnpm exec prisma migrate deploy
pnpm exec prisma db seed             # ADMIN admin@ecomisti.pe + factores
pnpm run start:dev                   # http://localhost:3000/api
```

Swagger: `http://localhost:3000/api/docs` · Tests: `pnpm run test` / `test:e2e` · Lint: `pnpm run lint` · Build: `pnpm run build`.

## Seguridad

- Contraseñas y PIN con **bcrypt** (costo 10); respuestas sin hashes.
- Prisma parametrizado (sin SQL crudo) → **sin SQL injection**; React escapa por defecto → **sin XSS**; guards JWT + roles en todas las rutas.

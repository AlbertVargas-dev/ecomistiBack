# Ecomisti Backend 

Backend de una plataforma social universitaria desarrollado con **NestJS y TypeScript**. Permite gestionar usuarios, administrar el sistema de puntos y supervisar los canjes realizados desde la aplicación móvil.

## Tecnologías

- **NestJS** — Framework backend.
- **TypeScript** — Lenguaje de programación.
- **Prisma ORM** — Mapeo relacional de base de datos (PostgreSQL).
- **pnpm** — Gestor de paquetes.
- **Swagger / OpenAPI** — Documentación interactiva de API.
- **Vitest** — Pruebas unitarias.
- **API REST** — Comunicación entre el backend y las aplicaciones cliente.

## Funcionalidades

- Gestión de usuarios y autenticación segura con JWT y Roles (`ADMIN`, `RECOLECTOR`, `CIUDADANO`).
- Administración del sistema de puntos (EcoPuntos).
- Registro y supervisión de pesajes de residuos y canjes de beneficios.
- Documentación interactiva de la API con Swagger en `/api/docs`.

## Instalación

```bash
git clone https://github.com/AlbertVargas-dev/ecomistiBack.git
cd ecomistiBack
pnpm install
```

## Base de datos

Levantar la base de datos PostgreSQL con Docker:

```bash
docker compose up -d
pnpm exec prisma migrate dev
```

## Ejecución

```bash
# Desarrollo con recarga automática
pnpm run start:dev

# Compilación y producción
pnpm run build
pnpm run start:prod
```

## Pruebas

```bash
pnpm run test
pnpm run lint
```

## Documentación API

Con el servidor en ejecución, visita:
- **Swagger UI**: `http://localhost:3000/api/docs`

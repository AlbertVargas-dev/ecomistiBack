-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECOLECTOR', 'CIUDADANO');

-- CreateEnum
CREATE TYPE "TipoResiduo" AS ENUM ('PLASTICO', 'CARTON', 'VIDRIO', 'METAL');

-- CreateEnum
CREATE TYPE "EstadoCanje" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "Role" NOT NULL DEFAULT 'CIUDADANO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_encuentro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "horario" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puntos_encuentro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesajes" (
    "id" TEXT NOT NULL,
    "recolectorId" TEXT NOT NULL,
    "ciudadanoId" TEXT NOT NULL,
    "puntoEncuentroId" TEXT NOT NULL,
    "tipoResiduo" "TipoResiduo" NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "puntosOtorgados" INTEGER NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecopuntos_balance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntosActuales" INTEGER NOT NULL DEFAULT 0,
    "puntosHistoricos" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecopuntos_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficios" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "puntosCosto" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 100,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canjes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "beneficioId" TEXT NOT NULL,
    "puntosUsados" INTEGER NOT NULL,
    "estado" "EstadoCanje" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canjes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE INDEX "pesajes_ciudadanoId_idx" ON "pesajes"("ciudadanoId");

-- CreateIndex
CREATE INDEX "pesajes_recolectorId_idx" ON "pesajes"("recolectorId");

-- CreateIndex
CREATE INDEX "pesajes_puntoEncuentroId_idx" ON "pesajes"("puntoEncuentroId");

-- CreateIndex
CREATE UNIQUE INDEX "ecopuntos_balance_userId_key" ON "ecopuntos_balance"("userId");

-- CreateIndex
CREATE INDEX "canjes_userId_idx" ON "canjes"("userId");

-- CreateIndex
CREATE INDEX "canjes_estado_idx" ON "canjes"("estado");

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_recolectorId_fkey" FOREIGN KEY ("recolectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_ciudadanoId_fkey" FOREIGN KEY ("ciudadanoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_puntoEncuentroId_fkey" FOREIGN KEY ("puntoEncuentroId") REFERENCES "puntos_encuentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecopuntos_balance" ADD CONSTRAINT "ecopuntos_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_beneficioId_fkey" FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

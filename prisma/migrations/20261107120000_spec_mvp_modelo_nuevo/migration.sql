-- Migracion spec_mvp_modelo_nuevo (docs/02_Reglas_de_Negocio_y_Seguridad.md S16)
-- Generada con `prisma migrate diff` y corregida manualmente:
--  * El bloque AlterEnum de TipoResiduo referenciaba tablas nuevas todavia no creadas;
--    se quitaron esas sentencias (las tablas nuevas ya usan el enum nuevo).
--  * qrCode en users: la BD dev tenia 1 fila; se hizo backfill previo con gen_random_uuid().
--  * TipoResiduo_old se dropea despues de dropear pesajes (orden corregido manualmente).
--  * Tablas viejas pesajes/beneficios/canjes se dropean (sin datos de negocio aun);
--    en produccion habria que migrar datos antes de este DROP.

-- CreateEnum
CREATE TYPE "EstadoVoucher" AS ENUM ('EMITIDO', 'APLICADO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ACREDITO', 'CANJE', 'REVERSA_ENTREGA', 'REVERSA_CANJE', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('VALIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('PENDIENTE', 'EN_EJECUCION', 'COMPLETADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'URBANIZACION';
ALTER TYPE "Role" ADD VALUE 'RENTAS';

-- AlterEnum
BEGIN;
CREATE TYPE "TipoResiduo_new" AS ENUM ('RECICLABLE', 'ORGANICO');
ALTER TYPE "TipoResiduo" RENAME TO "TipoResiduo_old";
ALTER TYPE "TipoResiduo_new" RENAME TO "TipoResiduo";
COMMIT;
-- TipoResiduo_old se dropea tras Dropear las tablas viejas (ver DropEnum mas abajo)

-- DropForeignKey
ALTER TABLE "canjes" DROP CONSTRAINT "canjes_beneficioId_fkey";

-- DropForeignKey
ALTER TABLE "canjes" DROP CONSTRAINT "canjes_userId_fkey";

-- DropForeignKey
ALTER TABLE "ecopuntos_balance" DROP CONSTRAINT "ecopuntos_balance_userId_fkey";

-- DropForeignKey
ALTER TABLE "pesajes" DROP CONSTRAINT "pesajes_ciudadanoId_fkey";

-- DropForeignKey
ALTER TABLE "pesajes" DROP CONSTRAINT "pesajes_puntoEncuentroId_fkey";

-- DropForeignKey
ALTER TABLE "pesajes" DROP CONSTRAINT "pesajes_recolectorId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aceptoTerminosAt" TIMESTAMP(3),
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "desactivadoAt" TIMESTAMP(3),
ADD COLUMN     "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qrCode" TEXT NOT NULL;

-- DropTable
DROP TABLE "beneficios";

-- DropTable
DROP TABLE "canjes";

-- DropTable
DROP TABLE "pesajes";

-- DropEnum
DROP TYPE "EstadoCanje";

-- Drop tipo viejo (ya sin tablas que dependan)
DROP TYPE "TipoResiduo_old";

-- CreateTable
CREATE TABLE "perfil_recolector" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "telefono" TEXT,
    "zonaCamion" TEXT,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_recolector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "deviceId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "recolectorId" TEXT NOT NULL,
    "puntoEncuentroId" TEXT,
    "qrCode" TEXT,
    "fechaCaptura" TIMESTAMP(3) NOT NULL,
    "puntosTotales" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'VALIDA',
    "motivoAnulacion" TEXT,
    "anuladoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_entrega" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "tipoResiduo" "TipoResiduo" NOT NULL,
    "pesoKg" DECIMAL(8,2) NOT NULL,
    "factor" DECIMAL(8,2) NOT NULL,
    "puntosSubtotal" INTEGER NOT NULL,

    CONSTRAINT "detalles_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_factor_residuo" (
    "id" TEXT NOT NULL,
    "tipoResiduo" "TipoResiduo" NOT NULL,
    "factor" DECIMAL(8,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_factor_residuo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_puntos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" INTEGER NOT NULL,
    "saldoPosterior" INTEGER NOT NULL,
    "entregaId" TEXT,
    "voucherId" TEXT,
    "motivo" TEXT,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_puntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofertas_recompensa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costoPuntos" INTEGER NOT NULL,
    "dirigidoA" "Role" NOT NULL,
    "stockDisponible" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "limitePorUsuario" INTEGER,
    "diasVigenciaVoucher" INTEGER NOT NULL DEFAULT 90,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofertas_recompensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers_canje" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "codigoVoucher" TEXT NOT NULL,
    "puntosUsados" INTEGER NOT NULL,
    "estado" "EstadoVoucher" NOT NULL DEFAULT 'EMITIDO',
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "fechaAplicacion" TIMESTAMP(3),
    "aplicadoPor" TEXT,
    "motivoCancelacion" TEXT,
    "canceladoPor" TEXT,
    "estadoObra" "EstadoObra",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_canje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioAfectadoId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfil_recolector_usuarioId_key" ON "perfil_recolector"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_recolector_dni_key" ON "perfil_recolector"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_idempotencyKey_key" ON "entregas"("idempotencyKey");

-- CreateIndex
CREATE INDEX "entregas_usuarioId_fechaCaptura_idx" ON "entregas"("usuarioId", "fechaCaptura");

-- CreateIndex
CREATE INDEX "entregas_recolectorId_fechaCaptura_idx" ON "entregas"("recolectorId", "fechaCaptura");

-- CreateIndex
CREATE INDEX "entregas_puntoEncuentroId_idx" ON "entregas"("puntoEncuentroId");

-- CreateIndex
CREATE INDEX "detalles_entrega_entregaId_idx" ON "detalles_entrega"("entregaId");

-- CreateIndex
CREATE INDEX "config_factor_residuo_tipoResiduo_vigenteDesde_idx" ON "config_factor_residuo"("tipoResiduo", "vigenteDesde");

-- CreateIndex
CREATE INDEX "movimientos_puntos_usuarioId_createdAt_idx" ON "movimientos_puntos"("usuarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_canje_codigoVoucher_key" ON "vouchers_canje"("codigoVoucher");

-- CreateIndex
CREATE INDEX "vouchers_canje_usuarioId_estado_idx" ON "vouchers_canje"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "audit_log_usuarioId_createdAt_idx" ON "audit_log"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entidad_entidadId_idx" ON "audit_log"("entidad", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "users_qrCode_key" ON "users"("qrCode");

-- AddForeignKey
ALTER TABLE "perfil_recolector" ADD CONSTRAINT "perfil_recolector_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_recolectorId_fkey" FOREIGN KEY ("recolectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_puntoEncuentroId_fkey" FOREIGN KEY ("puntoEncuentroId") REFERENCES "puntos_encuentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_entrega" ADD CONSTRAINT "detalles_entrega_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_factor_residuo" ADD CONSTRAINT "config_factor_residuo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecopuntos_balance" ADD CONSTRAINT "ecopuntos_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers_canje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "vouchers_canje_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "vouchers_canje_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "ofertas_recompensa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioAfectadoId_fkey" FOREIGN KEY ("usuarioAfectadoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


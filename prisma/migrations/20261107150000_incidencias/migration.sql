-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ABIERTA', 'EN_REVISION', 'RESUELTA');

-- CreateTable
CREATE TABLE "incidencias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidencias_usuarioId_createdAt_idx" ON "incidencias"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "incidencias_estado_idx" ON "incidencias"("estado");

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


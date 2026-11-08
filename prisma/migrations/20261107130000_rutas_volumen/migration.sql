-- CreateEnum
CREATE TYPE "EstadoRuta" AS ENUM ('ACTIVA', 'SUSPENDIDA');

-- AlterTable
ALTER TABLE "entregas" ADD COLUMN     "rutaId" TEXT,
ADD COLUMN     "volumenM3" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "rutas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zona" TEXT,
    "recolectorId" TEXT,
    "estado" "EstadoRuta" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entregas_rutaId_idx" ON "entregas"("rutaId");

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_recolectorId_fkey" FOREIGN KEY ("recolectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


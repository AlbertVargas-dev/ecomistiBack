-- AlterTable
ALTER TABLE "users" ADD COLUMN     "urbanizacionId" TEXT;

-- CreateTable
CREATE TABLE "urbanizaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "distrito" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urbanizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "urbanizaciones_nombre_key" ON "urbanizaciones"("nombre");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_urbanizacionId_fkey" FOREIGN KEY ("urbanizacionId") REFERENCES "urbanizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


// Seed idempotente (spec §13): primer ADMIN + factores iniciales.
// Ejecutar: pnpm exec prisma db seed
// Password del admin: SEED_ADMIN_PASSWORD (por defecto solo para dev).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@ecomisti.pe';
const ADMIN_DNI = '00000001';
const FACTORES = [
  { tipoResiduo: 'RECICLABLE', factor: 10 },
  { tipoResiduo: 'ORGANICO', factor: 5 },
] as const;
const VIGENTE_DESDE = new Date('2026-01-01T00:00:00.000Z');

async function main() {
  // --- Primer ADMIN (idempotente por email) ---
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234';
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (existing) {
    console.log(`ADMIN ya existe (${ADMIN_EMAIL}), se omite.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        nombres: 'Admin',
        apellidos: 'EcoMisti',
        dni: ADMIN_DNI,
        rol: 'ADMIN',
        aceptoTerminosAt: new Date(),
        puntosBalance: { create: { puntosActuales: 0, puntosHistoricos: 0 } },
      },
    });
    console.log(
      `ADMIN creado (${ADMIN_EMAIL}). Cambiar la contraseña en producción.`,
    );
  }

  // --- Factores iniciales (idempotentes por tipo + vigenteDesde) ---
  for (const f of FACTORES) {
    const existe = await prisma.configFactorResiduo.findFirst({
      where: { tipoResiduo: f.tipoResiduo, vigenteDesde: VIGENTE_DESDE },
    });
    if (existe) {
      console.log(`Factor ${f.tipoResiduo}=${f.factor} ya existe, se omite.`);
      continue;
    }
    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    if (!admin) throw new Error('No se encontró el ADMIN para creadoPor');
    await prisma.configFactorResiduo.create({
      data: {
        tipoResiduo: f.tipoResiduo,
        factor: f.factor,
        vigenteDesde: VIGENTE_DESDE,
        creadoPorId: admin.id,
      },
    });
    console.log(`Factor ${f.tipoResiduo}=${f.factor} creado.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

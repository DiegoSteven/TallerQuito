// @ts-check
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Catálogo inicial. El dueño ajusta los intervalos desde el sistema. */
const CATALOGO = [
  { nombre: 'Cambio de aceite', categoria: 'Motor', intervaloKm: 5000, intervaloMeses: 6 },
  { nombre: 'Filtro de aire', categoria: 'Motor', intervaloKm: 15000, intervaloMeses: 12 },
  { nombre: 'Bujías', categoria: 'Motor', intervaloKm: 30000, intervaloMeses: 24 },
  { nombre: 'Banda de distribución', categoria: 'Motor', intervaloKm: 60000, intervaloMeses: 48 },
  { nombre: 'Retén del cigüeñal', categoria: 'Motor', intervaloKm: 60000, intervaloMeses: 48 },
  { nombre: 'Bomba de agua', categoria: 'Refrigeración', intervaloKm: 60000, intervaloMeses: 48 },
  { nombre: 'Pastillas de freno', categoria: 'Frenos', intervaloKm: 30000, intervaloMeses: 24 },
  { nombre: 'ABC de frenos', categoria: 'Frenos', intervaloKm: 20000, intervaloMeses: 12 },
  { nombre: 'Alineación y balanceo', categoria: 'Suspensión', intervaloKm: 10000, intervaloMeses: 6 },
  { nombre: 'Amortiguadores', categoria: 'Suspensión', intervaloKm: 80000, intervaloMeses: null },
  { nombre: 'Embrague', categoria: 'Transmisión', intervaloKm: 120000, intervaloMeses: null },
  { nombre: 'Diagnóstico / otros', categoria: 'Otros', intervaloKm: null, intervaloMeses: null },
];

async function main() {
  for (const s of CATALOGO) {
    await prisma.tipoServicio.upsert({ where: { nombre: s.nombre }, update: {}, create: s });
  }

  // No se crea ningún usuario aquí (no hay contraseñas fijas en el código ni en el .env).
  // La cuenta del dueño se crea en el servidor con: node prisma/crear-dueno.js

  // Numeración: continúa la del talonario en papel (ej. el último fue 0000765 → NUMERO_ORDEN_INICIAL=766).
  const inicial = Number(process.env.NUMERO_ORDEN_INICIAL ?? 0);
  if (inicial > 1) {
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('ordenes_trabajo', 'numero'),
      GREATEST(${inicial - 1}::bigint, (SELECT COALESCE(MAX(numero), 0) FROM ordenes_trabajo)), true)`;
    console.log(`Numeración de órdenes: la próxima será la ${String(inicial).padStart(7, '0')} o mayor.`);
  }

  console.log(`Seed listo: ${CATALOGO.length} servicios en el catálogo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

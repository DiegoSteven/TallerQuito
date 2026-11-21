// @ts-check
/**
 * Crea (o restablece) una cuenta de DUEÑO directamente en la base de datos.
 * Se ejecuta en el servidor; no existe ninguna pantalla pública para esto.
 *
 *   Desarrollo:  pnpm --filter @taller/api crear-dueno
 *   VPS:         docker compose exec api node prisma/crear-dueno.js
 *
 * Pide nombre, usuario y contraseña por consola (la contraseña no se muestra ni queda en el
 * historial de comandos). Si el usuario ya existe, ofrece restablecer su contraseña y lo
 * deja como dueño activo (sirve si el dueño olvida su clave).
 */
const readline = require('node:readline');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const PASSWORD_MIN = 8;
const RONDAS_BCRYPT = 12;

/** Pregunta por consola. Con `oculto`, no muestra lo que se escribe (contraseñas). */
function preguntar(texto, oculto = false) {
  return new Promise((resolver) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      // Silencia el eco de lo que se teclea, pero deja ver la pregunta.
      /** @type {any} */ (rl)._writeToOutput = (s) => {
        if (s.includes(texto)) process.stdout.write(s);
      };
    }
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolver(respuesta.trim());
    });
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error('Ejecútelo en una consola interactiva (en Docker: docker compose exec api node prisma/crear-dueno.js).');
  }
  const prisma = new PrismaClient();
  try {
    console.log('\n=== Cuenta de dueño · MECÁNICA AUTOMOTRIZSánchez ===\n');

    const usuario = (await preguntar('Usuario para ingresar (ej: luis.sanchez): ')).toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) throw new Error('Usuario inválido: minúsculas, números, punto o guion (3 a 30).');

    const existente = await prisma.usuario.findUnique({ where: { usuario } });
    let nombre = existente?.nombre ?? '';
    if (existente) {
      const r = await preguntar(`"${usuario}" ya existe (${existente.nombre}, ${existente.rol}). ¿Restablecer su contraseña y dejarlo como dueño activo? (s/N): `);
      if (r.toLowerCase() !== 's') return console.log('Cancelado. No se cambió nada.');
    } else {
      nombre = await preguntar('Nombre completo: ');
      if (nombre.length < 2) throw new Error('Falta el nombre.');
    }

    const password = await preguntar(`Contraseña (mínimo ${PASSWORD_MIN} caracteres): `, true);
    if (password.length < PASSWORD_MIN) throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
    if ((await preguntar('Repita la contraseña: ', true)) !== password) throw new Error('Las contraseñas no coinciden.');

    const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
    await prisma.usuario.upsert({
      where: { usuario },
      update: { passwordHash, rol: 'DUENO', activo: true },
      create: { nombre, usuario, rol: 'DUENO', passwordHash },
    });
    console.log(`\n✔ Listo: "${usuario}" ${existente ? 'actualizado' : 'creado'} como dueño. Ya puede ingresar al sistema.`);
    console.log('  Desde la pantalla "Usuarios" puede crear las cuentas de recepción y mecánicos.\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}\n`);
  process.exit(1);
});

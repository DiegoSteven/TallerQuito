// @ts-check
/**
 * Carga la cartera de CLIENTES y VEHÍCULOS desde el Excel "BALANCE GENERAL" del taller.
 * No carga órdenes de trabajo: el historial empieza de cero en el sistema.
 *
 *   Simular (no escribe nada, genera el reporte):   node prisma/importar-clientes.js "<archivo.xlsx>"
 *   Cargar a la base:                                node prisma/importar-clientes.js "<archivo.xlsx>" --aplicar
 *   En el VPS:  docker compose cp archivo.xlsx api:/tmp/b.xlsx
 *               docker compose exec api node prisma/importar-clientes.js /tmp/b.xlsx --aplicar
 *
 * Solo entra información confiable (hoja MOVIMIENTOS GENERALES):
 *   - fuera: anulados, filas sin placa válida o sin cliente, y placas dudosas (a 1 letra de otra sin poder saber cuál es la buena);
 *   - se unen SOLO errores de tipeo seguros (reglas y pruebas en packages/shared/src/importacion.ts);
 *   - el vehículo queda a nombre del cliente de su visita más reciente;
 *   - teléfono y año se completan con la hoja TRABAJOS PENDIENTES cuando el nombre o la placa coinciden exactamente.
 * Es idempotente: si se corre otra vez, no duplica (clientes por nombre, vehículos por placa).
 */
const path = require('node:path');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const {
  enTitulo,
  normalizarNombre,
  normalizarPlaca,
  placaCompacta,
  placaValida,
  separarVehiculo,
  unirClientes,
  unirPlacas,
} = require('@taller/shared');

const KM_MIN = 100;
const KM_MAX = 1_500_000;

/** Valor plano de una celda (fórmulas → resultado; fechas como Date). */
function valor(celda) {
  const v = celda?.value;
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') return v.result ?? v.text ?? (Array.isArray(v.richText) ? v.richText.map((t) => t.text).join('') : null);
  return v;
}

/** Ubica una columna por el texto de su encabezado (filas 2 y 3), no por posición fija. */
function columna(hoja, patron, filasEncabezado = [2, 3]) {
  for (let c = 1; c <= hoja.columnCount; c++) {
    const texto = filasEncabezado.map((f) => normalizarNombre(valor(hoja.getRow(f).getCell(c)))).join(' ');
    if (patron.test(texto)) return c;
  }
  throw new Error(`No encontré la columna ${patron} en la hoja "${hoja.name}"`);
}

function leerMovimientos(libro) {
  const hoja = libro.getWorksheet('MOVIMIENTOS GENERALES');
  if (!hoja) throw new Error('El Excel no tiene la hoja "MOVIMIENTOS GENERALES"');
  const col = {
    fecha: columna(hoja, /\bFECHA\b/),
    ot: columna(hoja, /ORDEN DE TRABAJO/),
    vehiculo: columna(hoja, /\bVEHICULO\b/),
    placa: columna(hoja, /\bPLACA\b/),
    km: columna(hoja, /\bKM\b/),
    cliente: columna(hoja, /\bCLIENTE\b/),
    descripcion: columna(hoja, /DESCRIPCION TRABAJO/),
  };
  const filas = [];
  hoja.eachRow((r, n) => {
    if (n < 4) return;
    const v = (k) => valor(r.getCell(col[k]));
    const f = {
      fila: n,
      fecha: v('fecha') instanceof Date ? v('fecha') : null,
      ot: Number(v('ot')) || 0,
      vehiculoTexto: v('vehiculo') ? String(v('vehiculo')).trim() : '',
      placa: placaCompacta(v('placa')),
      placaOriginal: v('placa') ? String(v('placa')) : '',
      km: typeof v('km') === 'number' ? v('km') : null,
      clienteOriginal: v('cliente') ? String(v('cliente')).trim() : '',
      cliente: normalizarNombre(v('cliente')),
      descripcion: v('descripcion') ? String(v('descripcion')) : '',
    };
    if (f.placa || f.cliente || f.vehiculoTexto || f.descripcion) filas.push(f);
  });
  return filas;
}

/** TRABAJOS PENDIENTES: teléfonos por nombre y año por placa (solo coincidencias exactas). */
function leerPendientes(libro) {
  const hoja = libro.getWorksheet('TRABAJOS PENDIENTES');
  const telefonos = new Map();
  const anios = new Map();
  if (!hoja) return { telefonos, anios };
  const col = {
    cliente: columna(hoja, /NOMBRE DEL ?CLIENTE/, [2]),
    contacto: columna(hoja, /CONTACTO/, [2]),
    placa: columna(hoja, /\bPLACA\b/, [2]),
    anio: columna(hoja, /\bANO\b/, [2]),
  };
  hoja.eachRow((r, n) => {
    if (n < 3) return;
    const nombre = normalizarNombre(valor(r.getCell(col.cliente)));
    const tel = String(valor(r.getCell(col.contacto)) ?? '').replace(/\D/g, '');
    // Excel guardó los celulares como número y perdió el 0 inicial (984410000 → 0984410000).
    if (nombre && /^\d{9}$/.test(tel)) telefonos.set(nombre, `0${tel}`);
    else if (nombre && /^0\d{9}$/.test(tel)) telefonos.set(nombre, tel);
    const placa = placaCompacta(valor(r.getCell(col.placa)));
    const anio = Number(valor(r.getCell(col.anio)));
    if (placaValida(placa) && anio >= 1950 && anio <= 2100) anios.set(placa, anio);
  });
  return { telefonos, anios };
}

/** Decide qué se carga. Función pura: no toca la base. */
function preparar(filas, pendientes) {
  const descartadas = [];
  const descartar = (f, motivo) => descartadas.push({ ...f, motivo });
  const base = [];
  for (const f of filas) {
    if (/ANULAD/.test(normalizarNombre(`${f.vehiculoTexto} ${f.descripcion}`))) descartar(f, 'Trabajo anulado');
    else if (!placaValida(f.placa)) descartar(f, f.placa ? `Placa inválida (${f.placaOriginal})` : 'Sin placa');
    else if (!f.cliente) descartar(f, 'Sin cliente');
    else base.push({ ...f, marca: separarVehiculo(f.vehiculoTexto).marca });
  }

  const clientes = unirClientes(base);
  for (const f of base) f.clienteFinal = clientes.mapa.get(f.cliente);
  const placas = unirPlacas(base.map((f) => ({ placa: f.placa, cliente: f.clienteFinal, marca: f.marca })));
  const validas = [];
  for (const f of base) {
    f.placaFinal = placas.mapa.get(f.placa);
    if (placas.dudosas.has(f.placaFinal)) descartar(f, `Placa dudosa: está a 1 letra de otra placa y no se puede saber cuál es la correcta`);
    else validas.push(f);
  }

  // Vehículos: dueño = cliente de la visita más reciente; marca/modelo más frecuentes; km = máximo conocido.
  const porPlaca = new Map();
  for (const f of validas) {
    if (!porPlaca.has(f.placaFinal)) porPlaca.set(f.placaFinal, []);
    porPlaca.get(f.placaFinal).push(f);
  }
  const vehiculos = [...porPlaca].map(([placa, visitas]) => {
    const orden = [...visitas].sort((a, b) => (a.fecha?.getTime() ?? 0) - (b.fecha?.getTime() ?? 0) || a.ot - b.ot);
    const frecuencia = new Map();
    for (const v of visitas) {
      const sv = separarVehiculo(v.vehiculoTexto);
      if (!sv.marca && !sv.modelo) continue;
      const clave = `${sv.marca ?? ''}|${sv.modelo ?? ''}`;
      frecuencia.set(clave, { ...sv, n: (frecuencia.get(clave)?.n ?? 0) + 1 + (sv.marca ? 0.5 : 0) });
    }
    const elegido = [...frecuencia.values()].sort((a, b) => b.n - a.n)[0] ?? { marca: null, modelo: null };
    const kms = visitas.map((v) => v.km).filter((k) => k != null && k >= KM_MIN && k <= KM_MAX);
    const unidas = [...new Set(visitas.map((v) => v.placa))].filter((p) => p !== placa);
    return {
      placa,
      dueno: orden[orden.length - 1].clienteFinal,
      marca: elegido.marca,
      modelo: elegido.modelo,
      anio: pendientes.anios.get(placa) ?? null,
      kmActual: kms.length ? Math.max(...kms) : null,
      visitas: visitas.length,
      placasUnidas: unidas,
      personas: [...new Set(visitas.map((v) => v.clienteFinal))],
    };
  });

  // Clientes: todos los que trajeron un vehículo confiable (aunque hoy no sean el dueño).
  const variantes = new Map();
  for (const [nombre, final] of clientes.mapa) {
    if (!variantes.has(final)) variantes.set(final, new Set());
    variantes.get(final).add(nombre);
  }
  const nombresFinales = [...new Set(validas.map((f) => f.clienteFinal))];
  const listaClientes = nombresFinales.map((nombre) => {
    const todas = [...(variantes.get(nombre) ?? [nombre])];
    const telefono = todas.map((n) => pendientes.telefonos.get(n)).find(Boolean) ?? null;
    return {
      clave: nombre,
      nombre: enTitulo(nombre),
      telefono,
      variantes: todas.filter((n) => n !== nombre),
      vehiculos: vehiculos.filter((v) => v.dueno === nombre).map((v) => v.placa),
    };
  });

  return { filas, descartadas, vehiculos, clientes: listaClientes, unionesClientes: clientes.uniones, unionesPlacas: placas.uniones };
}

async function escribirReporte(r, destino, aplicado) {
  const libro = new ExcelJS.Workbook();
  const titulo = (hoja) => {
    hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
  };
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ header: 'Concepto', key: 'c', width: 52 }, { header: 'Cantidad', key: 'n', width: 12 }];
  [
    ['Filas de trabajo en el Excel', r.filas.length],
    ['Clientes que se cargan', r.clientes.length],
    ['  · con teléfono', r.clientes.filter((c) => c.telefono).length],
    ['  · con varios vehículos', r.clientes.filter((c) => c.vehiculos.length > 1).length],
    ['Vehículos que se cargan', r.vehiculos.length],
    ['  · con km conocido', r.vehiculos.filter((v) => v.kmActual).length],
    ['Filas descartadas (ver hoja "Descartados")', r.descartadas.length],
    ['Nombres unidos (mismo carro, escritura casi igual)', r.unionesClientes.length],
    ['Placas unidas (mismo cliente y marca, 1 letra)', r.unionesPlacas.length],
    ['Estado', aplicado ? 'CARGADO EN LA BASE' : 'SIMULACIÓN (no se escribió nada)'],
  ].forEach(([c, n]) => resumen.addRow({ c, n }));
  titulo(resumen);

  const hc = libro.addWorksheet('Clientes');
  hc.columns = [
    { header: 'Nombre', key: 'nombre', width: 32 },
    { header: 'Teléfono', key: 'telefono', width: 14 },
    { header: 'Vehículos', key: 'vehiculos', width: 30 },
    { header: 'También escrito como', key: 'variantes', width: 40 },
  ];
  r.clientes.forEach((c) => hc.addRow({ ...c, vehiculos: c.vehiculos.join(', '), variantes: c.variantes.join(' · ') }));
  titulo(hc);

  const hv = libro.addWorksheet('Vehículos');
  hv.columns = [
    { header: 'Placa', key: 'placa', width: 12 },
    { header: 'Marca', key: 'marca', width: 14 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Año', key: 'anio', width: 7 },
    { header: 'Dueño (visita más reciente)', key: 'dueno', width: 30 },
    { header: 'Último km', key: 'kmActual', width: 11 },
    { header: 'Visitas en el Excel', key: 'visitas', width: 10 },
    { header: 'Placas mal escritas unidas', key: 'placasUnidas', width: 22 },
    { header: 'También lo trajo', key: 'otros', width: 34 },
  ];
  r.vehiculos.forEach((v) =>
    hv.addRow({
      ...v,
      dueno: enTitulo(v.dueno),
      placasUnidas: v.placasUnidas.join(', '),
      otros: v.personas.filter((p) => p !== v.dueno).map(enTitulo).join(' · '),
    }),
  );
  titulo(hv);

  const hd = libro.addWorksheet('Descartados');
  hd.columns = [
    { header: 'Fila del Excel', key: 'fila', width: 9 },
    { header: 'Orden', key: 'ot', width: 8 },
    { header: 'Placa', key: 'placaOriginal', width: 12 },
    { header: 'Cliente', key: 'clienteOriginal', width: 28 },
    { header: 'Vehículo', key: 'vehiculoTexto', width: 24 },
    { header: 'Motivo', key: 'motivo', width: 70 },
  ];
  r.descartadas.sort((a, b) => a.fila - b.fila).forEach((d) => hd.addRow(d));
  titulo(hd);

  await libro.xlsx.writeFile(destino);
}

async function aplicar(r) {
  const prisma = new PrismaClient();
  const res = { clientesNuevos: 0, clientesExistentes: 0, telefonosAgregados: 0, vehiculosNuevos: 0, vehiculosExistentes: 0 };
  try {
    await prisma.$transaction(
      async (tx) => {
        // Clientes: se reutilizan los que ya existen con el mismo nombre (sin importar tildes ni mayúsculas).
        const existentes = new Map((await tx.cliente.findMany()).map((c) => [normalizarNombre(c.nombre), c]));
        const idPorClave = new Map();
        for (const c of r.clientes) {
          const previo = existentes.get(c.clave);
          if (previo) {
            res.clientesExistentes++;
            if (!previo.telefono && c.telefono) {
              await tx.cliente.update({ where: { id: previo.id }, data: { telefono: c.telefono } });
              res.telefonosAgregados++;
            }
            idPorClave.set(c.clave, previo.id);
          } else {
            const nuevo = await tx.cliente.create({
              data: { nombre: c.nombre, telefono: c.telefono, notas: 'Importado del Excel "Balance general" del taller.' },
            });
            res.clientesNuevos++;
            idPorClave.set(c.clave, nuevo.id);
          }
        }
        // Vehículos: si la placa ya existe en el sistema, no se toca.
        for (const v of r.vehiculos) {
          const placa = normalizarPlaca(v.placa);
          if (await tx.vehiculo.findUnique({ where: { placa } })) {
            res.vehiculosExistentes++;
            continue;
          }
          await tx.vehiculo.create({
            data: { placa, clienteId: idPorClave.get(v.dueno), marca: v.marca, modelo: v.modelo, anio: v.anio, kmActual: v.kmActual },
          });
          res.vehiculosNuevos++;
        }
      },
      { timeout: 120_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
  return res;
}

async function main() {
  const archivo = process.argv[2];
  const aplicarCambios = process.argv.includes('--aplicar');
  if (!archivo) throw new Error('Uso: node prisma/importar-clientes.js "<archivo.xlsx>" [--aplicar]');

  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  const r = preparar(leerMovimientos(libro), leerPendientes(libro));

  console.log('\n=== Cartera desde el Excel ===');
  console.log(`Filas de trabajo leídas:  ${r.filas.length}`);
  console.log(`Clientes a cargar:        ${r.clientes.length}  (con teléfono: ${r.clientes.filter((c) => c.telefono).length}, con varios vehículos: ${r.clientes.filter((c) => c.vehiculos.length > 1).length})`);
  console.log(`Vehículos a cargar:       ${r.vehiculos.length}  (con km conocido: ${r.vehiculos.filter((v) => v.kmActual).length})`);
  console.log(`Nombres unidos:           ${r.unionesClientes.map(([a, b]) => `${a} = ${b}`).join(' · ') || '—'}`);
  console.log(`Placas unidas:            ${r.unionesPlacas.map(([a, b]) => `${a} = ${b}`).join(' · ') || '—'}`);
  const motivos = new Map();
  for (const d of r.descartadas) {
    const m = d.motivo.startsWith('Placa inválida') ? 'Placa inválida' : d.motivo.split(':')[0];
    motivos.set(m, (motivos.get(m) ?? 0) + 1);
  }
  console.log(`Filas descartadas:        ${r.descartadas.length}  (${[...motivos].map(([m, n]) => `${m}: ${n}`).join(' · ')})`);

  let resultado = null;
  if (aplicarCambios) {
    resultado = await aplicar(r);
    console.log('\n✔ Cargado en la base:', resultado);
  } else {
    console.log('\n(Simulación: no se escribió nada. Revise el reporte y luego agregue --aplicar.)');
  }
  const reporte = path.join(path.dirname(path.resolve(archivo)), 'reporte-importacion-clientes.xlsx');
  await escribirReporte(r, reporte, aplicarCambios);
  console.log(`Reporte: ${reporte}\n`);
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}\n`);
  process.exit(1);
});

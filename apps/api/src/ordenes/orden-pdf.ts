/**
 * PDF de la orden de trabajo, con el formato del talonario del taller.
 * Se imprime al recibir el carro (para que el cliente firme) y otra vez al entregarlo.
 * Lo que aún no se llenó sale con líneas en blanco, para completar a mano si hace falta.
 */
import PdfPrinter from 'pdfmake';
import type { Column, Content, ContentStack, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  CHECKLIST_RECEPCION,
  clausulaAutorizacion,
  formatoNumeroOrden,
  HITOS_ORDEN,
  letraDanio,
  svgCombustible,
  svgVista,
  TALLER,
  textoCombustible,
  TIPOS_DANIO,
  VISTAS,
  type Carroceria,
  type ChecklistRecepcion,
  type MarcaDanio,
} from '@taller/shared';
import type { OrdenDetalle } from './ordenes.module';

const printer = new PdfPrinter({
  Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
});

const ROJO = '#c8102e';
const ROJO_SUAVE = '#fdecee';
const TINTA = '#1f2937';
const GRIS = '#6b7280';
const LINEA = '#d1d5db';

const ZONA = 'America/Guayaquil';
const fechaHora = (d: Date | null) =>
  d
    ? {
        fecha: d.toLocaleDateString('es-EC', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: d.toLocaleTimeString('es-EC', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }),
      }
    : null;
const fechaDia = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/');
const dinero = (n: number) => `$${n.toFixed(2)}`;
const km = (n: number) => n.toLocaleString('es-EC');

/** Barra de título de sección: fondo rojo, texto blanco. */
const seccion = (titulo: string, margenSuperior = 8): Content => ({
  margin: [0, margenSuperior, 0, 4],
  table: { widths: ['*'], body: [[{ text: titulo.toUpperCase(), color: '#ffffff', bold: true, fontSize: 8, characterSpacing: 1.2, margin: [6, 2, 0, 1] }]] },
  layout: { fillColor: () => ROJO, hLineWidth: () => 0, vLineWidth: () => 0 },
});

/** Celda "etiqueta pequeña + valor". Si no hay valor, deja espacio para escribir a mano. */
const campo = (etiqueta: string, valor?: string | number | null, opciones: { destacado?: boolean } = {}): ContentStack => ({
  stack: [
    { text: etiqueta.toUpperCase(), fontSize: 6, color: GRIS, bold: true, characterSpacing: 0.5 },
    valor !== null && valor !== undefined && valor !== ''
      ? { text: String(valor), fontSize: opciones.destacado ? 11 : 9, bold: true, color: TINTA, margin: [0, 1, 0, 0] }
      : { text: ' ', fontSize: 9, margin: [0, 1, 0, 0] },
  ],
  margin: [4, 3, 4, 3],
});

const bordesSuaves = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => LINEA,
  vLineColor: () => LINEA,
};

function encabezado(o: OrdenDetalle): Content {
  const estado =
    o.estado === 'ABIERTA' ? { t: 'EN TALLER', c: '#b45309' } : o.estado === 'CERRADA' ? { t: 'ENTREGADA', c: '#15803d' } : { t: 'ANULADA', c: GRIS };
  return {
    columns: [
      {
        width: 205,
        stack: [
          { text: 'MECÁNICA AUTOMOTRIZ', fontSize: 8, bold: true, color: GRIS, characterSpacing: 2.5 },
          { text: 'SÁNCHEZ', fontSize: 28, bold: true, color: TINTA, characterSpacing: 1, lineHeight: 1, margin: [0, 2, 0, 1] },
          { canvas: [{ type: 'rect', x: 0, y: 0, w: 150, h: 3, color: ROJO }] },
          { text: TALLER.lema, fontSize: 8, italics: true, color: GRIS, margin: [0, 3, 0, 0] },
        ],
      },
      {
        width: '*',
        margin: [8, 4, 0, 0],
        stack: [
          { text: TALLER.direccion, fontSize: 7.5, color: TINTA },
          { text: TALLER.ciudad, fontSize: 7.5, color: TINTA },
          { text: `Tel./WhatsApp: ${TALLER.telefono}`, fontSize: 7.5, color: TINTA, margin: [0, 3, 0, 0] },
          { text: TALLER.email, fontSize: 7.5, color: TINTA },
        ],
      },
      {
        width: 150,
        table: {
          widths: ['*'],
          body: [
            [{ text: 'ORDEN DE TRABAJO', bold: true, fontSize: 10, alignment: 'center', color: '#ffffff', fillColor: TINTA, margin: [0, 4, 0, 3] }],
            [
              {
                stack: [
                  { text: [{ text: 'N° ', fontSize: 10, color: GRIS }, { text: formatoNumeroOrden(o.numero), fontSize: 18, bold: true, color: ROJO }], alignment: 'center' },
                  { text: estado.t, fontSize: 7, bold: true, color: estado.c, alignment: 'center', characterSpacing: 1, margin: [0, 2, 0, 0] },
                ],
                margin: [0, 4, 0, 4],
              },
            ],
          ],
        },
        layout: { hLineWidth: () => 1.2, vLineWidth: () => 1.2, hLineColor: () => TINTA, vLineColor: () => TINTA },
      },
    ],
  };
}

function datosClienteVehiculo(o: OrdenDetalle): Content {
  const c = o.vehiculo.cliente;
  const v = o.vehiculo;
  return {
    columns: [
      {
        width: '*',
        stack: [
          seccion('Datos del cliente', 10),
          {
            table: {
              widths: ['*', 110],
              body: [
                [{ ...campo('Cliente', c.nombre, { destacado: true }), colSpan: 2 } as TableCell, {}],
                [campo('C.I. / RUC', c.cedulaRuc), campo('Teléfono', c.telefono)],
                [{ ...campo('Dirección', c.direccion), colSpan: 2 } as TableCell, {}],
                [campo('Fecha', fechaDia(o.fecha)), campo('Correo', c.email)],
              ],
            },
            layout: bordesSuaves,
          },
        ],
      },
      { width: 8, text: '' },
      {
        width: '*',
        stack: [
          seccion('Datos del vehículo', 10),
          {
            table: {
              widths: ['*', '*', '*'],
              body: [
                [
                  {
                    stack: [
                      { text: 'PLACA', fontSize: 6, color: GRIS, bold: true },
                      {
                        table: { body: [[{ text: v.placa, bold: true, fontSize: 11, margin: [5, 1, 5, 0] }]] },
                        layout: { hLineWidth: () => 1.2, vLineWidth: () => 1.2, hLineColor: () => TINTA, vLineColor: () => TINTA },
                        margin: [0, 1, 0, 0],
                      },
                    ],
                    margin: [4, 3, 4, 3],
                  },
                  campo('Marca', v.marca),
                  campo('Modelo', v.modelo),
                ],
                [campo('Año', v.anio), campo('Color', v.color), campo('Cilindraje', v.cilindraje)],
                [{ ...campo('Chasis', v.vin), colSpan: 2 } as TableCell, {}, campo('Kilómetros', km(o.kilometraje), { destacado: true })],
              ],
            },
            layout: bordesSuaves,
          },
        ],
      },
    ],
  };
}

function hitos(o: OrdenDetalle): Content {
  return {
    margin: [0, 8, 0, 0],
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        HITOS_ORDEN.map((h) => {
          const fh = fechaHora(o[h.clave]);
          return {
            stack: [
              { text: h.nombre.toUpperCase(), fontSize: 6, bold: true, color: ROJO, characterSpacing: 0.5 },
              fh
                ? { text: [{ text: fh.fecha, bold: true }, { text: `   ${fh.hora}`, color: GRIS }], fontSize: 9, margin: [0, 2, 0, 0] }
                : { text: '____/____/______    ____:____', fontSize: 8, color: '#9ca3af', margin: [0, 3, 0, 0] },
            ],
            margin: [5, 4, 5, 4],
          };
        }),
      ],
    },
    layout: { ...bordesSuaves, fillColor: () => '#fafafa' },
  };
}

/** Pastilla SÍ / NO. Si no se revisó, deja "SÍ  NO" en gris para encerrar a mano. */
function pastilla(valor: boolean | undefined): TableCell {
  if (valor === true) return { text: 'SÍ', bold: true, fontSize: 7, color: '#166534', fillColor: '#dcfce7', alignment: 'center' };
  if (valor === false) return { text: 'NO', bold: true, fontSize: 7, color: '#991b1b', fillColor: '#fee2e2', alignment: 'center' };
  return { text: 'SÍ · NO', fontSize: 6.5, color: '#9ca3af', alignment: 'center' };
}

function recepcion(o: OrdenDetalle): Content {
  const checklist = (o.recepcion ?? {}) as ChecklistRecepcion;
  const porColumna = 8;
  const columnas = [0, 1, 2].map((i) => CHECKLIST_RECEPCION.slice(i * porColumna, (i + 1) * porColumna));
  const tablaChecklist: ContentTable = {
    table: {
      widths: ['*', 30, 6, '*', 30, 6, '*', 30],
      body: Array.from({ length: porColumna }, (_, fila) =>
        columnas.flatMap((col, ci) => {
          const item = col[fila];
          const celdas: TableCell[] = [
            { text: item.nombre, fontSize: 7.5, color: TINTA, margin: [0, 1, 0, 0] },
            pastilla(checklist[item.clave]),
          ];
          return ci < 2 ? [...celdas, { text: '' }] : celdas;
        }),
      ),
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => '#eeeeee',
      paddingTop: () => 2,
      paddingBottom: () => 1.5,
    },
  };

  return {
    columns: [
      { width: '*', stack: [tablaChecklist] },
      { width: 10, text: '' },
      {
        width: 125,
        stack: [
          { text: 'COMBUSTIBLE', fontSize: 6.5, bold: true, color: GRIS, alignment: 'center', characterSpacing: 1 },
          { svg: svgCombustible(o.combustible, 115), width: 115, alignment: 'center' },
          { text: textoCombustible(o.combustible), alignment: 'center', bold: true, fontSize: 8, color: o.combustible == null ? '#9ca3af' : TINTA, margin: [0, 1, 0, 0] },
        ],
      },
    ],
  };
}

function carroceria(o: OrdenDetalle): Content[] {
  const tipo = (o.carroceria ?? 'AUTO') as Carroceria;
  const marcas = ((o.danios ?? []) as unknown as MarcaDanio[]).map((m, i) => ({ ...m, numero: i + 1 }));
  const anchos: Record<string, number> = { izquierda: 132, derecha: 132, frontal: 72, posterior: 72, superior: 110 };

  const dibujos: Content = {
    columns: VISTAS.map((v) => ({
      width: anchos[v.clave],
      stack: [
        { svg: svgVista(tipo, v.clave, marcas, anchos[v.clave]), width: anchos[v.clave] },
        { text: v.nombre, fontSize: 6.5, color: GRIS, alignment: 'center', margin: [0, 1, 0, 0] },
      ],
    })),
    columnGap: 4,
  };

  const leyendaTipos: Content = {
    text: [
      { text: 'Marcas: ', bold: true },
      ...TIPOS_DANIO.flatMap((t, i) => [{ text: t.letra, bold: true, color: ROJO }, ` ${t.nombre}${i < TIPOS_DANIO.length - 1 ? '   ·   ' : ''}`]),
    ],
    fontSize: 7,
    color: GRIS,
    margin: [0, 4, 0, 0],
  };

  const detalle: Content = marcas.length
    ? {
        margin: [0, 3, 0, 0],
        columns: [0, 1].map((col) => ({
          width: '*',
          stack: marcas
            .filter((_, i) => i % 2 === col)
            .map((m) => ({
              text: [
                { text: ` ${m.numero} `, bold: true, color: '#ffffff', background: ROJO },
                { text: `  ${letraDanio(m.tipo)} · `, bold: true, color: ROJO },
                `${TIPOS_DANIO.find((t) => t.clave === m.tipo)?.nombre} — ${VISTAS.find((v) => v.clave === m.vista)?.nombre.toLowerCase()}`,
                m.nota ? { text: `: ${m.nota}`, italics: true } : '',
              ],
              fontSize: 7.5,
              margin: [0, 1, 0, 1],
            })),
        })),
        columnGap: 10,
      }
    : { text: 'Sin golpes ni rayones registrados en la recepción.', fontSize: 7.5, italics: true, color: GRIS, margin: [0, 3, 0, 0] };

  return [dibujos, leyendaTipos, detalle];
}

function tablaItems(titulo: string, items: OrdenDetalle['items'], filasVacias: number): Content {
  const cuerpo: TableCell[][] = [
    [
      { text: 'CANT.', fontSize: 6.5, bold: true, color: GRIS, alignment: 'center' },
      { text: titulo.toUpperCase(), fontSize: 6.5, bold: true, color: GRIS },
      { text: 'VALOR', fontSize: 6.5, bold: true, color: GRIS, alignment: 'right' },
    ],
    ...items.map((i) => [
      { text: Number(i.cantidad) % 1 === 0 ? String(Number(i.cantidad)) : Number(i.cantidad).toFixed(2), fontSize: 8, alignment: 'center' as const },
      { text: i.descripcion, fontSize: 8 },
      { text: dinero(Number(i.cantidad) * Number(i.precioUnitario)), fontSize: 8, alignment: 'right' as const },
    ]),
    ...Array.from({ length: Math.max(0, filasVacias - items.length) }, () => [{ text: ' ', fontSize: 8 }, { text: ' ' }, { text: ' ' }]),
  ];
  return {
    table: { headerRows: 1, widths: [26, '*', 48], body: cuerpo },
    layout: {
      hLineWidth: (i, node) => (i === 1 ? 1 : i === 0 || i === node.table.body.length ? 0.8 : 0.4),
      vLineWidth: (i, node) => (i === 0 || i === node.table.widths!.length ? 0.8 : 0.4),
      hLineColor: (i) => (i === 1 ? ROJO : LINEA),
      vLineColor: () => LINEA,
      fillColor: (i) => (i === 0 ? ROJO_SUAVE : null),
      paddingTop: () => 2.5,
      paddingBottom: () => 2,
    },
  };
}

function detalleTrabajos(o: OrdenDetalle): Content[] {
  const repuestos = o.items.filter((i) => i.tipo === 'REPUESTO');
  const manoObra = o.items.filter((i) => i.tipo === 'MANO_OBRA');
  const suma = (l: typeof o.items) => l.reduce((s, i) => s + Number(i.cantidad) * Number(i.precioUnitario), 0);
  const filas = Math.max(4, repuestos.length, manoObra.length);
  const hayValores = o.items.length > 0;

  return [
    {
      columns: [
        { width: '*', stack: [seccion('Detalle de repuestos'), tablaItems('Repuesto', repuestos, filas)] },
        { width: 8, text: '' },
        { width: '*', stack: [seccion('Detalle de mano de obra'), tablaItems('Trabajo realizado', manoObra, filas)] },
      ],
    },
    {
      margin: [0, 5, 0, 0],
      columns: [
        {
          width: '*',
          stack: o.observaciones
            ? [
                { text: 'OBSERVACIONES', fontSize: 6.5, bold: true, color: GRIS },
                { text: o.observaciones, fontSize: 8, margin: [0, 1, 0, 0] },
              ]
            : [],
        },
        {
          width: 190,
          table: {
            widths: ['*', 70],
            body: [
              [{ text: 'Repuestos', fontSize: 8, color: GRIS }, { text: hayValores ? dinero(suma(repuestos)) : '', fontSize: 8, alignment: 'right' }],
              [{ text: 'Mano de obra', fontSize: 8, color: GRIS }, { text: hayValores ? dinero(suma(manoObra)) : '', fontSize: 8, alignment: 'right' }],
              [
                { text: 'TOTAL', bold: true, fontSize: 10, color: '#ffffff', fillColor: ROJO, margin: [2, 1, 0, 1] },
                { text: hayValores ? dinero(Number(o.total)) : '', bold: true, fontSize: 10, color: '#ffffff', fillColor: ROJO, alignment: 'right', margin: [0, 1, 2, 1] },
              ],
            ],
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => LINEA },
        },
      ],
    },
  ];
}

function autorizacionYFirmas(o: OrdenDetalle): Content[] {
  const c = o.vehiculo.cliente;
  const lineaFirma = (titulo: string, detalle: string): Column => ({
    width: '*',
    stack: [
      { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 230, y2: 0, lineWidth: 0.8, lineColor: TINTA }], margin: [0, 30, 0, 3] },
      { text: titulo, bold: true, fontSize: 8, alignment: 'center', characterSpacing: 1 },
      { text: detalle, fontSize: 7, color: GRIS, alignment: 'center' },
    ],
  });
  return [
    {
      margin: [0, 7, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: 'AUTORIZACIÓN DEL CLIENTE', bold: true, fontSize: 7, color: ROJO, characterSpacing: 1, margin: [0, 0, 0, 2] },
                ...clausulaAutorizacion(c.nombre, c.cedulaRuc).map((p) => ({ text: p, fontSize: 6.8, color: '#374151', alignment: 'justify' as const, margin: [0, 0, 0, 1.5] as [number, number, number, number] })),
              ],
              margin: [6, 4, 6, 3],
            },
          ],
        ],
      },
      layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => LINEA, vLineColor: () => LINEA, fillColor: () => '#fafafa' },
    },
    {
      unbreakable: true,
      columns: [
        lineaFirma('FIRMA DEL CLIENTE', `${c.nombre}${c.cedulaRuc ? `  ·  C.I. ${c.cedulaRuc}` : '  ·  C.I. ________________'}`),
        lineaFirma('FIRMA JEFE DE TALLER', TALLER.nombre),
      ],
    } as Content,
  ];
}

export function generarPdfOrden(o: OrdenDetalle) {
  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [28, 26, 28, 30],
    info: { title: `Orden de trabajo ${formatoNumeroOrden(o.numero)} · ${o.vehiculo.placa}`, author: TALLER.nombre },
    defaultStyle: { font: 'Helvetica', fontSize: 8, color: TINTA, lineHeight: 1.1 },
    footer: (pagina, total) => ({
      columns: [
        { text: `${TALLER.nombre} · Orden N° ${formatoNumeroOrden(o.numero)} · ${o.vehiculo.placa}`, fontSize: 6.5, color: '#9ca3af' },
        { text: `Página ${pagina} de ${total}`, fontSize: 6.5, color: '#9ca3af', alignment: 'right' },
      ],
      margin: [28, 10, 28, 0],
    }),
    content: [
      encabezado(o),
      datosClienteVehiculo(o),
      hitos(o),
      o.motivo
        ? {
            margin: [0, 6, 0, 0],
            text: [{ text: 'SOLICITUD DEL CLIENTE:  ', bold: true, fontSize: 7, color: ROJO, characterSpacing: 0.5 }, { text: o.motivo, fontSize: 9 }],
          }
        : '',
      seccion('Recepción del vehículo'),
      recepcion(o),
      seccion('Estado de la carrocería', 6),
      ...carroceria(o),
      ...detalleTrabajos(o),
      ...autorizacionYFirmas(o),
    ],
  };
  return printer.createPdfKitDocument(doc);
}

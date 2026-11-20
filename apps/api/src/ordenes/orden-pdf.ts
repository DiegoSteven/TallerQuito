/**
 * PDF de la orden de trabajo, con el formato del talonario del taller.
 * Se imprime al recibir el carro (para que el cliente firme) y otra vez al entregarlo.
 * Lo que aún no se llenó sale con líneas en blanco, para completar a mano si hace falta.
 *
 * Recuadros redondeados (como el talonario): pdfmake no redondea tablas, así que se arma en dos pasadas.
 *  1. Se maqueta el documento con marcas invisibles al inicio y fin de cada recuadro y se anota su posición.
 *  2. Se vuelve a maquetar dibujando, en el fondo de cada página, los marcos redondeados en esas posiciones.
 */
import PdfPrinter from 'pdfmake';
import type {
  CanvasElement,
  Column,
  Content,
  ContentStack,
  ContentTable,
  CustomTableLayout,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import {
  CHECKLIST_RECEPCION,
  clausulaAutorizacion,
  formatoNumeroOrden,
  HITOS_ORDEN,
  intervaloEfectivo,
  proximoCambio,
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
const FONDO_SUAVE = '#fafafa';

const MARGEN = 28;
const ANCHO = 595.28 - MARGEN * 2; // A4 menos márgenes
const SEPARACION = 8;
const MEDIO = (ANCHO - SEPARACION) / 2;
const RADIO = 6;

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
const mesAnio = (d: Date) => d.toLocaleDateString('es-EC', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '');

/** "Próximo cambio: 158.300 km · may 2027" (el sticker del parabrisas), si el trabajo es del catálogo. */
function textoProximo(o: OrdenDetalle, item: OrdenDetalle['items'][number]): string | null {
  if (!item.tipoServicio) return null;
  const p = proximoCambio(intervaloEfectivo(item, item.tipoServicio), { fecha: o.fecha, km: o.kilometraje });
  const partes = [p.km ? `${km(p.km)} km` : null, p.fecha ? mesAnio(p.fecha) : null].filter(Boolean);
  return partes.length ? `Próximo cambio: ${partes.join(' · ')}` : null;
}

// ───────────────────────── Recuadros redondeados ─────────────────────────

interface Recuadro {
  ancho: number;
  /** Color de la barra de título (si tiene título). */
  barra?: string;
  /** Relleno del cuerpo. */
  fondo?: string;
}

/** Posición de una marca en la página (la entrega pdfmake al maquetar). */
interface Posicion {
  pageNumber: number;
  left: number;
  top: number;
}

/** Marca invisible: solo sirve para saber dónde quedó un punto del documento. */
const marca = (id: string): Content => ({ text: ' ', fontSize: 1, lineHeight: 1, id });

/**
 * Arma un recuadro: barra de título opcional + cuerpo. Los bordes redondeados se dibujan en el fondo
 * (segunda pasada) usando las marcas `<id>-ini`, `<id>-bar` y `<id>-fin`.
 */
function crearRecuadros() {
  const registro = new Map<string, Recuadro>();
  const recuadro = (
    id: string,
    opciones: Recuadro & { titulo?: string; alinearTitulo?: 'left' | 'center' },
    cuerpo: Content[],
    margenCuerpo: [number, number, number, number] = [7, 4, 7, 4],
  ): ContentStack => {
    registro.set(id, opciones);
    return {
      stack: [
        marca(`${id}-ini`),
        ...(opciones.titulo
          ? [
              {
                text: opciones.titulo.toUpperCase(),
                color: '#ffffff',
                bold: true,
                fontSize: 8,
                characterSpacing: 1.2,
                alignment: opciones.alinearTitulo ?? 'left',
                margin: [9, 3, 9, 2],
              } as Content,
              marca(`${id}-bar`),
            ]
          : []),
        { stack: cuerpo, margin: margenCuerpo },
        marca(`${id}-fin`),
      ],
    };
  };

  /** Dibujos de fondo de una página: relleno, barra de título con esquinas superiores redondeadas y marco. */
  const fondo = (pagina: number, pos: Record<string, Posicion>): CanvasElement[] => {
    const dibujos: CanvasElement[] = [];
    for (const [id, r] of registro) {
      const ini = pos[`${id}-ini`];
      const fin = pos[`${id}-fin`];
      if (!ini || !fin || ini.pageNumber !== pagina || fin.pageNumber !== pagina) continue;
      const x = ini.left;
      const y = ini.top;
      const h = fin.top - ini.top + 1;
      if (r.fondo) dibujos.push({ type: 'rect', x, y, w: r.ancho, h, r: RADIO, color: r.fondo });
      const bar = pos[`${id}-bar`];
      if (r.barra && bar) {
        const hb = bar.top - y;
        dibujos.push({ type: 'rect', x, y, w: r.ancho, h: hb, r: RADIO, color: r.barra });
        // Esquinas inferiores de la barra rectas, para que se una con el cuerpo.
        dibujos.push({ type: 'rect', x, y: y + hb / 2, w: r.ancho, h: hb / 2, color: r.barra });
      }
      dibujos.push({ type: 'rect', x, y, w: r.ancho, h, r: RADIO, lineColor: r.barra ?? LINEA, lineWidth: 0.8 });
    }
    return dibujos;
  };

  return { recuadro, fondo };
}

/** Celda "etiqueta pequeña + valor". Si no hay valor, deja espacio para escribir a mano. */
const campo = (etiqueta: string, valor?: string | number | null, opciones: { destacado?: boolean } = {}): ContentStack => ({
  stack: [
    { text: etiqueta.toUpperCase(), fontSize: 6, color: GRIS, bold: true, characterSpacing: 0.5 },
    valor !== null && valor !== undefined && valor !== ''
      ? { text: String(valor), fontSize: opciones.destacado ? 11 : 9, bold: true, color: TINTA, margin: [0, 1, 0, 0] }
      : { text: ' ', fontSize: 9, margin: [0, 1, 0, 0] },
  ],
  margin: [2, 3, 2, 3],
});

/** Líneas solo por dentro: el borde exterior lo pone el recuadro redondeado. */
const lineasInternas: CustomTableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.6),
  vLineWidth: (i, node) => (i === 0 || i === (node.table.widths?.length ?? 0) ? 0 : 0.6),
  hLineColor: () => '#e5e7eb',
  vLineColor: () => '#e5e7eb',
};

type Recuadros = ReturnType<typeof crearRecuadros>;

// ───────────────────────── Secciones ─────────────────────────

function encabezado(o: OrdenDetalle, { recuadro }: Recuadros, logo: string | null): Content {
  const estado =
    o.estado === 'ABIERTA' ? { t: 'EN TALLER', c: '#b45309' } : o.estado === 'CERRADA' ? { t: 'ENTREGADA', c: '#15803d' } : { t: 'ANULADA', c: GRIS };
  return {
    columns: [
      {
        width: 205,
        stack: logo
          ? [
              { image: logo, fit: [200, 62] },
              { text: TALLER.lema, fontSize: 8, italics: true, color: GRIS, margin: [0, 3, 0, 0] },
            ]
          : [
          { text: 'TECNICENTRO AUTOMOTRIZ', fontSize: 8, bold: true, color: GRIS, characterSpacing: 2.5 },
          { text: 'SÁNCHEZ', fontSize: 28, bold: true, color: TINTA, characterSpacing: 1, lineHeight: 1, margin: [0, 2, 0, 1] },
          { canvas: [{ type: 'rect', x: 0, y: 0, w: 150, h: 3, r: 1.5, color: ROJO }] },
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
        ...recuadro('numero', { ancho: 150, barra: TINTA, titulo: 'Orden de trabajo', alinearTitulo: 'center' }, [
          {
            text: [{ text: 'N° ', fontSize: 10, color: GRIS }, { text: formatoNumeroOrden(o.numero), fontSize: 18, bold: true, color: ROJO }],
            alignment: 'center',
          },
          { text: estado.t, fontSize: 7, bold: true, color: estado.c, alignment: 'center', characterSpacing: 1, margin: [0, 2, 0, 0] },
        ]),
      } as Column,
    ],
  };
}

function datosClienteVehiculo(o: OrdenDetalle, { recuadro }: Recuadros): Content {
  const c = o.vehiculo.cliente;
  const v = o.vehiculo;
  return {
    margin: [0, 8, 0, 0],
    columns: [
      {
        width: MEDIO,
        ...recuadro('cliente', { ancho: MEDIO, barra: ROJO, titulo: 'Datos del cliente' }, [
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
            layout: lineasInternas,
          },
        ], [4, 2, 4, 2]),
      } as Column,
      { width: SEPARACION, text: '' },
      {
        width: MEDIO,
        ...recuadro('vehiculo', { ancho: MEDIO, barra: ROJO, titulo: 'Datos del vehículo' }, [
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
                    margin: [2, 3, 2, 3],
                  },
                  campo('Marca', v.marca),
                  campo('Modelo', v.modelo),
                ],
                [campo('Año', v.anio), campo('Color', v.color), campo('Cilindraje', v.cilindraje)],
                [{ ...campo('Chasis', v.vin), colSpan: 2 } as TableCell, {}, campo('Kilómetros', km(o.kilometraje), { destacado: true })],
              ],
            },
            layout: lineasInternas,
          },
        ], [4, 2, 4, 2]),
      } as Column,
    ],
  };
}

function hitos(o: OrdenDetalle, { recuadro }: Recuadros): Content {
  return {
    margin: [0, 5, 0, 0],
    ...recuadro('hitos', { ancho: ANCHO, fondo: FONDO_SUAVE }, [
      {
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
                margin: [3, 2, 3, 2],
              };
            }),
          ],
        },
        layout: lineasInternas,
      },
    ], [4, 3, 4, 3]),
  } as Content;
}

/** Pastilla SÍ / NO. Si no se revisó, deja "SÍ · NO" en gris para encerrar a mano. */
function pastilla(valor: boolean | undefined): TableCell {
  if (valor === true) return { text: 'SÍ', bold: true, fontSize: 7, color: '#166534', fillColor: '#dcfce7', alignment: 'center' };
  if (valor === false) return { text: 'NO', bold: true, fontSize: 7, color: '#991b1b', fillColor: '#fee2e2', alignment: 'center' };
  return { text: 'SÍ · NO', fontSize: 6.5, color: '#9ca3af', alignment: 'center' };
}

function recepcion(o: OrdenDetalle, { recuadro }: Recuadros): Content {
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
      paddingTop: () => 1.6,
      paddingBottom: () => 1.2,
    },
  };

  return {
    margin: [0, 5, 0, 0],
    ...recuadro('recepcion', { ancho: ANCHO, barra: ROJO, titulo: 'Recepción del vehículo' }, [
      {
        columns: [
          { width: '*', stack: [tablaChecklist] },
          { width: 10, text: '' },
          {
            width: 125,
            stack: [
              { text: 'COMBUSTIBLE', fontSize: 6.5, bold: true, color: GRIS, alignment: 'center', characterSpacing: 1 },
              { svg: svgCombustible(o.combustible, 115), width: 115, alignment: 'center' },
              {
                text: textoCombustible(o.combustible),
                alignment: 'center',
                bold: true,
                fontSize: 8,
                color: o.combustible == null ? '#9ca3af' : TINTA,
                margin: [0, 1, 0, 0],
              },
            ],
          },
        ],
      },
    ]),
  } as Content;
}

function carroceria(o: OrdenDetalle, { recuadro }: Recuadros): Content {
  const tipo = (o.carroceria ?? 'AUTO') as Carroceria;
  const marcas = ((o.danios ?? []) as unknown as MarcaDanio[]).map((m, i) => ({ ...m, numero: i + 1 }));
  const anchos: Record<string, number> = { izquierda: 130, derecha: 130, frontal: 70, posterior: 70, superior: 108 };

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

  return {
    margin: [0, 5, 0, 0],
    ...recuadro('carroceria', { ancho: ANCHO, barra: ROJO, titulo: 'Estado de la carrocería' }, [dibujos, leyendaTipos, detalle]),
  } as Content;
}

function tablaItems(o: OrdenDetalle, titulo: string, items: OrdenDetalle['items'], filasVacias: number): Content {
  const cuerpo: TableCell[][] = [
    [
      { text: 'CANT.', fontSize: 6.5, bold: true, color: GRIS, alignment: 'center' },
      { text: titulo.toUpperCase(), fontSize: 6.5, bold: true, color: GRIS },
      { text: 'VALOR', fontSize: 6.5, bold: true, color: GRIS, alignment: 'right' },
    ],
    ...items.map((i) => [
      { text: Number(i.cantidad) % 1 === 0 ? String(Number(i.cantidad)) : Number(i.cantidad).toFixed(2), fontSize: 8, alignment: 'center' as const },
      ((proximo) =>
        proximo
          ? { stack: [{ text: i.descripcion, fontSize: 8 }, { text: proximo, fontSize: 6.5, italics: true, color: ROJO }] }
          : { text: i.descripcion, fontSize: 8 })(textoProximo(o, i)),
      { text: dinero(Number(i.cantidad) * Number(i.precioUnitario)), fontSize: 8, alignment: 'right' as const },
    ]),
    ...Array.from({ length: Math.max(0, filasVacias - items.length) }, () => [{ text: ' ', fontSize: 8 }, { text: ' ' }, { text: ' ' }]),
  ];
  return {
    table: { headerRows: 1, widths: [26, '*', 48], body: cuerpo },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : i === 1 ? 1 : 0.4),
      vLineWidth: (i, node) => (i === 0 || i === (node.table.widths?.length ?? 0) ? 0 : 0.4),
      hLineColor: (i) => (i === 1 ? ROJO : LINEA),
      vLineColor: () => LINEA,
      fillColor: (i) => (i === 0 ? ROJO_SUAVE : null),
      paddingTop: () => 2.5,
      paddingBottom: () => 2,
    },
  };
}

function detalleTrabajos(o: OrdenDetalle, { recuadro }: Recuadros): Content[] {
  const repuestos = o.items.filter((i) => i.tipo === 'REPUESTO');
  const manoObra = o.items.filter((i) => i.tipo === 'MANO_OBRA');
  const suma = (l: typeof o.items) => l.reduce((s, i) => s + Number(i.cantidad) * Number(i.precioUnitario), 0);
  const filas = Math.max(4, repuestos.length, manoObra.length);
  const hayValores = o.items.length > 0;
  const ANCHO_TOTAL = 190;

  return [
    {
      margin: [0, 5, 0, 0],
      columns: [
        {
          width: MEDIO,
          ...recuadro('repuestos', { ancho: MEDIO, barra: ROJO, titulo: 'Detalle de repuestos' }, [tablaItems(o, 'Repuesto', repuestos, filas)], [0, 0, 0, 3]),
        } as Column,
        { width: SEPARACION, text: '' },
        {
          width: MEDIO,
          ...recuadro('manoobra', { ancho: MEDIO, barra: ROJO, titulo: 'Detalle de mano de obra' }, [tablaItems(o, 'Trabajo realizado', manoObra, filas)], [0, 0, 0, 3]),
        } as Column,
      ],
    },
    {
      margin: [0, 4, 0, 0],
      columns: [
        {
          width: '*',
          stack: o.observaciones
            ? [
                { text: 'OBSERVACIONES', fontSize: 6.5, bold: true, color: GRIS },
                { text: o.observaciones, fontSize: 8, margin: [0, 1, 10, 0] },
              ]
            : [],
        },
        {
          width: ANCHO_TOTAL,
          ...recuadro('total', { ancho: ANCHO_TOTAL }, [
            {
              table: {
                widths: ['*', 70],
                body: [
                  [{ text: 'Repuestos', fontSize: 8, color: GRIS }, { text: hayValores ? dinero(suma(repuestos)) : '', fontSize: 8, alignment: 'right' }],
                  [{ text: 'Mano de obra', fontSize: 8, color: GRIS }, { text: hayValores ? dinero(suma(manoObra)) : '', fontSize: 8, alignment: 'right' }],
                  [
                    { text: 'TOTAL', bold: true, fontSize: 11, color: ROJO, margin: [0, 2, 0, 0] },
                    { text: hayValores ? dinero(Number(o.total)) : '', bold: true, fontSize: 11, color: ROJO, alignment: 'right', margin: [0, 2, 0, 0] },
                  ],
                ],
              },
              layout: {
                hLineWidth: (i, node) => (i === node.table.body.length - 1 ? 1 : 0),
                vLineWidth: () => 0,
                hLineColor: () => ROJO,
              },
            },
          ], [6, 3, 6, 3]),
        } as Column,
      ],
    },
  ];
}

function autorizacionYFirmas(o: OrdenDetalle, { recuadro }: Recuadros): Content[] {
  const c = o.vehiculo.cliente;
  const lineaFirma = (titulo: string, detalle: string): Column => ({
    width: '*',
    stack: [
      { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 230, y2: 0, lineWidth: 0.8, lineColor: TINTA }], margin: [0, 20, 0, 3] },
      { text: titulo, bold: true, fontSize: 8, alignment: 'center', characterSpacing: 1 },
      { text: detalle, fontSize: 7, color: GRIS, alignment: 'center' },
    ],
  });
  return [
    {
      margin: [0, 5, 0, 0],
      ...recuadro('autorizacion', { ancho: ANCHO, fondo: FONDO_SUAVE }, [
        { text: 'AUTORIZACIÓN DEL CLIENTE', bold: true, fontSize: 7, color: ROJO, characterSpacing: 1, margin: [0, 0, 0, 2] },
        ...clausulaAutorizacion(c.nombre, c.cedulaRuc).map((p) => ({
          text: p,
          fontSize: 6.8,
          color: '#374151',
          alignment: 'justify' as const,
          margin: [0, 0, 0, 1.5] as [number, number, number, number],
        })),
      ]),
    } as Content,
    {
      unbreakable: true,
      columns: [
        lineaFirma('FIRMA DEL CLIENTE', `${c.nombre}${c.cedulaRuc ? `  ·  C.I. ${c.cedulaRuc}` : '  ·  C.I. ________________'}`),
        lineaFirma('FIRMA JEFE DE TALLER', TALLER.nombre),
      ],
    } as Content,
  ];
}

function documento(o: OrdenDetalle, r: Recuadros, logo: string | null, extra: Partial<TDocumentDefinitions>): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [MARGEN, 26, MARGEN, 30],
    info: { title: `Orden de trabajo ${formatoNumeroOrden(o.numero)} · ${o.vehiculo.placa}`, author: TALLER.nombre },
    defaultStyle: { font: 'Helvetica', fontSize: 8, color: TINTA, lineHeight: 1.1 },
    footer: (pagina, total) => ({
      columns: [
        { text: `${TALLER.nombre} · Orden N° ${formatoNumeroOrden(o.numero)} · ${o.vehiculo.placa}`, fontSize: 6.5, color: '#9ca3af' },
        { text: `Página ${pagina} de ${total}`, fontSize: 6.5, color: '#9ca3af', alignment: 'right' },
      ],
      margin: [MARGEN, 10, MARGEN, 0],
    }),
    content: [
      encabezado(o, r, logo),
      datosClienteVehiculo(o, r),
      hitos(o, r),
      o.motivo
        ? {
            margin: [2, 6, 0, 0],
            text: [{ text: 'SOLICITUD DEL CLIENTE:  ', bold: true, fontSize: 7, color: ROJO, characterSpacing: 0.5 }, { text: o.motivo, fontSize: 9 }],
          }
        : '',
      recepcion(o, r),
      carroceria(o, r),
      ...detalleTrabajos(o, r),
      ...autorizacionYFirmas(o, r),
    ],
    ...extra,
  };
}

/** `logo`: data URL PNG/JPG del logo del taller; si es null se muestra el nombre en texto. */
export function generarPdfOrden(o: OrdenDetalle, logo: string | null = null) {
  // 1.ª pasada: medir dónde cae cada recuadro.
  const medicion = crearRecuadros();
  const posiciones: Record<string, Posicion> = {};
  printer
    .createPdfKitDocument(
      documento(o, medicion, logo, {
        pageBreakBefore: (nodo) => {
          if (nodo.id && nodo.startPosition) posiciones[nodo.id] = nodo.startPosition as Posicion;
          return false;
        },
      }),
    )
    .end();

  // 2.ª pasada: el mismo documento, con los marcos redondeados dibujados en el fondo de cada página.
  const final = crearRecuadros();
  return printer.createPdfKitDocument(
    documento(o, final, logo, { background: (pagina) => ({ canvas: final.fondo(pagina, posiciones) }) }),
  );
}

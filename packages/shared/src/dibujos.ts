/**
 * Dibujos de la carrocería y del medidor de combustible en SVG.
 * Los usan la web (para marcar golpes con el dedo) y el PDF de la orden (pdfmake → svg),
 * así lo que se marca en pantalla sale idéntico en papel.
 */
import type { Carroceria, MarcaDanio, Vista } from './recepcion';
import { COMBUSTIBLE_MAX, TIPOS_DANIO } from './recepcion';

interface Dibujo {
  w: number;
  h: number;
  /** Contenido SVG (sin la etiqueta <svg>). Usa {L} como color de línea y {R} para llantas. */
  trazo: string;
}

const rueda = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="15" fill="#ffffff" stroke="{L}" stroke-width="1.6"/>` +
  `<circle cx="${cx}" cy="${cy}" r="12" fill="{R}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="5" fill="#ffffff"/>`;

const LADO_AUTO =
  `<path d="M14,62 L14,50 Q14,44 22,42 L62,38 Q76,22 92,19 L148,18 Q160,19 176,36 L200,40 Q208,42 208,50 L208,62 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M70,37 L92,23 L118,22 L118,37 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
  `<path d="M123,37 L123,22 L146,22 Q156,23 168,37 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
  `<path d="M120,39 L120,62 M66,40 L66,62 M172,40 L172,56" stroke="{L}" stroke-width="1" fill="none"/>` +
  `<path d="M96,45 L106,45 M146,45 L156,45" stroke="{L}" stroke-width="1.6" fill="none"/>` +
  `<path d="M15,46 L27,45 L27,50 L15,51 Z" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
  `<path d="M200,43 L207,44 L207,50 L200,50 Z" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
  rueda(52, 64) +
  rueda(170, 64);

const LADO_CAMIONETA =
  `<path d="M10,62 L10,48 Q10,42 18,40 L56,37 Q66,20 76,16 L118,15 Q122,15 122,20 L122,38 L208,38 L208,62 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M66,36 L80,20 L98,20 L98,36 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
  `<path d="M102,36 L102,20 L117,20 L117,36 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
  `<path d="M125,38 L125,62 M125,43 L208,43 M100,39 L100,62" stroke="{L}" stroke-width="1" fill="none"/>` +
  `<path d="M84,45 L94,45 M106,45 L114,45" stroke="{L}" stroke-width="1.6" fill="none"/>` +
  `<path d="M11,45 L23,44 L23,49 L11,50 Z" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
  `<path d="M203,41 L208,41 L208,50 L203,50 Z" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
  rueda(48, 64) +
  rueda(174, 64);

/** Vista del lado derecho = espejo del izquierdo. */
const espejo = (trazo: string, w: number) => `<g transform="translate(${w},0) scale(-1,1)">${trazo}</g>`;

const llantasFrente = (y: number) =>
  `<rect x="24" y="${y}" width="16" height="11" rx="2" fill="{R}"/><rect x="100" y="${y}" width="16" height="11" rx="2" fill="{R}"/>`;

const DIBUJOS: Record<Carroceria, Record<Vista, Dibujo>> = {
  AUTO: {
    izquierda: { w: 222, h: 82, trazo: LADO_AUTO },
    derecha: { w: 222, h: 82, trazo: espejo(LADO_AUTO, 222) },
    frontal: {
      w: 140,
      h: 84,
      trazo:
        llantasFrente(66) +
        `<path d="M22,70 L20,50 Q20,42 28,40 L36,22 Q38,16 46,16 L94,16 Q102,16 104,22 L112,40 Q120,42 120,50 L118,70 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M40,38 L46,22 L94,22 L100,38 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M20,41 L11,39 L11,46 L20,46 Z M120,41 L129,39 L129,46 L120,46 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<ellipse cx="35" cy="50" rx="9" ry="4.5" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
        `<ellipse cx="105" cy="50" rx="9" ry="4.5" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
        `<rect x="50" y="45" width="40" height="11" rx="3" fill="#e5e7eb" stroke="{L}" stroke-width="1"/>` +
        `<path d="M24,61 L116,61" stroke="{L}" stroke-width="1" fill="none"/>` +
        `<rect x="58" y="63" width="24" height="6" fill="#ffffff" stroke="{L}" stroke-width="0.8"/>`,
    },
    posterior: {
      w: 140,
      h: 84,
      trazo:
        llantasFrente(66) +
        `<path d="M22,70 L20,50 Q20,42 28,40 L36,22 Q38,16 46,16 L94,16 Q102,16 104,22 L112,40 Q120,42 120,50 L118,70 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M42,38 L47,24 L93,24 L98,38 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M28,43 L112,43" stroke="{L}" stroke-width="1" fill="none"/>` +
        `<rect x="22" y="46" width="16" height="7" rx="1.5" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
        `<rect x="102" y="46" width="16" height="7" rx="1.5" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
        `<rect x="58" y="52" width="24" height="7" fill="#ffffff" stroke="{L}" stroke-width="0.8"/>` +
        `<path d="M24,62 L116,62" stroke="{L}" stroke-width="1" fill="none"/>`,
    },
    superior: {
      w: 222,
      h: 100,
      trazo:
        `<path d="M64,20 L60,9 L70,9 Z M64,80 L60,91 L70,91 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<path d="M18,50 Q18,22 40,18 L180,16 Q204,18 206,50 Q204,82 180,84 L40,82 Q18,78 18,50 Z" fill="#ffffff" stroke="{L}" stroke-width="2"/>` +
        `<path d="M62,24 Q55,50 62,76 L84,72 Q80,50 84,28 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M84,28 L150,27 Q154,50 150,73 L84,72 Q80,50 84,28 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<path d="M150,27 L170,30 Q175,50 170,70 L150,73 Q154,50 150,27 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M24,36 Q36,34 56,30 M24,64 Q36,66 56,70" stroke="{L}" stroke-width="0.8" fill="none"/>`,
    },
  },
  CAMIONETA: {
    izquierda: { w: 222, h: 82, trazo: LADO_CAMIONETA },
    derecha: { w: 222, h: 82, trazo: espejo(LADO_CAMIONETA, 222) },
    frontal: {
      w: 140,
      h: 84,
      trazo:
        llantasFrente(68) +
        `<path d="M18,72 L16,48 Q16,40 26,38 L34,16 Q36,10 44,10 L96,10 Q104,10 106,16 L114,38 Q124,40 124,48 L122,72 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M38,35 L44,16 L96,16 L102,35 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M16,38 L7,36 L7,44 L16,44 Z M124,38 L133,36 L133,44 L124,44 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<rect x="21" y="43" width="20" height="8" rx="2" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
        `<rect x="99" y="43" width="20" height="8" rx="2" fill="#fde68a" stroke="{L}" stroke-width="1"/>` +
        `<rect x="45" y="42" width="50" height="14" rx="2" fill="#e5e7eb" stroke="{L}" stroke-width="1"/>` +
        `<path d="M19,62 L121,62" stroke="{L}" stroke-width="1.2" fill="none"/>` +
        `<rect x="58" y="64" width="24" height="6" fill="#ffffff" stroke="{L}" stroke-width="0.8"/>`,
    },
    posterior: {
      w: 140,
      h: 84,
      trazo:
        llantasFrente(68) +
        `<path d="M18,72 L18,40 L30,38 L36,14 Q38,10 44,10 L96,10 Q102,10 104,14 L110,38 L122,40 L122,72 Z" fill="#ffffff" stroke="{L}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M42,33 L46,16 L94,16 L98,33 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<rect x="26" y="42" width="88" height="20" rx="1.5" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<rect x="18" y="42" width="6" height="14" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
        `<rect x="116" y="42" width="6" height="14" fill="#fca5a5" stroke="{L}" stroke-width="1"/>` +
        `<rect x="58" y="64" width="24" height="6" fill="#ffffff" stroke="{L}" stroke-width="0.8"/>`,
    },
    superior: {
      w: 222,
      h: 100,
      trazo:
        `<path d="M60,22 L56,10 L66,10 Z M60,78 L56,90 L66,90 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<path d="M14,50 Q14,24 34,20 L204,18 Q208,18 208,22 L208,78 Q208,82 204,82 L34,80 Q14,76 14,50 Z" fill="#ffffff" stroke="{L}" stroke-width="2"/>` +
        `<path d="M58,25 Q52,50 58,75 L78,72 Q74,50 78,28 Z" fill="#eef2f7" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M78,28 L118,27 L118,73 L78,72 Q74,50 78,28 Z" fill="#ffffff" stroke="{L}" stroke-width="1.2"/>` +
        `<path d="M118,27 L122,27 L122,73 L118,73 Z" fill="#eef2f7" stroke="{L}" stroke-width="1"/>` +
        `<path d="M127,24 L204,24 L204,76 L127,76 Z" fill="#f3f4f6" stroke="{L}" stroke-width="1.4"/>` +
        `<path d="M140,24 L140,76 M160,24 L160,76 M180,24 L180,76" stroke="#d1d5db" stroke-width="0.8" fill="none"/>`,
    },
  },
};

export function medidasVista(carroceria: Carroceria, vista: Vista) {
  const d = DIBUJOS[carroceria][vista];
  return { w: d.w, h: d.h };
}

const COLORES = { linea: '#1f2937', llanta: '#374151', marca: '#c8102e' };

/** Trazo de una vista, listo para insertar dentro de un <svg viewBox="0 0 w h">. */
export function trazoVista(carroceria: Carroceria, vista: Vista): string {
  return DIBUJOS[carroceria][vista].trazo.replaceAll('{L}', COLORES.linea).replaceAll('{R}', COLORES.llanta);
}

export const letraDanio = (tipo: string) => TIPOS_DANIO.find((t) => t.clave === tipo)?.letra ?? '?';

/**
 * SVG completo de una vista con sus marcas numeradas.
 * `numeros` permite numerar las marcas de forma global (1, 2, 3… en toda la orden).
 */
export function svgVista(
  carroceria: Carroceria,
  vista: Vista,
  marcas: (MarcaDanio & { numero: number })[],
  ancho: number,
): string {
  const { w, h } = medidasVista(carroceria, vista);
  const puntos = marcas
    .filter((m) => m.vista === vista)
    .map((m) => {
      const x = (m.x * w).toFixed(1);
      const y = (m.y * h).toFixed(1);
      return (
        `<circle cx="${x}" cy="${y}" r="7.5" fill="${COLORES.marca}" stroke="#ffffff" stroke-width="1.5"/>` +
        `<text x="${x}" y="${(m.y * h + 3.3).toFixed(1)}" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">${m.numero}</text>`
      );
    })
    .join('');
  const alto = Math.round((ancho * h) / w);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${w} ${h}">${trazoVista(carroceria, vista)}${puntos}</svg>`;
}

/** Medidor de combustible tipo tablero (E — F) con la aguja en el nivel dado (0–8). */
export function svgCombustible(octavos: number | null | undefined, ancho = 120): string {
  const cx = 60;
  const cy = 58;
  const r = 46;
  const punto = (frac: number, radio: number) => {
    const a = Math.PI * (1 - frac);
    return [cx + radio * Math.cos(a), cy - radio * Math.sin(a)].map((n) => n.toFixed(2));
  };
  let marcas = '';
  for (let i = 0; i <= COMBUSTIBLE_MAX; i++) {
    const largo = i % 2 === 0 ? 9 : 5;
    const [x1, y1] = punto(i / COMBUSTIBLE_MAX, r);
    const [x2, y2] = punto(i / COMBUSTIBLE_MAX, r - largo);
    marcas += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f2937" stroke-width="${i % 2 === 0 ? 2 : 1.2}"/>`;
  }
  const [rx1, ry1] = punto(0, r);
  const [rx2, ry2] = punto(1 / COMBUSTIBLE_MAX, r);
  const reserva = `<path d="M${rx1},${ry1} A${r},${r} 0 0 1 ${rx2},${ry2}" stroke="#c8102e" stroke-width="5" fill="none"/>`;
  const arco = `<path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" stroke="#1f2937" stroke-width="2" fill="none"/>`;
  let aguja = '';
  if (octavos != null) {
    const [ax, ay] = punto(Math.min(Math.max(octavos, 0), COMBUSTIBLE_MAX) / COMBUSTIBLE_MAX, r - 12);
    aguja = `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="#c8102e" stroke-width="3" stroke-linecap="round"/>`;
  }
  const textos =
    `<text x="${cx - r - 2}" y="${cy + 12}" font-size="11" font-weight="bold" fill="#1f2937" text-anchor="middle">E</text>` +
    `<text x="${cx + r + 2}" y="${cy + 12}" font-size="11" font-weight="bold" fill="#1f2937" text-anchor="middle">F</text>`;
  const alto = Math.round((ancho * 72) / 120);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 120 72">${reserva}${arco}${marcas}${aguja}<circle cx="${cx}" cy="${cy}" r="5" fill="#1f2937"/>${textos}</svg>`;
}

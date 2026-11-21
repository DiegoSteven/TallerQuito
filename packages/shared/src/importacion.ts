/**
 * Limpieza del historial que el taller llevaba en Excel, antes de cargarlo al sistema.
 * Regla de oro: solo se unen errores de tipeo SEGUROS; lo dudoso no se carga (va al reporte).
 */

/** "Sr. José  Pérez" → "JOSE PEREZ" (para comparar). */
export function normalizarNombre(texto: unknown): string {
  return String(texto ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(SR|SRA|SRTA|SRES|ING|DR|DRA|LCDO|LCDA)\b\.?/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MINUSCULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'E']);
/** "JUAN DE LA TORRE" → "Juan de la Torre" (para guardar). */
export function enTitulo(normalizado: string): string {
  return normalizado
    .split(' ')
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p.toLowerCase() : p.charAt(0) + p.slice(1).toLowerCase()))
    .join(' ');
}

/** Distancia de Damerau-Levenshtein: cuántas letras hay que cambiar, agregar, quitar o invertir. */
export function distanciaDL(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Placa sin guiones ni espacios: "pbj-8761" → "PBJ8761". */
export const placaCompacta = (texto: unknown) => String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Formatos válidos en Ecuador: auto ABC1234 · moto AB123C. */
export const placaValida = (compacta: string) => /^[A-Z]{3}\d{4}$/.test(compacta) || /^[A-Z]{2}\d{3}[A-Z]$/.test(compacta);

// ───────────────────────── Marca y modelo ─────────────────────────

const MARCAS: Record<string, string> = {
  CHEVROLET: 'Chevrolet', NISSAN: 'Nissan', TOYOTA: 'Toyota', FORD: 'Ford', HYUNDAI: 'Hyundai', MITSUBISHI: 'Mitsubishi',
  VOLKSWAGEN: 'Volkswagen', PEUGEOT: 'Peugeot', SHINERAY: 'Shineray', KIA: 'Kia', DAEWOO: 'Daewoo', MAZDA: 'Mazda',
  FIAT: 'Fiat', SOUEAST: 'Soueast', JEEP: 'Jeep', BMW: 'BMW', RENAULT: 'Renault', HONDA: 'Honda', SUZUKI: 'Suzuki',
  CHERY: 'Chery', JAC: 'JAC', AUDI: 'Audi', SUBARU: 'Subaru', DODGE: 'Dodge', CITROEN: 'Citroën', SKODA: 'Škoda',
  ISUZU: 'Isuzu', DFSK: 'DFSK', HINO: 'Hino', VOLVO: 'Volvo', MERCEDES: 'Mercedes-Benz', LEXUS: 'Lexus', JMC: 'JMC',
  GEELY: 'Geely', CHANGAN: 'Changan', HAVAL: 'Haval', MG: 'MG', BYD: 'BYD', GREATWALL: 'Great Wall', LANDROVER: 'Land Rover',
};
/** Escrituras que aparecen en el Excel → marca correcta. */
const ALIAS_MARCA: Record<string, string> = {
  HUNDAY: 'HYUNDAI', HUNDAI: 'HYUNDAI', HYUNDAY: 'HYUNDAI', PEUGOT: 'PEUGEOT', PEUGET: 'PEUGEOT', VW: 'VOLKSWAGEN',
  WALWAGEN: 'VOLKSWAGEN', WALSWAGEN: 'VOLKSWAGEN', VOLSWAGEN: 'VOLKSWAGEN', VOLKSWAGUEN: 'VOLKSWAGEN', RENOUL: 'RENAULT',
  RENAUL: 'RENAULT', RENOL: 'RENAULT', SNIDERAY: 'SHINERAY', SHINERAI: 'SHINERAY', SOVEAST: 'SOUEAST', CHEVROLETH: 'CHEVROLET',
  CHEVROLT: 'CHEVROLET', CHEBROLET: 'CHEVROLET', MITSUBICHI: 'MITSUBISHI', MITSUBISCHI: 'MITSUBISHI', MAZDA3: 'MAZDA',
  SUSUKI: 'SUZUKI', MERCEDEZ: 'MERCEDES', BENZ: 'MERCEDES',
};
/** Modelos mal escritos frecuentes. */
const ALIAS_MODELO: Record<string, string> = { CORROLLA: 'COROLLA', COROLA: 'COROLLA', TRACKET: 'TRACKER', TRAQUET: 'TRACKER', DMAX: 'D-MAX', RAV: 'RAV4' };

/** "HUNDAY ELANTRA" → { marca: 'Hyundai', modelo: 'Elantra' } · "VITARA CHEVROLET" → { marca: 'Chevrolet', modelo: 'Vitara' }. */
export function separarVehiculo(texto: unknown): { marca: string | null; modelo: string | null } {
  let t = normalizarNombre(texto);
  // Great Wall llega como "GREAT WALL", "GREAT WELL", "GRAT WELL"…
  t = t.replace(/\bGRE?A?T W[AE]LL\b/g, 'GREATWALL').replace(/\bGRE?A?T\b/g, 'GREATWALL').replace(/\bLAND ROVER\b/g, 'LANDROVER');
  const palabras = t.split(' ').filter(Boolean);
  let marca: string | null = null;
  const resto: string[] = [];
  for (const p of palabras) {
    const clave = ALIAS_MARCA[p] ?? p;
    if (!marca && MARCAS[clave]) marca = MARCAS[clave];
    else resto.push(ALIAS_MODELO[p] ?? p);
  }
  const modelo = resto.length ? resto.map((p) => (p.length <= 3 && /\d/.test(p) ? p : enTitulo(p))).join(' ') : null;
  return { marca, modelo };
}

// ───────────────────────── Uniones seguras ─────────────────────────

export interface FilaHistorial {
  placa: string; // compacta y válida
  cliente: string; // normalizado
  marca: string | null;
}

class Grupos {
  private padre = new Map<string, string>();
  raiz(x: string): string {
    let r = x;
    while (this.padre.has(r) && this.padre.get(r) !== r) r = this.padre.get(r)!;
    return r;
  }
  /** Une dos grupos; el que queda es el más frecuente (o el primero en orden alfabético si empatan). */
  unir(a: string, b: string, peso: (x: string) => number) {
    const ra = this.raiz(a);
    const rb = this.raiz(b);
    if (ra === rb) return;
    const [queda, sale] = peso(ra) > peso(rb) || (peso(ra) === peso(rb) && ra < rb) ? [ra, rb] : [rb, ra];
    this.padre.set(sale, queda);
  }
}

/**
 * Nombres del MISMO cliente escritos distinto: solo si atendieron la MISMA placa y difieren en ≤ 2 letras
 * (con nombres de al menos 6 letras). "DIANA GRANDA" = "DIANA GRANJA"; "PEDRO CALISTO" ≠ "RICARDO LUZURIAGA".
 * Devuelve nombre → nombre elegido (el más frecuente).
 */
export function unirClientes(filas: FilaHistorial[]): { mapa: Map<string, string>; uniones: [string, string][] } {
  const frecuencia = new Map<string, number>();
  const porPlaca = new Map<string, Set<string>>();
  for (const f of filas) {
    frecuencia.set(f.cliente, (frecuencia.get(f.cliente) ?? 0) + 1);
    if (!porPlaca.has(f.placa)) porPlaca.set(f.placa, new Set());
    porPlaca.get(f.placa)!.add(f.cliente);
  }
  const g = new Grupos();
  const peso = (x: string) => frecuencia.get(x) ?? 0;
  const uniones: [string, string][] = [];
  for (const nombres of porPlaca.values()) {
    const lista = [...nombres];
    for (const a of lista) {
      for (const b of lista) {
        if (a < b && Math.min(a.length, b.length) >= 6 && distanciaDL(a, b) <= 2) {
          g.unir(a, b, peso);
          uniones.push([a, b]);
        }
      }
    }
  }
  const mapa = new Map([...frecuencia.keys()].map((n) => [n, g.raiz(n)] as [string, string]));
  return { mapa, uniones };
}

/**
 * Placas mal escritas: se unen SOLO si son del mismo cliente (ya unido), de la misma marca y difieren en 1 letra
 * (o 2 letras invertidas). Cualquier otra pareja a esa distancia queda DUDOSA: no se sabe cuál es la buena.
 * `filas` debe traer el cliente ya unido. Devuelve placa → placa elegida, y las dudosas.
 */
export function unirPlacas(filas: FilaHistorial[]): { mapa: Map<string, string>; dudosas: Set<string>; uniones: [string, string][] } {
  const info = new Map<string, { n: number; clientes: Set<string>; marcas: Set<string> }>();
  for (const f of filas) {
    if (!info.has(f.placa)) info.set(f.placa, { n: 0, clientes: new Set(), marcas: new Set() });
    const x = info.get(f.placa)!;
    x.n++;
    x.clientes.add(f.cliente);
    if (f.marca) x.marcas.add(f.marca);
  }
  const g = new Grupos();
  const peso = (p: string) => info.get(p)?.n ?? 0;
  const uniones: [string, string][] = [];
  const placas = [...info.keys()];
  for (const a of placas) {
    for (const b of placas) {
      if (a >= b || distanciaDL(a, b) > 1) continue;
      const A = info.get(a)!;
      const B = info.get(b)!;
      const mismoCliente = A.clientes.size === 1 && B.clientes.size === 1 && [...A.clientes][0] === [...B.clientes][0];
      const mismaMarca = [...A.marcas].some((m) => B.marcas.has(m));
      if (mismoCliente && mismaMarca) {
        g.unir(a, b, peso);
        uniones.push([a, b]);
      }
    }
  }
  const mapa = new Map(placas.map((p) => [p, g.raiz(p)] as [string, string]));
  // Lo que sigue a 1 letra de otra placa después de unir: dudoso.
  const finales = [...new Set(mapa.values())];
  const dudosas = new Set<string>();
  for (const a of finales) for (const b of finales) if (a < b && distanciaDL(a, b) <= 1) dudosas.add(a).add(b);
  return { mapa, dudosas, uniones };
}

/**
 * Recepción del vehículo: lo que el taller revisa al recibir el carro
 * (mismo orden que la orden de trabajo en papel).
 */

export const CHECKLIST_RECEPCION = [
  { clave: 'matricula', nombre: 'Matrícula' },
  { clave: 'espejos', nombre: 'Espejos' },
  { clave: 'vidrios', nombre: 'Vidrios' },
  { clave: 'plumas', nombre: 'Plumas' },
  { clave: 'radio', nombre: 'Radio' },
  { clave: 'encendedor', nombre: 'Encendedor' },
  { clave: 'controlAlarma', nombre: 'Control de alarma' },
  { clave: 'cds', nombre: "CD's" },
  { clave: 'moquetas', nombre: 'Moquetas' },
  { clave: 'antena', nombre: 'Antena' },
  { clave: 'botiquin', nombre: 'Botiquín' },
  { clave: 'extintor', nombre: 'Extintor' },
  { clave: 'triangulos', nombre: 'Triángulos' },
  { clave: 'cubresol', nombre: 'Cubresol' },
  { clave: 'herramientas', nombre: 'Herramientas' },
  { clave: 'gata', nombre: 'Gata' },
  { clave: 'farosLunas', nombre: 'Faros / lunas' },
  { clave: 'tapaCubos', nombre: 'Tapa cubos' },
  { clave: 'tapaGasolina', nombre: 'Tapa gasolina' },
  { clave: 'llaveRuedas', nombre: 'Llave de ruedas' },
  { clave: 'llantaEmergencia', nombre: 'Llanta de emergencia' },
  { clave: 'emblemaDelantero', nombre: 'Emblema delantero' },
  { clave: 'emblemaPosterior', nombre: 'Emblema posterior' },
  { clave: 'placas', nombre: 'Placas' },
] as const;

export type ClaveChecklist = (typeof CHECKLIST_RECEPCION)[number]['clave'];
/** true = SÍ tiene, false = NO tiene; si falta la clave, no se revisó. */
export type ChecklistRecepcion = Partial<Record<ClaveChecklist, boolean>>;

export const CLAVES_CHECKLIST: readonly string[] = CHECKLIST_RECEPCION.map((c) => c.clave);

/** Nivel de combustible en octavos: 0 = vacío (E), 8 = lleno (F). */
export const COMBUSTIBLE_MAX = 8;
export function textoCombustible(octavos: number | null | undefined): string {
  if (octavos == null) return 'No registrado';
  if (octavos <= 0) return 'Vacío (E)';
  if (octavos >= COMBUSTIBLE_MAX) return 'Lleno (F)';
  const nombres: Record<number, string> = { 2: '1/4', 4: '1/2', 6: '3/4' };
  return nombres[octavos] ?? `${octavos}/8`;
}

// ───────────────────────── Daños en la carrocería ─────────────────────────

export const CARROCERIAS = [
  { clave: 'AUTO', nombre: 'Auto / SUV' },
  { clave: 'CAMIONETA', nombre: 'Camioneta' },
] as const;
export type Carroceria = (typeof CARROCERIAS)[number]['clave'];

export const VISTAS = [
  { clave: 'izquierda', nombre: 'Lado izquierdo' },
  { clave: 'derecha', nombre: 'Lado derecho' },
  { clave: 'frontal', nombre: 'Frente' },
  { clave: 'posterior', nombre: 'Atrás' },
  { clave: 'superior', nombre: 'Arriba' },
] as const;
export type Vista = (typeof VISTAS)[number]['clave'];

export const TIPOS_DANIO = [
  { clave: 'GOLPE', letra: 'G', nombre: 'Golpe / abolladura' },
  { clave: 'RAYON', letra: 'R', nombre: 'Rayón' },
  { clave: 'ROTO', letra: 'X', nombre: 'Roto / trizado' },
  { clave: 'OTRO', letra: 'O', nombre: 'Otro' },
] as const;
export type TipoDanio = (typeof TIPOS_DANIO)[number]['clave'];

/** Marca sobre el dibujo. x, y van de 0 a 1 respecto al dibujo de esa vista. */
export interface MarcaDanio {
  vista: Vista;
  x: number;
  y: number;
  tipo: TipoDanio;
  nota?: string;
}

/** Revisa que las marcas recibidas tengan la forma correcta. Devuelve el error o null. */
export function validarMarcas(marcas: unknown): string | null {
  if (!Array.isArray(marcas)) return 'Las marcas de daños deben ser una lista';
  if (marcas.length > 60) return 'Demasiadas marcas de daños (máx. 60)';
  const vistas = new Set<string>(VISTAS.map((v) => v.clave));
  const tipos = new Set<string>(TIPOS_DANIO.map((t) => t.clave));
  for (const m of marcas as MarcaDanio[]) {
    if (!m || typeof m !== 'object') return 'Marca de daño inválida';
    if (!vistas.has(m.vista)) return `Vista inválida: ${m.vista}`;
    if (!tipos.has(m.tipo)) return `Tipo de daño inválido: ${m.tipo}`;
    if (typeof m.x !== 'number' || typeof m.y !== 'number' || m.x < 0 || m.x > 1 || m.y < 0 || m.y > 1)
      return 'Coordenadas de daño fuera del dibujo';
    if (m.nota != null && (typeof m.nota !== 'string' || m.nota.length > 120)) return 'Nota de daño muy larga';
  }
  return null;
}

export function validarChecklist(c: unknown): string | null {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) return 'La recepción debe ser un objeto';
  for (const [k, v] of Object.entries(c)) {
    if (!CLAVES_CHECKLIST.includes(k)) return `Ítem de recepción desconocido: ${k}`;
    if (typeof v !== 'boolean') return `El ítem ${k} debe ser SÍ o NO`;
  }
  return null;
}

// ───────────────────────── Hitos de la orden ─────────────────────────

export const HITOS_ORDEN = [
  { clave: 'fechaLlegada', nombre: 'Llegada del cliente' },
  { clave: 'fechaPedidoRepuestos', nombre: 'Pedido de repuestos' },
  { clave: 'fechaLlegadaRepuestos', nombre: 'Llegada de repuestos' },
  { clave: 'fechaEntrega', nombre: 'Entrega al cliente' },
] as const;
export type HitoOrden = (typeof HITOS_ORDEN)[number]['clave'];

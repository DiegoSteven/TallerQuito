/**
 * Cálculo de recordatorios de mantenimiento.
 *
 * Se recomienda el próximo servicio por kilometraje o por tiempo, lo que llegue
 * primero. Como el sistema solo conoce el km de las visitas, el km de hoy se
 * ESTIMA con el promedio de km/mes del propio vehículo.
 */

export type EstadoRecordatorio = 'AL_DIA' | 'PRONTO' | 'LE_TOCA';

export interface IntervaloServicio {
  intervaloKm: number | null;
  intervaloMeses: number | null;
}

export interface Visita {
  fecha: Date;
  km: number;
}

export interface Umbrales {
  /** Km antes del próximo servicio para marcarlo como "pronto". */
  km: number;
  /** Días antes del próximo servicio para marcarlo como "pronto". */
  dias: number;
}

export interface Recordatorio {
  estado: EstadoRecordatorio;
  proximoKm: number | null;
  proximaFecha: Date | null;
  /** Negativo = ya se pasó. */
  kmRestantes: number | null;
  /** Negativo = ya se pasó. */
  diasRestantes: number | null;
}

const MS_DIA = 86_400_000;
const DIAS_MES = 30.4375;

export const UMBRALES_POR_DEFECTO: Umbrales = { km: 2000, dias: 30 };

export function sumarMeses(fecha: Date, meses: number): Date {
  const r = new Date(fecha.getTime());
  r.setMonth(r.getMonth() + meses);
  return r;
}

/**
 * Km estimado a la fecha `hoy` según el promedio del vehículo.
 * Necesita al menos dos visitas con km distinto; si no, devuelve el último km.
 */
export function estimarKmActual(visitas: Visita[], hoy: Date): number | null {
  if (visitas.length === 0) return null;
  const orden = [...visitas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const primera = orden[0];
  const ultima = orden[orden.length - 1];
  const meses = (ultima.fecha.getTime() - primera.fecha.getTime()) / MS_DIA / DIAS_MES;
  if (orden.length < 2 || meses < 1 || ultima.km <= primera.km) return ultima.km;

  const kmPorMes = (ultima.km - primera.km) / meses;
  const mesesDesdeUltima = Math.max(0, (hoy.getTime() - ultima.fecha.getTime()) / MS_DIA / DIAS_MES);
  return Math.round(ultima.km + kmPorMes * mesesDesdeUltima);
}

export function calcularRecordatorio(
  servicio: IntervaloServicio,
  ultimo: Visita,
  kmActual: number | null,
  hoy: Date,
  umbrales: Umbrales = UMBRALES_POR_DEFECTO,
): Recordatorio | null {
  const { intervaloKm, intervaloMeses } = servicio;
  if (!intervaloKm && !intervaloMeses) return null;

  const proximoKm = intervaloKm ? ultimo.km + intervaloKm : null;
  const proximaFecha = intervaloMeses ? sumarMeses(ultimo.fecha, intervaloMeses) : null;

  const kmRestantes = proximoKm !== null && kmActual !== null ? proximoKm - kmActual : null;
  const diasRestantes =
    proximaFecha !== null ? Math.floor((proximaFecha.getTime() - hoy.getTime()) / MS_DIA) : null;

  let estado: EstadoRecordatorio = 'AL_DIA';
  if ((kmRestantes !== null && kmRestantes <= 0) || (diasRestantes !== null && diasRestantes <= 0)) {
    estado = 'LE_TOCA';
  } else if (
    (kmRestantes !== null && kmRestantes <= umbrales.km) ||
    (diasRestantes !== null && diasRestantes <= umbrales.dias)
  ) {
    estado = 'PRONTO';
  }

  return { estado, proximoKm, proximaFecha, kmRestantes, diasRestantes };
}

/** Intervalo propio de un trabajo (null = usar el del catálogo). */
export interface IntervaloTrabajo {
  intervaloKm?: number | null;
  intervaloMeses?: number | null;
}

/**
 * Intervalo que vale para un trabajo: el que puso el mecánico en ese trabajo (depende del carro y de lo que
 * se le puso, p. ej. aceite sintético) y, campo por campo, si lo dejó vacío, el del catálogo.
 */
export function intervaloEfectivo(trabajo: IntervaloTrabajo, catalogo: IntervaloServicio): IntervaloServicio & { personalizado: boolean } {
  const intervaloKm = trabajo.intervaloKm ?? catalogo.intervaloKm;
  const intervaloMeses = trabajo.intervaloMeses ?? catalogo.intervaloMeses;
  const personalizado =
    (trabajo.intervaloKm != null && trabajo.intervaloKm !== catalogo.intervaloKm) ||
    (trabajo.intervaloMeses != null && trabajo.intervaloMeses !== catalogo.intervaloMeses);
  return { intervaloKm, intervaloMeses, personalizado };
}

/** Km y fecha del próximo cambio a partir de cuándo se hizo el trabajo. */
export function proximoCambio(intervalo: IntervaloServicio, hecho: Visita): { km: number | null; fecha: Date | null } {
  return {
    km: intervalo.intervaloKm ? hecho.km + intervalo.intervaloKm : null,
    fecha: intervalo.intervaloMeses ? sumarMeses(hecho.fecha, intervalo.intervaloMeses) : null,
  };
}

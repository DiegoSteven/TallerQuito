import type { ChecklistRecepcion, MarcaDanio } from '@taller/shared';
import { token } from './api';

export { formatoNumeroOrden as formatoNumero } from '@taller/shared';

export interface Cliente {
  id: number;
  nombre: string;
  cedulaRuc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

export interface Vehiculo {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  cilindraje: string | null;
  vin: string | null;
  kmActual: number | null;
  clienteId: number;
  cliente: Cliente;
}

export type TipoItem = 'MANO_OBRA' | 'REPUESTO';
export type EstadoOrden = 'ABIERTA' | 'CERRADA' | 'ANULADA';

export interface ItemOrden {
  id?: number;
  tipoServicioId?: number | null;
  tipo: TipoItem;
  descripcion: string;
  cantidad: number | string;
  precioUnitario: number | string;
}

export interface Orden {
  id: number;
  numero: number;
  fecha: string;
  kilometraje: number;
  estado: EstadoOrden;
  motivo: string | null;
  observaciones: string | null;
  total: string;
  fechaLlegada: string | null;
  fechaPedidoRepuestos: string | null;
  fechaLlegadaRepuestos: string | null;
  fechaEntrega: string | null;
  combustible: number | null;
  recepcion: ChecklistRecepcion | null;
  carroceria: 'AUTO' | 'CAMIONETA' | null;
  danios: MarcaDanio[] | null;
  vehiculo: Vehiculo;
  items: ItemOrden[];
  creadoPor: { nombre: string } | null;
}

export interface TipoServicio {
  id: number;
  nombre: string;
  categoria: string | null;
}

// ─── Formatos ───
export const km = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('es-EC'));
export const dinero = (n: number | string) => `$${Number(n).toFixed(2)}`;
export const fechaCorta = (s: string) => new Date(s).toLocaleDateString('es-EC', { timeZone: 'UTC' });
export const fechaHora = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

/** ISO → valor de <input type="datetime-local"> en hora local. */
export function aInputFechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const deInputFechaHora = (v: string) => (v ? new Date(v).toISOString() : null);

/**
 * Abre un PDF protegido por token en una pestaña nueva (para ver o imprimir).
 * La pestaña se abre antes de pedir el PDF; si se abre después de esperar, el navegador la bloquea.
 * Por eso se puede pasar una pestaña ya abierta en el clic.
 */
export async function abrirPdf(ruta: string, ventana: Window | null = window.open('', '_blank')) {
  const res = await fetch(`/api${ruta}`, { headers: { Authorization: `Bearer ${token.get()}` } });
  if (!res.ok) {
    ventana?.close();
    alert('No se pudo generar el PDF');
    return;
  }
  const url = URL.createObjectURL(await res.blob());
  if (ventana) {
    ventana.location.href = url;
    return;
  }
  // El navegador bloqueó la pestaña: se descarga el PDF sin salir de la pantalla actual.
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = ruta.split('/').pop() ?? 'documento.pdf';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const ESTADOS_ORDEN: Record<EstadoOrden, { texto: string; clase: string }> = {
  ABIERTA: { texto: 'En el taller', clase: 'bg-amber-100 text-amber-800' },
  CERRADA: { texto: 'Entregada', clase: 'bg-green-100 text-green-700' },
  ANULADA: { texto: 'Anulada', clase: 'bg-gray-200 text-gray-600' },
};

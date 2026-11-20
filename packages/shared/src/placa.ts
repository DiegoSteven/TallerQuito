/**
 * Normaliza una placa ecuatoriana para guardarla siempre igual.
 * "pba1234", "PBA 1234", "pba-1234" → "PBA-1234"
 */
export function normalizarPlaca(placa: string): string {
  const limpia = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = limpia.match(/^([A-Z]{2,3})(\d{3,4})$/);
  return m ? `${m[1]}-${m[2]}` : limpia;
}

/** Versión sin guiones ni espacios, para buscar. */
export function claveBusquedaPlaca(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

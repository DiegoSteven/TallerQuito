/** Datos del taller: aparecen en el sistema, en los PDF y en la landing. */
export const TALLER = {
  nombre: 'TECNICENTRO AUTOMOTRIZ SÁNCHEZ',
  nombreCorto: 'Mecánica Sánchez',
  lema: 'Su mecánica de confianza',
  direccion: 'Av. Oswaldo Guayasamín E3-115 y Manuel Betancourt',
  ciudad: 'Cumbayá · Quito',
  telefono: '099 539 6039',
  /** Formato internacional para enlaces wa.me */
  whatsapp: '593995396039',
  email: 'tecnicentrols79@gmail.com',
} as const;

/**
 * Texto de autorización de la orden de trabajo (el mismo del talonario en papel).
 * El cliente lo firma al dejar el vehículo.
 */
export function clausulaAutorizacion(cliente: string, cedula?: string | null): string[] {
  const t = TALLER.nombre;
  return [
    `Yo, ${cliente}${cedula ? `, con C.I./RUC ${cedula},` : ''} autorizo a ${t} a realizar los trabajos de reparación y comprobación (dentro o fuera del taller) descritos en esta Orden de Trabajo, y me comprometo a cancelar el monto de la reparación, incluyendo mano de obra, repuestos y cualquier gasto adicional.`,
    `Reconozco además que ${t} no es responsable por la pérdida de artículos que no hubieran sido inventariados al momento de la recepción.`,
    `Eximo a ${t} de cualquier responsabilidad civil o penal por la Orden de Trabajo encomendada, una vez verificadas las condiciones en que recibió el vehículo.`,
    'En caso de existir alguna anormalidad o controversia, me someto al procedimiento arbitral administrativo del Centro de Mediación y Arbitraje de la Cámara de Comercio de Quito.',
  ];
}

/** 765 → "0000765", como en el talonario. */
export const formatoNumeroOrden = (n: number) => String(n).padStart(7, '0');

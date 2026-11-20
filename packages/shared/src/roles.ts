export const ROLES = ['DUENO', 'RECEPCION', 'MECANICO'] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_ETIQUETA: Record<Rol, string> = {
  DUENO: 'Dueño',
  RECEPCION: 'Recepción',
  MECANICO: 'Mecánico',
};

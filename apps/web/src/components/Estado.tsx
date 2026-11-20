import type { Recordatorio } from '@taller/shared';

const km = (n: number) => n.toLocaleString('es-EC');

/** Etiqueta de color para el estado de un mantenimiento. */
export function EstadoServicio({ r }: { r: Recordatorio | null }) {
  if (!r) return <span className="text-gray-400">—</span>;
  const estilo = {
    LE_TOCA: 'bg-red-100 text-red-700',
    PRONTO: 'bg-amber-100 text-amber-800',
    AL_DIA: 'bg-green-100 text-green-700',
  }[r.estado];

  let texto: string;
  if (r.estado === 'LE_TOCA') {
    texto = r.kmRestantes !== null && r.kmRestantes <= 0 ? `Le toca · +${km(-r.kmRestantes)} km` : 'Le toca por fecha';
  } else if (r.estado === 'PRONTO') {
    texto =
      r.kmRestantes !== null && r.kmRestantes <= 2000 ? `Pronto · faltan ~${km(r.kmRestantes)} km` : `Pronto · ${r.diasRestantes} días`;
  } else {
    texto = r.proximoKm ? `A los ${km(r.proximoKm)} km` : 'Al día';
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${estilo}`}>{texto}</span>;
}

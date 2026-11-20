import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dinero, ESTADOS_ORDEN, fechaHora, formatoNumero, km, type EstadoOrden, type Orden } from '../tipos';

type FilaOrden = Pick<Orden, 'id' | 'numero' | 'fecha' | 'kilometraje' | 'estado' | 'motivo' | 'total' | 'fechaLlegada'> & {
  vehiculo: Pick<Orden['vehiculo'], 'id' | 'placa' | 'marca' | 'modelo'> & { cliente: { nombre: string; telefono: string | null } };
};

/** Lista compacta de órdenes. Se usa en Inicio ("en el taller ahora") y en la pantalla de órdenes. */
export function ListaOrdenes({ filas, vacio }: { filas: FilaOrden[]; vacio: string }) {
  if (!filas.length) return <p className="py-4 text-center text-gray-500">{vacio}</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {filas.map((o) => (
        <li key={o.id}>
          <Link to={`/ordenes/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-3 hover:bg-marca-suave/40">
            <span className="w-20 font-bold text-marca">{formatoNumero(o.numero)}</span>
            <span className="placa">{o.vehiculo.placa}</span>
            <span className="font-semibold">{[o.vehiculo.marca, o.vehiculo.modelo].filter(Boolean).join(' ')}</span>
            <span className="text-gray-500">{o.vehiculo.cliente.nombre}</span>
            <span className="truncate text-sm text-gray-500 italic">{o.motivo}</span>
            <span className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-gray-500">{o.fechaLlegada ? fechaHora(o.fechaLlegada) : new Date(o.fecha).toLocaleDateString('es-EC', { timeZone: 'UTC' })}</span>
              <span className="text-gray-500">{km(o.kilometraje)} km</span>
              <b>{dinero(o.total)}</b>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADOS_ORDEN[o.estado].clase}`}>{ESTADOS_ORDEN[o.estado].texto}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function useOrdenes(estado?: EstadoOrden, porPagina = 50) {
  return useQuery({
    queryKey: ['ordenes', estado, porPagina],
    queryFn: () => api<{ total: number; datos: FilaOrden[] }>(`/ordenes?porPagina=${porPagina}${estado ? `&estado=${estado}` : ''}`),
  });
}

export function Ordenes() {
  const [estado, setEstado] = useState<EstadoOrden | undefined>('ABIERTA');
  const ordenes = useOrdenes(estado);
  const pestañas: { valor?: EstadoOrden; texto: string }[] = [
    { valor: 'ABIERTA', texto: '🔧 En el taller' },
    { valor: 'CERRADA', texto: '✔ Entregadas' },
    { valor: undefined, texto: 'Todas' },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Órdenes de trabajo</h1>
        <Link to="/ordenes/nueva" className="rounded-lg bg-marca px-4 py-2 font-semibold text-white">
          + Recibir vehículo
        </Link>
      </div>
      <div className="mb-3 flex gap-2">
        {pestañas.map((p) => (
          <button
            key={p.texto}
            onClick={() => setEstado(p.valor)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${estado === p.valor ? 'bg-tinta text-white' : 'border border-gray-300 bg-white'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-2">
        {ordenes.isLoading ? (
          <p className="p-4 text-gray-500">Cargando…</p>
        ) : (
          <ListaOrdenes filas={ordenes.data?.datos ?? []} vacio={estado === 'ABIERTA' ? 'No hay vehículos en el taller ahora.' : 'Sin órdenes.'} />
        )}
      </section>
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Icono } from '../components/Iconos';
import { dinero, ESTADOS_ORDEN, fechaHora, formatoNumero, km, type EstadoOrden, type Orden } from '../tipos';

type FilaOrden = Pick<Orden, 'id' | 'numero' | 'fecha' | 'kilometraje' | 'estado' | 'motivo' | 'total' | 'fechaLlegada'> & {
  vehiculo: Pick<Orden['vehiculo'], 'id' | 'placa' | 'marca' | 'modelo'> & { cliente: { nombre: string; telefono: string | null } };
};

/** Lista compacta de órdenes. Se usa en Inicio ("en el taller ahora") y en la pantalla de órdenes. */
export function ListaOrdenes({ filas, vacio }: { filas: FilaOrden[]; vacio: string }) {
  if (!filas.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icono nombre="vehiculo" className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-slate-500">{vacio}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {filas.map((o) => (
        <li key={o.id}>
          <Link
            to={`/ordenes/${o.id}`}
            className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-slate-50/80 md:px-5"
          >
            <span className="font-display text-sm font-extrabold text-marca">N° {formatoNumero(o.numero)}</span>
            <span className="placa text-sm">{o.vehiculo.placa}</span>
            <span className="min-w-[180px] flex-1">
              <span className="block truncate font-display font-bold text-tinta">
                {[o.vehiculo.marca, o.vehiculo.modelo].filter(Boolean).join(' ')}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {o.vehiculo.cliente.nombre}
                {o.motivo ? ` · ${o.motivo}` : ''}
              </span>
            </span>
            <span className="hidden text-right text-xs leading-snug text-slate-500 sm:block">
              <span className="block">
                {o.fechaLlegada ? fechaHora(o.fechaLlegada) : new Date(o.fecha).toLocaleDateString('es-EC', { timeZone: 'UTC' })}
              </span>
              <span className="block">{km(o.kilometraje)} km</span>
            </span>
            <b className="font-display text-sm text-tinta">{dinero(o.total)}</b>
            <span className={`chip ${ESTADOS_ORDEN[o.estado].clase}`}>{ESTADOS_ORDEN[o.estado].texto}</span>
            <Icono nombre="flecha" className="hidden h-4 w-4 text-slate-300 transition group-hover:text-marca md:block" />
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
  const pestanas: { valor?: EstadoOrden; texto: string }[] = [
    { valor: 'ABIERTA', texto: 'En el taller' },
    { valor: 'CERRADA', texto: 'Entregadas' },
    { valor: undefined, texto: 'Todas' },
  ];

  return (
    <div className="space-y-5">
      <header>
        <span className="eyebrow">Operación diaria</span>
        <h1 className="page-title">Órdenes de trabajo</h1>
        <p className="page-sub">Controle el avance, los repuestos y las entregas de cada vehículo.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {pestanas.map((p) => (
          <button
            key={p.texto}
            type="button"
            onClick={() => setEstado(p.valor)}
            className={`tab ${estado === p.valor ? 'tab-on' : 'tab-off'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="card-head">
          <div>
            <h2 className="card-title">
              {estado === 'ABIERTA' ? 'Vehículos en el taller' : estado === 'CERRADA' ? 'Órdenes entregadas' : 'Todas las órdenes'}
            </h2>
            <p className="text-xs text-slate-500">
              {ordenes.data ? `${ordenes.data.total} registros` : 'Cargando…'}
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-600">
            <Icono nombre="ordenes" className="h-3.5 w-3.5" />
            {ordenes.data?.datos.length ?? 0} visibles
          </span>
        </div>
        {ordenes.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <ListaOrdenes
            filas={ordenes.data?.datos ?? []}
            vacio={estado === 'ABIERTA' ? 'No hay vehículos en el taller ahora.' : 'Sin órdenes.'}
          />
        )}
      </section>
    </div>
  );
}

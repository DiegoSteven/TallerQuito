import { useQuery } from '@tanstack/react-query';
import type { Recordatorio } from '@taller/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { EstadoServicio } from '../components/Estado';
import { Icono } from '../components/Iconos';

export interface FilaRecordatorio {
  vehiculo: { id: number; placa: string; marca: string | null; modelo: string | null };
  cliente: { id: number; nombre: string; telefono: string | null };
  tipoServicio: { id: number; nombre: string };
  ultimo: { fecha: string; km: number };
  recordatorio: Recordatorio;
}

const fecha = (s: string) => new Date(s).toLocaleDateString('es-EC', { timeZone: 'UTC' });

export function TablaRecordatorios({ filas }: { filas: FilaRecordatorio[] }) {
  if (!filas.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Icono nombre="check" className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-slate-500">Nada pendiente por ahora.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="tabla">
        <thead>
          <tr>
            <th>Placa</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Último</th>
            <th>Estado</th>
            <th>Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.vehiculo.id}-${f.tipoServicio.id}`} className="fila">
              <td>
                <Link to={`/vehiculos/${f.vehiculo.id}`} className="placa text-sm">
                  {f.vehiculo.placa}
                </Link>
              </td>
              <td className="font-semibold text-tinta">{f.cliente.nombre}</td>
              <td>{f.tipoServicio.nombre}</td>
              <td className="whitespace-nowrap text-slate-500">
                {fecha(f.ultimo.fecha)} · {f.ultimo.km.toLocaleString('es-EC')} km
              </td>
              <td>
                <EstadoServicio r={f.recordatorio} />
              </td>
              <td className="whitespace-nowrap text-slate-500">{f.cliente.telefono ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Recordatorios() {
  const [estado, setEstado] = useState<'' | 'LE_TOCA' | 'PRONTO'>('');
  const { data, isLoading } = useQuery({
    queryKey: ['recordatorios', estado],
    queryFn: () => api<FilaRecordatorio[]>(`/recordatorios${estado ? `?estado=${estado}` : ''}`),
  });

  const opciones = [
    ['', 'Todos'],
    ['LE_TOCA', 'Le toca'],
    ['PRONTO', 'Pronto'],
  ] as const;

  return (
    <div className="space-y-5">
      <header>
        <span className="eyebrow">Mantenimiento preventivo</span>
        <h1 className="page-title">Recordatorios</h1>
        <p className="page-sub">Según el catálogo y el kilometraje estimado de cada vehículo.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {opciones.map(([v, t]) => (
          <button
            key={v}
            type="button"
            onClick={() => setEstado(v)}
            className={`tab ${estado === v ? 'tab-on' : 'tab-off'}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500">
          {data ? `${data.length} mantenimientos` : 'Cargando…'}
        </span>
      </div>

      <section className="card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <TablaRecordatorios filas={data ?? []} />
        )}
      </section>
    </div>
  );
}

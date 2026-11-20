import { useQuery } from '@tanstack/react-query';
import type { Recordatorio } from '@taller/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { EstadoServicio } from '../components/Estado';

export interface FilaRecordatorio {
  vehiculo: { id: number; placa: string; marca: string | null; modelo: string | null };
  cliente: { id: number; nombre: string; telefono: string | null };
  tipoServicio: { id: number; nombre: string };
  ultimo: { fecha: string; km: number };
  recordatorio: Recordatorio;
}

const fecha = (s: string) => new Date(s).toLocaleDateString('es-EC', { timeZone: 'UTC' });

export function TablaRecordatorios({ filas }: { filas: FilaRecordatorio[] }) {
  if (!filas.length) return <p className="py-4 text-center text-gray-500">Nada pendiente 🎉</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="p-2">Placa</th>
            <th className="p-2">Cliente</th>
            <th className="p-2">Servicio</th>
            <th className="p-2">Último</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.vehiculo.id}-${f.tipoServicio.id}`} className="border-t border-gray-100">
              <td className="p-2">
                <Link to={`/vehiculos/${f.vehiculo.id}`} className="placa">
                  {f.vehiculo.placa}
                </Link>
              </td>
              <td className="p-2">{f.cliente.nombre}</td>
              <td className="p-2">{f.tipoServicio.nombre}</td>
              <td className="p-2 whitespace-nowrap">
                {fecha(f.ultimo.fecha)} · {f.ultimo.km.toLocaleString('es-EC')} km
              </td>
              <td className="p-2">
                <EstadoServicio r={f.recordatorio} />
              </td>
              <td className="p-2 whitespace-nowrap">{f.cliente.telefono ?? '—'}</td>
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

  return (
    <>
      <h1 className="text-2xl font-bold">Recordatorios</h1>
      <p className="mb-4 text-gray-500">Según el catálogo y el kilometraje estimado de cada vehículo.</p>
      <div className="mb-4 flex gap-2">
        {(
          [
            ['', 'Todos'],
            ['LE_TOCA', 'Le toca'],
            ['PRONTO', 'Pronto'],
          ] as const
        ).map(([v, t]) => (
          <button
            key={v}
            onClick={() => setEstado(v)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold ${estado === v ? 'border-marca bg-marca text-white' : 'border-gray-300 bg-white'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        {isLoading ? <p className="text-gray-500">Cargando…</p> : <TablaRecordatorios filas={data ?? []} />}
      </section>
    </>
  );
}

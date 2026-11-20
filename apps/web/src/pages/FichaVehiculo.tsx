import { useQuery } from '@tanstack/react-query';
import type { Recordatorio } from '@taller/shared';
import { Link, useParams } from 'react-router-dom';
import { api, token } from '../api';
import { EstadoServicio } from '../components/Estado';
import { formatoNumero } from '../tipos';

interface Historial {
  vehiculo: {
    id: number;
    placa: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    motor: string | null;
    kmActual: number | null;
    cliente: { nombre: string; telefono: string | null };
  };
  kmEstimado: number | null;
  servicios: { tipoServicio: { id: number; nombre: string }; ultimo: { fecha: string; km: number }; recordatorio: Recordatorio | null }[];
  ordenes: {
    id: number;
    numero: number;
    estado: 'ABIERTA' | 'CERRADA' | 'ANULADA';
    fecha: string;
    kilometraje: number;
    motivo: string | null;
    observaciones: string | null;
    total: string;
    mecanico: { nombre: string } | null;
    items: { id: number; descripcion: string; tipoServicio: { nombre: string } | null }[];
  }[];
}

const km = (n: number) => n.toLocaleString('es-EC');
const fecha = (s: string) => new Date(s).toLocaleDateString('es-EC', { timeZone: 'UTC' });

async function abrirPdf(id: number) {
  const res = await fetch(`/api/vehiculos/${id}/historial.pdf`, { headers: { Authorization: `Bearer ${token.get()}` } });
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank');
}

export function FichaVehiculo() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['historial', id],
    queryFn: () => api<Historial>(`/vehiculos/${id}/historial`),
  });

  if (isLoading) return <p className="text-gray-500">Cargando…</p>;
  if (error || !data) return <p className="text-red-700">{(error as Error)?.message ?? 'No encontrado'}</p>;
  const { vehiculo: v, servicios, ordenes, kmEstimado } = data;

  return (
    <>
      <Link to="/" className="text-sm text-gray-500 underline">
        ← Inicio
      </Link>
      <section className="my-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <span className="placa text-xl">{v.placa}</span>
          <span className="ml-2 text-xl font-extrabold">{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</span>
          <p className="mt-1 text-gray-500">
            {v.motor ? `${v.motor} · ` : ''}Dueño: <b className="text-tinta">{v.cliente.nombre}</b>
            {v.cliente.telefono ? ` · 📞 ${v.cliente.telefono}` : ''} · Último km: <b className="text-tinta">{km(v.kmActual ?? 0)}</b>
            {kmEstimado && kmEstimado !== v.kmActual ? ` · Estimado hoy: ≈ ${km(kmEstimado)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => abrirPdf(v.id)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold">
            📄 PDF historial
          </button>
          <Link to={`/ordenes/nueva?vehiculo=${v.id}`} className="rounded-lg bg-marca px-4 py-2 font-semibold text-white">
            + Nueva orden
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-bold">Último servicio por tipo</h2>
          <table className="w-full text-sm">
            <tbody>
              {servicios.map((s) => (
                <tr key={s.tipoServicio.id} className="border-t border-gray-100">
                  <td className="p-2 font-semibold">{s.tipoServicio.nombre}</td>
                  <td className="p-2 whitespace-nowrap">{fecha(s.ultimo.fecha)}</td>
                  <td className="p-2 whitespace-nowrap">{km(s.ultimo.km)} km</td>
                  <td className="p-2">
                    <EstadoServicio r={s.recordatorio} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-bold">Línea de tiempo · {ordenes.length} visitas</h2>
          <ol className="relative ml-2 border-l-2 border-gray-200">
            {ordenes.map((o) => (
              <li key={o.id} className="mb-3 ml-5">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-marca ring-4 ring-white" />
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap justify-between gap-2 font-bold">
                    {fecha(o.fecha)} · {km(o.kilometraje)} km
                    <Link to={`/ordenes/${o.id}`} className="font-normal text-gray-500 hover:text-marca hover:underline">
                      {o.estado === 'ABIERTA' && <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">En el taller</span>}
                      N° {formatoNumero(o.numero)} · ${Number(o.total).toFixed(2)} →
                    </Link>
                  </div>
                  <p className="text-sm text-gray-500">
                    {o.motivo}
                    {o.mecanico ? ` · Mec. ${o.mecanico.nombre}` : ''}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {o.items.map((i) => (
                      <li key={i.id}>{i.descripcion}</li>
                    ))}
                  </ul>
                  {o.observaciones && <p className="mt-1 text-sm text-gray-500">📝 {o.observaciones}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

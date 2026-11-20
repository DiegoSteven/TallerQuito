import { useQuery } from '@tanstack/react-query';
import type { Recordatorio } from '@taller/shared';
import { Link, useParams } from 'react-router-dom';
import { api, token } from '../api';
import { EstadoServicio } from '../components/Estado';
import { Icono } from '../components/Iconos';
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
  servicios: { tipoServicio: { id: number; nombre: string }; ultimo: { fecha: string; km: number }; recordatorio: Recordatorio | null; personalizado?: boolean }[];
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

  if (isLoading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (error || !data) return <p className="text-sm font-semibold text-red-700">{(error as Error)?.message ?? 'No encontrado'}</p>;
  const { vehiculo: v, servicios, ordenes, kmEstimado } = data;

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-marca">
        <Icono nombre="flecha" className="h-4 w-4 rotate-180" />
        Volver al inicio
      </Link>

      <section className="card overflow-hidden">
        <div className="panel-oscuro relative px-5 py-6 text-white md:px-8 md:py-7">
          <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-50" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-300">
                Ficha del vehículo
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="rounded-md border-2 border-white/80 bg-white/10 px-2.5 py-1 font-display text-xl font-extrabold tracking-widest text-white">
                  {v.placa}
                </span>
                <h1 className="font-display text-2xl font-black tracking-tight text-white md:text-3xl">
                  {[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}
                </h1>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Icono nombre="usuario" className="h-4 w-4 text-slate-400" />
                  {v.cliente.nombre}
                </span>
                {v.cliente.telefono && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icono nombre="telefono" className="h-4 w-4 text-slate-400" />
                    {v.cliente.telefono}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Icono nombre="reloj" className="h-4 w-4 text-slate-400" />
                  {km(v.kmActual ?? 0)} km
                  {kmEstimado && kmEstimado !== v.kmActual ? ` · hoy ≈ ${km(kmEstimado)} km` : ''}
                </span>
                {v.motor && <span className="text-slate-400">{v.motor}</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => abrirPdf(v.id)}
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <Icono nombre="documento" className="h-4 w-4" />
                PDF historial
              </button>
              <Link to={`/ordenes/nueva?vehiculo=${v.id}`} className="btn btn-marca">
                <Icono nombre="mas" className="h-4 w-4" />
                Nueva orden
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="card-head">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-suave text-marca">
                <Icono nombre="catalogo" className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="card-title">Último servicio por tipo</h2>
                <p className="text-xs text-slate-500">Control de mantenimiento preventivo.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="tabla">
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.tipoServicio.id} className="fila">
                    <td className="font-semibold text-tinta">
                      {s.tipoServicio.nombre}
                      {s.personalizado && (
                        <span className="chip ml-1.5 bg-amber-100 text-amber-800" title="El último trabajo tiene un intervalo propio (no el del catálogo)">
                          intervalo propio
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-slate-500">{fecha(s.ultimo.fecha)}</td>
                    <td className="whitespace-nowrap text-slate-500">{km(s.ultimo.km)} km</td>
                    <td>
                      <EstadoServicio r={s.recordatorio} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="card-head">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icono nombre="reloj" className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="card-title">Línea de tiempo</h2>
                <p className="text-xs text-slate-500">{ordenes.length} visitas registradas.</p>
              </div>
            </div>
          </div>
          <ol className="relative ml-5 border-l-2 border-slate-200 px-5 py-5">
            {ordenes.map((o) => (
              <li key={o.id} className="relative mb-4 last:mb-0">
                <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-marca ring-4 ring-white" />
                <div className="rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-tinta">
                      {fecha(o.fecha)} · {km(o.kilometraje)} km
                    </span>
                    <Link
                      to={`/ordenes/${o.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-marca"
                    >
                      {o.estado === 'ABIERTA' && (
                        <span className="chip bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">En el taller</span>
                      )}
                      N° {formatoNumero(o.numero)} · ${Number(o.total).toFixed(2)}
                      <Icono nombre="flecha" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {o.motivo}
                    {o.mecanico ? ` · Mec. ${o.mecanico.nombre}` : ''}
                  </p>
                  {o.items.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                          {i.descripcion}
                        </li>
                      ))}
                    </ul>
                  )}
                  {o.observaciones && <p className="mt-1.5 text-xs italic text-slate-500">{o.observaciones}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

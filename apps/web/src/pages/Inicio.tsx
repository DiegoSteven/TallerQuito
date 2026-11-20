import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';
import { TablaRecordatorios, type FilaRecordatorio } from './Recordatorios';
import { ListaOrdenes, useOrdenes } from './Ordenes';

interface VehiculoBusqueda {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  kmActual: number | null;
  cliente: { id: number; nombre: string };
}

function useDebounce<T>(valor: T, ms = 250) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export function Inicio() {
  const { usuario } = useAuth();
  const [texto, setTexto] = useState('');
  const q = useDebounce(texto.trim());
  const hoy = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });

  const busqueda = useQuery({
    queryKey: ['vehiculos', q],
    queryFn: () => api<{ datos: VehiculoBusqueda[] }>(`/vehiculos?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
  const enTaller = useOrdenes('ABIERTA', 10);
  const recordatorios = useQuery({
    queryKey: ['recordatorios'],
    queryFn: () => api<FilaRecordatorio[]>('/recordatorios'),
  });

  const leToca = recordatorios.data?.filter((r) => r.recordatorio.estado === 'LE_TOCA').length ?? 0;
  const pronto = recordatorios.data?.filter((r) => r.recordatorio.estado === 'PRONTO').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Bienvenida + buscador principal */}
      <section className="panel-oscuro relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-xl shadow-tinta/10 md:px-10 md:py-10">
        <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-marca/20 blur-3xl" />

        <div className="relative">
          <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-300">
            Panel de operación · {hoy}
          </span>
          <h1 className="mt-2 font-display text-3xl font-black leading-tight text-white md:text-4xl">
            Hola, {usuario?.nombre.split(' ')[0] ?? 'equipo'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            Busque un vehículo por placa, dueño o cédula para ver su historial, o reciba un auto nuevo en segundos.
          </p>

          <div className="relative mt-6 max-w-2xl">
            <Icono
              nombre="buscar"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ej: PBA-1234, Carlos, 0912345678…"
              className="w-full rounded-2xl border border-white/10 bg-white py-4 pl-12 pr-4 text-base font-semibold text-tinta shadow-2xl outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:ring-4 focus:ring-marca/30 md:text-lg"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Icono nombre="check" className="h-3.5 w-3.5 text-emerald-400" />
              Historial por vehículo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icono nombre="check" className="h-3.5 w-3.5 text-emerald-400" />
              Recordatorios por kilometraje
            </span>
            <Link to="/ordenes/nueva" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-red-300">
              Recibir vehículo
              <Icono nombre="flecha" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Indicadores rápidos */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/ordenes"
          className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-marca/30"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-suave text-marca">
            <Icono nombre="herramienta" className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-2xl font-black leading-none text-tinta">
              {enTaller.data ? enTaller.data.total : '—'}
            </div>
            <div className="mt-1 text-sm text-slate-500">Vehículos en el taller</div>
          </div>
          <Icono nombre="flecha" className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-marca" />
        </Link>

        <Link
          to="/recordatorios"
          className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-marca/30"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Icono nombre="recordatorios" className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-2xl font-black leading-none text-tinta">{leToca}</div>
            <div className="mt-1 text-sm text-slate-500">Mantenimientos que tocan</div>
          </div>
          <Icono nombre="flecha" className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-marca" />
        </Link>

        <Link
          to="/recordatorios"
          className="card group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-marca/30"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icono nombre="calendario" className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-2xl font-black leading-none text-tinta">{pronto}</div>
            <div className="mt-1 text-sm text-slate-500">Próximos a mantenimiento</div>
          </div>
          <Icono nombre="flecha" className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-marca" />
        </Link>
      </section>

      {/* Resultados de la búsqueda */}
      {q.length >= 2 && (
        <section className="card overflow-hidden">
          <div className="card-head">
            <div>
              <h2 className="card-title">Resultados para “{q}”</h2>
              <p className="text-xs text-slate-500">Seleccione un vehículo para abrir su ficha completa.</p>
            </div>
            <span className="chip bg-slate-100 text-slate-600">{busqueda.data?.datos.length ?? 0} encontrados</span>
          </div>
          <div className="p-4 md:p-5">
            {busqueda.isLoading && <p className="py-4 text-center text-sm text-slate-500">Buscando…</p>}
            {busqueda.data?.datos.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">Sin resultados para “{q}”.</p>
            )}
            <ul className="divide-y divide-slate-100">
              {busqueda.data?.datos.map((v) => (
                <li key={v.id}>
                  <Link
                    to={`/vehiculos/${v.id}`}
                    className="group flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
                  >
                    <span className="placa">{v.placa}</span>
                    <span className="font-display font-bold text-tinta">
                      {[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}
                    </span>
                    <span className="text-sm text-slate-500">{v.cliente.nombre}</span>
                    <span className="ml-auto text-sm text-slate-500">
                      {v.kmActual?.toLocaleString('es-EC') ?? '—'} km
                    </span>
                    <Icono nombre="flecha" className="h-4 w-4 text-slate-300 transition group-hover:text-marca" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* En el taller */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-suave text-marca">
              <Icono nombre="herramienta" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="card-title">Vehículos en el taller</h2>
              <p className="text-xs text-slate-500">
                {enTaller.data ? `${enTaller.data.total} órdenes abiertas` : 'Cargando…'}
              </p>
            </div>
          </div>
          <Link to="/ordenes" className="btn btn-borde btn-sm">
            Ver órdenes
            <Icono nombre="flecha" className="h-3.5 w-3.5" />
          </Link>
        </div>
        {enTaller.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <ListaOrdenes filas={enTaller.data?.datos ?? []} vacio="No hay vehículos en el taller." />
        )}
      </section>

      {/* Recordatorios */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Icono nombre="recordatorios" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="card-title">Mantenimientos que tocan</h2>
              <p className="text-xs text-slate-500">Según el catálogo y el kilometraje de cada vehículo.</p>
            </div>
          </div>
          <Link to="/recordatorios" className="btn btn-borde btn-sm">
            Ver todos
            <Icono nombre="flecha" className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recordatorios.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="p-4 md:p-5">
            <TablaRecordatorios filas={(recordatorios.data ?? []).slice(0, 8)} />
          </div>
        )}
      </section>
    </div>
  );
}

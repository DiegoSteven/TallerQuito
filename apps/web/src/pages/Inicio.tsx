import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
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

  return (
    <>
      <h1 className="text-2xl font-bold">Hola, {usuario?.nombre} 👋</h1>
      <p className="mb-4 text-gray-500">Escriba una placa, un nombre o una cédula.</p>

      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ej: PBA-1234, Carlos, 0912345678…"
        className="mb-5 w-full rounded-xl border-2 border-marca px-4 py-3.5 text-lg focus:outline-none focus:ring-4 focus:ring-marca-suave"
      />

      {q.length >= 2 && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-bold">Resultados</h2>
          {busqueda.isLoading && <p className="text-gray-500">Buscando…</p>}
          {busqueda.data?.datos.length === 0 && <p className="text-gray-500">Sin resultados para “{q}”.</p>}
          <ul className="divide-y divide-gray-100">
            {busqueda.data?.datos.map((v) => (
              <li key={v.id}>
                <Link to={`/vehiculos/${v.id}`} className="flex flex-wrap items-center gap-3 px-2 py-3 hover:bg-marca-suave/40">
                  <span className="placa">{v.placa}</span>
                  <span className="font-semibold">{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</span>
                  <span className="text-gray-500">{v.cliente.nombre}</span>
                  <span className="ml-auto text-sm text-gray-500">{v.kmActual?.toLocaleString('es-EC') ?? '—'} km</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">🔧 En el taller ahora {enTaller.data ? `· ${enTaller.data.total}` : ''}</h2>
          <Link to="/ordenes" className="text-sm font-semibold text-marca">
            Ver órdenes →
          </Link>
        </div>
        {enTaller.isLoading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <ListaOrdenes filas={enTaller.data?.datos ?? []} vacio="No hay vehículos en el taller." />
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">⏰ Mantenimientos que tocan</h2>
          <Link to="/recordatorios" className="text-sm font-semibold text-marca">
            Ver todos →
          </Link>
        </div>
        {recordatorios.isLoading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <TablaRecordatorios filas={(recordatorios.data ?? []).slice(0, 8)} />
        )}
      </section>
    </>
  );
}

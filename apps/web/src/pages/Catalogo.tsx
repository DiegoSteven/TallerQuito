import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { Icono } from '../components/Iconos';
import { Campo, Modal, oNulo } from '../components/Modal';

interface Servicio {
  id: number;
  nombre: string;
  categoria: string | null;
  intervaloKm: number | null;
  intervaloMeses: number | null;
  activo: boolean;
}

const VACIO = { nombre: '', categoria: '', intervaloKm: '', intervaloMeses: '' };
const numero = (v: string) => (v.trim() === '' ? null : Number(v));

/** Catálogo de servicios: de aquí salen los recordatorios ("le toca la banda a los X km"). Solo el dueño lo edita. */
export function Catalogo() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ['catalogo-todos'], queryFn: () => api<Servicio[]>('/tipos-servicio?todos=true') });

  const [editando, setEditando] = useState<Servicio | 'nuevo' | null>(null);
  const [f, setF] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const abrir = (s: Servicio | 'nuevo') => {
    setError(null);
    setEditando(s);
    setF(
      s === 'nuevo'
        ? VACIO
        : { nombre: s.nombre, categoria: s.categoria ?? '', intervaloKm: s.intervaloKm ? String(s.intervaloKm) : '', intervaloMeses: s.intervaloMeses ? String(s.intervaloMeses) : '' },
    );
  };

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['catalogo-todos'] });
    qc.invalidateQueries({ queryKey: ['catalogo'] });
    qc.invalidateQueries({ queryKey: ['recordatorios'] });
  };

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { nombre: f.nombre.trim(), categoria: oNulo(f.categoria), intervaloKm: numero(f.intervaloKm), intervaloMeses: numero(f.intervaloMeses) };
      return editando === 'nuevo'
        ? api('/tipos-servicio', { method: 'POST', body: JSON.stringify(cuerpo) })
        : api(`/tipos-servicio/${(editando as Servicio).id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
    },
    onSuccess: () => {
      refrescar();
      setEditando(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const activar = useMutation({
    mutationFn: (s: Servicio) => api(`/tipos-servicio/${s.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !s.activo }) }),
    onSuccess: refrescar,
    onError: (e: Error) => alert(e.message),
  });

  const servicios = lista.data ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Administración</span>
          <h1 className="page-title">Catálogo de servicios</h1>
          <p className="page-sub">Cada servicio con su intervalo recomendado. De aquí salen los avisos de "le toca".</p>
        </div>
        <button type="button" className="btn btn-marca" onClick={() => abrir('nuevo')}>
          <Icono nombre="mas" className="h-4 w-4" />
          Nuevo servicio
        </button>
      </header>

      <section className="card overflow-hidden">
        {lista.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla min-w-[680px]">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Categoría</th>
                  <th className="text-right">Cada (km)</th>
                  <th className="text-right">Cada (meses)</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id} className={`fila ${s.activo ? '' : 'opacity-60'}`}>
                    <td className="font-semibold text-tinta">{s.nombre}</td>
                    <td className="text-slate-600">{s.categoria ?? '—'}</td>
                    <td className="text-right">{s.intervaloKm ? s.intervaloKm.toLocaleString('es-EC') : <span className="text-slate-300">—</span>}</td>
                    <td className="text-right">{s.intervaloMeses ?? <span className="text-slate-300">—</span>}</td>
                    <td>
                      <span className={`chip ${s.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{s.activo ? 'Activo' : 'Oculto'}</span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button type="button" className="btn btn-borde btn-sm" onClick={() => abrir(s)}>
                        <Icono nombre="editar" className="h-3.5 w-3.5" />
                        Editar
                      </button>{' '}
                      <button type="button" className="btn btn-borde btn-sm" disabled={activar.isPending} onClick={() => activar.mutate(s)}>
                        {s.activo ? 'Ocultar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Los servicios no se borran (están en órdenes antiguas). "Ocultar" los quita de la lista al registrar una orden; el historial no cambia.
      </p>

      {editando && (
        <Modal
          titulo={editando === 'nuevo' ? 'Nuevo servicio' : `Editar: ${editando.nombre}`}
          onCerrar={() => setEditando(null)}
          onGuardar={() => guardar.mutate()}
          guardando={guardar.isPending}
          error={error}
          ancho="max-w-lg"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre *" className="sm:col-span-2">
              <input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required minLength={2} autoFocus />
            </Campo>
            <Campo etiqueta="Categoría" className="sm:col-span-2">
              <input className="input" value={f.categoria} placeholder="Motor, Frenos, Suspensión…" onChange={(e) => setF({ ...f, categoria: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cada cuántos km">
              <input className="input" inputMode="numeric" value={f.intervaloKm} placeholder="Ej: 60000" onChange={(e) => setF({ ...f, intervaloKm: e.target.value.replace(/\D/g, '') })} />
            </Campo>
            <Campo etiqueta="Cada cuántos meses">
              <input className="input" inputMode="numeric" value={f.intervaloMeses} placeholder="Ej: 48" onChange={(e) => setF({ ...f, intervaloMeses: e.target.value.replace(/\D/g, '') })} />
            </Campo>
          </div>
          <p className="mt-3 text-xs text-slate-500">Deje vacío lo que no aplique. El aviso sale con lo que llegue primero (km o meses).</p>
        </Modal>
      )}
    </div>
  );
}

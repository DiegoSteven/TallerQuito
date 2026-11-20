import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizarPlaca } from '@taller/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';
import { Campo, Modal, oNulo, Paginador } from '../components/Modal';
import { km } from '../tipos';
import { useDebounce } from './Clientes';

interface VehiculoFila {
  id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  cilindraje: string | null;
  motor: string | null;
  vin: string | null;
  kmActual: number | null;
  clienteId: number;
  cliente: { id: number; nombre: string };
}

interface ClienteMin {
  id: number;
  nombre: string;
  cedulaRuc: string | null;
}

const VACIO = { placa: '', marca: '', modelo: '', anio: '', color: '', cilindraje: '', motor: '', vin: '' };
const POR_PAGINA = 20;

/** Buscador de cliente para elegir (o cambiar) el dueño del vehículo. */
function SelectorCliente({ valor, onCambiar }: { valor: ClienteMin | null; onCambiar: (c: ClienteMin | null) => void }) {
  const [texto, setTexto] = useState('');
  const q = useDebounce(texto.trim(), 250);
  const resultados = useQuery({
    queryKey: ['clientes-selector', q],
    queryFn: () => api<{ datos: ClienteMin[] }>(`/clientes?porPagina=8&q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });

  if (valor) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <span>
          <b className="text-tinta">{valor.nombre}</b>
          {valor.cedulaRuc && <span className="ml-2 font-mono text-xs text-slate-500">{valor.cedulaRuc}</span>}
        </span>
        <button type="button" className="text-sm font-semibold text-marca hover:underline" onClick={() => onCambiar(null)}>
          Cambiar
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escriba nombre o cédula del dueño…" autoComplete="off" />
      {q.length >= 2 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {resultados.isLoading && <li className="px-3.5 py-2 text-sm text-slate-500">Buscando…</li>}
          {resultados.data?.datos.map((c) => (
            <li key={c.id}>
              <button type="button" className="w-full px-3.5 py-2 text-left hover:bg-slate-50" onClick={() => onCambiar(c)}>
                <b className="text-sm text-tinta">{c.nombre}</b>
                {c.cedulaRuc && <span className="ml-2 font-mono text-xs text-slate-500">{c.cedulaRuc}</span>}
              </button>
            </li>
          ))}
          {resultados.data && !resultados.data.datos.length && (
            <li className="px-3.5 py-2 text-sm text-slate-500">
              No existe. Créelo primero en <Link to="/clientes" className="font-semibold text-marca underline">Clientes</Link>.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function Vehiculos() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol !== 'MECANICO';
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const q = useDebounce(texto.trim());
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), [q]);

  const lista = useQuery({
    queryKey: ['vehiculos-lista', q, pagina],
    queryFn: () =>
      api<{ total: number; datos: VehiculoFila[] }>(`/vehiculos?pagina=${pagina}&porPagina=${POR_PAGINA}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: keepPreviousData,
  });

  const [editando, setEditando] = useState<VehiculoFila | 'nuevo' | null>(null);
  const [f, setF] = useState(VACIO);
  const [dueno, setDueno] = useState<ClienteMin | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abrir = (v: VehiculoFila | 'nuevo') => {
    setError(null);
    setEditando(v);
    if (v === 'nuevo') {
      setF(VACIO);
      setDueno(null);
    } else {
      setF({
        placa: v.placa,
        marca: v.marca ?? '',
        modelo: v.modelo ?? '',
        anio: v.anio ? String(v.anio) : '',
        color: v.color ?? '',
        cilindraje: v.cilindraje ?? '',
        motor: v.motor ?? '',
        vin: v.vin ?? '',
      });
      setDueno({ id: v.cliente.id, nombre: v.cliente.nombre, cedulaRuc: null });
    }
  };

  const guardar = useMutation({
    mutationFn: () => {
      if (!dueno) throw new Error('Elija el dueño del vehículo');
      const cuerpo = {
        placa: f.placa.trim(),
        clienteId: dueno.id,
        marca: oNulo(f.marca),
        modelo: oNulo(f.modelo),
        anio: f.anio ? Number(f.anio) : null,
        color: oNulo(f.color),
        cilindraje: oNulo(f.cilindraje),
        motor: oNulo(f.motor),
        vin: oNulo(f.vin.toUpperCase()),
      };
      return editando === 'nuevo'
        ? api('/vehiculos', { method: 'POST', body: JSON.stringify(cuerpo) })
        : api(`/vehiculos/${(editando as VehiculoFila).id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditando(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const cambiaDueno = editando && editando !== 'nuevo' && dueno && dueno.id !== editando.clienteId;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Registro</span>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-sub">Todos los vehículos atendidos, con su dueño y su historial.</p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn btn-marca" onClick={() => abrir('nuevo')}>
            <Icono nombre="mas" className="h-4 w-4" />
            Nuevo vehículo
          </button>
        )}
      </header>

      <div className="relative">
        <Icono nombre="buscar" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por placa, dueño o cédula…" />
      </div>

      <section className="card overflow-hidden">
        {lista.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : !lista.data?.datos.length ? (
          <p className="p-8 text-center text-sm text-slate-500">{q ? `Sin resultados para “${q}”.` : 'Aún no hay vehículos registrados.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla min-w-[760px]">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Vehículo</th>
                  <th>Dueño</th>
                  <th className="text-right">Último km</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.data.datos.map((v) => (
                  <tr key={v.id} className="fila">
                    <td>
                      <span className="placa text-sm">{v.placa}</span>
                    </td>
                    <td>
                      <b className="text-tinta">{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || '—'}</b>
                      <div className="text-xs text-slate-500">{[v.color, v.cilindraje && `${v.cilindraje}`].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{v.cliente.nombre}</td>
                    <td className="text-right whitespace-nowrap">{km(v.kmActual)} km</td>
                    <td className="text-right whitespace-nowrap">
                      <Link to={`/vehiculos/${v.id}`} className="btn btn-borde btn-sm">
                        <Icono nombre="documento" className="h-3.5 w-3.5" />
                        Historial
                      </Link>{' '}
                      {puedeEditar && (
                        <button type="button" className="btn btn-borde btn-sm" onClick={() => abrir(v)}>
                          <Icono nombre="editar" className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!q && <Paginador pagina={pagina} porPagina={POR_PAGINA} total={lista.data?.total ?? 0} onPagina={setPagina} />}
      </section>

      {editando && (
        <Modal
          titulo={editando === 'nuevo' ? 'Nuevo vehículo' : `Editar vehículo ${editando.placa}`}
          subtitulo={editando === 'nuevo' ? 'Para recibirlo en el taller use mejor "Recibir vehículo": crea el vehículo y la orden a la vez.' : undefined}
          onCerrar={() => setEditando(null)}
          onGuardar={() => guardar.mutate()}
          guardando={guardar.isPending}
          error={error}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Placa *">
              <input
                className="input font-bold tracking-wider uppercase"
                value={f.placa}
                onChange={(e) => setF({ ...f, placa: e.target.value })}
                onBlur={() => f.placa && setF({ ...f, placa: normalizarPlaca(f.placa) })}
                required
                minLength={5}
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Marca">
              <input className="input" value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} />
            </Campo>
            <Campo etiqueta="Modelo">
              <input className="input" value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Año">
              <input className="input" inputMode="numeric" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </Campo>
            <Campo etiqueta="Color">
              <input className="input" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cilindraje">
              <input className="input" value={f.cilindraje} placeholder="1.6 / 2500 cc" onChange={(e) => setF({ ...f, cilindraje: e.target.value })} />
            </Campo>
            <Campo etiqueta="Motor">
              <input className="input" value={f.motor} onChange={(e) => setF({ ...f, motor: e.target.value })} />
            </Campo>
            <Campo etiqueta="Chasis" className="sm:col-span-2">
              <input className="input font-mono uppercase" value={f.vin} onChange={(e) => setF({ ...f, vin: e.target.value })} />
            </Campo>
            <div className="sm:col-span-3">
              <span className="label">Dueño *</span>
              <SelectorCliente valor={dueno} onCambiar={setDueno} />
              {cambiaDueno && (
                <p className="mt-1.5 text-xs font-semibold text-amber-700">
                  El vehículo pasará a nombre de {dueno.nombre}. Su historial de órdenes se conserva.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

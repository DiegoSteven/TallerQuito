import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';
import { Campo, Modal, oNulo, Paginador } from '../components/Modal';

interface ClienteFila {
  id: number;
  nombre: string;
  cedulaRuc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  vehiculos: { id: number; placa: string; marca: string | null; modelo: string | null }[];
}

const VACIO = { nombre: '', cedulaRuc: '', telefono: '', email: '', direccion: '', notas: '' };
const POR_PAGINA = 20;

export function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export function Clientes() {
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol !== 'MECANICO';
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const q = useDebounce(texto.trim());
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), [q]);

  const lista = useQuery({
    queryKey: ['clientes', q, pagina],
    queryFn: () => api<{ total: number; datos: ClienteFila[] }>(`/clientes?pagina=${pagina}&porPagina=${POR_PAGINA}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: keepPreviousData,
  });

  const [editando, setEditando] = useState<ClienteFila | 'nuevo' | null>(null);
  const [f, setF] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const abrir = (c: ClienteFila | 'nuevo') => {
    setError(null);
    setEditando(c);
    setF(
      c === 'nuevo'
        ? VACIO
        : { nombre: c.nombre, cedulaRuc: c.cedulaRuc ?? '', telefono: c.telefono ?? '', email: c.email ?? '', direccion: c.direccion ?? '', notas: c.notas ?? '' },
    );
  };

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        nombre: f.nombre.trim(),
        cedulaRuc: oNulo(f.cedulaRuc),
        telefono: oNulo(f.telefono),
        email: oNulo(f.email),
        direccion: oNulo(f.direccion),
        notas: oNulo(f.notas),
      };
      return editando === 'nuevo'
        ? api('/clientes', { method: 'POST', body: JSON.stringify(cuerpo) })
        : api(`/clientes/${(editando as ClienteFila).id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setEditando(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Registro</span>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">Dueños de los vehículos, con sus datos de contacto.</p>
        </div>
        {puedeEditar && (
          <button type="button" className="btn btn-marca" onClick={() => abrir('nuevo')}>
            <Icono nombre="mas" className="h-4 w-4" />
            Nuevo cliente
          </button>
        )}
      </header>

      <div className="relative">
        <Icono nombre="buscar" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, cédula o teléfono…" />
      </div>

      <section className="card overflow-hidden">
        {lista.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : !lista.data?.datos.length ? (
          <p className="p-8 text-center text-sm text-slate-500">{q ? `Sin resultados para “${q}”.` : 'Aún no hay clientes registrados.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla min-w-[760px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>C.I. / RUC</th>
                  <th>Contacto</th>
                  <th>Vehículos</th>
                  {puedeEditar && <th />}
                </tr>
              </thead>
              <tbody>
                {lista.data.datos.map((c) => (
                  <tr key={c.id} className="fila">
                    <td>
                      <b className="text-tinta">{c.nombre}</b>
                      {c.direccion && <div className="text-xs text-slate-500">{c.direccion}</div>}
                    </td>
                    <td className="font-mono text-xs">{c.cedulaRuc ?? <span className="text-slate-300">—</span>}</td>
                    <td className="text-xs">
                      {c.telefono && <div>📞 {c.telefono}</div>}
                      {c.email && <div className="text-slate-500">{c.email}</div>}
                      {!c.telefono && !c.email && <span className="text-slate-300">—</span>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {c.vehiculos.map((v) => (
                          <Link key={v.id} to={`/vehiculos/${v.id}`} className="placa text-xs hover:border-marca hover:text-marca" title={[v.marca, v.modelo].filter(Boolean).join(' ')}>
                            {v.placa}
                          </Link>
                        ))}
                        {!c.vehiculos.length && <span className="text-xs text-slate-400">Sin vehículos</span>}
                      </div>
                    </td>
                    {puedeEditar && (
                      <td className="text-right">
                        <button type="button" className="btn btn-borde btn-sm" onClick={() => abrir(c)}>
                          <Icono nombre="editar" className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador pagina={pagina} porPagina={POR_PAGINA} total={lista.data?.total ?? 0} onPagina={setPagina} />
      </section>

      {editando && (
        <Modal
          titulo={editando === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
          onCerrar={() => setEditando(null)}
          onGuardar={() => guardar.mutate()}
          guardando={guardar.isPending}
          error={error}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre completo *" className="sm:col-span-2">
              <input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required minLength={2} autoFocus />
            </Campo>
            <Campo etiqueta="C.I. / RUC">
              <input
                className="input font-mono"
                inputMode="numeric"
                value={f.cedulaRuc}
                onChange={(e) => setF({ ...f, cedulaRuc: e.target.value.replace(/\D/g, '') })}
                pattern="\d{10}(\d{3})?"
                title="Cédula de 10 dígitos o RUC de 13"
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input className="input" inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Correo" className="sm:col-span-2">
              <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Campo>
            <Campo etiqueta="Dirección" className="sm:col-span-2">
              <input className="input" value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} />
            </Campo>
            <Campo etiqueta="Notas internas" className="sm:col-span-2">
              <textarea className="input" rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} placeholder="Ej: prefiere que lo llamen en la tarde" />
            </Campo>
          </div>
        </Modal>
      )}
    </div>
  );
}

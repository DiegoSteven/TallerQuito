import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROL_ETIQUETA, ROLES, type Rol } from '@taller/shared';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';

interface UsuarioFila {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

const QUE_PUEDE: Record<Rol, string> = {
  DUENO: 'Todo: órdenes, usuarios, catálogo, estadísticas y web',
  RECEPCION: 'Recibir vehículos, editar y entregar órdenes, clientes',
  MECANICO: 'Consultar órdenes e historial (sin editar)',
};

const VACIO = { nombre: '', usuario: '', password: '', rol: 'RECEPCION' as Rol };

export function Usuarios() {
  const { usuario: yo } = useAuth();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ['usuarios'], queryFn: () => api<UsuarioFila[]>('/usuarios') });

  const [nuevo, setNuevo] = useState(VACIO);
  const [formAbierto, setFormAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [claveDe, setClaveDe] = useState<UsuarioFila | null>(null);
  const [clave, setClave] = useState('');

  const avisar = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    if (tipo === 'ok') setTimeout(() => setMensaje(null), 4000);
  };

  const crear = useMutation({
    mutationFn: () => api<UsuarioFila>('/usuarios', { method: 'POST', body: JSON.stringify(nuevo) }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setNuevo(VACIO);
      setFormAbierto(false);
      avisar('ok', `Usuario "${u.usuario}" creado. Entréguele su usuario y contraseña.`);
    },
    onError: (e: Error) => avisar('error', e.message),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: Partial<UsuarioFila> & { password?: string } }) =>
      api<UsuarioFila>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }),
    onSuccess: (u, v) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      if (v.cambios.password) {
        setClaveDe(null);
        setClave('');
        avisar('ok', `Contraseña de "${u.usuario}" restablecida.`);
      } else avisar('ok', `Usuario "${u.usuario}" actualizado.`);
    },
    onError: (e: Error) => avisar('error', e.message),
  });

  const enviarNuevo = (e: FormEvent) => {
    e.preventDefault();
    crear.mutate();
  };

  const usuarios = lista.data ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Administración</span>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">Cree una cuenta para cada persona del taller. Nadie comparte contraseña.</p>
        </div>
        {!formAbierto && (
          <button type="button" className="btn btn-marca" onClick={() => setFormAbierto(true)}>
            <Icono nombre="mas" className="h-4 w-4" />
            Nuevo usuario
          </button>
        )}
      </header>

      {mensaje && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            mensaje.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      {formAbierto && (
        <form onSubmit={enviarNuevo} className="card p-5 sm:p-6">
          <h2 className="card-title mb-4">Nuevo usuario</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Nombre completo</span>
              <input className="input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required minLength={2} />
            </label>
            <label className="block">
              <span className="label">Usuario para ingresar</span>
              <input
                className="input"
                value={nuevo.usuario}
                placeholder="ej: pedro.mecanico"
                onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
                pattern="[a-z0-9._-]{3,30}"
                title="Minúsculas, números, punto o guion (3 a 30)"
                autoComplete="off"
                required
              />
            </label>
            <label className="block">
              <span className="label">Contraseña inicial</span>
              <input
                type="text"
                className="input font-mono"
                value={nuevo.password}
                onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <span className="mt-1 block text-xs text-slate-500">La persona puede cambiarla luego en "Mi cuenta".</span>
            </label>
            <div>
              <span className="label">Rol</span>
              <div className="grid gap-2">
                {ROLES.map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${
                      nuevo.rol === r ? 'border-marca bg-marca-suave' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input type="radio" name="rol" className="mt-1 accent-marca" checked={nuevo.rol === r} onChange={() => setNuevo({ ...nuevo, rol: r })} />
                    <span>
                      <b className="block text-sm text-tinta">{ROL_ETIQUETA[r]}</b>
                      <span className="text-xs text-slate-500">{QUE_PUEDE[r]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-borde" onClick={() => { setFormAbierto(false); setNuevo(VACIO); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-marca" disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
        <div className="card-head">
          <div>
            <h2 className="card-title">Personal del taller</h2>
            <p className="text-xs text-slate-500">
              {usuarios.filter((u) => u.activo).length} activos · los usuarios no se borran, se desactivan
            </p>
          </div>
        </div>
        {lista.isLoading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla min-w-[640px]">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const soyYo = u.id === yo?.id;
                  return (
                    <tr key={u.id} className={`fila ${u.activo ? '' : 'opacity-60'}`}>
                      <td className="font-semibold text-tinta">
                        {u.nombre} {soyYo && <span className="chip ml-1 bg-slate-100 text-slate-600">Usted</span>}
                      </td>
                      <td className="font-mono text-xs text-slate-600">{u.usuario}</td>
                      <td>
                        <select
                          className="input py-1.5 text-sm"
                          value={u.rol}
                          disabled={soyYo || actualizar.isPending}
                          title={soyYo ? 'No puede cambiar su propio rol' : 'Cambiar rol'}
                          onChange={(e) => actualizar.mutate({ id: u.id, cambios: { rol: e.target.value as Rol } })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROL_ETIQUETA[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`chip ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {u.activo ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button type="button" className="btn btn-borde btn-sm" onClick={() => { setClaveDe(u); setClave(''); }}>
                          <Icono nombre="candado" className="h-3.5 w-3.5" />
                          Contraseña
                        </button>{' '}
                        {!soyYo && (
                          <button
                            type="button"
                            className={`btn btn-sm ${u.activo ? 'btn-borde text-red-700' : 'btn-tinta'}`}
                            disabled={actualizar.isPending}
                            onClick={() =>
                              (!u.activo || confirm(`¿Desactivar a ${u.nombre}? Ya no podrá ingresar, pero sus órdenes quedan en el historial.`)) &&
                              actualizar.mutate({ id: u.id, cambios: { activo: !u.activo } })
                            }
                          >
                            {u.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {claveDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form
            className="card w-full max-w-md p-6"
            onSubmit={(e) => {
              e.preventDefault();
              actualizar.mutate({ id: claveDe.id, cambios: { password: clave } });
            }}
          >
            <h2 className="card-title">Restablecer contraseña</h2>
            <p className="mt-1 text-sm text-slate-500">
              Nueva contraseña para <b>{claveDe.nombre}</b> ({claveDe.usuario}). Désela en persona.
            </p>
            <input
              autoFocus
              type="text"
              className="input mt-4 font-mono"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-borde" onClick={() => setClaveDe(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-marca" disabled={actualizar.isPending}>
                Guardar contraseña
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

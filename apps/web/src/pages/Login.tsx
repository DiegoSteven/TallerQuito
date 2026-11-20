import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';
import { Logo } from '../components/Layout';

const BENEFICIOS = [
  {
    icono: 'documento' as const,
    titulo: 'Historial digital por vehículo',
    texto: 'Cada trabajo, repuesto y kilometraje queda registrado para siempre.',
  },
  {
    icono: 'escudo' as const,
    titulo: 'Control total del taller',
    texto: 'Órdenes, recordatorios y entregas en un solo panel.',
  },
  {
    icono: 'reloj' as const,
    titulo: 'Listo desde el celular',
    texto: 'Consulte la ficha de un auto desde la bahía o la oficina.',
  },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(usuario, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca, con el mismo lenguaje visual del hero de la landing */}
      <div className="panel-oscuro relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-70" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-marca/20 blur-3xl" />

        <div className="relative">
          <Logo claro sub="SISTEMA INTERNO DEL TALLER" />
        </div>

        <div className="relative max-w-lg">
          <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-300">
            Centro de servicio integral · Cumbayá
          </span>
          <h1 className="mt-3 font-display text-4xl font-black leading-[1.08] text-white xl:text-5xl">
            Todo el historial de cada vehículo, a un clic.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Órdenes de trabajo, mantenimiento preventivo y la web del taller en un mismo sistema.
          </p>

          <ul className="mt-8 space-y-4">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-red-300">
                  <Icono nombre={b.icono} className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-white">{b.titulo}</div>
                  <div className="text-sm text-slate-400">{b.texto}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px w-10 bg-marca" />
          Repuestos certificados · Diagnóstico computarizado · Garantía total
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-humo px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo sub="SISTEMA INTERNO" />
          </div>

          <div className="card p-7 sm:p-9">
            <span className="eyebrow">Acceso del personal</span>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-tinta">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-500">Ingrese con el usuario asignado por el taller.</p>

            <form onSubmit={enviar} className="mt-7 space-y-4">
              <label className="block">
                <span className="label">Usuario</span>
                <div className="relative">
                  <Icono
                    nombre="usuario"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="input pl-10"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoComplete="username"
                    placeholder="Nombre de usuario"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="label">Contraseña</span>
                <div className="relative">
                  <Icono
                    nombre="candado"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    className="input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <button type="submit" disabled={cargando} className="btn btn-marca w-full py-3">
                {cargando ? 'Ingresando…' : 'Ingresar al sistema'}
                {!cargando && <Icono nombre="flecha" className="h-4 w-4" />}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Acceso exclusivo del personal de Mecánica Automotriz Sánchez.
          </p>
        </div>
      </div>
    </div>
  );
}

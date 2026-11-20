import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from '../components/Layout';

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
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-marca to-marca-oscuro p-14 text-white md:flex">
        <div>
          <div className="text-xs font-bold tracking-[.3em] opacity-80">MECÁNICA AUTOMOTRIZ</div>
          <div className="text-3xl font-black tracking-wide">SÁNCHEZ</div>
          <div className="text-sm italic opacity-80">Su mecánica de confianza</div>
        </div>
        <h2 className="text-4xl font-bold leading-tight">Órdenes de trabajo e historial de cada vehículo, a un clic.</h2>
        <small className="opacity-70">Desde el taller, el celular o la casa.</small>
      </div>
      <div className="flex items-center justify-center bg-white p-8">
        <form onSubmit={enviar} className="w-full max-w-sm">
          <Logo />
          <h1 className="mb-6 mt-4 text-2xl font-bold">Iniciar sesión</h1>
          <label className="mb-1 block text-sm font-semibold text-gray-600">Usuario</label>
          <input
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-marca focus:outline-none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="mb-1 block text-sm font-semibold text-gray-600">Contraseña</label>
          <input
            type="password"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-marca focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            disabled={cargando}
            className="w-full rounded-lg bg-marca py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { ROL_ETIQUETA } from '@taller/shared';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

/** Cada persona cambia su propia contraseña (pide la actual). */
export function MiCuenta() {
  const { usuario } = useAuth();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    if (f.nueva !== f.repetir) return setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden' });
    setGuardando(true);
    try {
      await api('/auth/cambiar-password', { method: 'POST', body: JSON.stringify({ actual: f.actual, nueva: f.nueva }) });
      setF({ actual: '', nueva: '', repetir: '' });
      setMensaje({ tipo: 'ok', texto: 'Contraseña cambiada. Úsela la próxima vez que ingrese.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <header>
        <span className="eyebrow">Mi cuenta</span>
        <h1 className="page-title">{usuario?.nombre}</h1>
        <p className="page-sub">
          Usuario <b className="font-mono">{usuario?.usuario}</b> · {usuario ? ROL_ETIQUETA[usuario.rol] : ''}
        </p>
      </header>

      <form onSubmit={enviar} className="card space-y-4 p-6">
        <h2 className="card-title">Cambiar contraseña</h2>
        <label className="block">
          <span className="label">Contraseña actual</span>
          <input type="password" className="input" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} autoComplete="current-password" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Contraseña nueva</span>
            <input type="password" className="input" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} autoComplete="new-password" minLength={8} required />
          </label>
          <label className="block">
            <span className="label">Repetir contraseña nueva</span>
            <input type="password" className="input" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} autoComplete="new-password" minLength={8} required />
          </label>
        </div>
        {mensaje && (
          <p
            className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${
              mensaje.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {mensaje.texto}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-marca" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

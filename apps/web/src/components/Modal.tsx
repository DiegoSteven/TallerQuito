import { useEffect, type FormEvent, type ReactNode } from 'react';

/** Ventana para crear o editar un registro. Se cierra con Esc o con "Cancelar". */
export function Modal({
  titulo,
  subtitulo,
  children,
  onCerrar,
  onGuardar,
  guardando,
  error,
  textoGuardar = 'Guardar',
  ancho = 'max-w-2xl',
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando?: boolean;
  error?: string | null;
  textoGuardar?: string;
  ancho?: string;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onGuardar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={enviar} className={`card my-6 w-full ${ancho} p-6`}>
        <h2 className="font-display text-xl font-black text-tinta">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
        <div className="mt-5">{children}</div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-borde" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-marca" disabled={guardando}>
            {guardando ? 'Guardando…' : textoGuardar}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Campo con etiqueta, con el estilo del sistema. */
export function Campo({ etiqueta, children, className = '' }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{etiqueta}</span>
      {children}
    </label>
  );
}

/** "" → null: así un campo vaciado se borra en la base (y la API no rechaza una cédula o correo vacíos). */
export const oNulo = (v: string) => (v.trim() === '' ? null : v.trim());

/** Paginación simple: anterior / siguiente. */
export function Paginador({ pagina, porPagina, total, onPagina }: { pagina: number; porPagina: number; total: number; onPagina: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        Página {pagina} de {paginas} · {total} registros
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn btn-borde btn-sm" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
          ← Anterior
        </button>
        <button type="button" className="btn btn-borde btn-sm" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

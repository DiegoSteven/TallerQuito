import { Icono } from '../components/Iconos';

/** Marcador para las pantallas que se construyen según el cronograma. */
export function Pendiente({ titulo }: { titulo: string }) {
  return (
    <div className="space-y-5">
      <header>
        <span className="eyebrow">En construcción</span>
        <h1 className="page-title">{titulo}</h1>
      </header>
      <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-suave text-marca">
          <Icono nombre="herramienta" className="h-7 w-7" />
        </span>
        <h2 className="font-display text-lg font-extrabold text-tinta">Pantalla en construcción</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Estamos preparando este módulo. El diseño de referencia está en{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">docs/prototipo_fase1.html</code>.
        </p>
      </div>
    </div>
  );
}

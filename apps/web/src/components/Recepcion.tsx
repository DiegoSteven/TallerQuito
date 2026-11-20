import {
  CARROCERIAS,
  CHECKLIST_RECEPCION,
  COMBUSTIBLE_MAX,
  letraDanio,
  medidasVista,
  svgCombustible,
  textoCombustible,
  TIPOS_DANIO,
  trazoVista,
  VISTAS,
  type Carroceria,
  type ChecklistRecepcion,
  type MarcaDanio,
  type TipoDanio,
  type Vista,
} from '@taller/shared';
import type { MouseEvent } from 'react';
import { Icono } from './Iconos';

// ───────────────────────── Checklist SÍ / NO ─────────────────────────

/** Cada ítem se toca para pasar por: sin revisar → SÍ → NO → sin revisar. */
export function Checklist({ valor, onChange }: { valor: ChecklistRecepcion; onChange?: (v: ChecklistRecepcion) => void }) {
  const cambiar = (clave: keyof ChecklistRecepcion) => {
    if (!onChange) return;
    const actual = valor[clave];
    const siguiente = { ...valor };
    if (actual === undefined) siguiente[clave] = true;
    else if (actual === true) siguiente[clave] = false;
    else delete siguiente[clave];
    onChange(siguiente);
  };
  const revisados = Object.keys(valor).length;

  return (
    <div>
      {onChange && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">
            Toque cada ítem: <b className="text-green-700">SÍ</b> → <b className="text-red-700">NO</b> → sin revisar. Revisados {revisados}/
            {CHECKLIST_RECEPCION.length}
          </span>
          <button
            type="button"
            className="btn btn-borde btn-sm ml-auto"
            onClick={() => onChange(Object.fromEntries(CHECKLIST_RECEPCION.map((c) => [c.clave, valor[c.clave] ?? true])))}
          >
            <Icono nombre="check" className="h-3.5 w-3.5" />
            Lo demás SÍ
          </button>
          <button type="button" className="btn btn-borde btn-sm" onClick={() => onChange({})}>
            Limpiar
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {CHECKLIST_RECEPCION.map((c) => {
          const v = valor[c.clave];
          const estilo =
            v === true
              ? 'border-green-300 bg-green-50 text-green-800'
              : v === false
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-gray-200 bg-white text-gray-600';
          return (
            <button
              key={c.clave}
              type="button"
              disabled={!onChange}
              onClick={() => cambiar(c.clave)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold disabled:cursor-default ${estilo}`}
            >
              <span>{c.nombre}</span>
              <span className="text-xs font-black">{v === true ? 'SÍ' : v === false ? 'NO' : '—'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Combustible ─────────────────────────

export function Combustible({ valor, onChange }: { valor: number | null; onChange?: (v: number | null) => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-44" dangerouslySetInnerHTML={{ __html: svgCombustible(valor, 176) }} />
      <b className={valor == null ? 'text-gray-400' : ''}>{textoCombustible(valor)}</b>
      {onChange && (
        <>
          <input
            type="range"
            min={0}
            max={COMBUSTIBLE_MAX}
            step={1}
            value={valor ?? 4}
            onChange={(e) => onChange(Number(e.target.value))}
            className="mt-2 w-48 accent-marca"
            aria-label="Nivel de combustible"
          />
          <div className="flex w-48 justify-between text-xs font-bold text-gray-500">
            <span>E</span>
            <span>1/2</span>
            <span>F</span>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── Diagrama de carrocería ─────────────────────────

const COLOR_MARCA = '#c8102e';

function VistaCarroceria({
  carroceria,
  vista,
  marcas,
  onTocar,
}: {
  carroceria: Carroceria;
  vista: Vista;
  marcas: (MarcaDanio & { numero: number; indice: number })[];
  onTocar?: (x: number, y: number) => void;
}) {
  const { w, h } = medidasVista(carroceria, vista);
  const tocar = (e: MouseEvent<SVGSVGElement>) => {
    if (!onTocar) return;
    const r = e.currentTarget.getBoundingClientRect();
    onTocar(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const nombre = VISTAS.find((v) => v.clave === vista)!.nombre;
  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`w-full ${onTocar ? 'cursor-crosshair' : ''}`}
        onClick={tocar}
        role={onTocar ? 'button' : 'img'}
        aria-label={`Dibujo: ${nombre}`}
      >
        <g dangerouslySetInnerHTML={{ __html: trazoVista(carroceria, vista) }} />
        {marcas
          .filter((m) => m.vista === vista)
          .map((m) => (
            <g key={m.indice} pointerEvents="none">
              <circle cx={m.x * w} cy={m.y * h} r={8} fill={COLOR_MARCA} stroke="#fff" strokeWidth={1.5} />
              <text x={m.x * w} y={m.y * h + 3.3} fontSize={9} fontWeight="bold" fill="#fff" textAnchor="middle">
                {m.numero}
              </text>
            </g>
          ))}
      </svg>
      <figcaption className="text-xs text-gray-500">{nombre}</figcaption>
    </figure>
  );
}

export function DiagramaCarroceria({
  carroceria,
  marcas,
  onChange,
  onCarroceria,
  tipoActivo,
  onTipoActivo,
}: {
  carroceria: Carroceria;
  marcas: MarcaDanio[];
  onChange?: (m: MarcaDanio[]) => void;
  onCarroceria?: (c: Carroceria) => void;
  tipoActivo?: TipoDanio;
  onTipoActivo?: (t: TipoDanio) => void;
}) {
  const numeradas = marcas.map((m, i) => ({ ...m, numero: i + 1, indice: i }));
  const agregar = onChange
    ? (vista: Vista) => (x: number, y: number) => onChange([...marcas, { vista, x: +x.toFixed(3), y: +y.toFixed(3), tipo: tipoActivo ?? 'GOLPE' }])
    : undefined;

  return (
    <div>
      {onChange && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {CARROCERIAS.map((c) => (
              <button
                key={c.clave}
                type="button"
                onClick={() => onCarroceria?.(c.clave)}
                className={`px-3 py-1.5 font-semibold ${carroceria === c.clave ? 'bg-tinta text-white' : 'bg-white'}`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          <span className="ml-2 text-gray-500">Marcar como:</span>
          {TIPOS_DANIO.map((t) => (
            <button
              key={t.clave}
              type="button"
              onClick={() => onTipoActivo?.(t.clave)}
              className={`rounded-full border px-3 py-1 font-semibold ${tipoActivo === t.clave ? 'border-marca bg-marca text-white' : 'border-gray-300 bg-white'}`}
            >
              <b>{t.letra}</b> · {t.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 items-end gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-3 md:grid-cols-[3fr_3fr_2fr_2fr_3fr]">
        {VISTAS.map((v) => (
          <VistaCarroceria key={v.clave} carroceria={carroceria} vista={v.clave} marcas={numeradas} onTocar={agregar?.(v.clave)} />
        ))}
      </div>
      {onChange && <p className="mt-1 text-xs text-gray-500">Toque el dibujo donde está el golpe o rayón. Se numera solo.</p>}

      {numeradas.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {numeradas.map((m) => (
            <li key={m.indice} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-marca text-xs font-bold text-white">{m.numero}</span>
              <b className="text-marca">{letraDanio(m.tipo)}</b>
              <span>
                {TIPOS_DANIO.find((t) => t.clave === m.tipo)?.nombre} — {VISTAS.find((v) => v.clave === m.vista)?.nombre.toLowerCase()}
              </span>
              {onChange ? (
                <>
                  <input
                    value={m.nota ?? ''}
                    maxLength={120}
                    placeholder="Detalle (opcional): puerta, guardafango…"
                    onChange={(e) => onChange(marcas.map((x, i) => (i === m.indice ? { ...x, nota: e.target.value || undefined } : x)))}
                    className="min-w-48 flex-1 rounded-lg border border-gray-300 px-2 py-1"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar marca ${m.numero}`}
                    className="rounded-lg px-2 py-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onChange(marcas.filter((_, i) => i !== m.indice))}
                  >
                    ✕
                  </button>
                </>
              ) : (
                m.nota && <i className="text-gray-600">: {m.nota}</i>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500 italic">Sin golpes ni rayones registrados.</p>
      )}
    </div>
  );
}

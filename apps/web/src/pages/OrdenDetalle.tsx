import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HITOS_ORDEN, intervaloEfectivo, proximoCambio } from '@taller/shared';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono } from '../components/Iconos';
import { Checklist, Combustible, DiagramaCarroceria } from '../components/Recepcion';
import { abrirPdf, dinero, ESTADOS_ORDEN, fechaHora, formatoNumero, km, textoProximo, type ItemOrden, type Orden } from '../tipos';

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <h2 className="flex items-center gap-2 bg-tinta px-4 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-marca" />
        {titulo}
      </h2>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div>
      <div className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{etiqueta}</div>
      <div className="font-semibold text-tinta">{valor || <span className="text-slate-300">—</span>}</div>
    </div>
  );
}

function TablaItems({ items, vacio, hecho }: { items: ItemOrden[]; vacio: string; hecho: { fecha: Date; km: number } }) {
  if (!items.length) return <p className="py-2 text-sm italic text-slate-400">{vacio}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((i) => (
          <tr key={i.id} className="border-t border-slate-100 first:border-t-0">
            <td className="w-10 py-2 text-center font-display text-xs font-bold text-slate-500">{Number(i.cantidad)}</td>
            <td className="py-2">
              {i.descripcion}
              {i.tipoServicio &&
                ((intervalo) => {
                  const texto = textoProximo(proximoCambio(intervalo, hecho));
                  return texto ? (
                    <div className="text-xs font-semibold text-marca">
                      Próximo cambio: {texto}
                      {intervalo.personalizado && <span className="chip ml-1.5 bg-amber-100 text-amber-800">según este carro</span>}
                    </div>
                  ) : null;
                })(intervaloEfectivo(i, i.tipoServicio))}
            </td>
            <td className="py-2 text-right font-display font-bold text-tinta">{dinero(Number(i.cantidad) * Number(i.precioUnitario))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OrdenDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const { data: o, isLoading, error } = useQuery({ queryKey: ['orden', id], queryFn: () => api<Orden>(`/ordenes/${id}`) });

  const accion = useMutation({
    mutationFn: ({ ruta, cuerpo }: { ruta: string; cuerpo?: object }) =>
      api<Orden>(`/ordenes/${id}${ruta}`, { method: cuerpo ? 'PATCH' : 'POST', body: cuerpo ? JSON.stringify(cuerpo) : undefined }),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => alert(e.message),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (error || !o) return <p className="text-sm font-semibold text-red-700">{(error as Error)?.message ?? 'Orden no encontrada'}</p>;

  const v = o.vehiculo;
  const c = o.cliente ?? v.cliente; // quien trajo el carro en esta orden
  const abierta = o.estado === 'ABIERTA';
  const puedeEditar = usuario?.rol !== 'MECANICO' && (abierta || (o.estado === 'CERRADA' && usuario?.rol === 'DUENO'));
  const repuestos = o.items.filter((i) => i.tipo === 'REPUESTO');
  const manoObra = o.items.filter((i) => i.tipo === 'MANO_OBRA');
  const suma = (l: ItemOrden[]) => l.reduce((s, i) => s + Number(i.cantidad) * Number(i.precioUnitario), 0);
  const estado = ESTADOS_ORDEN[o.estado];
  const ahora = () => new Date().toISOString();

  return (
    <div className="space-y-4">
      <Link
        to={`/vehiculos/${v.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-marca"
      >
        <Icono nombre="flecha" className="h-4 w-4 rotate-180" />
        Historial de {v.placa}
      </Link>

      <section className="card overflow-hidden">
        <div className="panel-oscuro relative px-5 py-5 text-white md:px-7 md:py-6">
          <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-50" />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="mr-auto">
              <div className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-300">
                Orden de trabajo
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="font-display text-4xl font-black leading-none tracking-tight text-white">
                  N° {formatoNumero(o.numero)}
                </span>
                <span className={`chip ${estado.clase}`}>{estado.texto}</span>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-300">
                <span className="rounded-md border-2 border-white/80 bg-white/10 px-2 py-0.5 font-display font-extrabold tracking-widest text-white">
                  {v.placa}
                </span>
                <b className="text-white">{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</b>
                <span>{c.nombre}</span>
                {c.telefono && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icono nombre="telefono" className="h-4 w-4 text-slate-400" />
                    {c.telefono}
                  </span>
                )}
              </p>
            </div>
            <button type="button" onClick={() => abrirPdf(`/ordenes/${o.id}/orden.pdf`)} className="btn btn-marca">
              <Icono nombre="imprimir" className="h-4 w-4" />
              Imprimir para firmar
            </button>
            {puedeEditar && (
              <Link to={`/ordenes/${o.id}/editar`} className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20">
                <Icono nombre="editar" className="h-4 w-4" />
                Editar
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Avance de la orden: los 4 hitos del talonario */}
      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {HITOS_ORDEN.map((h, i) => {
          const valor = o[h.clave];
          const boton =
            abierta && !valor && usuario?.rol !== 'MECANICO'
              ? h.clave === 'fechaEntrega'
                ? {
                    texto: 'Entregar al cliente',
                    hacer: () =>
                      confirm('¿Entregar el vehículo? La orden se cierra y queda en el historial.') && accion.mutate({ ruta: '/entregar' }),
                  }
                : h.clave !== 'fechaLlegada'
                  ? { texto: 'Marcar ahora', hacer: () => accion.mutate({ ruta: '', cuerpo: { [h.clave]: ahora() } }) }
                  : null
              : null;
          return (
            <div
              key={h.clave}
              className={`rounded-xl border p-3.5 ${valor ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-center gap-2 font-display text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white ${
                    valor ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  {valor ? <Icono nombre="check" className="h-3 w-3" /> : i + 1}
                </span>
                {h.nombre}
              </div>
              <div className="mt-1.5 font-display font-bold text-tinta">
                {valor ? fechaHora(valor) : <span className="font-sans font-normal text-slate-400">Pendiente</span>}
              </div>
              {boton && (
                <button
                  type="button"
                  disabled={accion.isPending}
                  onClick={boton.hacer}
                  className={`mt-2.5 w-full rounded-lg px-3 py-1.5 font-display text-xs font-bold transition ${
                    h.clave === 'fechaEntrega'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-slate-300 bg-white text-tinta hover:bg-slate-50'
                  }`}
                >
                  {boton.texto}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Cliente">
          <div className="grid grid-cols-2 gap-3">
            <Dato etiqueta="Cliente" valor={c.nombre} />
            <Dato etiqueta="C.I. / RUC" valor={c.cedulaRuc} />
            <Dato etiqueta="Teléfono" valor={c.telefono} />
            <Dato etiqueta="Correo" valor={c.email} />
            <div className="col-span-2">
              <Dato etiqueta="Dirección" valor={c.direccion} />
            </div>
          </div>
        </Bloque>
        <Bloque titulo="Vehículo">
          <div className="grid grid-cols-3 gap-3">
            <Dato etiqueta="Marca" valor={v.marca} />
            <Dato etiqueta="Modelo" valor={v.modelo} />
            <Dato etiqueta="Año" valor={v.anio} />
            <Dato etiqueta="Color" valor={v.color} />
            <Dato etiqueta="Cilindraje" valor={v.cilindraje} />
            <Dato etiqueta="Kilómetros" valor={<span className="font-display text-lg font-black">{km(o.kilometraje)}</span>} />
            <div className="col-span-3">
              <Dato etiqueta="Chasis" valor={v.vin} />
            </div>
          </div>
        </Bloque>
      </div>

      {o.motivo && (
        <p className="rounded-xl border border-slate-200 border-l-4 border-l-marca bg-white p-4 shadow-card">
          <b className="font-display text-[10px] uppercase tracking-[0.14em] text-marca">Solicitud del cliente: </b>
          <span className="text-sm text-carbon">{o.motivo}</span>
        </p>
      )}

      <Bloque titulo="Recepción del vehículo">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto]">
          <Checklist valor={o.recepcion ?? {}} />
          <Combustible valor={o.combustible} />
        </div>
      </Bloque>

      <Bloque titulo="Estado de la carrocería">
        <DiagramaCarroceria carroceria={o.carroceria ?? 'AUTO'} marcas={o.danios ?? []} />
      </Bloque>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo={`Repuestos · ${dinero(suma(repuestos))}`}>
          <TablaItems items={repuestos} vacio="Aún sin repuestos." hecho={{ fecha: new Date(o.fecha), km: o.kilometraje }} />
        </Bloque>
        <Bloque titulo={`Mano de obra · ${dinero(suma(manoObra))}`}>
          <TablaItems items={manoObra} vacio="Aún sin trabajos registrados." hecho={{ fecha: new Date(o.fecha), km: o.kilometraje }} />
        </Bloque>
      </div>

      <section className="card flex flex-wrap items-center gap-4 p-4 md:p-5">
        <div className="min-w-0 flex-1">
          {o.observaciones ? (
            <>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Observaciones</div>
              <p className="text-sm">{o.observaciones}</p>
            </>
          ) : (
            <span className="text-sm text-slate-400">Sin observaciones.</span>
          )}
        </div>
        <div className="rounded-xl bg-marca px-5 py-3 text-right text-white shadow-lg shadow-marca/20">
          <div className="font-display text-[10px] font-bold tracking-[0.18em] text-red-100">TOTAL</div>
          <div className="font-display text-2xl font-black">{dinero(o.total)}</div>
        </div>
      </section>

      {usuario?.rol === 'DUENO' && o.estado !== 'ANULADA' && (
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          {o.estado === 'CERRADA' && (
            <button type="button" className="btn btn-borde btn-sm" onClick={() => accion.mutate({ ruta: '/reabrir' })}>
              Reabrir orden
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm border border-red-200 bg-white text-red-700 hover:bg-red-50"
            onClick={() => confirm('¿Anular esta orden? No se borra, pero deja de contar en el historial.') && accion.mutate({ ruta: '/anular' })}
          >
            Anular orden
          </button>
        </div>
      )}
      <p className="text-right text-xs text-slate-400">Registrada por {o.creadoPor?.nombre ?? '—'}</p>
    </div>
  );
}

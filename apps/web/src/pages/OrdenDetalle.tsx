import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HITOS_ORDEN } from '@taller/shared';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Checklist, Combustible, DiagramaCarroceria } from '../components/Recepcion';
import { abrirPdf, dinero, ESTADOS_ORDEN, fechaHora, formatoNumero, km, type ItemOrden, type Orden } from '../tipos';

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h2 className="bg-marca px-4 py-2 text-sm font-bold tracking-wider text-white uppercase">{titulo}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold tracking-wide text-gray-500 uppercase">{etiqueta}</div>
      <div className="font-semibold">{valor || <span className="text-gray-300">—</span>}</div>
    </div>
  );
}

function TablaItems({ items, vacio }: { items: ItemOrden[]; vacio: string }) {
  if (!items.length) return <p className="text-sm text-gray-500 italic">{vacio}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((i) => (
          <tr key={i.id} className="border-t border-gray-100">
            <td className="w-10 p-1.5 text-center text-gray-500">{Number(i.cantidad)}</td>
            <td className="p-1.5">{i.descripcion}</td>
            <td className="p-1.5 text-right font-semibold">{dinero(Number(i.cantidad) * Number(i.precioUnitario))}</td>
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

  if (isLoading) return <p className="text-gray-500">Cargando…</p>;
  if (error || !o) return <p className="text-red-700">{(error as Error)?.message ?? 'Orden no encontrada'}</p>;

  const v = o.vehiculo;
  const c = v.cliente;
  const abierta = o.estado === 'ABIERTA';
  const puedeEditar = usuario?.rol !== 'MECANICO' && (abierta || (o.estado === 'CERRADA' && usuario?.rol === 'DUENO'));
  const repuestos = o.items.filter((i) => i.tipo === 'REPUESTO');
  const manoObra = o.items.filter((i) => i.tipo === 'MANO_OBRA');
  const suma = (l: ItemOrden[]) => l.reduce((s, i) => s + Number(i.cantidad) * Number(i.precioUnitario), 0);
  const estado = ESTADOS_ORDEN[o.estado];
  const ahora = () => new Date().toISOString();

  return (
    <>
      <Link to={`/vehiculos/${v.id}`} className="text-sm text-gray-500 underline">
        ← Historial de {v.placa}
      </Link>

      <section className="my-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mr-auto">
          <div className="text-xs font-bold tracking-widest text-gray-500">ORDEN DE TRABAJO</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-black text-marca">N° {formatoNumero(o.numero)}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${estado.clase}`}>{estado.texto}</span>
          </div>
          <p className="mt-1 text-gray-600">
            <span className="placa mr-2">{v.placa}</span>
            <b>{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</b> · {c.nombre}
            {c.telefono ? ` · 📞 ${c.telefono}` : ''}
          </p>
        </div>
        <button
          onClick={() => abrirPdf(`/ordenes/${o.id}/orden.pdf`)}
          className="rounded-lg bg-marca px-5 py-2.5 font-semibold text-white hover:bg-marca-oscuro"
        >
          🖨 Imprimir para firmar
        </button>
        {puedeEditar && (
          <Link to={`/ordenes/${o.id}/editar`} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold">
            ✏️ Editar
          </Link>
        )}
      </section>

      {/* Avance de la orden: los 4 hitos del talonario */}
      <section className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {HITOS_ORDEN.map((h, i) => {
          const valor = o[h.clave];
          const boton =
            abierta && !valor && usuario?.rol !== 'MECANICO'
              ? h.clave === 'fechaEntrega'
                ? {
                    texto: '✔ Entregar al cliente',
                    hacer: () =>
                      confirm('¿Entregar el vehículo? La orden se cierra y queda en el historial.') && accion.mutate({ ruta: '/entregar' }),
                  }
                : h.clave !== 'fechaLlegada'
                  ? { texto: 'Marcar ahora', hacer: () => accion.mutate({ ruta: '', cuerpo: { [h.clave]: ahora() } }) }
                  : null
              : null;
          return (
            <div key={h.clave} className={`rounded-xl border p-3 ${valor ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white ${valor ? 'bg-green-600' : 'bg-gray-300'}`}>
                  {valor ? '✔' : i + 1}
                </span>
                {h.nombre}
              </div>
              <div className="mt-1 font-semibold">{valor ? fechaHora(valor) : <span className="text-gray-400">Pendiente</span>}</div>
              {boton && (
                <button
                  disabled={accion.isPending}
                  onClick={boton.hacer}
                  className={`mt-2 w-full rounded-lg px-3 py-1.5 text-sm font-semibold ${h.clave === 'fechaEntrega' ? 'bg-green-600 text-white' : 'border border-gray-300 bg-white'}`}
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
            <Dato etiqueta="Kilómetros" valor={<span className="text-lg">{km(o.kilometraje)}</span>} />
            <div className="col-span-3">
              <Dato etiqueta="Chasis" valor={v.vin} />
            </div>
          </div>
        </Bloque>
      </div>

      {o.motivo && (
        <p className="mb-4 rounded-xl border-l-4 border-marca bg-white p-3">
          <b className="text-xs tracking-wide text-marca uppercase">Solicitud del cliente: </b>
          {o.motivo}
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
          <TablaItems items={repuestos} vacio="Aún sin repuestos." />
        </Bloque>
        <Bloque titulo={`Mano de obra · ${dinero(suma(manoObra))}`}>
          <TablaItems items={manoObra} vacio="Aún sin trabajos registrados." />
        </Bloque>
      </div>

      <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mr-auto min-w-0 flex-1">
          {o.observaciones ? (
            <>
              <div className="text-xs font-bold tracking-wide text-gray-500 uppercase">Observaciones</div>
              <p>{o.observaciones}</p>
            </>
          ) : (
            <span className="text-sm text-gray-400">Sin observaciones.</span>
          )}
        </div>
        <div className="rounded-xl bg-marca px-5 py-3 text-right text-white">
          <div className="text-xs font-bold tracking-widest">TOTAL</div>
          <div className="text-2xl font-black">{dinero(o.total)}</div>
        </div>
      </section>

      {usuario?.rol === 'DUENO' && o.estado !== 'ANULADA' && (
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          {o.estado === 'CERRADA' && (
            <button className="rounded-lg border border-gray-300 px-3 py-1.5" onClick={() => accion.mutate({ ruta: '/reabrir' })}>
              Reabrir orden
            </button>
          )}
          <button
            className="rounded-lg border border-red-200 px-3 py-1.5 text-red-700"
            onClick={() => confirm('¿Anular esta orden? No se borra, pero deja de contar en el historial.') && accion.mutate({ ruta: '/anular' })}
          >
            Anular orden
          </button>
        </div>
      )}
      <p className="mt-2 text-right text-xs text-gray-400">Registrada por {o.creadoPor?.nombre ?? '—'}</p>
    </>
  );
}

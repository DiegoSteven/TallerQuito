import { useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizarPlaca, proximoCambio, type Carroceria, type ChecklistRecepcion, type MarcaDanio, type TipoDanio } from '@taller/shared';
import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { Icono } from '../components/Iconos';
import { Checklist, Combustible, DiagramaCarroceria } from '../components/Recepcion';
import {
  abrirPdf,
  aInputFechaHora,
  deInputFechaHora,
  dinero,
  textoProximo,
  formatoNumero,
  km,
  type Cliente,
  type ItemOrden,
  type Orden,
  type TipoItem,
  type TipoServicio,
  type Vehiculo,
} from '../tipos';

// ─── Formularios de cliente y vehículo ───
const VEH_VACIO = { placa: '', marca: '', modelo: '', anio: '', color: '', cilindraje: '', vin: '' };
const CLI_VACIO = { nombre: '', cedulaRuc: '', telefono: '', direccion: '', email: '' };
type FormVeh = typeof VEH_VACIO;
type FormCli = typeof CLI_VACIO;

const deVehiculo = (v: Vehiculo): FormVeh => ({
  placa: v.placa,
  marca: v.marca ?? '',
  modelo: v.modelo ?? '',
  anio: v.anio ? String(v.anio) : '',
  color: v.color ?? '',
  cilindraje: v.cilindraje ?? '',
  vin: v.vin ?? '',
});
const deCliente = (c: Cliente): FormCli => ({
  nombre: c.nombre,
  cedulaRuc: c.cedulaRuc ?? '',
  telefono: c.telefono ?? '',
  direccion: c.direccion ?? '',
  email: c.email ?? '',
});
/** Quita los campos vacíos: la API los rechaza ("" no es una cédula ni un correo válido). */
const sinVacios = <T extends Record<string, string>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim()]));

interface FilaItem {
  clave: number;
  tipo: TipoItem;
  tipoServicioId: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  /** Próximo cambio de este trabajo (vacío = el del catálogo). */
  intervaloKm: string;
  intervaloMeses: string;
}
let contador = 0;
const filaNueva = (tipo: TipoItem, i?: ItemOrden): FilaItem => ({
  clave: ++contador,
  tipo,
  tipoServicioId: i?.tipoServicioId ? String(i.tipoServicioId) : '',
  descripcion: i?.descripcion ?? '',
  cantidad: i ? String(Number(i.cantidad)) : '1',
  precioUnitario: i ? String(Number(i.precioUnitario)) : '',
  intervaloKm: i?.intervaloKm ? String(i.intervaloKm) : '',
  intervaloMeses: i?.intervaloMeses ? String(i.intervaloMeses) : '',
});
const valorFila = (f: FilaItem) => (Number(f.cantidad) || 0) * (Number(f.precioUnitario) || 0);

// ─── Piezas de interfaz ───
function Tarjeta({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <h2 className="flex items-center justify-between bg-tinta px-4 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-marca" />
          {titulo}
        </span>
        {extra}
      </h2>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function Campo({ etiqueta, children, ancho = '' }: { etiqueta: string; children: ReactNode; ancho?: string }) {
  return (
    <label className={`block ${ancho}`}>
      <span className="label">{etiqueta}</span>
      {children}
    </label>
  );
}
const INPUT = 'input';

export function OrdenForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editando = Boolean(id);

  // Vehículo y cliente
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [veh, setVeh] = useState<FormVeh>(VEH_VACIO);
  const [cli, setCli] = useState<FormCli>(CLI_VACIO);
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [placaNueva, setPlacaNueva] = useState(false);

  // Orden
  const [numero, setNumero] = useState<number | null>(null);
  const [kilometraje, setKilometraje] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaLlegada, setFechaLlegada] = useState(aInputFechaHora(new Date().toISOString()));
  const [fechaPedido, setFechaPedido] = useState('');
  const [fechaLlegadaRep, setFechaLlegadaRep] = useState('');
  const [recepcion, setRecepcion] = useState<ChecklistRecepcion>({});
  const [combustible, setCombustible] = useState<number | null>(null);
  const [carroceria, setCarroceria] = useState<Carroceria>('AUTO');
  const [danios, setDanios] = useState<MarcaDanio[]>([]);
  const [tipoDanio, setTipoDanio] = useState<TipoDanio>('GOLPE');
  const [filas, setFilas] = useState<FilaItem[]>([]);

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const catalogo = useQuery({ queryKey: ['catalogo'], queryFn: () => api<TipoServicio[]>('/tipos-servicio') });

  const elegirVehiculo = (v: Vehiculo) => {
    setVehiculo(v);
    setVeh(deVehiculo(v));
    setClienteId(v.cliente.id);
    setCli(deCliente(v.cliente));
    setPlacaNueva(false);
    if (/d-?max|hilux|ranger|bt-?50|l200|frontier|navara|amarok|luv|np300|tundra|tacoma|wingle|t60/i.test(`${v.modelo} ${v.marca}`)) {
      setCarroceria('CAMIONETA');
    }
  };

  // Cargar la orden (edición) o el vehículo indicado (?vehiculo=)
  useEffect(() => {
    if (id) {
      api<Orden>(`/ordenes/${id}`).then((o) => {
        elegirVehiculo(o.vehiculo);
        setNumero(o.numero);
        setKilometraje(String(o.kilometraje));
        setMotivo(o.motivo ?? '');
        setObservaciones(o.observaciones ?? '');
        setFechaLlegada(aInputFechaHora(o.fechaLlegada));
        setFechaPedido(aInputFechaHora(o.fechaPedidoRepuestos));
        setFechaLlegadaRep(aInputFechaHora(o.fechaLlegadaRepuestos));
        setRecepcion(o.recepcion ?? {});
        setCombustible(o.combustible);
        setCarroceria(o.carroceria ?? 'AUTO');
        setDanios(o.danios ?? []);
        setFilas(o.items.map((i) => filaNueva(i.tipo, i)));
      }, (e: Error) => setError(e.message));
    } else if (params.get('vehiculo')) {
      api<{ vehiculo: Vehiculo }>(`/vehiculos/${params.get('vehiculo')}/historial`).then((h) => elegirVehiculo(h.vehiculo));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function buscarPlaca() {
    const placa = normalizarPlaca(veh.placa);
    if (placa.length < 5) return;
    setBuscandoPlaca(true);
    try {
      const r = await api<{ datos: Vehiculo[] }>(`/vehiculos?q=${encodeURIComponent(placa)}`);
      const v = r.datos.find((x) => normalizarPlaca(x.placa) === placa);
      if (v) {
        const h = await api<{ vehiculo: Vehiculo }>(`/vehiculos/${v.id}/historial`);
        elegirVehiculo(h.vehiculo);
      } else {
        setVehiculo(null);
        setPlacaNueva(true);
        setVeh({ ...VEH_VACIO, placa });
      }
    } finally {
      setBuscandoPlaca(false);
    }
  }

  async function buscarCedula() {
    const ced = cli.cedulaRuc.trim();
    if (vehiculo || ced.length < 10) return;
    const r = await api<{ datos: Cliente[] }>(`/clientes?q=${encodeURIComponent(ced)}`);
    const c = r.datos.find((x) => x.cedulaRuc === ced);
    if (c) {
      setClienteId(c.id);
      setCli(deCliente(c));
    }
  }

  const repuestos = filas.filter((f) => f.tipo === 'REPUESTO');
  const manoObra = filas.filter((f) => f.tipo === 'MANO_OBRA');
  const suma = (l: FilaItem[]) => l.reduce((s, f) => s + valorFila(f), 0);
  const cambiarFila = (clave: number, cambio: Partial<FilaItem>) => setFilas(filas.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  async function guardar(e: FormEvent, imprimir = false, forzarKm = false, ventanaAbierta?: Window | null) {
    e.preventDefault();
    setError('');
    // La pestaña del PDF se abre ya, en el clic; si no, el navegador la bloquea.
    const ventana = imprimir ? (ventanaAbierta ?? window.open('', '_blank')) : null;
    const fallar = (msg: string) => {
      ventana?.close();
      setError(msg);
    };
    if (!vehiculo && !placaNueva) return fallar('Primero busque la placa del vehículo.');
    if (!cli.nombre.trim()) return fallar('Falta el nombre del cliente.');
    if (!kilometraje) return fallar('Falta el kilometraje.');
    const incompletas = filas.filter((f) => f.descripcion.trim() && !(Number(f.cantidad) > 0));
    if (incompletas.length) return fallar('Revise las cantidades de repuestos y mano de obra.');

    setGuardando(true);
    try {
      // 1. Cliente
      let idCliente = clienteId;
      if (idCliente) await api(`/clientes/${idCliente}`, { method: 'PATCH', body: JSON.stringify(sinVacios(cli)) });
      else idCliente = (await api<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(sinVacios(cli)) })).id;

      // 2. Vehículo
      const { placa, anio, ...resto } = veh;
      const datosVeh = { ...sinVacios(resto), ...(anio ? { anio: Number(anio) } : {}) };
      let idVehiculo = vehiculo?.id;
      if (idVehiculo) await api(`/vehiculos/${idVehiculo}`, { method: 'PATCH', body: JSON.stringify(datosVeh) });
      else
        idVehiculo = (await api<Vehiculo>('/vehiculos', { method: 'POST', body: JSON.stringify({ ...datosVeh, placa, clienteId: idCliente }) }))
          .id;
      if (!vehiculo) {
        const h = await api<{ vehiculo: Vehiculo }>(`/vehiculos/${idVehiculo}/historial`);
        setVehiculo(h.vehiculo);
        setClienteId(idCliente);
        setPlacaNueva(false);
      }

      // 3. Orden
      const cuerpo = {
        kilometraje: Number(kilometraje),
        motivo: motivo.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        fechaLlegada: deInputFechaHora(fechaLlegada) ?? undefined,
        fechaPedidoRepuestos: deInputFechaHora(fechaPedido),
        fechaLlegadaRepuestos: deInputFechaHora(fechaLlegadaRep),
        recepcion,
        combustible: combustible ?? undefined,
        carroceria,
        danios,
        items: filas
          .filter((f) => f.descripcion.trim())
          .map((f) => ({
            tipo: f.tipo,
            descripcion: f.descripcion.trim(),
            cantidad: Number(f.cantidad),
            precioUnitario: Number(f.precioUnitario) || 0,
            ...(f.tipoServicioId
              ? {
                  tipoServicioId: Number(f.tipoServicioId),
                  intervaloKm: f.intervaloKm ? Number(f.intervaloKm) : null,
                  intervaloMeses: f.intervaloMeses ? Number(f.intervaloMeses) : null,
                }
              : {}),
          })),
        ...(forzarKm ? { forzarKm: true } : {}),
      };
      const orden = editando
        ? await api<Orden>(`/ordenes/${id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) })
        : await api<Orden>('/ordenes', {
            method: 'POST',
            body: JSON.stringify({ ...cuerpo, vehiculoId: idVehiculo, fechaPedidoRepuestos: cuerpo.fechaPedidoRepuestos ?? undefined, fechaLlegadaRepuestos: cuerpo.fechaLlegadaRepuestos ?? undefined }),
          });

      await qc.invalidateQueries();
      if (imprimir) abrirPdf(`/ordenes/${orden.id}/orden.pdf`, ventana);
      navigate(`/ordenes/${orden.id}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (err instanceof ApiError && msg.includes('forzarKm')) {
        if (confirm(`${msg.split('Revise')[0]}\n\n¿Se cambió el odómetro o el tablero? Aceptar para guardar igual.`)) {
          setGuardando(false);
          return guardar(e, imprimir, true, ventana);
        }
        fallar('El kilometraje es menor al último registrado. Corríjalo antes de guardar.');
      } else fallar(msg);
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Segunda línea de un trabajo del catálogo: cada cuánto es el próximo cambio para ESTE carro
   * (p. ej. aceite sintético cada 10.000 km). Viene con el valor del catálogo y se puede ajustar.
   * Es una función (no un componente) para que los inputs no pierdan el foco al escribir.
   */
  const filaProximo = (f: FilaItem) => {
    const servicio = catalogo.data?.find((c) => String(c.id) === f.tipoServicioId);
    const intervalo = {
      intervaloKm: f.intervaloKm ? Number(f.intervaloKm) : (servicio?.intervaloKm ?? null),
      intervaloMeses: f.intervaloMeses ? Number(f.intervaloMeses) : (servicio?.intervaloMeses ?? null),
    };
    const llegada = fechaLlegada ? new Date(fechaLlegada) : new Date();
    const proximo = textoProximo(proximoCambio(intervalo, { fecha: llegada, km: Number(kilometraje) || 0 }));
    const propio =
      (f.intervaloKm !== '' && Number(f.intervaloKm) !== servicio?.intervaloKm) ||
      (f.intervaloMeses !== '' && Number(f.intervaloMeses) !== servicio?.intervaloMeses);
    const corto = 'w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-marca focus:outline-none';
    return (
      <tr>
        <td colSpan={6} className="px-1 pt-0 pb-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span className="font-bold text-tinta">Próximo cambio:</span>
            cada
            <input className={corto} inputMode="numeric" placeholder="km" value={f.intervaloKm} onChange={(e) => cambiarFila(f.clave, { intervaloKm: e.target.value.replace(/\D/g, '') })} />
            km ·
            <input className={`${corto} w-16`} inputMode="numeric" placeholder="meses" value={f.intervaloMeses} onChange={(e) => cambiarFila(f.clave, { intervaloMeses: e.target.value.replace(/\D/g, '') })} />
            meses
            {proximo && kilometraje && <span className="font-semibold text-marca">→ {proximo}</span>}
            {propio && (
              <button
                type="button"
                className="ml-auto text-slate-500 underline hover:text-marca"
                title={`Catálogo: ${servicio?.intervaloKm ?? '—'} km · ${servicio?.intervaloMeses ?? '—'} meses`}
                onClick={() =>
                  cambiarFila(f.clave, {
                    intervaloKm: servicio?.intervaloKm ? String(servicio.intervaloKm) : '',
                    intervaloMeses: servicio?.intervaloMeses ? String(servicio.intervaloMeses) : '',
                  })
                }
              >
                usar catálogo
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const tablaFilas = (tipo: TipoItem, lista: FilaItem[]) => (
    <div>
      <div className="overflow-x-auto">
        <table className="tabla min-w-[520px]">
          <thead>
            <tr>
              <th>{tipo === 'REPUESTO' ? 'Repuesto' : 'Trabajo'}</th>
              <th className="w-52">Servicio del catálogo</th>
              <th className="w-16">Cant.</th>
              <th className="w-24">P. unit.</th>
              <th className="w-20 text-right">Valor</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <Fragment key={f.clave}>
              <tr className="border-t border-gray-100">
                <td className="p-1">
                  <input
                    className={INPUT}
                    value={f.descripcion}
                    placeholder={tipo === 'REPUESTO' ? 'Ej: Kit banda de distribución' : 'Ej: Cambio de banda y tensor'}
                    onChange={(e) => cambiarFila(f.clave, { descripcion: e.target.value })}
                  />
                </td>
                <td className="p-1">
                  <select
                    className={INPUT}
                    value={f.tipoServicioId}
                    title="Sirve para el historial y los recordatorios"
                    onChange={(e) => {
                      const servicio = catalogo.data?.find((c) => String(c.id) === e.target.value);
                      cambiarFila(f.clave, {
                        tipoServicioId: e.target.value,
                        ...(!f.descripcion && servicio ? { descripcion: servicio.nombre } : {}),
                        // Se proponen los intervalos del catálogo; el mecánico los ajusta según lo que puso.
                        intervaloKm: servicio?.intervaloKm ? String(servicio.intervaloKm) : '',
                        intervaloMeses: servicio?.intervaloMeses ? String(servicio.intervaloMeses) : '',
                      });
                    }}
                  >
                    <option value="">—</option>
                    {catalogo.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <input className={INPUT} inputMode="decimal" value={f.cantidad} onChange={(e) => cambiarFila(f.clave, { cantidad: e.target.value })} />
                </td>
                <td className="p-1">
                  <input
                    className={INPUT}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={f.precioUnitario}
                    onChange={(e) => cambiarFila(f.clave, { precioUnitario: e.target.value })}
                  />
                </td>
                <td className="p-1 text-right font-semibold">{dinero(valorFila(f))}</td>
                <td className="p-1">
                  <button
                    type="button"
                    aria-label="Quitar fila"
                    className="rounded px-2 py-1 text-gray-400 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setFilas(filas.filter((x) => x.clave !== f.clave))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
              {f.tipoServicioId && filaProximo(f)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn btn-borde btn-sm" onClick={() => setFilas([...filas, filaNueva(tipo)])}>
          <Icono nombre="mas" className="h-3.5 w-3.5" />
          Agregar {tipo === 'REPUESTO' ? 'repuesto' : 'trabajo'}
        </button>
        <span className="text-sm text-slate-500">
          Subtotal <b className="font-display text-tinta">{dinero(suma(lista))}</b>
        </span>
      </div>
    </div>
  );

  const datosBloqueados = !vehiculo && !placaNueva;

  return (
    <form onSubmit={(e) => guardar(e)}>
      <Link
        to={editando ? `/ordenes/${id}` : '/'}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-marca"
      >
        <Icono nombre="flecha" className="h-4 w-4 rotate-180" />
        Volver
      </Link>
      <div className="my-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="eyebrow">{editando ? 'Edición de la orden' : 'Recepción en el taller'}</span>
          <h1 className="page-title">
            {editando ? (
              <>
                Orden de trabajo <span className="text-marca">N° {formatoNumero(numero ?? 0)}</span>
              </>
            ) : (
              'Recibir vehículo'
            )}
          </h1>
        </div>
        {vehiculo?.kmActual != null && (
          <span className="chip bg-white text-slate-600 ring-1 ring-slate-200">
            Último km registrado: {km(vehiculo.kmActual)}
          </span>
        )}
      </div>

      <Tarjeta titulo="Vehículo y cliente">
        <div className="grid gap-3 md:grid-cols-4">
          <Campo etiqueta="Placa" ancho="md:col-span-1">
            <div className="flex gap-1">
              <input
                className={`${INPUT} font-bold tracking-wider uppercase`}
                value={veh.placa}
                disabled={editando}
                placeholder="PBA-1234"
                onChange={(e) => {
                  setVeh({ ...veh, placa: e.target.value });
                  if (vehiculo || placaNueva) {
                    setVehiculo(null);
                    setPlacaNueva(false);
                    setClienteId(null);
                    setCli(CLI_VACIO);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarPlaca())}
                onBlur={() => !vehiculo && !placaNueva && buscarPlaca()}
              />
              {!editando && (
                <button type="button" className="btn btn-tinta shrink-0 px-3" onClick={buscarPlaca}>
                  {buscandoPlaca ? '…' : 'Buscar'}
                </button>
              )}
            </div>
          </Campo>
          <div className="flex items-end md:col-span-3">
            {vehiculo && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">✔ Vehículo registrado. Revise y complete los datos si hace falta.</p>}
            {placaNueva && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Vehículo nuevo: llene sus datos y los del dueño.</p>}
            {datosBloqueados && <p className="text-sm text-gray-500">Escriba la placa y presione Buscar.</p>}
          </div>
        </div>

        <fieldset disabled={datosBloqueados} className="mt-4 grid gap-4 disabled:opacity-50 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Campo etiqueta="Marca">
              <input className={INPUT} value={veh.marca} onChange={(e) => setVeh({ ...veh, marca: e.target.value })} />
            </Campo>
            <Campo etiqueta="Modelo">
              <input className={INPUT} value={veh.modelo} onChange={(e) => setVeh({ ...veh, modelo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Año">
              <input className={INPUT} inputMode="numeric" value={veh.anio} onChange={(e) => setVeh({ ...veh, anio: e.target.value.replace(/\D/g, '') })} />
            </Campo>
            <Campo etiqueta="Color">
              <input className={INPUT} value={veh.color} onChange={(e) => setVeh({ ...veh, color: e.target.value })} />
            </Campo>
            <Campo etiqueta="Cilindraje">
              <input className={INPUT} value={veh.cilindraje} placeholder="1.6 / 2500 cc" onChange={(e) => setVeh({ ...veh, cilindraje: e.target.value })} />
            </Campo>
            <Campo etiqueta="Chasis">
              <input className={`${INPUT} uppercase`} value={veh.vin} onChange={(e) => setVeh({ ...veh, vin: e.target.value })} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="C.I. / RUC">
              <input
                className={INPUT}
                inputMode="numeric"
                value={cli.cedulaRuc}
                onChange={(e) => setCli({ ...cli, cedulaRuc: e.target.value.replace(/\D/g, '') })}
                onBlur={buscarCedula}
              />
            </Campo>
            <Campo etiqueta="Cliente *">
              <input className={INPUT} value={cli.nombre} onChange={(e) => setCli({ ...cli, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input className={INPUT} inputMode="tel" value={cli.telefono} onChange={(e) => setCli({ ...cli, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Correo">
              <input className={INPUT} type="email" value={cli.email} onChange={(e) => setCli({ ...cli, email: e.target.value })} />
            </Campo>
            <Campo etiqueta="Dirección" ancho="col-span-2">
              <input className={INPUT} value={cli.direccion} onChange={(e) => setCli({ ...cli, direccion: e.target.value })} />
            </Campo>
          </div>
        </fieldset>
      </Tarjeta>

      <fieldset disabled={datosBloqueados} className="disabled:opacity-50">
        <Tarjeta titulo="Llegada">
          <div className="grid gap-3 md:grid-cols-4">
            <Campo etiqueta="Kilómetros *">
              <input className={`${INPUT} text-lg font-bold`} inputMode="numeric" value={kilometraje} onChange={(e) => setKilometraje(e.target.value.replace(/\D/g, ''))} />
            </Campo>
            <Campo etiqueta="Llegada del cliente">
              <input className={INPUT} type="datetime-local" value={fechaLlegada} onChange={(e) => setFechaLlegada(e.target.value)} />
            </Campo>
            <Campo etiqueta="Pedido de repuestos">
              <input className={INPUT} type="datetime-local" value={fechaPedido} onChange={(e) => setFechaPedido(e.target.value)} />
            </Campo>
            <Campo etiqueta="Llegada de repuestos">
              <input className={INPUT} type="datetime-local" value={fechaLlegadaRep} onChange={(e) => setFechaLlegadaRep(e.target.value)} />
            </Campo>
            <Campo etiqueta="¿Qué pide el cliente?" ancho="md:col-span-4">
              <input className={INPUT} value={motivo} placeholder="Ej: mantenimiento de los 100 mil, suena la suspensión…" onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Recepción del vehículo">
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto]">
            <Checklist valor={recepcion} onChange={setRecepcion} />
            <Combustible valor={combustible} onChange={setCombustible} />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Estado de la carrocería">
          <DiagramaCarroceria
            carroceria={carroceria}
            marcas={danios}
            onChange={setDanios}
            onCarroceria={setCarroceria}
            tipoActivo={tipoDanio}
            onTipoActivo={setTipoDanio}
          />
        </Tarjeta>

        <Tarjeta titulo="Detalle de repuestos">{tablaFilas('REPUESTO', repuestos)}</Tarjeta>
        <Tarjeta titulo="Detalle de mano de obra">{tablaFilas('MANO_OBRA', manoObra)}</Tarjeta>

        <Tarjeta titulo="Observaciones">
          <textarea className={INPUT} rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Tarjeta>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur md:-mx-8 md:px-8">
        <div className="mr-auto">
          <span className="text-sm text-slate-500">Total </span>
          <b className="font-display text-2xl font-black text-marca">{dinero(suma(filas))}</b>
          <span className="ml-3 text-xs text-slate-500">
            Repuestos {dinero(suma(repuestos))} · Mano de obra {dinero(suma(manoObra))}
          </span>
        </div>
        {error && <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:order-first">{error}</p>}
        <button type="submit" disabled={guardando} className="btn btn-borde">
          Guardar
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={(e) => guardar(e as unknown as FormEvent, true)}
          className="btn btn-marca"
        >
          <Icono nombre="imprimir" className="h-4 w-4" />
          {guardando ? 'Guardando…' : 'Guardar e imprimir'}
        </button>
      </div>
    </form>
  );
}

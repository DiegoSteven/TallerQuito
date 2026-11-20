import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../api';
import { Icono } from '../components/Iconos';
import {
  CONFIGURACION_LANDING_DEFAULT,
  type LandingConfig,
  type SlideHero,
  type ServicioLanding,
} from '@taller/shared';

/** Procesa y optimiza imágenes locales antes de subirlas al servidor */
function procesarFotoLocal(file: File, maxAncho: number, callback: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        callback(dataUrl);
      } else {
        callback(e.target?.result as string);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

/** Vista previa de la foto. Sin foto (o si falla) muestra un aviso, nunca una foto de relleno. */
function VistaFoto({ url, alt, className }: { url: string; alt: string; className: string }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [url]);
  if (!url || fallo) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1 bg-slate-100 text-center text-xs font-semibold text-slate-400`}>
        <Icono nombre="imagen" className="h-6 w-6" />
        {url ? 'No se pudo cargar la foto' : 'Sin foto'}
      </div>
    );
  }
  return <img src={url} alt={alt} className={`${className} object-cover`} onError={() => setFallo(true)} />;
}

function EstadoElemento({ nuevo, pendiente }: { nuevo: boolean; pendiente: boolean }) {
  if (nuevo) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">Nuevo · sin guardar</span>;
  if (pendiente) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Cambios sin publicar</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">✓ Publicado</span>;
}

/** true si el elemento tiene cambios que aún no se publicaron (o nunca se guardó). */
const distinto = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

export function MantenimientoLanding() {
  const qc = useQueryClient();
  /**
   * Dos copias:
   * - `publicado`: lo que está guardado en la base y se ve en la landing.
   * - `config`: el borrador en pantalla.
   * Nada del borrador llega a la base hasta que se pulsa "Guardar" en ESE elemento,
   * y ese botón publica solo ese elemento (no los cambios pendientes de los demás).
   */
  const [publicado, setPublicado] = useState<LandingConfig | null>(null);
  const [config, setConfig] = useState<LandingConfig>(CONFIGURACION_LANDING_DEFAULT);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [subiendoId, setSubiendoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pestana, setPestana] = useState<'slides' | 'servicios' | 'taller'>('slides');

  useEffect(() => {
    cargarConfig();
  }, []);

  async function cargarConfig() {
    setCargando(true);
    try {
      const data = await api<LandingConfig>('/landing');
      setPublicado(data);
      setConfig(data);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `No se pudo cargar la landing: ${err instanceof Error ? err.message : err}` });
    } finally {
      setCargando(false);
    }
  }

  // ─── Estado de cada elemento ───
  const slidePublicado = (id: string) => publicado?.slides.find((s) => s.id === id);
  const servicioPublicado = (id: string) => publicado?.servicios.find((s) => s.id === id);
  const slidePendiente = (s: SlideHero) => distinto(s, slidePublicado(s.id));
  const servicioPendiente = (s: ServicioLanding) => distinto(s, servicioPublicado(s.id));
  const contactoPendiente = publicado ? distinto(config.taller, publicado.taller) : false;
  const hayPendientes =
    contactoPendiente || config.slides.some(slidePendiente) || config.servicios.some(servicioPendiente);

  // Avisar antes de salir si quedó algo sin guardar
  useEffect(() => {
    if (!hayPendientes) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayPendientes]);

  /** Envía a la API solo la parte indicada y actualiza la copia publicada. */
  async function publicar(id: string, nombre: string, cambios: Partial<LandingConfig>) {
    setGuardandoId(id);
    setMensaje(null);
    try {
      const res = await api<LandingConfig>('/landing', { method: 'PUT', body: JSON.stringify(cambios) });
      if (cambios.taller) qc.invalidateQueries({ queryKey: ['logo-taller'] }); // el logo del menú se actualiza al instante
      setPublicado(res);
      setMensaje({ tipo: 'ok', texto: `${nombre}: publicado en la landing.` });
      setTimeout(() => setMensaje(null), 4000);
      return res;
    } catch (err: unknown) {
      setMensaje({ tipo: 'error', texto: `No se pudo guardar: ${err instanceof Error ? err.message : 'error'}` });
      return null;
    } finally {
      setGuardandoId(null);
    }
  }

  /** Reemplaza (o agrega) un elemento dentro de la lista publicada, sin tocar los demás. */
  function conElemento<T extends { id: string }>(lista: T[], item: T, ordenBorrador: string[]): T[] {
    const todos = [...lista.filter((x) => x.id !== item.id), item];
    // Respeta el orden que se ve en pantalla
    return todos.sort((a, b) => ordenBorrador.indexOf(a.id) - ordenBorrador.indexOf(b.id));
  }

  // Sube la foto al servidor y la pone SOLO en el borrador. Se publica al pulsar "Guardar".
  async function subirFotoAlServidor(file: File, maxAncho: number, tipo: 'slide' | 'servicio', id: string) {
    setSubiendoId(id);
    setMensaje({ tipo: 'ok', texto: 'Subiendo foto…' });
    procesarFotoLocal(file, maxAncho, async (dataUrl) => {
      try {
        const res = await api<{ url: string }>('/landing/upload', {
          method: 'POST',
          body: JSON.stringify({ imagenBase64: dataUrl }),
        });
        if (tipo === 'slide') actualizarSlide(id, { imagenUrl: res.url });
        else actualizarServicio(id, { imagenUrl: res.url });
        setMensaje({
          tipo: 'ok',
          texto: 'Foto lista en la vista previa. Todavía NO está publicada: pulse "Guardar" en ese elemento.',
        });
      } catch (err: unknown) {
        setMensaje({ tipo: 'error', texto: `Error al subir la foto: ${err instanceof Error ? err.message : 'error'}` });
      } finally {
        setSubiendoId(null);
      }
    });
  }

  // ─── Banners ───
  function actualizarSlide(id: string, parcial: Partial<SlideHero>) {
    setConfig((prev) => ({ ...prev, slides: prev.slides.map((s) => (s.id === id ? { ...s, ...parcial } : s)) }));
  }

  /** Crea un banner VACÍO solo en pantalla. No se publica hasta guardarlo. */
  function agregarSlide() {
    const nuevo: SlideHero = {
      id: `slide-${Date.now()}`,
      titulo: '',
      subtitulo: '',
      imagenUrl: '',
      botonTexto: '',
      botonUrl: '',
      activo: true,
      orden: config.slides.length + 1,
    };
    setConfig((prev) => ({ ...prev, slides: [...prev.slides, nuevo] }));
  }

  async function guardarSlide(id: string, numero: number) {
    const s = config.slides.find((x) => x.id === id);
    if (!s || !publicado) return;
    if (!s.titulo.trim() || !s.imagenUrl.trim()) {
      setMensaje({ tipo: 'error', texto: `Banner #${numero}: falta el título o la foto.` });
      return;
    }
    const orden = config.slides.map((x) => x.id);
    await publicar(id, `Banner #${numero}`, { slides: conElemento(publicado.slides, s, orden) });
  }

  function descartarSlide(id: string) {
    const original = slidePublicado(id);
    setConfig((prev) => ({
      ...prev,
      slides: original ? prev.slides.map((s) => (s.id === id ? original : s)) : prev.slides.filter((s) => s.id !== id),
    }));
  }

  async function eliminarSlide(id: string) {
    if (!slidePublicado(id)) return descartarSlide(id); // nunca se guardó: solo se quita de la pantalla
    if (!publicado) return;
    if (publicado.slides.length <= 1) {
      alert('Debe existir al menos un banner en el carrusel.');
      return;
    }
    if (!confirm('¿Eliminar este banner de la landing?')) return;
    const res = await publicar('carrusel', 'Banner eliminado', { slides: publicado.slides.filter((s) => s.id !== id) });
    if (res) setConfig((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== id) }));
  }

  /** Cambia el orden. Publica solo el nuevo orden de los banners ya guardados, sin cambios pendientes. */
  async function moverSlide(index: number, direccion: -1 | 1) {
    const target = index + direccion;
    if (target < 0 || target >= config.slides.length || !publicado) return;
    const nuevos = [...config.slides];
    [nuevos[index], nuevos[target]] = [nuevos[target], nuevos[index]];
    setConfig((prev) => ({ ...prev, slides: nuevos }));
    const orden = nuevos.map((s) => s.id);
    const ordenados = [...publicado.slides].sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
    await publicar('orden-slides', 'Orden de banners', { slides: ordenados });
  }

  // ─── Servicios ───
  function actualizarServicio(id: string, parcial: Partial<ServicioLanding>) {
    setConfig((prev) => ({
      ...prev,
      servicios: prev.servicios.map((s) => (s.id === id ? { ...s, ...parcial } : s)),
    }));
  }

  /** Crea un servicio VACÍO solo en pantalla. No se publica hasta guardarlo. */
  function agregarServicio() {
    const nuevo: ServicioLanding = {
      id: `serv-${Date.now()}`,
      titulo: '',
      categoria: '',
      descripcion: '',
      imagenUrl: '',
      etiqueta: '',
      orden: config.servicios.length + 1,
    };
    setConfig((prev) => ({ ...prev, servicios: [...prev.servicios, nuevo] }));
  }

  async function guardarServicio(id: string) {
    const s = config.servicios.find((x) => x.id === id);
    if (!s || !publicado) return;
    if (!s.titulo.trim() || !s.imagenUrl.trim()) {
      setMensaje({ tipo: 'error', texto: 'El servicio necesita título y foto antes de publicarse.' });
      return;
    }
    const orden = config.servicios.map((x) => x.id);
    await publicar(id, `Servicio "${s.titulo}"`, { servicios: conElemento(publicado.servicios, s, orden) });
  }

  function descartarServicio(id: string) {
    const original = servicioPublicado(id);
    setConfig((prev) => ({
      ...prev,
      servicios: original
        ? prev.servicios.map((s) => (s.id === id ? original : s))
        : prev.servicios.filter((s) => s.id !== id),
    }));
  }

  async function eliminarServicio(id: string) {
    if (!servicioPublicado(id)) return descartarServicio(id);
    if (!publicado || !confirm('¿Eliminar este servicio de la landing?')) return;
    const res = await publicar('servicios', 'Servicio eliminado', {
      servicios: publicado.servicios.filter((s) => s.id !== id),
    });
    if (res) setConfig((prev) => ({ ...prev, servicios: prev.servicios.filter((s) => s.id !== id) }));
  }

  // ─── Logo ───
  /** Sube el logo y lo pone SOLO en el borrador; se publica con "Guardar" de contacto. */
  function subirLogo(file: File) {
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setMensaje({ tipo: 'error', texto: 'El logo debe ser PNG (recomendado, con fondo transparente) o JPG.' });
      return;
    }
    setSubiendoId('logo');
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const escala = Math.min(1, 800 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
        try {
          const res = await api<{ url: string }>('/landing/upload', { method: 'POST', body: JSON.stringify({ imagenBase64: dataUrl }) });
          setConfig((prev) => ({ ...prev, taller: { ...prev.taller, logoUrl: res.url } }));
          setMensaje({ tipo: 'ok', texto: 'Logo listo en la vista previa. Pulse "Guardar y publicar" para usarlo en la web, el sistema y los PDF.' });
        } catch (err) {
          setMensaje({ tipo: 'error', texto: `No se pudo subir el logo: ${err instanceof Error ? err.message : 'error'}` });
        } finally {
          setSubiendoId(null);
        }
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(file);
  }

  // ─── Contacto ───
  const guardarContacto = () => publicar('contacto', 'Datos de contacto', { taller: config.taller });
  const descartarContacto = () => {
    if (publicado) setConfig((prev) => ({ ...prev, taller: publicado.taller }));
  };

  if (cargando && !config.slides.length) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando datos desde la base de datos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="eyebrow">Sitio web del taller</span>
          <h1 className="page-title">Mantenimiento de la landing</h1>
          <p className="page-sub">
            Edite los banners, servicios y datos de contacto que ven sus clientes en la web pública.
          </p>
        </div>
      </div>

      {/* Banner de Mensajes de Éxito / Error */}
      {mensaje && (
        <div
          className={`p-3.5 rounded-lg font-medium text-sm flex items-center justify-between ${
            mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {hayPendientes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Hay cambios que todavía <b>no se ven en la landing</b>. Se publican al pulsar <b>Guardar</b> en cada elemento.
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPestana('slides')}
          className={`tab ${pestana === 'slides' ? 'tab-on' : 'tab-off'}`}
        >
          <Icono nombre="imagen" className="h-4 w-4" />
          Carrusel hero ({config.slides.length})
        </button>
        <button
          type="button"
          onClick={() => setPestana('servicios')}
          className={`tab ${pestana === 'servicios' ? 'tab-on' : 'tab-off'}`}
        >
          <Icono nombre="catalogo" className="h-4 w-4" />
          Servicios destacados ({config.servicios.length})
        </button>
        <button
          type="button"
          onClick={() => setPestana('taller')}
          className={`tab ${pestana === 'taller' ? 'tab-on' : 'tab-off'}`}
        >
          <Icono nombre="ubicacion" className="h-4 w-4" />
          Contacto y horarios
        </button>
      </div>

      {/* PESTAÑA: SLIDES DEL CARRUSEL */}
      {pestana === 'slides' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Los cambios se ven aquí al instante, pero solo llegan a la landing al pulsar <b>Guardar</b> en cada banner.
            </p>
            <button
              onClick={agregarSlide}
              className="btn btn-tinta btn-sm"
            >
              <span>+ Agregar Banner</span>
            </button>
          </div>

          <div className="space-y-6">
            {config.slides.map((slide, idx) => (
              <div key={slide.id} className={`card p-5 space-y-4 ${slidePendiente(slide) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-700">
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-gray-900">{slide.titulo || 'Banner sin título'}</h3>
                    <EstadoElemento nuevo={!slidePublicado(slide.id)} pendiente={slidePendiente(slide)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mr-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slide.activo}
                        onChange={(e) => actualizarSlide(slide.id, { activo: e.target.checked })}
                        className="rounded text-marca focus:ring-marca"
                      />
                      {slide.activo ? 'Activo' : 'Oculto'}
                    </label>
                    <button
                      onClick={() => moverSlide(idx, -1)}
                      disabled={idx === 0 || !!guardandoId}
                      className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-50"
                      title="Mover arriba"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moverSlide(idx, 1)}
                      disabled={idx === config.slides.length - 1 || !!guardandoId}
                      className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-30 hover:bg-gray-50"
                      title="Mover abajo"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => eliminarSlide(slide.id)}
                      className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                      title={slidePublicado(slide.id) ? 'Eliminar de la landing' : 'Quitar (no se guardó)'}
                    >
                      {slidePublicado(slide.id) ? 'Eliminar' : 'Quitar'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Vista Previa de Imagen */}
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-900 h-48 flex items-center justify-center">
                    <VistaFoto url={slide.imagenUrl} alt={slide.titulo} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex flex-col justify-end text-white">
                      <span className="text-[10px] uppercase font-bold text-red-400">Vista Previa</span>
                      <p className="text-xs font-bold truncate">{slide.titulo}</p>
                    </div>
                  </div>

                  {/* Campos de Edición */}
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Fotografía del Banner
                        </label>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-colors">
                          <svg className="w-4 h-4 text-marca" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {subiendoId === slide.id ? 'Subiendo foto…' : 'Cargar foto desde mi equipo'}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={subiendoId === slide.id}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                subirFotoAlServidor(file, 1920, 'slide', slide.id);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={slide.imagenUrl}
                        onChange={(e) => actualizarSlide(slide.id, { imagenUrl: e.target.value })}
                        placeholder="URL de la imagen"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 font-mono bg-gray-50 focus:border-marca focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Título de Impacto
                      </label>
                      <input
                        type="text"
                        value={slide.titulo}
                        placeholder="Ej: Mantenimiento preventivo con garantía"
                        onChange={(e) => actualizarSlide(slide.id, { titulo: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold focus:border-marca focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Subtítulo / Mensaje de Confianza
                      </label>
                      <textarea
                        rows={2}
                        value={slide.subtitulo}
                        placeholder="Ej: Revisamos su vehículo por kilometraje y le avisamos qué le toca."
                        onChange={(e) => actualizarSlide(slide.id, { subtitulo: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Texto del Botón CTA
                        </label>
                        <input
                          type="text"
                          value={slide.botonTexto}
                          placeholder="Ej: Agendar por WhatsApp"
                          onChange={(e) => actualizarSlide(slide.id, { botonTexto: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Enlace del Botón
                        </label>
                        <input
                          type="text"
                          value={slide.botonUrl}
                          onChange={(e) => actualizarSlide(slide.id, { botonUrl: e.target.value })}
                          placeholder="https://wa.me/... o #servicios"
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÓN INDIVIDUAL DE GUARDAR ESTE BANNER */}
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                  {slidePublicado(slide.id) && slidePendiente(slide) && (
                    <button
                      onClick={() => descartarSlide(slide.id)}
                      className="btn btn-borde btn-sm"
                    >
                      Descartar cambios
                    </button>
                  )}
                  <button
                    onClick={() => guardarSlide(slide.id, idx + 1)}
                    disabled={guardandoId === slide.id || !slidePendiente(slide)}
                    className={`btn btn-sm ${slidePendiente(slide) ? 'btn-marca' : 'btn-borde'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {guardandoId === slide.id ? 'Guardando…' : slidePendiente(slide) ? 'Guardar y publicar' : 'Sin cambios'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: SERVICIOS */}
      {pestana === 'servicios' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Cada servicio se publica en la landing solo al pulsar <b>Guardar</b> en su tarjeta.
            </p>
            <button
              onClick={agregarServicio}
              className="btn btn-tinta btn-sm"
            >
              <span>+ Agregar Servicio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.servicios.map((serv) => (
              <div key={serv.id} className={`card p-4 space-y-3 ${servicioPendiente(serv) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <EstadoElemento nuevo={!servicioPublicado(serv.id)} pendiente={servicioPendiente(serv)} />
                  <button
                    onClick={() => eliminarServicio(serv.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {servicioPublicado(serv.id) ? 'Eliminar' : 'Quitar'}
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="w-28 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <VistaFoto url={serv.imagenUrl} alt={serv.titulo} className="w-full h-full" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={serv.titulo}
                      onChange={(e) => actualizarServicio(serv.id, { titulo: e.target.value })}
                      placeholder="Título del servicio (ej: Frenos)"
                      className="w-full rounded border border-gray-300 px-2.5 py-1 text-sm font-bold focus:border-marca focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={serv.categoria}
                        onChange={(e) => actualizarServicio(serv.id, { categoria: e.target.value })}
                        placeholder="Categoría (ej: Seguridad)"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-marca focus:outline-none"
                      />
                      <input
                        type="text"
                        value={serv.etiqueta || ''}
                        onChange={(e) => actualizarServicio(serv.id, { etiqueta: e.target.value })}
                        placeholder="Badge (ej: Vital)"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-marca focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Imagen del Servicio
                    </label>
                    <label className="cursor-pointer text-xs font-semibold text-marca hover:underline inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {subiendoId === serv.id ? 'Subiendo foto…' : 'Subir foto del equipo'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={subiendoId === serv.id}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            subirFotoAlServidor(file, 800, 'servicio', serv.id);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={serv.imagenUrl}
                    onChange={(e) => actualizarServicio(serv.id, { imagenUrl: e.target.value })}
                    placeholder="URL de la imagen"
                    className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 font-mono bg-gray-50 focus:border-marca focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Descripción Técnica
                  </label>
                  <textarea
                    rows={2}
                    value={serv.descripcion}
                    placeholder="Ej: Pastillas, discos y líquido de frenos con revisión completa."
                    onChange={(e) => actualizarServicio(serv.id, { descripcion: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs focus:border-marca focus:outline-none"
                  />
                </div>

                {/* BOTÓN INDIVIDUAL DE GUARDAR SERVICIO */}
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
                  {servicioPublicado(serv.id) && servicioPendiente(serv) && (
                    <button
                      onClick={() => descartarServicio(serv.id)}
                      className="btn btn-borde btn-sm"
                    >
                      Descartar cambios
                    </button>
                  )}
                  <button
                    onClick={() => guardarServicio(serv.id)}
                    disabled={guardandoId === serv.id || !servicioPendiente(serv)}
                    className={`btn btn-sm ${servicioPendiente(serv) ? 'btn-marca' : 'btn-borde'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {guardandoId === serv.id ? 'Guardando…' : servicioPendiente(serv) ? 'Guardar y publicar' : 'Sin cambios'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: DATOS DEL TALLER & HORARIOS */}
      {pestana === 'taller' && (
        <div className="card max-w-3xl space-y-5 p-6">
          <h3 className="flex items-center gap-2 font-bold text-gray-900 border-b border-gray-100 pb-2">
            Información Pública del Taller <EstadoElemento nuevo={false} pendiente={contactoPendiente} />
          </h3>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-700">Logo del taller</span>
                <span className="text-xs text-slate-500">Se usa en la landing, en el sistema y en los PDF de órdenes e historial.</span>
              </div>
              <div className="flex gap-2">
                <label className="btn btn-borde btn-sm cursor-pointer">
                  {subiendoId === 'logo' ? 'Subiendo…' : config.taller.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={subiendoId === 'logo'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) subirLogo(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {config.taller.logoUrl && (
                  <button
                    type="button"
                    className="btn btn-borde btn-sm text-red-700"
                    onClick={() => setConfig((prev) => ({ ...prev, taller: { ...prev.taller, logoUrl: '' } }))}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3">
                {config.taller.logoUrl ? (
                  <img src={config.taller.logoUrl} alt="Logo sobre fondo claro" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Sin logo: se muestra el nombre en texto</span>
                )}
              </div>
              <div className="flex h-24 items-center justify-center rounded-lg bg-tinta p-3">
                {config.taller.logoUrl ? (
                  <img src={config.taller.logoUrl} alt="Logo sobre fondo oscuro" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-500">Vista sobre fondo oscuro (menú del sistema)</span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Recomendado: PNG horizontal con fondo transparente, al menos 600 px de ancho.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nombre del Taller
              </label>
              <input
                type="text"
                value={config.taller.nombre}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, nombre: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Lema o Slogan
              </label>
              <input
                type="text"
                value={config.taller.lema}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, lema: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={config.taller.telefono}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, telefono: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                WhatsApp Internacional (ej: 593995396039)
              </label>
              <input
                type="text"
                value={config.taller.whatsapp}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, whatsapp: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                value={config.taller.direccion}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, direccion: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Enlace de Google Maps
              </label>
              <input
                type="url"
                value={config.taller.mapsUrl}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, taller: { ...prev.taller, mapsUrl: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-marca focus:outline-none"
              />
            </div>
          </div>

          {/* BOTÓN INDIVIDUAL DE GUARDAR CONTACTO */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            {contactoPendiente && (
              <button
                onClick={descartarContacto}
                className="btn btn-borde"
              >
                Descartar cambios
              </button>
            )}
            <button
              onClick={guardarContacto}
              disabled={guardandoId === 'contacto' || !contactoPendiente}
              className={`btn ${contactoPendiente ? 'btn-marca' : 'btn-borde'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {guardandoId === 'contacto' ? 'Guardando…' : contactoPendiente ? 'Guardar y publicar' : 'Sin cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

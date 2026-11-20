import { TALLER } from './taller';

export interface SlideHero {
  id: string;
  titulo: string;
  subtitulo: string;
  imagenUrl: string;
  botonTexto: string;
  botonUrl: string;
  activo: boolean;
  orden: number;
}

export interface ServicioLanding {
  id: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  imagenUrl: string;
  etiqueta?: string;
  orden: number;
}

export interface PilarConfianza {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

export interface LandingConfig {
  taller: {
    nombre: string;
    lema: string;
    telefono: string;
    whatsapp: string;
    email: string;
    direccion: string;
    horario: string[];
    mapsUrl: string;
  };
  slides: SlideHero[];
  servicios: ServicioLanding[];
  pilares: PilarConfianza[];
}

/** Configuración inicial por defecto con fotografía automotriz profesional estilo CEPSA Mecánica */
export const CONFIGURACION_LANDING_DEFAULT: LandingConfig = {
  taller: {
    nombre: TALLER.nombre,
    lema: TALLER.lema,
    telefono: TALLER.telefono,
    whatsapp: TALLER.whatsapp,
    email: TALLER.email,
    direccion: `${TALLER.direccion} · ${TALLER.ciudad}`,
    horario: ['Lunes a viernes · 08:00 – 18:00', 'Sábados · 08:00 – 13:00'],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Mecánica Automotriz Sánchez, Av. Oswaldo Guayasamín E3-115, Cumbayá'),
  },
  slides: [
    {
      id: 'slide-1',
      titulo: 'Mantenimiento y Mecánica Integral para su Vehículo',
      subtitulo: 'Servicio técnico especializado con historial digital de cada trabajo. Cuidamos su vehículo con repuestos garantizados y diagnóstico de precisión.',
      imagenUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1920&q=80',
      botonTexto: 'Agendar Cita por WhatsApp',
      botonUrl: 'https://wa.me/593995396039?text=Hola%2C%20quisiera%20agendar%20un%20turno%20para%20mi%20veh%C3%ADculo',
      activo: true,
      orden: 1,
    },
    {
      id: 'slide-2',
      titulo: 'Diagnóstico Computarizado & Escáner Multimarca',
      subtitulo: 'Detectamos y corregimos fallas electrónicas, sensores y sistemas de inyección con tecnología de escaneo avanzada.',
      imagenUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1920&q=80',
      botonTexto: 'Consultar Diagnóstico',
      botonUrl: 'https://wa.me/593995396039?text=Hola%2C%20quisiera%20consultar%20por%20un%20diagn%C3%B3stico%20con%20esc%C3%A1ner',
      activo: true,
      orden: 2,
    },
    {
      id: 'slide-3',
      titulo: 'Seguridad en Cada Kilómetro: Sistema de Frenos y Suspensión',
      subtitulo: 'ABC completo de frenos, rectificación de discos, amortiguadores y alineación para su total tranquilidad en carretera.',
      imagenUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1920&q=80',
      botonTexto: 'Cotizar Frenos o Suspensión',
      botonUrl: 'https://wa.me/593995396039?text=Hola%2C%20quisiera%20cotizar%20revisi%C3%B3n%20de%20frenos%20o%20suspensi%C3%B3n',
      activo: true,
      orden: 3,
    },
  ],
  servicios: [
    {
      id: 'serv-1',
      titulo: 'Mantenimiento Preventivo & Cambio de Aceite',
      categoria: 'Mantenimiento',
      descripcion: 'Cambio de aceite según especificaciones del fabricante (sintético/semisintético), sustitución de filtros de aceite, aire y cabina.',
      imagenUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Recomendado c/ 5,000 km',
      orden: 1,
    },
    {
      id: 'serv-2',
      titulo: 'Sistema de Frenos & Seguridad',
      categoria: 'Seguridad',
      descripcion: 'Inspección de pastillas y zapatas, rectificación de discos y tambores, purga y cambio de líquido de frenos.',
      imagenUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Revisión Vital',
      orden: 2,
    },
    {
      id: 'serv-3',
      titulo: 'Diagnóstico Electrónico & Escáner',
      categoria: 'Tecnología',
      descripcion: 'Lectura de códigos de avería (Check Engine, ABS, Airbag), análisis de sensores en tiempo real y reseteo de intervalos de servicio.',
      imagenUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Multimarca',
      orden: 3,
    },
    {
      id: 'serv-4',
      titulo: 'Suspensión, Dirección & Amortiguadores',
      categoria: 'Mecánica',
      descripcion: 'Cambio de amortiguadores, rótulas, terminales, bujes de mesa y calibración de dirección para una conducción suave y segura.',
      imagenUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Confort y Control',
      orden: 4,
    },
    {
      id: 'serv-5',
      titulo: 'Banda de Distribución & Bomba de Agua',
      categoria: 'Motor',
      descripcion: 'Kit completo de distribución, tensores y bomba de refrigerante. Evite daños costosos en las válvulas de su motor.',
      imagenUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Protección de Motor',
      orden: 5,
    },
    {
      id: 'serv-6',
      titulo: 'Embrague & Transmisión',
      categoria: 'Mecánica',
      descripcion: 'Kit de embrague (disco, plato y rulimán), calibración del pedal y revisión de caja de cambios manual o automática.',
      imagenUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
      etiqueta: 'Potencia y Tracción',
      orden: 6,
    },
  ],
  pilares: [
    {
      id: 'pilar-1',
      titulo: 'Historial Digital por Placa',
      descripcion: 'Cada visita y repuesto queda registrado en nuestro sistema. Sabemos el historial exacto de su vehículo en cada kilometraje.',
      icono: 'shield',
    },
    {
      id: 'pilar-2',
      titulo: 'Diagnóstico Computarizado',
      descripcion: 'Equipos de escaneo multimarca para identificar la falla con precisión antes de cambiar piezas innecesarias.',
      icono: 'cpu',
    },
    {
      id: 'pilar-3',
      titulo: 'Garantía en Mano de Obra y Repuestos',
      descripcion: 'Trabajamos con repuestos originales o de calidad OEM garantizada, con respaldo total del taller.',
      icono: 'check',
    },
    {
      id: 'pilar-4',
      titulo: 'Presupuesto Previo y Transparente',
      descripcion: 'Usted autoriza el presupuesto antes de iniciar cualquier labor. Cero sorpresas ni sobrecostos al retirar su auto.',
      icono: 'file-text',
    },
  ],
};

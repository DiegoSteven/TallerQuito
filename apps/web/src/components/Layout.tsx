import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROL_ETIQUETA, type LandingConfig } from '@taller/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { Icono, type NombreIcono } from './Iconos';

interface ItemMenu {
  to: string;
  icono: NombreIcono;
  texto: string;
  fin?: boolean;
  soloDueno?: boolean;
}

const GRUPOS: { titulo: string; items: ItemMenu[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { to: '/', icono: 'inicio', texto: 'Inicio', fin: true },
      { to: '/ordenes', icono: 'ordenes', texto: 'Órdenes' },
      { to: '/recordatorios', icono: 'recordatorios', texto: 'Recordatorios' },
      { to: '/vehiculos', icono: 'vehiculo', texto: 'Vehículos' },
      { to: '/clientes', icono: 'clientes', texto: 'Clientes' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { to: '/estadisticas', icono: 'estadisticas', texto: 'Estadísticas', soloDueno: true },
      { to: '/catalogo', icono: 'catalogo', texto: 'Catálogo', soloDueno: true },
      { to: '/usuarios', icono: 'usuarios', texto: 'Usuarios', soloDueno: true },
      { to: '/importar', icono: 'importar', texto: 'Importar Excel', soloDueno: true },
    ],
  },
  {
    titulo: 'Sitio web',
    items: [{ to: '/landing', icono: 'landing', texto: 'Mantenimiento web' }],
  },
];

function tituloDeRuta(ruta: string): string {
  if (ruta === '/') return 'Inicio';
  if (ruta.startsWith('/ordenes/nueva')) return 'Recibir vehículo';
  if (ruta.startsWith('/ordenes/') && ruta !== '/ordenes') return 'Orden de trabajo';
  if (ruta.startsWith('/vehiculos/')) return 'Ficha del vehículo';
  if (ruta.startsWith('/ordenes')) return 'Órdenes de trabajo';
  if (ruta.startsWith('/recordatorios')) return 'Recordatorios';
  if (ruta.startsWith('/vehiculos')) return 'Vehículos';
  if (ruta.startsWith('/clientes')) return 'Clientes';
  if (ruta.startsWith('/estadisticas')) return 'Estadísticas';
  if (ruta.startsWith('/catalogo')) return 'Catálogo de servicios';
  if (ruta.startsWith('/usuarios')) return 'Usuarios';
  if (ruta.startsWith('/mi-cuenta')) return 'Mi cuenta';
  if (ruta.startsWith('/importar')) return 'Importar desde Excel';
  if (ruta.startsWith('/landing')) return 'Mantenimiento web';
  return 'Sistema del taller';
}

/** Logo subido en "Mantenimiento web" (la consulta es pública y se comparte en toda la app). */
export function useLogoTaller() {
  const { data } = useQuery({
    queryKey: ['logo-taller'],
    queryFn: () => api<LandingConfig>('/landing'),
    staleTime: 5 * 60_000,
    select: (c) => c.taller.logoUrl || null,
  });
  return data ?? null;
}

export function Logo({ sub, claro = false }: { sub?: string; claro?: boolean }) {
  const logo = useLogoTaller();
  if (logo) {
    return (
      <div className="leading-none">
        <img src={logo} alt="Logo del taller" className="max-h-14 max-w-[210px] object-contain" />
        {sub && (
          <div className={`mt-2 font-display text-[10px] font-bold tracking-[0.2em] ${claro ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</div>
        )}
      </div>
    );
  }
  return (
    <div className="leading-none">
      <div
        className={`font-display text-[9px] font-bold tracking-[0.28em] ${claro ? 'text-slate-400' : 'text-slate-500'}`}
      >
        TECNICENTRO AUTOMOTRIZ
      </div>
      <div
        className={`mt-1 font-display text-[26px] font-black leading-none tracking-[0.08em] ${claro ? 'text-white' : 'text-tinta'}`}
      >
        SÁNCHEZ
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="h-[3px] w-14 bg-marca" />
        <span
          className={`font-display text-[8px] font-bold tracking-[0.14em] ${claro ? 'text-slate-400' : 'text-slate-500'}`}
        >
          CENTRO DE SERVICIO INTEGRAL
        </span>
      </div>
      {sub && (
        <div className={`mt-2 font-display text-[10px] font-bold tracking-[0.2em] ${claro ? 'text-slate-500' : 'text-slate-400'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const titulo = tituloDeRuta(pathname);
  const iniciales = (usuario?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-humo">
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-tinta/60 backdrop-blur-sm md:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col bg-tinta transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          abierto ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 grilla-tecnica opacity-50" />
        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Logo claro sub="SISTEMA INTERNO" />
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          {GRUPOS.map((grupo) => {
            const items = grupo.items.filter((m) => !m.soloDueno || usuario?.rol === 'DUENO');
            if (!items.length) return null;
            return (
              <div key={grupo.titulo} className="mb-5">
                <div className="mb-2 px-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {grupo.titulo}
                </div>
                <div className="space-y-1">
                  {items.map((m) => (
                    <NavLink
                      key={m.to}
                      to={m.to}
                      end={m.fin}
                      onClick={() => setAbierto(false)}
                      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-on' : ''}`}
                    >
                      <span className="nav-icono">
                        <Icono nombre={m.icono} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="truncate">{m.texto}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca font-display text-sm font-black text-white">
              {iniciales || 'MS'}
            </span>
            <NavLink
              to="/mi-cuenta"
              onClick={() => setAbierto(false)}
              className="min-w-0 flex-1 rounded-lg hover:opacity-90"
              title="Mi cuenta: cambiar contraseña"
            >
              <div className="truncate font-display text-sm font-bold text-white">{usuario?.nombre}</div>
              <div className="truncate text-[11px] text-slate-400">
                {usuario ? ROL_ETIQUETA[usuario.rol] : 'Sesión'} · Mi cuenta
              </div>
            </NavLink>
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icono nombre="salir" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-8">
            <button
              type="button"
              className="rounded-lg p-1.5 text-tinta hover:bg-slate-100 md:hidden"
              onClick={() => setAbierto(true)}
              aria-label="Abrir menú"
            >
              <Icono nombre="menu" className="h-6 w-6" />
            </button>

            <nav className="hidden items-baseline gap-2 sm:flex" aria-label="Ubicación">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Sistema
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-display text-sm font-bold text-tinta">{titulo}</span>
            </nav>

            <span className="flex-1" />

            <a
              href={import.meta.env.VITE_LANDING_URL || 'http://localhost:4321'}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 font-display text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-tinta lg:inline-flex"
            >
              <Icono nombre="landing" className="h-4 w-4" />
              Ver landing
            </a>
            <button type="button" className="btn btn-marca btn-sm md:px-4 md:py-2.5" onClick={() => navigate('/ordenes/nueva')}>
              <Icono nombre="mas" className="h-4 w-4" />
              <span className="hidden sm:inline">Recibir vehículo</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200/80 px-4 py-4 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              © {new Date().getFullYear()} MECÁNICA AUTOMOTRIZSánchez · Cumbayá, Quito
            </span>
            <span className="font-display font-semibold uppercase tracking-[0.14em]">
              Historial digital garantizado
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const MENU = [
  { to: '/', icono: '🔍', texto: 'Inicio', fin: true },
  { to: '/vehiculos', icono: '🚗', texto: 'Vehículos' },
  { to: '/clientes', icono: '👤', texto: 'Clientes' },
  { to: '/ordenes', icono: '🧾', texto: 'Órdenes' },
  { to: '/recordatorios', icono: '⏰', texto: 'Recordatorios' },
  { to: '/estadisticas', icono: '📊', texto: 'Estadísticas', soloDueno: true },
  { to: '/catalogo', icono: '⚙️', texto: 'Catálogo', soloDueno: true },
  { to: '/usuarios', icono: '👥', texto: 'Usuarios', soloDueno: true },
  { to: '/importar', icono: '📥', texto: 'Importar Excel', soloDueno: true },
];

export function Logo({ sub = 'SISTEMA DEL TALLER' }: { sub?: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[9px] font-bold tracking-[.25em] text-gray-500">MECÁNICA AUTOMOTRIZ</div>
      <div className="text-2xl leading-none font-black tracking-wide">SÁNCHEZ</div>
      <div className="mt-1 h-[3px] w-24 bg-marca" />
      <div className="mt-1 text-[10px] font-bold tracking-[.12em] text-gray-500">{sub}</div>
    </div>
  );
}

export function Layout() {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-200 bg-white transition-transform md:static md:translate-x-0 ${abierto ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}
      >
        <div className="border-b border-gray-200 px-5 py-4">
          <Logo />
        </div>
        <nav className="flex-1 py-2">
          {MENU.filter((m) => !m.soloDueno || usuario?.rol === 'DUENO').map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.fin}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-4 px-5 py-2.5 font-semibold ${isActive ? 'border-marca bg-marca-suave text-marca' : 'border-transparent text-gray-700 hover:bg-gray-50'}`
              }
            >
              <span>{m.icono}</span>
              {m.texto}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 px-5 py-3 text-sm text-gray-500">
          👤 <b className="text-tinta">{usuario?.nombre}</b>
          <button className="ml-2 underline" onClick={logout}>
            Salir
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <button className="text-2xl md:hidden" onClick={() => setAbierto(!abierto)} aria-label="Menú">
            ☰
          </button>
          <span className="flex-1" />
          <button
            className="rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro"
            onClick={() => navigate('/ordenes/nueva')}
          >
            + Recibir vehículo
          </button>
        </header>
        <main className="w-full max-w-6xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

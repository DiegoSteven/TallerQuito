import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Inicio } from './pages/Inicio';
import { FichaVehiculo } from './pages/FichaVehiculo';
import { Recordatorios } from './pages/Recordatorios';
import { Pendiente } from './pages/Pendiente';
import { OrdenForm } from './pages/OrdenForm';
import { OrdenDetalle } from './pages/OrdenDetalle';
import { Ordenes } from './pages/Ordenes';
import { MantenimientoLanding } from './pages/MantenimientoLanding';
import { Usuarios } from './pages/Usuarios';
import { Clientes } from './pages/Clientes';
import { Vehiculos } from './pages/Vehiculos';
import { Catalogo } from './pages/Catalogo';
import { MiCuenta } from './pages/MiCuenta';

export function App() {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="vehiculos/:id" element={<FichaVehiculo />} />
        <Route path="recordatorios" element={<Recordatorios />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/nueva" element={<OrdenForm />} />
        <Route path="ordenes/:id" element={<OrdenDetalle />} />
        <Route path="ordenes/:id/editar" element={<OrdenForm key="editar" />} />
        {/* Pantallas del cronograma que se construyen en las siguientes semanas */}
        <Route path="vehiculos" element={<Vehiculos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="estadisticas" element={<Pendiente titulo="Estadísticas" />} />
        <Route path="catalogo" element={usuario.rol === 'DUENO' ? <Catalogo /> : <Navigate to="/" replace />} />
        <Route path="usuarios" element={usuario.rol === 'DUENO' ? <Usuarios /> : <Navigate to="/" replace />} />
        <Route path="mi-cuenta" element={<MiCuenta />} />
        <Route path="importar" element={<Pendiente titulo="Importar desde Excel" />} />
        <Route path="landing" element={<MantenimientoLanding />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

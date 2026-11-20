import type { Rol } from '@taller/shared';
import { createContext, ReactNode, useContext, useState } from 'react';
import { api, token } from './api';

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

interface AuthCtx {
  usuario: Usuario | null;
  login: (usuario: string, password: string) => Promise<void>;
  /** Entra con una sesión ya creada (p. ej. al terminar la configuración inicial). */
  entrar: (s: Sesion) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'taller.usuario';

function leerUsuario(): Usuario | null {
  try {
    return token.get() ? JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario);

  const entrar = (r: Sesion) => {
    token.set(r.token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(r.usuario));
    } catch {
      /* sin almacenamiento */
    }
    setUsuario(r.usuario);
  };

  const login = async (u: string, password: string) => {
    entrar(await api<Sesion>('/auth/login', { method: 'POST', body: JSON.stringify({ usuario: u, password }) }));
  };

  const logout = () => {
    token.set(null);
    setUsuario(null);
  };

  return <Ctx.Provider value={{ usuario, login, entrar, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}

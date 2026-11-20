import type { Rol } from '@taller/shared';
import { createContext, ReactNode, useContext, useState } from 'react';
import { api, token } from './api';

export interface Usuario {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
}

interface AuthCtx {
  usuario: Usuario | null;
  login: (usuario: string, password: string) => Promise<void>;
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

  const login = async (u: string, password: string) => {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario: u, password }),
    });
    token.set(r.token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(r.usuario));
    } catch {
      /* sin almacenamiento */
    }
    setUsuario(r.usuario);
  };

  const logout = () => {
    token.set(null);
    setUsuario(null);
  };

  return <Ctx.Provider value={{ usuario, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}

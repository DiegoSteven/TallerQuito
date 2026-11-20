const TOKEN_KEY = 'taller.token';

export const token = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Cliente HTTP mínimo: agrega el token y convierte errores de la API en mensajes legibles. */
export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = token.get();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api${ruta}`, { ...init, headers });
  if (res.status === 401 && ruta !== '/auth/login') {
    token.set(null);
    window.location.assign('/login');
  }
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    const msg = Array.isArray(cuerpo.message) ? cuerpo.message.join(' · ') : cuerpo.message;
    throw new ApiError(res.status, msg ?? `Error ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

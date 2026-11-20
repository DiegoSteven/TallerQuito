import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol } from '@prisma/client';

export const ES_PUBLICO = 'esPublico';
/** Marca una ruta como accesible sin iniciar sesión. */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

export const ROLES_KEY = 'roles';
/** Restringe una ruta a ciertos roles. Sin este decorador, cualquier usuario autenticado entra. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

export interface UsuarioSesion {
  id: number;
  usuario: string;
  rol: Rol;
}

export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioSesion => ctx.switchToHttp().getRequest().user,
);

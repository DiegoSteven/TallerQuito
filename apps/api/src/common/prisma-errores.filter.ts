import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Nombre legible del campo único que se repitió. */
const CAMPOS: Record<string, string> = {
  cedulaRuc: 'Ya existe un cliente con esa cédula o RUC',
  placa: 'Ya existe un vehículo con esa placa',
  nombre: 'Ya existe un servicio con ese nombre en el catálogo',
  usuario: 'Ese usuario ya existe',
};

/**
 * Convierte errores conocidos de la base en respuestas claras, en vez de un 500:
 *  P2002 (dato único repetido) → 409 · P2025 (registro no existe) → 404 · P2003 (relación inválida) → 400.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaErroresFilter implements ExceptionFilter {
  private readonly logger = new Logger('Prisma');

  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error de base de datos';

    if (e.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const campos = ([] as string[]).concat((e.meta?.target as string[] | string) ?? []);
      message = campos.map((c) => CAMPOS[c]).find(Boolean) ?? 'Ya existe un registro con ese dato';
    } else if (e.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'El registro no existe';
    } else if (e.code === 'P2003') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Referencia inválida: el registro relacionado no existe';
    } else {
      this.logger.error(e.message);
    }
    res.status(status).json({ statusCode: status, message });
  }
}

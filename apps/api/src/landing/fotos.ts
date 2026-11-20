import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/** Carpeta de fotos. En Docker es un volumen (`uploads`) que también entra en los respaldos. */
export const carpetaFotos = () => path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads'));

/** Ruta pública de las fotos (relativa: funciona en local con el proxy de Vite y en el VPS con Caddy). */
export const RUTA_FOTOS = '/api/uploads/';

const MAX_BYTES = 8 * 1024 * 1024;

/** Reconoce el tipo real por los primeros bytes; no confía en lo que diga el navegador. */
function tipoImagen(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Guarda la foto (data URL en base64) y devuelve su ruta pública. */
export async function guardarFoto(base64: unknown): Promise<string> {
  if (typeof base64 !== 'string' || !base64) throw new BadRequestException('No se recibió ninguna imagen');
  const buffer = Buffer.from(base64.replace(/^data:image\/[\w+.-]+;base64,/, ''), 'base64');
  if (buffer.length > MAX_BYTES) throw new BadRequestException('La foto pesa más de 8 MB');
  const ext = tipoImagen(buffer);
  if (!ext) throw new BadRequestException('El archivo no es una imagen JPG, PNG o WEBP');

  const nombre = `foto_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
  await fs.mkdir(carpetaFotos(), { recursive: true });
  await fs.writeFile(path.join(carpetaFotos(), nombre), buffer);
  return RUTA_FOTOS + nombre;
}

/**
 * Corrige URLs guardadas antes de este cambio ("http://localhost:3000/uploads/x.jpg" o "/uploads/x.jpg")
 * para que apunten a la ruta pública actual. Las URLs externas (https://…) no se tocan.
 */
export function normalizarUrlFoto(url: string | undefined): string {
  if (!url) return '';
  const m = url.match(/^(?:https?:\/\/[^/]+)?\/(?:api\/)?uploads\/([\w.-]+)$/);
  return m ? RUTA_FOTOS + m[1] : url;
}

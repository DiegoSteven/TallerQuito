import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { PrismaService } from '../prisma/prisma.service';
import { carpetaFotos, normalizarUrlFoto, RUTA_FOTOS } from './fotos';

/**
 * Logo del taller listo para pdfmake (data URL), o null si no hay logo o no es PNG/JPG.
 * Se lee del disco (fotos subidas); los PDF no descargan imágenes de internet.
 */
export async function logoParaPdf(prisma: PrismaService): Promise<string | null> {
  const fila = await prisma.configuracionLanding.findUnique({ where: { clave: 'principal' } });
  const url = normalizarUrlFoto((fila?.datos as { taller?: { logoUrl?: string } } | null)?.taller?.logoUrl);
  if (!url.startsWith(RUTA_FOTOS)) return null;

  const nombre = path.basename(url);
  const ext = path.extname(nombre).toLowerCase();
  const tipo = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : null;
  if (!tipo) return null;
  try {
    const datos = await fs.readFile(path.join(carpetaFotos(), nombre));
    return `data:${tipo};base64,${datos.toString('base64')}`;
  } catch {
    return null;
  }
}

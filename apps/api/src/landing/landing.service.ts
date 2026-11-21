import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CONFIGURACION_LANDING_DEFAULT, LandingConfig } from '@taller/shared';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { guardarFoto, normalizarUrlFoto } from './fotos';

const CLAVE = 'principal';

/** Archivo que usaba la versión anterior. Solo se lee una vez para no perder lo que ya se había cargado. */
const ARCHIVO_ANTERIOR = path.resolve(process.cwd(), 'data', 'landing-config.json');

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);
  private reconstruccionPendiente?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  guardarFotoEnDisco(base64: unknown): Promise<string> {
    return guardarFoto(base64);
  }

  async obtenerConfiguracion(): Promise<LandingConfig> {
    const fila = await this.prisma.configuracionLanding.findUnique({ where: { clave: CLAVE } });
    if (fila) return this.normalizarConfig(fila.datos as Partial<LandingConfig>);

    // Sin datos en la base: se intenta importar el archivo de la versión anterior; si no existe, valores por defecto.
    try {
      const anterior = JSON.parse(await fs.readFile(ARCHIVO_ANTERIOR, 'utf-8')) as Partial<LandingConfig>;
      this.logger.log('Importando la configuración de la landing desde data/landing-config.json');
      return this.guardarConfiguracion(anterior);
    } catch {
      return this.normalizarConfig({});
    }
  }

  /** Guarda solo las partes que llegan (taller, slides, servicios o pilares); el resto queda como está. */
  async guardarConfiguracion(cambios: Partial<LandingConfig>): Promise<LandingConfig> {
    const fila = await this.prisma.configuracionLanding.findUnique({ where: { clave: CLAVE } });
    const actual = this.normalizarConfig((fila?.datos ?? {}) as Partial<LandingConfig>);
    const combinada = this.normalizarConfig({
      ...actual,
      taller: { ...actual.taller, ...(cambios.taller ?? {}) },
      slides: Array.isArray(cambios.slides) ? cambios.slides : actual.slides,
      servicios: Array.isArray(cambios.servicios) ? cambios.servicios : actual.servicios,
      pilares: Array.isArray(cambios.pilares) ? cambios.pilares : actual.pilares,
    });

    const datos = combinada as unknown as Prisma.InputJsonValue;
    await this.prisma.configuracionLanding.upsert({
      where: { clave: CLAVE },
      create: { clave: CLAVE, datos },
      update: { datos, actualizadoEn: new Date() },
    });
    this.programarReconstruccionLanding();
    return combinada;
  }

  /**
   * La landing pública es un sitio estático (Cloudflare Pages): hay que reconstruirla para que muestre lo guardado.
   * Se espera 1 minuto desde el último cambio para juntar varios guardados en una sola reconstrucción.
   */
  private programarReconstruccionLanding() {
    const hook = process.env.LANDING_DEPLOY_HOOK;
    if (!hook) return;
    clearTimeout(this.reconstruccionPendiente);
    this.reconstruccionPendiente = setTimeout(() => {
      fetch(hook, { method: 'POST' })
        .then((r) => this.logger.log(`Reconstrucción de la landing solicitada (HTTP ${r.status}).`))
        .catch((e: Error) => this.logger.warn(`No se pudo avisar a Cloudflare Pages: ${e.message}`));
    }, 60_000);
    this.reconstruccionPendiente.unref();
  }

  private normalizarConfig(parsed: Partial<LandingConfig>): LandingConfig {
    const d = CONFIGURACION_LANDING_DEFAULT;
    // Si el taller dejó una lista vacía a propósito, se respeta: no se rellenan datos de ejemplo.
    const slides = Array.isArray(parsed.slides) ? parsed.slides : d.slides;
    const servicios = Array.isArray(parsed.servicios) ? parsed.servicios : d.servicios;
    return {
      ...d,
      ...parsed,
      taller: { ...d.taller, ...(parsed.taller ?? {}) },
      slides: slides.map((s) => ({ ...s, imagenUrl: normalizarUrlFoto(s.imagenUrl) })),
      servicios: servicios.map((s) => ({ ...s, imagenUrl: normalizarUrlFoto(s.imagenUrl) })),
      pilares: Array.isArray(parsed.pilares) ? parsed.pilares : d.pilares,
    };
  }
}

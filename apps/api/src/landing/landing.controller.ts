import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import type { LandingConfig } from '@taller/shared';
import { Publico, Roles } from '../common/decorators';
import { LandingService } from './landing.service';

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  /** Endpoint público: la landing page de Astro lo consume para renderizar o hidratar contenido actualizado */
  @Publico()
  @Get()
  async obtenerConfiguracion(): Promise<LandingConfig> {
    return this.landingService.obtenerConfiguracion();
  }

  /** Endpoint protegido: para el personal administrativo desde el panel interno apps/web */
  @Roles('DUENO', 'RECEPCION')
  @Put()
  async actualizarConfiguracion(@Body() body: Partial<LandingConfig>): Promise<LandingConfig> {
    return this.landingService.guardarConfiguracion(body);
  }

  /** Subir físicamente una fotografía a la carpeta uploads y devolver su URL pública */
  @Roles('DUENO', 'RECEPCION')
  @Post('upload')
  async subirFoto(@Body() body: { imagenBase64: string }): Promise<{ url: string }> {
    const url = await this.landingService.guardarFotoEnDisco(body.imagenBase64);
    return { url };
  }
}

import { Injectable } from '@nestjs/common';
import type { TipoServicio } from '@prisma/client';
import { calcularRecordatorio, estimarKmActual, intervaloEfectivo, Recordatorio } from '@taller/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Forma mínima de una orden que necesita el cálculo. */
interface OrdenParaCalculo {
  fecha: Date;
  /** null = historial importado sin km. */
  kilometraje: number | null;
  items: { tipoServicio: TipoServicio | null; intervaloKm?: number | null; intervaloMeses?: number | null }[];
}

export interface ServicioVehiculo {
  tipoServicio: TipoServicio;
  ultimo: { fecha: Date; km: number | null };
  recordatorio: Recordatorio | null;
  /** true si el último trabajo tiene un intervalo propio distinto al del catálogo. */
  personalizado: boolean;
}

@Injectable()
export class RecordatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Último servicio de cada tipo y su próximo mantenimiento, para un vehículo. */
  porVehiculo(ordenes: OrdenParaCalculo[], hoy: Date) {
    const visitas = ordenes.map((o) => ({ fecha: o.fecha, km: o.kilometraje }));
    const kmEstimado = estimarKmActual(visitas, hoy);

    type Ultimo = { tipoServicio: TipoServicio; fecha: Date; km: number | null; intervaloKm: number | null; intervaloMeses: number | null };
    const ultimos = new Map<number, Ultimo>();
    for (const o of [...ordenes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())) {
      for (const it of o.items) {
        if (it.tipoServicio) {
          ultimos.set(it.tipoServicio.id, {
            tipoServicio: it.tipoServicio,
            fecha: o.fecha,
            km: o.kilometraje,
            intervaloKm: it.intervaloKm ?? null,
            intervaloMeses: it.intervaloMeses ?? null,
          });
        }
      }
    }

    // El intervalo lo pone el último trabajo de ese tipo (según lo que se le puso); si lo dejó vacío, el catálogo.
    const servicios: ServicioVehiculo[] = [...ultimos.values()].map((u) => {
      const intervalo = intervaloEfectivo(u, u.tipoServicio);
      return {
        tipoServicio: u.tipoServicio,
        ultimo: { fecha: u.fecha, km: u.km },
        recordatorio: calcularRecordatorio(intervalo, { fecha: u.fecha, km: u.km }, kmEstimado, hoy),
        personalizado: intervalo.personalizado,
      };
    });

    const peso = (s: ServicioVehiculo) => (s.recordatorio?.estado === 'LE_TOCA' ? 0 : s.recordatorio?.estado === 'PRONTO' ? 1 : 2);
    servicios.sort((a, b) => peso(a) - peso(b));
    return { kmEstimado, servicios };
  }

  /**
   * Recorre todos los vehículos. Para el volumen de un taller (miles de órdenes) es
   * suficiente; si crece, se precalcula en una tabla con un job nocturno.
   */
  async listar(hoy: Date, filtro?: 'LE_TOCA' | 'PRONTO') {
    const vehiculos = await this.prisma.vehiculo.findMany({
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        ordenes: {
          where: { estado: { not: 'ANULADA' } },
          select: { fecha: true, kilometraje: true, items: { select: { tipoServicio: true, intervaloKm: true, intervaloMeses: true } } },
        },
      },
    });

    return vehiculos
      .flatMap((v) => {
        const { kmEstimado, servicios } = this.porVehiculo(v.ordenes, hoy);
        return servicios
          .filter((s) => s.recordatorio && s.recordatorio.estado !== 'AL_DIA')
          .map((s) => ({
            vehiculo: { id: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo },
            cliente: v.cliente,
            kmEstimado,
            ...s,
          }));
      })
      .filter((r) => !filtro || r.recordatorio?.estado === filtro)
      .sort((a, b) => (a.recordatorio!.estado === b.recordatorio!.estado ? 0 : a.recordatorio!.estado === 'LE_TOCA' ? -1 : 1));
  }
}

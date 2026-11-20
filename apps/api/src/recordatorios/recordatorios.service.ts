import { Injectable } from '@nestjs/common';
import type { TipoServicio } from '@prisma/client';
import { calcularRecordatorio, estimarKmActual, Recordatorio } from '@taller/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Forma mínima de una orden que necesita el cálculo. */
interface OrdenParaCalculo {
  fecha: Date;
  kilometraje: number;
  items: { tipoServicio: TipoServicio | null }[];
}

export interface ServicioVehiculo {
  tipoServicio: TipoServicio;
  ultimo: { fecha: Date; km: number };
  recordatorio: Recordatorio | null;
}

@Injectable()
export class RecordatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Último servicio de cada tipo y su próximo mantenimiento, para un vehículo. */
  porVehiculo(ordenes: OrdenParaCalculo[], hoy: Date) {
    const visitas = ordenes.map((o) => ({ fecha: o.fecha, km: o.kilometraje }));
    const kmEstimado = estimarKmActual(visitas, hoy);

    const ultimos = new Map<number, { tipoServicio: TipoServicio; fecha: Date; km: number }>();
    for (const o of [...ordenes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())) {
      for (const it of o.items) {
        if (it.tipoServicio) ultimos.set(it.tipoServicio.id, { tipoServicio: it.tipoServicio, fecha: o.fecha, km: o.kilometraje });
      }
    }

    const servicios: ServicioVehiculo[] = [...ultimos.values()].map((u) => ({
      tipoServicio: u.tipoServicio,
      ultimo: { fecha: u.fecha, km: u.km },
      recordatorio: calcularRecordatorio(u.tipoServicio, { fecha: u.fecha, km: u.km }, kmEstimado, hoy),
    }));

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
          select: { fecha: true, kilometraje: true, items: { select: { tipoServicio: true } } },
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

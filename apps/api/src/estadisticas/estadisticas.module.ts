import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('estadísticas')
@ApiBearerAuth()
@Roles('DUENO')
@Controller('estadisticas')
class EstadisticasController {
  constructor(private readonly prisma: PrismaService) {}

  /** Resumen con filtro de fechas (por defecto, los últimos 12 meses). */
  @Get()
  async resumen(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    const fin = hasta ? new Date(hasta) : new Date();
    const inicio = desde ? new Date(desde) : new Date(fin.getFullYear() - 1, fin.getMonth() + 1, 1);
    const rango = { fecha: { gte: inicio, lte: fin }, estado: { not: 'ANULADA' as const } };

    const [porMes, topServicios, totales, porMarca] = await Promise.all([
      this.prisma.$queryRaw<{ mes: Date; ordenes: number; total: number }[]>`
        SELECT date_trunc('month', fecha) AS mes, count(*)::int AS ordenes, coalesce(sum(total), 0)::float AS total
        FROM ordenes_trabajo
        WHERE fecha BETWEEN ${inicio} AND ${fin} AND estado <> 'ANULADA'
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<{ nombre: string; veces: number }[]>`
        SELECT ts.nombre, count(DISTINCT oi."ordenId")::int AS veces
        FROM orden_items oi
        JOIN tipos_servicio ts ON ts.id = oi."tipoServicioId"
        JOIN ordenes_trabajo o ON o.id = oi."ordenId"
        WHERE o.fecha BETWEEN ${inicio} AND ${fin} AND o.estado <> 'ANULADA'
        GROUP BY ts.nombre ORDER BY veces DESC LIMIT 10`,
      this.prisma.ordenTrabajo.aggregate({ where: rango, _count: true, _sum: { total: true } }),
      this.prisma.$queryRaw<{ marca: string; ordenes: number }[]>`
        SELECT coalesce(v.marca, 'Sin marca') AS marca, count(*)::int AS ordenes
        FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o."vehiculoId"
        WHERE o.fecha BETWEEN ${inicio} AND ${fin} AND o.estado <> 'ANULADA'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    ]);

    return {
      desde: inicio,
      hasta: fin,
      ordenes: totales._count,
      valorRegistrado: Number(totales._sum.total ?? 0),
      porMes,
      topServicios,
      porMarca,
    };
  }
}

@Module({ controllers: [EstadisticasController] })
export class EstadisticasModule {}

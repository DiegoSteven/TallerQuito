import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { claveBusquedaPlaca, normalizarPlaca } from '@taller/shared';
import { BusquedaDto } from '../common/paginacion.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RecordatoriosService } from '../recordatorios/recordatorios.service';
import { ActualizarVehiculoDto, CrearVehiculoDto } from './vehiculos.dto';

@Injectable()
export class VehiculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordatorios: RecordatoriosService,
  ) {}

  /**
   * Busca por placa (ignorando guiones/espacios), nombre del dueño (también con errores
   * de tipeo gracias a pg_trgm) o inicio de la cédula.
   */
  async buscar({ q, pagina, porPagina }: BusquedaDto) {
    const texto = (q ?? '').trim();
    if (!texto) {
      const datos = await this.prisma.vehiculo.findMany({
        include: { cliente: { select: { id: true, nombre: true } } },
        orderBy: { actualizadoEn: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      });
      return { total: await this.prisma.vehiculo.count(), pagina, porPagina, datos };
    }

    const placa = claveBusquedaPlaca(texto);
    const ids = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT v.id
      FROM vehiculos v
      JOIN clientes c ON c.id = v."clienteId"
      WHERE (${placa} <> '' AND regexp_replace(upper(v.placa), '[^A-Z0-9]', '', 'g') LIKE '%' || ${placa} || '%')
         OR c.nombre ILIKE '%' || ${texto} || '%'
         OR c."cedulaRuc" LIKE ${texto} || '%'
         OR similarity(c.nombre, ${texto}) > 0.3
      ORDER BY greatest(similarity(v.placa, ${texto}), similarity(c.nombre, ${texto})) DESC
      LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`;

    const datos = await this.prisma.vehiculo.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    const orden = new Map(ids.map((r, i) => [r.id, i]));
    datos.sort((a, b) => orden.get(a.id)! - orden.get(b.id)!);
    return { total: datos.length, pagina, porPagina, datos };
  }

  async historial(id: number) {
    const v = await this.prisma.vehiculo.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordenes: {
          where: { estado: { not: 'ANULADA' } },
          orderBy: { fecha: 'desc' },
          include: {
            items: { include: { tipoServicio: true } },
            mecanico: { select: { id: true, nombre: true } },
            cliente: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!v) throw new NotFoundException('Vehículo no encontrado');

    const { kmEstimado, servicios } = this.recordatorios.porVehiculo(v.ordenes, new Date());
    return { vehiculo: { ...v, ordenes: undefined }, kmEstimado, servicios, ordenes: v.ordenes };
  }

  async crear(dto: CrearVehiculoDto) {
    const placa = normalizarPlaca(dto.placa);
    if (await this.prisma.vehiculo.findUnique({ where: { placa } })) {
      throw new ConflictException(`La placa ${placa} ya está registrada`);
    }
    return this.prisma.vehiculo.create({ data: { ...dto, placa } });
  }

  actualizar(id: number, dto: ActualizarVehiculoDto) {
    return this.prisma.vehiculo.update({
      where: { id },
      data: { ...dto, ...(dto.placa ? { placa: normalizarPlaca(dto.placa) } : {}) },
    });
  }
}

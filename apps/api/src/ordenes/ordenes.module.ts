import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { formatoNumeroOrden, validarChecklist, validarMarcas } from '@taller/shared';
import type { Response } from 'express';
import { Roles, UsuarioActual, UsuarioSesion } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { generarPdfOrden } from './orden-pdf';
import { ActualizarOrdenDto, CrearOrdenDto, ItemOrdenDto, ListarOrdenesDto } from './ordenes.dto';

const INCLUIR_DETALLE = {
  vehiculo: { include: { cliente: true } },
  items: { include: { tipoServicio: true }, orderBy: { id: 'asc' } },
  mecanico: { select: { id: true, nombre: true } },
  creadoPor: { select: { id: true, nombre: true } },
} satisfies Prisma.OrdenTrabajoInclude;

export type OrdenDetalle = Prisma.OrdenTrabajoGetPayload<{ include: typeof INCLUIR_DETALLE }>;

/** Fecha de hoy en Ecuador (YYYY-MM-DD), aunque el servidor esté en UTC. */
const hoyEcuador = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

const totalItems = (items: ItemOrdenDto[]) =>
  new Prisma.Decimal(items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0).toFixed(2));

const aFecha = (s?: string | null) => (s === undefined ? undefined : s === null ? null : new Date(s));

@Injectable()
export class OrdenesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Valida lo que viene de la recepción (checklist y golpes) con las reglas compartidas. */
  private validarRecepcion(dto: Pick<CrearOrdenDto, 'recepcion' | 'danios'>) {
    const error = (dto.recepcion && validarChecklist(dto.recepcion)) || (dto.danios && validarMarcas(dto.danios));
    if (error) throw new BadRequestException(error);
  }

  /** El km no puede bajar respecto a otras visitas, salvo que se confirme (cambio de odómetro). */
  private async validarKm(vehiculoId: number, km: number, forzar?: boolean, excluirOrdenId?: number) {
    if (forzar) return;
    const max = await this.prisma.ordenTrabajo.aggregate({
      where: { vehiculoId, estado: { not: 'ANULADA' }, ...(excluirOrdenId ? { id: { not: excluirOrdenId } } : {}) },
      _max: { kilometraje: true },
    });
    const ultimo = max._max.kilometraje;
    if (ultimo !== null && km < ultimo) {
      throw new BadRequestException(
        `El kilometraje (${km}) es menor al último registrado (${ultimo}). ` +
          'Revise el dato o confirme con forzarKm si se cambió el odómetro.',
      );
    }
  }

  private async actualizarKmVehiculo(tx: Prisma.TransactionClient, vehiculoId: number) {
    const max = await tx.ordenTrabajo.aggregate({
      where: { vehiculoId, estado: { not: 'ANULADA' } },
      _max: { kilometraje: true },
    });
    await tx.vehiculo.update({ where: { id: vehiculoId }, data: { kmActual: max._max.kilometraje } });
  }

  listar({ estado, vehiculoId, pagina, porPagina }: ListarOrdenesDto) {
    const where: Prisma.OrdenTrabajoWhereInput = { estado, vehiculoId };
    return this.prisma.$transaction(async (tx) => ({
      total: await tx.ordenTrabajo.count({ where }),
      pagina,
      porPagina,
      datos: await tx.ordenTrabajo.findMany({
        where,
        include: { vehiculo: { include: { cliente: { select: { id: true, nombre: true, telefono: true } } } } },
        orderBy: [{ fecha: 'desc' }, { numero: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    }));
  }

  async crear(dto: CrearOrdenDto, usuario: UsuarioSesion) {
    const vehiculo = await this.prisma.vehiculo.findUnique({ where: { id: dto.vehiculoId } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');
    this.validarRecepcion(dto);
    await this.validarKm(dto.vehiculoId, dto.kilometraje, dto.forzarKm);

    const items = dto.items ?? [];
    if (dto.entregada && items.length === 0) {
      throw new BadRequestException('Una orden entregada debe tener al menos un trabajo o repuesto');
    }
    const fechaLlegada = dto.fechaLlegada ? new Date(dto.fechaLlegada) : dto.entregada ? undefined : new Date();
    const fecha = dto.fecha ?? hoyEcuador(fechaLlegada);

    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.ordenTrabajo.create({
        data: {
          vehiculoId: dto.vehiculoId,
          mecanicoId: dto.mecanicoId,
          creadoPorId: usuario.id,
          fecha: new Date(fecha),
          kilometraje: dto.kilometraje,
          motivo: dto.motivo,
          observaciones: dto.observaciones,
          total: totalItems(items),
          estado: dto.entregada ? 'CERRADA' : 'ABIERTA',
          fechaLlegada,
          fechaPedidoRepuestos: aFecha(dto.fechaPedidoRepuestos),
          fechaLlegadaRepuestos: aFecha(dto.fechaLlegadaRepuestos),
          fechaEntrega: aFecha(dto.fechaEntrega),
          combustible: dto.combustible,
          recepcion: dto.recepcion,
          carroceria: dto.carroceria,
          danios: dto.danios as unknown as Prisma.InputJsonValue,
          items: { create: items },
        },
        include: INCLUIR_DETALLE,
      });
      await this.actualizarKmVehiculo(tx, dto.vehiculoId);
      return orden;
    });
  }

  async obtener(id: number): Promise<OrdenDetalle> {
    const o = await this.prisma.ordenTrabajo.findUnique({ where: { id }, include: INCLUIR_DETALLE });
    if (!o) throw new NotFoundException('Orden no encontrada');
    return o;
  }

  /**
   * Mientras el carro está en el taller se completa la orden: repuestos, mano de obra, hitos…
   * Una orden entregada solo la corrige el dueño.
   */
  async actualizar(id: number, dto: ActualizarOrdenDto, usuario: UsuarioSesion) {
    const actual = await this.obtener(id);
    if (actual.estado === 'ANULADA') throw new BadRequestException('La orden está anulada');
    if (actual.estado === 'CERRADA' && usuario.rol !== 'DUENO') {
      throw new ForbiddenException('La orden ya fue entregada; solo el dueño puede corregirla');
    }
    this.validarRecepcion(dto);
    if (dto.kilometraje !== undefined) await this.validarKm(actual.vehiculoId, dto.kilometraje, dto.forzarKm, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) await tx.ordenItem.deleteMany({ where: { ordenId: id } });
      const orden = await tx.ordenTrabajo.update({
        where: { id },
        data: {
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          kilometraje: dto.kilometraje,
          mecanicoId: dto.mecanicoId,
          motivo: dto.motivo,
          observaciones: dto.observaciones,
          fechaLlegada: aFecha(dto.fechaLlegada),
          fechaPedidoRepuestos: aFecha(dto.fechaPedidoRepuestos),
          fechaLlegadaRepuestos: aFecha(dto.fechaLlegadaRepuestos),
          fechaEntrega: aFecha(dto.fechaEntrega),
          combustible: dto.combustible,
          recepcion: dto.recepcion,
          carroceria: dto.carroceria,
          danios: dto.danios as unknown as Prisma.InputJsonValue | undefined,
          ...(dto.items ? { items: { create: dto.items }, total: totalItems(dto.items) } : {}),
        },
        include: INCLUIR_DETALLE,
      });
      if (dto.kilometraje !== undefined) await this.actualizarKmVehiculo(tx, actual.vehiculoId);
      return orden;
    });
  }

  /** Entrega el vehículo: la orden se cierra y queda en el historial. */
  async entregar(id: number) {
    const o = await this.obtener(id);
    if (o.estado !== 'ABIERTA') throw new BadRequestException('Solo se puede entregar una orden abierta');
    if (o.items.length === 0) {
      throw new BadRequestException('Agregue al menos un repuesto o trabajo de mano de obra antes de entregar');
    }
    return this.prisma.ordenTrabajo.update({
      where: { id },
      data: { estado: 'CERRADA', fechaEntrega: o.fechaEntrega ?? new Date() },
      include: INCLUIR_DETALLE,
    });
  }

  async reabrir(id: number) {
    const o = await this.obtener(id);
    if (o.estado !== 'CERRADA') throw new BadRequestException('Solo se puede reabrir una orden entregada');
    return this.prisma.ordenTrabajo.update({ where: { id }, data: { estado: 'ABIERTA' }, include: INCLUIR_DETALLE });
  }

  async anular(id: number) {
    const o = await this.obtener(id);
    return this.prisma.$transaction(async (tx) => {
      const anulada = await tx.ordenTrabajo.update({ where: { id }, data: { estado: 'ANULADA' } });
      await this.actualizarKmVehiculo(tx, o.vehiculoId);
      return anulada;
    });
  }
}

@ApiTags('órdenes de trabajo')
@ApiBearerAuth()
@Controller('ordenes')
class OrdenesController {
  constructor(private readonly ordenes: OrdenesService) {}

  /** Lista órdenes. `?estado=ABIERTA` = carros que están ahora en el taller. */
  @Get()
  listar(@Query() filtros: ListarOrdenesDto) {
    return this.ordenes.listar(filtros);
  }

  @Roles('DUENO', 'RECEPCION')
  @Post()
  crear(@Body() dto: CrearOrdenDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.ordenes.crear(dto, usuario);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.ordenes.obtener(id);
  }

  @Roles('DUENO', 'RECEPCION')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarOrdenDto, @UsuarioActual() u: UsuarioSesion) {
    return this.ordenes.actualizar(id, dto, u);
  }

  @Roles('DUENO', 'RECEPCION')
  @Post(':id/entregar')
  entregar(@Param('id', ParseIntPipe) id: number) {
    return this.ordenes.entregar(id);
  }

  @Roles('DUENO')
  @Post(':id/reabrir')
  reabrir(@Param('id', ParseIntPipe) id: number) {
    return this.ordenes.reabrir(id);
  }

  /** Las órdenes no se borran: se anulan, para no perder historial. */
  @Roles('DUENO')
  @Post(':id/anular')
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.ordenes.anular(id);
  }

  /** Orden de trabajo en PDF, para imprimir y que firmen el cliente y el jefe de taller. */
  @ApiProduces('application/pdf')
  @Get(':id/orden.pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const orden = await this.ordenes.obtener(id);
    const pdf = generarPdfOrden(orden);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Orden_${formatoNumeroOrden(orden.numero)}_${orden.vehiculo.placa}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }
}

@Module({ controllers: [OrdenesController], providers: [OrdenesService] })
export class OrdenesModule {}

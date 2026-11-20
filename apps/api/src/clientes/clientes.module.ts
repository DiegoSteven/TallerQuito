import { Body, Controller, Get, Module, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { BusquedaDto } from '../common/paginacion.dto';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class CrearClienteDto {
  @IsString() @MinLength(2) nombre: string;

  /** Cédula (10 dígitos) o RUC (13 dígitos). */
  @IsOptional() @Matches(/^\d{10}(\d{3})?$/, { message: 'Cédula de 10 dígitos o RUC de 13' })
  cedulaRuc?: string;

  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() notas?: string;
}

export class ActualizarClienteDto extends PartialType(CrearClienteDto) {}

@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
class ClientesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar(@Query() { q, pagina, porPagina }: BusquedaDto) {
    const where: Prisma.ClienteWhereInput = q
      ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { cedulaRuc: { startsWith: q } }, { telefono: { contains: q } }] }
      : {};
    const [total, datos] = await this.prisma.$transaction([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        include: { vehiculos: { select: { id: true, placa: true, marca: true, modelo: true } } },
        orderBy: { nombre: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);
    return { total, pagina, porPagina, datos };
  }

  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    const c = await this.prisma.cliente.findUnique({ where: { id }, include: { vehiculos: true } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  @Roles('DUENO', 'RECEPCION')
  @Post()
  crear(@Body() dto: CrearClienteDto) {
    return this.prisma.cliente.create({ data: dto });
  }

  @Roles('DUENO', 'RECEPCION')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarClienteDto) {
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }
}

@Module({ controllers: [ClientesController] })
export class ClientesModule {}

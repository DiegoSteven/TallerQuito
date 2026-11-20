import { Body, Controller, Get, Module, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class CrearTipoServicioDto {
  @IsString() @MinLength(2) nombre: string;
  @IsOptional() @IsString() categoria?: string;
  /** Cada cuántos km se recomienda (vacío = no aplica). */
  @IsOptional() @IsInt() @Min(1) intervaloKm?: number;
  /** Cada cuántos meses se recomienda (vacío = no aplica). */
  @IsOptional() @IsInt() @Min(1) intervaloMeses?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

class ActualizarTipoServicioDto extends PartialType(CrearTipoServicioDto) {}

@ApiTags('catálogo')
@ApiBearerAuth()
@Controller('tipos-servicio')
class TiposServicioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar(@Query('todos') todos?: string) {
    return this.prisma.tipoServicio.findMany({
      where: todos === 'true' ? {} : { activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
  }

  @Roles('DUENO')
  @Post()
  crear(@Body() dto: CrearTipoServicioDto) {
    return this.prisma.tipoServicio.create({ data: dto });
  }

  @Roles('DUENO')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarTipoServicioDto) {
    return this.prisma.tipoServicio.update({ where: { id }, data: dto });
  }
}

@Module({ controllers: [TiposServicioController] })
export class TiposServicioModule {}

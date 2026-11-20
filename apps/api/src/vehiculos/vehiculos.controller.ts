import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusquedaDto } from '../common/paginacion.dto';
import { Roles } from '../common/decorators';
import { ActualizarVehiculoDto, CrearVehiculoDto } from './vehiculos.dto';
import { VehiculosService } from './vehiculos.service';

@ApiTags('vehículos')
@ApiBearerAuth()
@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculos: VehiculosService) {}

  /** Búsqueda principal del sistema: placa (con o sin guion), nombre del dueño o cédula. */
  @Get()
  buscar(@Query() dto: BusquedaDto) {
    return this.vehiculos.buscar(dto);
  }

  /** Ficha completa: datos, último servicio por tipo, próximos mantenimientos y línea de tiempo. */
  @Get(':id/historial')
  historial(@Param('id', ParseIntPipe) id: number) {
    return this.vehiculos.historial(id);
  }

  @Roles('DUENO', 'RECEPCION')
  @Post()
  crear(@Body() dto: CrearVehiculoDto) {
    return this.vehiculos.crear(dto);
  }

  @Roles('DUENO', 'RECEPCION')
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarVehiculoDto) {
    return this.vehiculos.actualizar(id, dto);
  }
}

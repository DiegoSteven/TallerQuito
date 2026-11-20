import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecordatoriosService } from './recordatorios.service';

@ApiTags('recordatorios')
@ApiBearerAuth()
@Controller('recordatorios')
class RecordatoriosController {
  constructor(private readonly recordatorios: RecordatoriosService) {}

  /** Vehículos a los que "les toca" o les toca "pronto" algún servicio. */
  @ApiQuery({ name: 'estado', required: false, enum: ['LE_TOCA', 'PRONTO'] })
  @Get()
  listar(@Query('estado') estado?: 'LE_TOCA' | 'PRONTO') {
    return this.recordatorios.listar(new Date(), estado);
  }
}

@Module({
  controllers: [RecordatoriosController],
  providers: [RecordatoriosService],
  exports: [RecordatoriosService],
})
export class RecordatoriosModule {}

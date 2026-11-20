import { Module } from '@nestjs/common';
import { RecordatoriosModule } from '../recordatorios/recordatorios.module';
import { VehiculosController } from './vehiculos.controller';
import { VehiculosService } from './vehiculos.service';

@Module({
  imports: [RecordatoriosModule],
  controllers: [VehiculosController],
  providers: [VehiculosService],
  exports: [VehiculosService],
})
export class VehiculosModule {}

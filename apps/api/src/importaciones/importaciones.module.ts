import { Controller, Get, Module, NotImplementedException, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { Roles } from '../common/decorators';

/** Columnas de la plantilla para cargar el historial en papel. */
export const COLUMNAS_PLANTILLA = [
  { header: 'Fecha (dd/mm/aaaa)', key: 'fecha', width: 18 },
  { header: 'Placa', key: 'placa', width: 12 },
  { header: 'Cliente', key: 'cliente', width: 28 },
  { header: 'Cédula/RUC', key: 'cedula', width: 16 },
  { header: 'Teléfono', key: 'telefono', width: 14 },
  { header: 'Marca', key: 'marca', width: 14 },
  { header: 'Modelo', key: 'modelo', width: 14 },
  { header: 'Año', key: 'anio', width: 8 },
  { header: 'Kilometraje', key: 'km', width: 12 },
  { header: 'Servicio (del catálogo)', key: 'servicio', width: 26 },
  { header: 'Detalle', key: 'detalle', width: 36 },
  { header: 'Valor', key: 'valor', width: 10 },
];

@ApiTags('importación')
@ApiBearerAuth()
@Roles('DUENO')
@Controller('importaciones')
class ImportacionesController {
  @Get('plantilla')
  async plantilla(@Res() res: Response) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Historial');
    ws.columns = COLUMNAS_PLANTILLA;
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
    ws.addRow({ fecha: '14/03/2022', placa: 'PBA-1234', cliente: 'Carlos Andrade', km: 85000, servicio: 'Banda de distribución', detalle: 'Kit de distribución', valor: 320 });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_historial.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }

  /**
   * TODO (semana 5 del cronograma): recibir el .xlsx (multipart), validar cada fila,
   * devolver una vista previa con errores y confirmar la carga en una transacción.
   */
  @Post()
  importar() {
    throw new NotImplementedException('Importación en desarrollo');
  }
}

@Module({ controllers: [ImportacionesController] })
export class ImportacionesModule {}

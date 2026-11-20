import { Controller, Get, Module, Param, ParseIntPipe, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { TALLER } from '@taller/shared';
import { logoParaPdf } from '../landing/logo';
import { PrismaService } from '../prisma/prisma.service';
import { VehiculosModule } from '../vehiculos/vehiculos.module';
import { VehiculosService } from '../vehiculos/vehiculos.service';

/** Fuentes estándar de PDF: no hace falta incluir archivos de fuentes. */
const printer = new PdfPrinter({
  Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
});

const ROJO = '#c8102e';
const fecha = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/');
const km = (n: number) => n.toLocaleString('es-EC');

@ApiTags('reportes')
@ApiBearerAuth()
@Controller('vehiculos')
class ReportesController {
  constructor(
    private readonly vehiculos: VehiculosService,
    private readonly prisma: PrismaService,
  ) {}

  /** PDF del historial de un vehículo, para descargar o imprimir. */
  @ApiProduces('application/pdf')
  @Get(':id/historial.pdf')
  async historialPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { vehiculo: v, ordenes, servicios, kmEstimado } = await this.vehiculos.historial(id);
    const logo = await logoParaPdf(this.prisma);
    const pendientes = servicios.filter((s) => s.recordatorio && s.recordatorio.estado !== 'AL_DIA');

    const doc: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      footer: (p, n) => ({ text: `Página ${p} de ${n}`, alignment: 'center', fontSize: 8, color: '#888' }),
      content: [
        {
          columns: [
            logo
              ? { stack: [{ image: logo, fit: [180, 50] }, { text: `${TALLER.ciudad} · ${TALLER.telefono}`, fontSize: 7, color: '#6b7280', margin: [0, 2, 0, 0] }] }
              : { stack: [{ text: 'TECNICENTRO AUTOMOTRIZ', fontSize: 7, bold: true, color: '#6b7280', characterSpacing: 2 }, { text: 'SÁNCHEZ', fontSize: 20, bold: true }, { text: `${TALLER.ciudad} · ${TALLER.telefono}`, fontSize: 7, color: '#6b7280' }] },
            { text: `Historial de mantenimiento\n${fecha(new Date())}`, alignment: 'right', bold: true },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 2, lineColor: ROJO }] },
        {
          margin: [0, 12, 0, 12],
          text: [
            { text: `${v.placa}  ·  ${[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}\n`, bold: true, fontSize: 12 },
            `Propietario: ${v.cliente.nombre}   ·   Último km registrado: ${km(v.kmActual ?? 0)}` +
              (kmEstimado ? `   ·   Km estimado hoy: ≈ ${km(kmEstimado)}` : ''),
          ],
        },
        {
          table: {
            headerRows: 1,
            widths: [60, 55, '*', 55],
            body: [
              ['Fecha', 'Km', 'Trabajos', 'Valor'].map((t) => ({ text: t, bold: true, fillColor: '#f3f4f6' })),
              ...ordenes.map((o) => [
                fecha(o.fecha),
                km(o.kilometraje),
                o.items.map((i) => i.descripcion).join(', ') + (o.observaciones ? `\nObs.: ${o.observaciones}` : ''),
                { text: `$${Number(o.total).toFixed(2)}`, alignment: 'right' as const },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        pendientes.length
          ? {
              margin: [0, 14, 0, 0],
              text: [
                { text: 'Recomendado: ', bold: true },
                pendientes
                  .map((s) => `${s.tipoServicio.nombre}${s.recordatorio?.estado === 'LE_TOCA' ? ' (le toca)' : ' (pronto)'}`)
                  .join(' · '),
              ],
            }
          : '',
      ],
    };

    const pdf = printer.createPdfKitDocument(doc);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Historial_${v.placa}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }
}

@Module({ imports: [VehiculosModule], controllers: [ReportesController] })
export class ReportesModule {}

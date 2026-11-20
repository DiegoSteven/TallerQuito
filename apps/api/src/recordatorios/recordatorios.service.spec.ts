import { RecordatoriosService } from './recordatorios.service';

const servicio = (id: number, nombre: string, intervaloKm: number | null, intervaloMeses: number | null) => ({
  id,
  nombre,
  categoria: null,
  intervaloKm,
  intervaloMeses,
  activo: true,
});

describe('RecordatoriosService.porVehiculo', () => {
  const svc = new RecordatoriosService({} as never);
  const banda = servicio(1, 'Banda de distribución', 60000, 48);
  const aceite = servicio(2, 'Cambio de aceite', 5000, 6);

  it('toma el último servicio de cada tipo y ordena primero lo que le toca', () => {
    const ordenes = [
      { fecha: new Date('2019-06-22'), kilometraje: 41200, items: [{ tipoServicio: aceite }] },
      { fecha: new Date('2022-03-14'), kilometraje: 85000, items: [{ tipoServicio: banda }] },
      { fecha: new Date('2026-09-12'), kilometraje: 148300, items: [{ tipoServicio: aceite }] },
    ];
    const { kmEstimado, servicios } = svc.porVehiculo(ordenes, new Date('2026-11-19'));

    expect(kmEstimado).toBeGreaterThan(148300);
    expect(servicios[0].tipoServicio.nombre).toBe('Banda de distribución');
    expect(servicios[0].recordatorio?.estado).toBe('LE_TOCA');
    expect(servicios.find((s) => s.tipoServicio.id === 2)?.ultimo.km).toBe(148300);
  });

  it('usa el intervalo propio del último trabajo (aceite sintético) y, si está vacío, el del catálogo', () => {
    const hoy = new Date('2026-11-20');
    const sintetico = svc.porVehiculo(
      [{ fecha: new Date('2026-11-01'), kilometraje: 100000, items: [{ tipoServicio: aceite, intervaloKm: 10000, intervaloMeses: null }] }],
      hoy,
    ).servicios[0];
    expect(sintetico.recordatorio?.proximoKm).toBe(110000);
    expect(sintetico.recordatorio?.proximaFecha?.toISOString().slice(0, 7)).toBe('2027-05'); // meses: del catálogo
    expect(sintetico.personalizado).toBe(true);

    const normal = svc.porVehiculo(
      [{ fecha: new Date('2026-11-01'), kilometraje: 100000, items: [{ tipoServicio: aceite, intervaloKm: null, intervaloMeses: null }] }],
      hoy,
    ).servicios[0];
    expect(normal.recordatorio?.proximoKm).toBe(105000);
    expect(normal.personalizado).toBe(false);
  });
});

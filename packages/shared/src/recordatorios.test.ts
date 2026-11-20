import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRecordatorio, estimarKmActual, intervaloEfectivo, proximoCambio } from './recordatorios';
import { normalizarPlaca } from './placa';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

test('banda de distribución de la D-Max: le toca por km', () => {
  const r = calcularRecordatorio(
    { intervaloKm: 60000, intervaloMeses: 48 },
    { fecha: d('2022-03-14'), km: 85000 },
    148300,
    d('2026-11-19'),
  );
  assert.equal(r?.estado, 'LE_TOCA');
  assert.equal(r?.proximoKm, 145000);
  assert.equal(r?.kmRestantes, -3300);
});

test('cambio de aceite reciente: al día', () => {
  const r = calcularRecordatorio(
    { intervaloKm: 5000, intervaloMeses: 6 },
    { fecha: d('2026-09-12'), km: 148300 },
    150000,
    d('2026-11-19'),
  );
  assert.equal(r?.estado, 'AL_DIA');
});

test('pronto por fecha aunque no llegue al km', () => {
  const r = calcularRecordatorio(
    { intervaloKm: 5000, intervaloMeses: 6 },
    { fecha: d('2026-05-28'), km: 88000 },
    89000,
    d('2026-11-19'),
  );
  assert.equal(r?.estado, 'PRONTO');
});

test('servicio sin intervalo no genera recordatorio', () => {
  assert.equal(
    calcularRecordatorio({ intervaloKm: null, intervaloMeses: null }, { fecha: d('2026-01-01'), km: 1 }, 2, d('2026-02-01')),
    null,
  );
});

test('estima el km actual con el promedio del vehículo', () => {
  const km = estimarKmActual(
    [
      { fecha: d('2019-06-22'), km: 41200 },
      { fecha: d('2026-09-12'), km: 148300 },
    ],
    d('2026-11-19'),
  );
  assert.ok(km !== null && km > 150000 && km < 152000, `km estimado fuera de rango: ${km}`);
});

test('normaliza placas', () => {
  assert.equal(normalizarPlaca('pba1234'), 'PBA-1234');
  assert.equal(normalizarPlaca(' PBA 1234 '), 'PBA-1234');
  assert.equal(normalizarPlaca('gsd-447'), 'GSD-447');
});

test('intervalo por trabajo: gana el del trabajo, campo por campo; vacío usa el catálogo', () => {
  const catalogo = { intervaloKm: 5000, intervaloMeses: 6 };
  assert.deepEqual(intervaloEfectivo({ intervaloKm: 10000 }, catalogo), { intervaloKm: 10000, intervaloMeses: 6, personalizado: true });
  assert.deepEqual(intervaloEfectivo({ intervaloKm: null, intervaloMeses: null }, catalogo), { intervaloKm: 5000, intervaloMeses: 6, personalizado: false });
  assert.equal(intervaloEfectivo({ intervaloKm: 5000 }, catalogo).personalizado, false);
  const p = proximoCambio({ intervaloKm: 10000, intervaloMeses: 6 }, { fecha: d('2026-11-20'), km: 148300 });
  assert.equal(p.km, 158300);
  assert.equal(p.fecha?.toISOString().slice(0, 7), '2027-05');
});

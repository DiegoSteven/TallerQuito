import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKLIST_RECEPCION, textoCombustible, validarChecklist, validarMarcas } from './recepcion';
import { svgCombustible, svgVista } from './dibujos';
import { clausulaAutorizacion, formatoNumeroOrden } from './taller';

test('el checklist tiene los 24 ítems del talonario, sin repetidos', () => {
  assert.equal(CHECKLIST_RECEPCION.length, 24);
  assert.equal(new Set(CHECKLIST_RECEPCION.map((c) => c.clave)).size, 24);
});

test('checklist: acepta SÍ/NO y rechaza ítems inventados o valores raros', () => {
  assert.equal(validarChecklist({ matricula: true, gata: false }), null);
  assert.equal(validarChecklist({}), null);
  assert.match(validarChecklist({ turbo: true })!, /desconocido/);
  assert.match(validarChecklist({ gata: 'si' })!, /SÍ o NO/);
  assert.ok(validarChecklist([]));
});

test('golpes: valida vista, tipo y que el punto caiga dentro del dibujo', () => {
  const ok = { vista: 'izquierda', x: 0.4, y: 0.5, tipo: 'GOLPE' };
  assert.equal(validarMarcas([ok, { ...ok, vista: 'superior', tipo: 'RAYON', nota: 'capó' }]), null);
  assert.match(validarMarcas([{ ...ok, x: 1.2 }])!, /fuera del dibujo/);
  assert.match(validarMarcas([{ ...ok, vista: 'techo' }])!, /Vista inválida/);
  assert.match(validarMarcas([{ ...ok, tipo: 'MANCHA' }])!, /Tipo de daño/);
  assert.match(validarMarcas([{ ...ok, nota: 'x'.repeat(121) }])!, /muy larga/);
  assert.match(validarMarcas(Array(61).fill(ok))!, /Demasiadas/);
});

test('combustible en palabras', () => {
  assert.equal(textoCombustible(null), 'No registrado');
  assert.equal(textoCombustible(0), 'Vacío (E)');
  assert.equal(textoCombustible(4), '1/2');
  assert.equal(textoCombustible(3), '3/8');
  assert.equal(textoCombustible(8), 'Lleno (F)');
});

test('número de orden con 7 dígitos, como el talonario', () => {
  assert.equal(formatoNumeroOrden(766), '0000766');
  assert.equal(formatoNumeroOrden(12345678), '12345678');
});

test('la cláusula lleva el nombre y la cédula del cliente', () => {
  const [p] = clausulaAutorizacion('María Pérez', '1798765432');
  assert.match(p, /María Pérez, con C\.I\.\/RUC 1798765432/);
  assert.doesNotMatch(clausulaAutorizacion('Juan')[0], /C\.I\./);
});

test('los dibujos numeran las marcas y la aguja aparece solo si hay nivel', () => {
  const svg = svgVista('CAMIONETA', 'izquierda', [{ vista: 'izquierda', x: 0.5, y: 0.5, tipo: 'GOLPE', numero: 3 }], 140);
  assert.match(svg, />3<\/text>/);
  assert.doesNotMatch(svg, /\{L\}|\{R\}/);
  assert.match(svgCombustible(4), /stroke-linecap="round"/);
  assert.doesNotMatch(svgCombustible(null), /stroke-linecap="round"/);
});

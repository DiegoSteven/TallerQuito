import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanciaDL,
  enTitulo,
  normalizarNombre,
  placaValida,
  separarVehiculo,
  unirClientes,
  unirPlacas,
  type FilaHistorial,
} from './importacion';

test('normaliza nombres y los guarda en formato título', () => {
  assert.equal(normalizarNombre('SR. CECILIA DE REYES '), 'CECILIA DE REYES');
  assert.equal(normalizarNombre('Óptica  los Ceibos'), 'OPTICA LOS CEIBOS');
  assert.equal(enTitulo('CECILIA DE REYES'), 'Cecilia de Reyes');
});

test('placas válidas de Ecuador', () => {
  assert.ok(placaValida('PBJ8761'));
  assert.ok(placaValida('IL123A'));
  for (const mala of ['PBH32', 'PGPP0482', '348650']) assert.ok(!placaValida(mala), mala);
});

test('distancia cuenta la inversión de dos letras como un solo error', () => {
  assert.equal(distanciaDL('PBV4714', 'PVB4714'), 1);
  assert.equal(distanciaDL('PBJ8761', 'PBJ8771'), 1);
  assert.equal(distanciaDL('DIANA GRANDA', 'DIANA GRANJA'), 1);
});

test('separa y corrige marca y modelo del Excel', () => {
  assert.deepEqual(separarVehiculo('HUNDAY ELANTRA'), { marca: 'Hyundai', modelo: 'Elantra' });
  assert.deepEqual(separarVehiculo('VITARA CHEVROLET'), { marca: 'Chevrolet', modelo: 'Vitara' });
  assert.deepEqual(separarVehiculo('GRAT WELL WINGLE'), { marca: 'Great Wall', modelo: 'Wingle' });
  assert.deepEqual(separarVehiculo('TOYOTA CORROLLA'), { marca: 'Toyota', modelo: 'Corolla' });
  assert.deepEqual(separarVehiculo('PEUGOT 406'), { marca: 'Peugeot', modelo: '406' });
  assert.equal(separarVehiculo('VW').marca, 'Volkswagen');
});

const f = (placa: string, cliente: string, marca = 'Chevrolet'): FilaHistorial => ({ placa, cliente, marca });

test('une nombres del mismo carro escritos distinto, pero no personas distintas', () => {
  const { mapa } = unirClientes([
    f('PTE0874', 'DIANA GRANDA'), f('PTE0874', 'DIANA GRANDA'), f('PTE0874', 'DIANA GRANJA'),
    f('PPI0559', 'PEDRO CALISTO'), f('PPI0559', 'RICARDO LUZURIAGA'),
    f('PCE8318', 'LUIS ORBE'), f('PCE8318', 'LUIS ORVE'),
  ]);
  assert.equal(mapa.get('DIANA GRANJA'), 'DIANA GRANDA'); // queda el más frecuente
  assert.equal(mapa.get('RICARDO LUZURIAGA'), 'RICARDO LUZURIAGA');
  assert.equal(mapa.get('PEDRO CALISTO'), 'PEDRO CALISTO');
  assert.equal(mapa.get('LUIS ORVE'), mapa.get('LUIS ORBE'));
});

test('nombres parecidos en carros distintos NO se unen (Consuelo y Gonzalo Freire)', () => {
  const { mapa } = unirClientes([f('PCQ7220', 'CONSUELO FREIRE'), f('PCQ7720', 'GONZALO FREIRE')]);
  assert.notEqual(mapa.get('CONSUELO FREIRE'), mapa.get('GONZALO FREIRE'));
});

test('une placas mal escritas solo si son del mismo cliente y marca; lo demás queda dudoso', () => {
  const { mapa, dudosas } = unirPlacas([
    f('PBJ8761', 'GUILLERMO MALDONADO', 'BMW'), f('PBJ8761', 'GUILLERMO MALDONADO', 'BMW'), f('PBJ8771', 'GUILLERMO MALDONADO', 'BMW'),
    f('PCQ7220', 'CONSUELO FREIRE'), f('PCQ7720', 'GONZALO FREIRE'),
    f('PBV4714', 'DANIEL CLAVIJO', 'Renault'), f('PVB4714', 'DANIEL CLAVIJO', 'Volkswagen'),
  ]);
  assert.equal(mapa.get('PBJ8771'), 'PBJ8761');
  assert.ok(!dudosas.has('PBJ8761'));
  assert.ok(dudosas.has('PCQ7220') && dudosas.has('PCQ7720'));
  assert.ok(dudosas.has('PBV4714') && dudosas.has('PVB4714')); // marca distinta: no se sabe cuál es la buena
});

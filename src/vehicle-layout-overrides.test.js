// @vitest-environment jsdom
import React from 'react';
import { expect, it } from 'vitest';
import { confirmedVehicleLayout } from './vehicle-layout-overrides.js';

window.React = React;
const { inferLayoutKey } = await import('./screens/pneus.jsx');
const { inferMaintenanceLayout } = await import('./screens/manutencao-posicoes.jsx');

it.each(['RAA8G58', 'RAA8G18', 'raa-8g58', ' RAA 8G18 '])('uses bitruck in both screens for %s even with outdated metadata', placa => {
  const vehicle = {placa, modelo:'TRUCK 6X2', tipo:'TRUCK', eixos:3};
  expect(confirmedVehicleLayout(vehicle)).toBe('BITRUCK');
  expect(inferLayoutKey(vehicle)).toBe('BITRUCK');
  expect(inferLayoutKey(vehicle, [{posicao:'4ET-E'}])).toBe('BITRUCK');
  expect(inferMaintenanceLayout(vehicle)).toBe('BITRUCK');
});

it('preserves automatic detection for other vehicles', () => {
  expect(confirmedVehicleLayout({placa:'RXO6C18'})).toBeNull();
  expect(inferLayoutKey({placa:'RXO6C18', tipo:'TRUCK'})).toBe('TRUCK');
  expect(inferMaintenanceLayout({placa:'RXO6C18', eixos:3})).toBe('TRUCK');
  expect(inferLayoutKey({tipo:'CARRETA'})).toBe('CARRETA_4_EIXOS');
  expect(inferMaintenanceLayout({eixos:4})).toBe('BITRUCK');
});

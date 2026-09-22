// @vitest-environment jsdom
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {costDeviations} from './cost-deviations-model.js';
import {CostDeviations} from './cost-deviations.jsx';

afterEach(cleanup);
const row = (valor, placa = 'ABC1D23') => ({valor, placa, tipoCusto: 'Abastecimento'});
describe('desvios de custos', () => {
  it('reconciles increases and decreases including credits and vehicles only in one period', () => {
    const model = costDeviations([row(150), row(-10), row(40, 'NEW')], [row(100), row(30, 'OLD')]);
    expect(model.increase).toBe(80);
    expect(model.decrease).toBe(-30);
    expect(model.delta).toBe(50);
    expect(model.items.find(item => item.plate === 'ABC1D23').percent).toBe(40);
    expect(model.items.find(item => item.plate === 'NEW').percent).toBeNull();
    expect(model.items.find(item => item.plate === 'OLD').status).toBe('Sem lançamentos atuais');
  });
  it('does not turn invalid values or incomplete distance into zero', () => {
    const model = costDeviations([row(null), row(100)], [row(0)], {
      months: [{key: '2026-01'}, {key: '2026-02'}],
      distance: {available: true, monthly: [{placa: 'ABC1D23', mes: '2026-01', km: 100}]},
    });
    expect(model.invalid).toBe(1);
    expect(model.items[0].costKm).toBeNull();
    expect(model.items[0].percent).toBeNull();
  });
  it('uses the complete period distance and never divides by zero', () => {
    const options = {months: [{key: '2026-01'}], distance: {available: true, monthly: [{placa: 'ABC1D23', mes: '2026-01', km: 200}]}};
    expect(costDeviations([row(100)], [], options).items[0].costKm).toBe(0.5);
    options.distance.monthly[0].km = 0;
    expect(costDeviations([row(100)], [], options).items[0].costKm).toBeNull();
  });
  it('opens transaction details for the selected vehicle', () => {
    const onOpen = vi.fn();
    render(<CostDeviations rows={[row(100)]} previous={[row(50)]} months={[]} onOpen={onOpen}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Ver lançamentos'}));
    expect(onOpen).toHaveBeenCalledWith('ABC1D23');
    expect(screen.getByText('Comparável')).toBeTruthy();
  });
  it('does not compare a selected month against the full previous period', () => {
    render(<CostDeviations rows={[row(100)]} previous={[row(50)]} months={[]} month="2026-01"/>);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/Remova o filtro de mês/)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import "./simulador.jsx";

const response = (driver = 8700) => ({
  entrada: { tipoVeiculo: "Carreta" },
  tabela: {
    valorMotoristaTabela: driver,
    kmValor: 5.13,
    cargaDescarga: 523.33,
  },
  encargos: { seguroCarga: 64.43, seguroRC: 35.19 },
  resultado: { valorMotorista: driver, valorCliente: 15000 },
});
beforeEach(() => {
  window.React = React;
  window.Icon = () => null;
  localStorage.clear();
  window.NT_DATA = {
    ANTT_TABELA: [
      { eixos: 6, tipoVeiculo: "Carreta" },
      { eixos: 3, tipoVeiculo: "Truck" },
    ],
  };
  window.RB_API = {
    listAntt: vi.fn().mockResolvedValue([]),
    calcularFrete: vi.fn().mockResolvedValue(response()),
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const change = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const ready = () => screen.findByText('Cotação atualizada · valores em reais');

it('reproduz a planilha com impostos nos custos e percentual bruto separado do líquido', async () => {
  window.RB_API.calcularFrete.mockImplementation(async ({ tipoCarga }) => ({
    ...response(tipoCarga === 'normal' ? 8928.42 : 7064.67), encargos: { seguroCarga: 0, seguroRC: 141.91 },
  }));
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  expect(screen.getByLabelText('Pedágio').value).toBe('50,00');
  expect(screen.getByLabelText('Seguro terceiros').value).toBe('91,91');
  // Esta referência de cálculo usa seguro de 141,91 e pedágio zero.
  change('Pedágio', '0');
  change('Seguro terceiros', '141,91');
  change('Quilometragem', '1000');
  await ready();
  const normal = screen.getByRole('region', { name: 'Cotação padrão · Normal' });
  const high = screen.getByRole('region', { name: 'Cotação padrão · Alto desempenho' });
  for (const amount of ['12.754,89', '247,76', '367,05', '9.543,22', '2.153,97', '1.539,17', '16,89%', '12,07%']) expect(normal.textContent).toContain(amount);
  for (const amount of ['12.754,89', '196,04', '290,43', '7.551,14', '4.017,72', '3.531,25']) expect(high.textContent).toContain(amount);
  change('Valor do motorista', '9000');
  change('Percentual bruto', '25');
  expect(screen.getByRole('region', { name: 'Alterar motorista · Normal' }).textContent).toContain('12.000,00');
  change('Percentual bruto', '0');
  expect(screen.getByRole('region', { name: 'Alterar motorista · Normal' }).textContent).toContain('9.000,00');
  change('Percentual bruto', '100');
  expect(screen.getByRole('button', { name: 'Copiar negociação' }).disabled).toBe(true);
});

it('uses only the approved layout despite an old stored preference and shows all four combinations', async () => {
  localStorage.setItem('rodobach_quote_layout', 'sheet');
  window.RB_API.calcularFrete.mockImplementation(async ({tipoCarga, operacao}) => response((tipoCarga === 'normal' ? 8700 : 7000) + (operacao === 'tac' ? 100 : 0)));
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  expect(screen.queryByRole('group', {name: 'Modelo da calculadora'})).toBeNull();
  change('Quilometragem', '1600');
  await ready();
  expect(window.RB_API.calcularFrete).toHaveBeenCalledTimes(4);
  const normal = screen.getByRole('region', {name: 'Cotação padrão · Normal'});
  const high = screen.getByRole('region', {name: 'Cotação padrão · Alto desempenho'});
  expect(normal.textContent).toContain('8.700,00');
  expect(normal.textContent).toContain('8.800,00');
  expect(high.textContent).toContain('7.000,00');
  expect(high.textContent).toContain('7.100,00');
  expect(normal.querySelector('details').open).toBe(false);
  expect(within(normal).getAllByRole('article')).toHaveLength(2);
  expect(normal.querySelectorAll('.ql-contract-prices dd')).toHaveLength(4);
  expect(within(normal).queryByRole('button', { name: /Selecionar/ })).toBeNull();
  fireEvent.click(within(normal).getByText('Ver impostos e demais custos'));
  expect(normal.querySelector('details').open).toBe(true);
  expect(within(normal).getAllByRole('cell').map(el => el.textContent)).toContain('R$ 361,77');
});

it('selects the combination for the trip without recalculating or losing input', async () => {
  const navigate = vi.fn();
  window.RB_API.calcularFrete.mockImplementation(async ({tipoCarga}) => response(tipoCarga === 'normal' ? 8700 : 7000));
  render(<window.SimuladorFrete onNavigate={navigate} />);
  change('Quilometragem', '1600');
  change('Valor do cliente', '18000');
  await ready();
  change('Preço ANTT', 'alto_desempenho');
  change('Contratação', 'tac');
  expect(screen.getByLabelText('Valor do cliente').value).toBe('18000');
  fireEvent.click(screen.getByRole('button', {name: 'Usar negociação na viagem'}));
  expect(window.NT_SIM).toMatchObject({valorMotorista: 7000, valorCliente: 18000, tipoCarga: 'alto_desempenho', operacao: 'tac'});
  expect(navigate).toHaveBeenCalledWith('viagens');
  expect(window.RB_API.calcularFrete).toHaveBeenCalledTimes(4);
});

it('blocks incomplete comparisons and recovers on an input change', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  window.RB_API.calcularFrete.mockRejectedValueOnce(new Error('offline'));
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  change('Quilometragem', '1600');
  await screen.findByText(/Não foi possível calcular/);
  expect(screen.getByRole('button', {name: 'Usar negociação na viagem'}).disabled).toBe(true);
  change('Quilometragem', '1700');
  await ready();
  expect(screen.getByRole('button', {name: 'Copiar negociação'}).disabled).toBe(false);
});

it('ignores late results from the previous distance', async () => {
  const resolvers = [];
  window.RB_API.calcularFrete.mockImplementation(({km}) => km === 1600 ? new Promise(resolve => resolvers.push(resolve)) : Promise.resolve(response(9900)));
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  change('Quilometragem', '1600');
  await waitFor(() => expect(resolvers).toHaveLength(4));
  change('Quilometragem', '1800');
  await ready();
  await act(async () => resolvers.forEach(resolve => resolve(response(100))));
  expect(screen.getByRole('region', {name: 'Cotação padrão · Normal'}).textContent).toContain('9.900,00');
});

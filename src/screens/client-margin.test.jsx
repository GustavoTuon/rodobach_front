// @vitest-environment jsdom
import React from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ClientMargin, clientMarginCsv} from './client-margin.jsx';
afterEach(() => {cleanup(); vi.restoreAllMocks();});
const summary = {receita: 100, receitaSemCusto: 100, documentos: 1, documentosComCusto: 0, saldoParcial: null, custoDireto: null, margemParcial: null};
const client = {id: '[1,1]', cliente: 'Cliente teste', empresa: 1, atual: summary, anterior: summary, variacaoMargemPp: null};
const payload = {resumo: summary, anterior: summary, clientes: [client], rotas: [], documentos: [{id: '1:A:1', clienteId: '[1,1]', cliente: 'Cliente teste', data: '2026-09-01', receita: 100, custoDireto: null, saldoParcial: null, cartas: [], fonteCusto: 'Sem custo direto identificado'}], documentosAnteriores: [], custosCompartilhados: [], metodologia: 'Margem parcial, não representa lucro líquido.', atualizadoEm: '2026-09-15T12:00:00Z', periodos: {current: {startDate: '2026-09-01', endDate: '2026-09-02'}, previous: {startDate: '2026-08-30', endDate: '2026-08-31'}}};

it('shows missing coverage and opens the underlying documents', async () => {
  window.RB_API = {getClienteMargem: vi.fn().mockResolvedValue(payload)};
  render(<ClientMargin/>);
  fireEvent.click(await screen.findByRole('button', {name: 'Ver documentos'}));
  expect(screen.getByRole('region', {name: 'Documentos da seleção'})).toBeTruthy();
  expect(screen.getByText('1:A:1')).toBeTruthy();
  expect(screen.getByText('Sem custo direto identificado')).toBeTruthy();
  expect(screen.getByText('Sem base comparável')).toBeTruthy();
  expect(screen.queryByText('100%')).toBeNull();
});

it('reports a loading failure and retries without invented zero totals', async () => {
  window.RB_API = {getClienteMargem: vi.fn().mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValue(payload)};
  render(<ClientMargin/>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Receita documental')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Tentar novamente'}));
  await screen.findByRole('button', {name: 'Ver documentos'});
  await waitFor(() => expect(window.RB_API.getClienteMargem).toHaveBeenCalledTimes(2));
});

it('CSV identifies partial figures and neutralizes spreadsheet formulas', () => {
  const csv = clientMarginCsv([{...client, cliente: '=HYPERLINK("bad")'}], payload.periodos.current);
  expect(csv).toContain('Saldo parcial da base coberta');
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('2026-09-01');
  expect(csv).not.toContain('"null"');
});

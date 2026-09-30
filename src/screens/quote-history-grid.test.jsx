// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QuoteHistoryGrid, filterHistory, sortHistory } from './quote-history-grid.jsx';
afterEach(cleanup);
it('solicita páginas e filtros globais ao servidor', () => {
  const onPagingChange = vi.fn();
  const paging = { page: 2, pageSize: 25, hasMore: true, filters: {}, sort: { field: 'data', direction: 'desc' } };
  const { rerender } = render(<QuoteHistoryGrid fretes={[]} paging={paging} onPagingChange={onPagingChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(onPagingChange).toHaveBeenLastCalledWith({ page: 3 });
  fireEvent.change(screen.getByLabelText('Linhas por página'), { target: { value: '50' } });
  expect(onPagingChange).toHaveBeenLastCalledWith({ pageSize: 50, page: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar Origem' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Içara' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(onPagingChange).toHaveBeenLastCalledWith({ filters: { origem: 'Içara' }, page: 1 });
  rerender(<QuoteHistoryGrid fretes={[]} paging={{ ...paging, hasMore: false }} onPagingChange={onPagingChange} />);
  expect(screen.getByRole('button', { name: 'Próxima' }).disabled).toBe(true);
});
const rows = [
  { id: 1, data: '2026-09-01', origem: 'IÇARA/SC', destino: 'GOIÂNIA/GO', material: 'Peças', valor: 900, peso: 300, placa: 'ABC1D23' },
  { id: 2, data: '2025-10-05', origem: 'IÇARA/SC', destino: 'ANÁPOLIS/GO', material: 'Motor', valor: 12000, peso: 500, placa: 'ABC1D23' },
  { id: 3, data: '2026-09-12', origem: 'SANGÃO/SC', destino: 'GOIÂNIA/GO', material: 'Peças', valor: 100, peso: 100, placa: 'DEF4G56' },
];
it('combines column selections and sorts numbers and ISO dates correctly', () => {
  expect(filterHistory(rows, { origem: ['IÇARA/SC'], destino: ['GOIÂNIA/GO'] }).map(row => row.id)).toEqual([1]);
  expect(sortHistory(rows, 'valor', 'asc').map(row => row.id)).toEqual([3, 1, 2]);
  expect(sortHistory(rows, 'data', 'desc').map(row => row.id)).toEqual([3, 1, 2]);
});
it('applies checkbox filters, updates aggregates, and keeps headers available when no rows match', () => {
  render(<QuoteHistoryGrid fretes={rows} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar Origem' }));
  let menu = screen.getByRole('dialog', { name: 'Filtrar Origem' });
  fireEvent.click(within(menu).getByLabelText('SANGÃO/SC'));
  fireEvent.click(within(menu).getByText('Aplicar'));
  expect(screen.getByText('2 de 3 fretes')).toBeTruthy();
  expect(screen.getByText(/Média exibida:/).textContent).toContain('6.450,00');
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar Origem' }));
  menu = screen.getByRole('dialog', { name: 'Filtrar Origem' });
  fireEvent.click(within(menu).getByLabelText('IÇARA/SC'));
  fireEvent.click(within(menu).getByText('Aplicar'));
  expect(screen.getByText('0 de 3 fretes')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Filtrar Origem' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByText('3 de 3 fretes')).toBeTruthy();
});
it('searches accents and cancels uncommitted selections', () => {
  render(<QuoteHistoryGrid fretes={rows} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar Origem' }));
  const menu = screen.getByRole('dialog', { name: 'Filtrar Origem' });
  fireEvent.change(within(menu).getByRole('searchbox'), { target: { value: 'icara' } });
  expect(within(menu).getByLabelText('IÇARA/SC')).toBeTruthy();
  expect(within(menu).queryByLabelText('SANGÃO/SC')).toBeNull();
  fireEvent.click(within(menu).getByLabelText('IÇARA/SC'));
  fireEvent.click(within(menu).getByText('Cancelar'));
  expect(screen.getByText('3 de 3 fretes')).toBeTruthy();
});

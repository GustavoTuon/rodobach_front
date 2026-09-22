// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('recalcula cards com a busca e permite expandir a tabela financeira', async () => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('Icon', () => null);
  vi.stubGlobal('MiniBar', () => null);
  window.RB_API = { getAnaliseClientes: vi.fn().mockResolvedValue({
    summary: {totalFaturado:9999}, monthly:[], topClientesMonthly:[],
    clients:[{codigo:1,nome:'Alfa',totalPeriodo:100,totalAnterior:50,totalAnoAnterior:50,lancamentos:1,statusComercial:'ativo'},
      {codigo:2,nome:'Beta',totalPeriodo:300,totalAnterior:200,totalAnoAnterior:200,lancamentos:2,statusComercial:'ativo'}]
  }) };
  await import('./analise-clientes.jsx');
  const Component = window.AnaliseClientes;
  const {container} = render(<Component/>);
  await waitFor(() => expect(container.querySelector('.kpi-value')?.textContent).toContain('400,00'));
  fireEvent.change(screen.getByPlaceholderText('Buscar cliente…'), {target:{value:'Alfa'}});
  await waitFor(() => expect(container.querySelector('.kpi-value')?.textContent).toContain('100,00'));
  fireEvent.click(screen.getByRole('button',{name:'Ver financeiro completo'}));
  expect(container.querySelector('.ac-client-table.financeiro')).toBeTruthy();
});

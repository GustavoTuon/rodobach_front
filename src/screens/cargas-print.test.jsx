// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function setup(api = {}) {
  window.React = React; window.Icon = () => null; window.RB_API = api;
  const popup = { closed: false, document: { write: vi.fn(), close: vi.fn(), open: vi.fn(), getElementById: () => null } };
  vi.spyOn(window, 'open').mockReturnValue(popup);
  return { ...await import('./cargas-viagens-v2.jsx'), popup };
}
const load = id => ({ id, codigo: `C-${id}`, cliente: 'Cliente', peso: 10, valorCliente: 100, documentos: [], paradas: [{ tipo: 'entrega', endereco: `Rua ${id}`, cidade: 'Cidade', uf: 'SC', nf: '123' }], observacoes: '<script>malicioso()</script>' });

it('agrupa nome e local de coleta e entrega em sete colunas no A4', async () => {
  const fixture = { ...load(4463), cliente: 'NATREB EQUIPAMENTOS INDUSTRIAIS E TRANSPORTES',
    origem: 'MORRO DA FUMAÇA', ufOrigem: 'SC', clienteFinal: 'CERÂMICA RINCÃO EIRELI - EPP', destino: 'RINCÃO', ufDestino: 'SP',
    tomadorServico: 'PAGADOR COM NOME EMPRESARIAL EXTENSO LTDA', material: 'AUTOMAÇÃO', valorCliente: 12000 };
  const { Cv2PrintLoadsButton, popup } = await setup({ getCargaV2: vi.fn(async () => fixture) });
  render(<Cv2PrintLoadsButton ids={[fixture.id]}>Imprimir</Cv2PrintLoadsButton>);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
  await waitFor(() => expect(popup.document.write).toHaveBeenCalledTimes(2));
  const html = popup.document.write.mock.calls[1][0];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  expect([...doc.querySelectorAll('th')].map(cell => cell.textContent)).toEqual(['Carga', 'Cliente (coleta)', 'Entrega', 'Tomador', 'CT-e', 'Peso', 'Valor']);
  const cells = [...doc.querySelectorAll('tbody tr:first-child td')].map(cell => cell.textContent);
  expect(cells).toHaveLength(7);
  expect(doc.querySelector('tbody td:nth-child(2) b').textContent).toBe(fixture.cliente);
  expect(doc.querySelector('tbody td:nth-child(2) small').textContent).toBe('MORRO DA FUMAÇA/SC');
  expect(doc.querySelector('tbody td:nth-child(3) b').textContent).toBe(fixture.clienteFinal);
  expect(doc.querySelector('tbody td:nth-child(3) small').textContent).toBe('RINCÃO/SP');
  expect(cells[3]).toBe(fixture.tomadorServico);
  expect([...doc.querySelectorAll('.data-grid .cell > span')].slice(0, 4).map(cell => cell.textContent)).toEqual(['Cliente (coleta)', 'Entrega', 'Tomador', 'Material']);
  expect(doc.querySelector('.data-grid .cell small').textContent).toBe('MORRO DA FUMAÇA/SC');
  expect(html).toContain('size:A4 portrait');
  expect(html).toContain('overflow-wrap:anywhere');
  if (process.env.CV2_PRINT_PREVIEW) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(process.env.CV2_PRINT_PREVIEW, html, 'utf8');
  }
});

it('imprime cargas completas em uma janela com folhas separadas, ordem e HTML seguro', async () => {
  const get = vi.fn(async id => load(id));
  const { Cv2PrintLoadsButton, popup } = await setup({ getCargaV2: get });
  render(<Cv2PrintLoadsButton ids={[2, 1, 2]}>Imprimir selecionadas</Cv2PrintLoadsButton>);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir selecionadas' }));
  await waitFor(() => expect(popup.document.write).toHaveBeenCalledTimes(2));
  expect(window.open).toHaveBeenCalledOnce();
  expect(get).toHaveBeenCalledTimes(2);
  const html = popup.document.write.mock.calls[1][0];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  expect(doc.querySelectorAll('main.sheet')).toHaveLength(2);
  expect([...doc.querySelectorAll('main.sheet .code b')].map(node => node.textContent)).toEqual(['C-2', '\u00a0', 'C-1', '\u00a0']);
  expect(html).toContain('break-before:page');
  expect(html).toContain('Rua 1'); expect(html).toContain('Rua 2');
  expect(html).toContain('&lt;script&gt;'); expect(doc.querySelector('script')).toBeNull();
});

it('usa os vínculos atuais da viagem e busca os detalhes completos de todas as cargas', async () => {
  const trip = vi.fn(async () => ({ cargas: [{ id: 3 }, { id: 4 }] }));
  const get = vi.fn(async id => load(id));
  const { Cv2TripDetails, popup } = await setup({ getViagemV2: trip, getCargaV2: get });
  render(<Cv2TripDetails viagem={{ id: 7, numero: 'V-7', cargas: [load(3)] }} onClose={() => {}} onLinkCte={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir cargas da viagem' }));
  await waitFor(() => expect(popup.document.write).toHaveBeenCalledTimes(2));
  expect(trip).toHaveBeenCalledWith(7);
  expect(get.mock.calls.map(([id]) => id)).toEqual([3, 4]);
  expect(popup.document.write.mock.calls[1][0]).toContain('C-4');
});

it('bloqueio de pop-up não consulta e falha de uma carga não imprime lote parcial', async () => {
  const get = vi.fn(async id => { if (id === 2) throw new Error('Carga indisponível'); return load(id); });
  const { Cv2PrintLoadsButton, popup } = await setup({ getCargaV2: get });
  window.open.mockReturnValueOnce(null);
  render(<Cv2PrintLoadsButton ids={[1, 2]}>Imprimir lote</Cv2PrintLoadsButton>);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir lote' }));
  expect(screen.getByRole('alert').textContent).toContain('bloqueou');
  expect(get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir lote' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Carga indisponível'));
  expect(popup.document.write.mock.calls.at(-1)[0]).not.toContain('class="sheet"');
  expect(screen.getByRole('button', { name: 'Imprimir lote' }).disabled).toBe(false);
});

it('seleciona cargas da lista, imprime apenas as marcadas e limpa ao trocar filtro', async () => {
  const get = vi.fn(async id => load(id));
  const { popup } = await setup({ getCargaV2: get,
    listCargasV2: vi.fn(async () => ({ items: [load(1), load(2)], total: 2, totalPages: 1 })),
    getCargasViagensV2Resumo: vi.fn(async () => ({ cargas: 2 })),
    getCargasViagensV2Filtros: vi.fn(async () => ({ empresas: [], origens: [], ufsOrigem: [], destinos: [], ufsDestino: [], materiais: [], vendedores: [] })),
  });
  const Screen = window.CargasViagensV2; render(<Screen user={{}} />);
  expect(screen.getByRole('button', { name: 'Imprimir selecionadas (0)' }).disabled).toBe(true);
  await screen.findByLabelText('Selecionar carga C-1');
  fireEvent.click(screen.getByLabelText('Selecionar todas as cargas desta página'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir selecionadas (2)' })).toBeTruthy());
  fireEvent.click(screen.getByLabelText('Selecionar carga C-1'));
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir selecionadas (1)' }));
  await waitFor(() => expect(popup.document.write).toHaveBeenCalledTimes(2));
  expect(get).toHaveBeenCalledWith(2); expect(get).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Todas', exact: true }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir selecionadas (0)' }).disabled).toBe(true));
});

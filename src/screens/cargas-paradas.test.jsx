// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function setup() {
  window.React = React; window.Icon = () => null;
  window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),
    searchCidades: vi.fn(async () => [{ nome: 'Curitiba', uf: 'PR' }]),
    searchViagemClientes: vi.fn(async () => [{ nome: 'Filial Centro', documento: '123', cidade: 'Joinville', uf: 'SC', endereco: 'Rua Central, 10' }]),
    createCargaV2: vi.fn(async () => ({ id: 1 })),
  };
  const { Cv2CargaForm } = await import('./cargas-viagens-v2.jsx');
  render(<Cv2CargaForm user={{}} onClose={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '+ Adicionar parada' }));
}

it('seleciona cidade/UF e cliente/endereço somente da parada escolhida e salva os dados', async () => {
  await setup();
  fireEvent.click(screen.getByRole('button', { name: '+ Adicionar parada' }));
  fireEvent.change(screen.getByLabelText('Cidade da parada 2'), { target: { value: 'Curi' } });
  fireEvent.click(await screen.findByRole('button', { name: /Curitiba/ }));
  expect(screen.getAllByPlaceholderText('UF')[1].value).toBe('PR');
  expect(screen.getByLabelText('Cidade da parada 1').value).toBe('');
  fireEvent.change(screen.getByLabelText('Cliente/local da parada 2'), { target: { value: 'Filial' } });
  fireEvent.click(await screen.findByRole('button', { name: /Filial Centro/ }));
  expect(screen.getByLabelText('Cidade da parada 2').value).toBe('Joinville');
  expect(screen.getAllByPlaceholderText('UF')[1].value).toBe('SC');
  expect(screen.getAllByPlaceholderText('Endereço')[1].value).toBe('Rua Central, 10');
  expect(screen.getByLabelText('Cidade de destino').value).toBe('');
  fireEvent.change(screen.getAllByPlaceholderText('Endereço')[1], { target: { value: 'Portão dos fundos' } });
  await screen.findByRole('option',{name:'Responsavel ERP'}); fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar carga', exact: true }));
  await waitFor(() => expect(window.RB_API.createCargaV2).toHaveBeenCalledWith(expect.objectContaining({ paradas: [expect.objectContaining({ cidade: '', cliente: '' }), expect.objectContaining({ cidade: 'Joinville', uf: 'SC', cliente: 'Filial Centro', endereco: 'Portão dos fundos' })] })));
});

it('permite texto livre e preserva endereço manual quando o cliente não possui endereço cadastrado', async () => {
  await setup();
  window.RB_API.searchCidades.mockResolvedValue([]);
  window.RB_API.searchViagemClientes.mockResolvedValue([{ nome: 'Cliente sem endereço' }]);
  fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua manual' } });
  fireEvent.change(screen.getByLabelText('Cidade da parada 1'), { target: { value: 'Local novo' } });
  await screen.findByText('Nenhum resultado. Você pode manter o texto digitado.');
  fireEvent.keyDown(screen.getByLabelText('Cidade da parada 1'), { key: 'Escape' });
  fireEvent.change(screen.getByLabelText('Cliente/local da parada 1'), { target: { value: 'Cliente' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Cliente sem endereço' }));
  expect(screen.getByPlaceholderText('Endereço').value).toBe('Rua manual');
  expect(screen.getByLabelText('Cidade da parada 1').value).toBe('Local novo');
});

it('remover uma parada não transfere as sugestões para outra parada', async () => {
  await setup();
  fireEvent.click(screen.getByRole('button', { name: '+ Adicionar parada' }));
  fireEvent.change(screen.getByLabelText('Cidade da parada 1'), { target: { value: 'Curi' } });
  await screen.findByRole('button', { name: /Curitiba/ });
  fireEvent.click(screen.getAllByRole('button', { name: 'Remover parada' })[0]);
  expect(screen.queryByRole('button', { name: /Curitiba/ })).toBeNull();
  expect(screen.getByLabelText('Cidade da parada 1').value).toBe('');
});

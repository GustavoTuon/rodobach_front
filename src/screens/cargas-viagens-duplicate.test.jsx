// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('exibe a lista enquanto resumo e filtros ainda estão consultando', async () => {
  window.React = React; window.Icon = () => null;
  const list = vi.fn(async () => ({ items: [{ id: 9, codigo: 'C-9', cliente: 'Lista disponível', documentos: [], status: 'aguardando_viagem' }], total: 1, totalPages: 1 }));
  window.RB_API = { listCargaResponsaveis: vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),
    listCargasV2: list,
    getCargasViagensV2Resumo: vi.fn(() => new Promise(() => {})),
    getCargasViagensV2Filtros: vi.fn(() => new Promise(() => {})),
  };
  await import('./cargas-viagens-v2.jsx');
  const Screen = window.CargasViagensV2;
  render(<Screen user={{}} />);
  await screen.findByText('Lista disponível');
  fireEvent.click(screen.getByRole('button', { name: 'Todas', exact: true }));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  expect(window.RB_API.getCargasViagensV2Resumo).toHaveBeenCalledOnce();
  expect(window.RB_API.getCargasViagensV2Filtros).toHaveBeenCalledOnce();
});

it('busca cadastro completo antes de duplicar e trata falha sem abrir cópia incompleta', async () => {
  window.React = React; window.Icon = () => null;
  const carga = { id: 9, codigo: 'C-9', cliente: 'Cliente', documentos: [], status: 'aguardando_viagem' };
  const get = vi.fn().mockRejectedValueOnce(new Error('Banco indisponível')).mockResolvedValueOnce({ ...carga, material: 'Madeira', observacoes: 'Instrução completa', paradas: [{ tipo: 'entrega', cidade: 'Curitiba', uf: 'PR', cliente: 'Filial', endereco: 'Rua completa', nf: '', observacoes: '' }] });
  window.RB_API = { listCargaResponsaveis: vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),
    listCargasV2: vi.fn(async () => ({ items: [carga], total: 1, totalPages: 1 })),
    getCargasViagensV2Resumo: vi.fn(async () => ({ cargas: 1 })),
    getCargasViagensV2Filtros: vi.fn(async () => ({ empresas: [], origens: [], ufsOrigem: [], destinos: [], ufsDestino: [], materiais: [], vendedores: [] })),
    getCargaV2: get, createCargaV2: vi.fn(),
  };
  await import('./cargas-viagens-v2.jsx');
  const Screen = window.CargasViagensV2;
  render(<Screen user={{}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Duplicar carga' }));
  await screen.findByText('Banco indisponível');
  expect(screen.queryByText('Duplicar carga C-9')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar carga' }));
  await screen.findByText('Duplicar carga C-9');
  expect(get).toHaveBeenLastCalledWith(9);
  expect(screen.getByPlaceholderText('Endereço').value).toBe('Rua completa');
  expect(screen.getByLabelText('Material').value).toBe('Madeira');
  expect(window.RB_API.createCargaV2).not.toHaveBeenCalled();
});

it('preserva alterações após falha e bloqueia novo envio durante salvamento', async () => {
  window.React = React; window.Icon = () => null;
  let finish;
  const create = vi.fn().mockRejectedValueOnce(new Error('Serviço indisponível')).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  window.RB_API = { listCargaResponsaveis: vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]), createCargaV2: create };
  const { Cv2CargaForm } = await import('./cargas-viagens-v2.jsx');
  const saved = vi.fn();
  render(<Cv2CargaForm duplicateFrom={{ id: 9, codigo: 'C-9', cliente: 'Cliente' }} user={{}} onClose={() => {}} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText('Observações'), { target: { value: 'Novo endereço' } });
  await screen.findByRole('option', {name:'Responsavel ERP'});
  fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar carga', exact: true }));
  await screen.findByText('Serviço indisponível');
  expect(screen.getByLabelText('Observações').value).toBe('Novo endereço');
  expect(saved).not.toHaveBeenCalled();
  await screen.findByRole('option', {name:'Responsavel ERP'});
  fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar carga', exact: true }));
  const saving = screen.getByRole('button', { name: 'Salvando...' });
  expect(saving.disabled).toBe(true);
  fireEvent.click(saving);
  expect(create).toHaveBeenCalledTimes(2);
  finish({ id: 20 });
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});

it('duplica os dados editáveis, permite alterar endereço e cria outra carga sem vínculos', async () => {
  window.React = React;
  window.Icon = () => null;
  const create = vi.fn(async () => ({ id: 20, codigo: 'C-20' }));
  const update = vi.fn();
  window.RB_API = { listCargaResponsaveis: vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]), createCargaV2: create, updateCargaV2: update };
  const { Cv2CargaForm } = await import('./cargas-viagens-v2.jsx');
  const source = {
    id: 9, codigo: 'C-9', data: '2026-10-23', cliente: 'Cliente inicial',
    clienteFinal: 'Cliente final', tomadorServico: 'Tomador', vendedor: 'Vendedor',
    origem: 'Joinville', ufOrigem: 'SC', destino: 'Curitiba', ufDestino: 'PR',
    material: 'Madeira', peso: 2000, valorCliente: 1500, condicaoPagamento: '30 dias',
    observacoes: 'Conferir entrega', status: 'entregue', viagemId: 7,
    documentos: [{ tipo: 'CT-e', numero: '123' }], financeiro: { status: 'quitado' },
    calculoPreco: { custoEstimado: 900 },
    paradas: [{ id: 100, tipo: 'entrega', cidade: 'Curitiba', uf: 'PR', cliente: 'Filial', endereco: 'Rua A', nf: '123', observacoes: 'Portão lateral' }],
  };
  const original = JSON.stringify(source);
  const saved = vi.fn(), close = vi.fn();
  render(<Cv2CargaForm duplicateFrom={source} user={{}} onSaved={saved} onClose={close} />);
  expect(screen.getByText('Duplicar carga C-9')).toBeTruthy();
  expect(create).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText('Endereço').value).toBe('Rua A');
  fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua B' } });
  await screen.findByRole('option', {name:'Responsavel ERP'});
  fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar carga', exact: true }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith({ id: 20, codigo: 'C-20' }));
  const payload = create.mock.calls[0][0];
  for (const key of ['data', 'cliente', 'clienteFinal', 'tomadorServico', 'vendedor', 'origem', 'ufOrigem', 'destino', 'ufDestino', 'material', 'peso', 'valorCliente', 'condicaoPagamento', 'observacoes']) expect(payload[key]).toEqual(source[key]);
  expect(payload.paradas).toEqual([{ tipo: 'entrega', cidade: 'Curitiba', uf: 'PR', cliente: 'Filial', endereco: 'Rua B', nf: '123', observacoes: 'Portão lateral' }]);
  for (const key of ['id', 'codigo', 'status', 'viagemId', 'documentos', 'financeiro']) expect(payload).not.toHaveProperty(key);
  expect(payload.calculoPreco).toEqual({});
  expect(update).not.toHaveBeenCalled();
  expect(JSON.stringify(source)).toBe(original);
});

it('cancelar a cópia não cadastra nem altera a carga original', async () => {
  window.React = React; window.Icon = () => null;
  window.RB_API = { listCargaResponsaveis: vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]), createCargaV2: vi.fn(), updateCargaV2: vi.fn() };
  const { Cv2CargaForm } = await import('./cargas-viagens-v2.jsx');
  const close = vi.fn();
  render(<Cv2CargaForm duplicateFrom={{ id: 9, codigo: 'C-9' }} user={{}} onClose={close} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(close).toHaveBeenCalledOnce();
  expect(window.RB_API.createCargaV2).not.toHaveBeenCalled();
  expect(window.RB_API.updateCargaV2).not.toHaveBeenCalled();
});

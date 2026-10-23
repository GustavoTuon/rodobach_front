// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(cleanup);
it('busca placas cadastradas e usa a placa escolhida na consulta em lote', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  window.RB_API = {
    searchViagemPlacas: vi.fn(async () => [{placa:'ABC1D23',ownershipType:'FROTA',motorista:'Motorista cadastrado'}]),
    searchViagemDocumentos: vi.fn(async () => ({items:[],page:1,hasMore:false})),
  };
  render(<Cv2CteModal carga={{id:1,documentos:[]}} onClose={()=>{}} onSaved={()=>{}} />);
  fireEvent.click(screen.getByText('Placa e data'));
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ab'}});
  fireEvent.click((await screen.findByText('ABC1D23')).closest('button'));
  expect(window.RB_API.searchViagemPlacas).toHaveBeenCalledWith('AB');
  expect(screen.getByLabelText('Placa').value).toBe('ABC1D23');
  expect(screen.queryByText('Motorista cadastrado')).toBeNull();
  fireEvent.change(screen.getByLabelText('Data de emissão'),{target:{value:'2026-10-23'}});
  fireEvent.click(screen.getByText('Pesquisar'));
  await waitFor(()=>expect(window.RB_API.searchViagemDocumentos).toHaveBeenCalledWith({placa:'ABC1D23',data:'2026-10-23',page:1}));
});
it('vincula 23 CT-es em lote, preserva anteriores e deduplica NF-es; mantém seleção após falha', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const items = Array.from({length:23}, (_, i) => ({tipo:'CT-e',numero:String(i+1),empresa:'2',serie:'1',notasDocumentos:[{numero:'50',chave:'nf50'}]}));
  const original = {tipo:'CT-e',numero:'999',empresa:'2',serie:'1'};
  window.RB_API = {
    searchViagemPlacas: vi.fn(async () => []),
    searchViagemDocumentos: vi.fn(async () => ({items,page:1,hasMore:false})),
    saveCargaDocumentosV2: vi.fn().mockRejectedValueOnce(new Error('Falha temporária')).mockResolvedValue({id:1}),
  };
  render(<Cv2CteModal carga={{id:1,documentos:[original]}} onClose={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByText('Placa e data'));
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1D23'}});
  fireEvent.change(screen.getByLabelText('Data de emissão'),{target:{value:'2026-10-23'}});
  fireEvent.click(screen.getByText('Pesquisar'));
  await screen.findAllByRole('checkbox');
  expect(window.RB_API.searchViagemDocumentos).toHaveBeenCalledWith({placa:'ABC1D23',data:'2026-10-23',page:1});
  fireEvent.click(screen.getByText('Selecionar todos os resultados carregados'));
  expect(screen.getAllByRole('checkbox',{checked:true})).toHaveLength(23);
  fireEvent.click(screen.getByText('Vincular documentos'));
  await waitFor(() => expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledTimes(1));
  await screen.findByText('Falha temporária');
  expect(screen.getAllByRole('checkbox',{checked:true})).toHaveLength(23);
  fireEvent.click(screen.getByText('Vincular documentos'));
  await waitFor(() => expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledTimes(2));
  const docs = window.RB_API.saveCargaDocumentosV2.mock.calls[1][1];
  expect(docs).toHaveLength(25);
  expect(docs[0]).toEqual(original);
  expect(docs.filter(doc=>doc.tipo==='NF-e')).toHaveLength(1);
});

it('carrega outra página, preserva seleção e limpa seleção ao trocar filtro', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  window.RB_API = {searchViagemPlacas:vi.fn(async()=>[]),searchViagemDocumentos:vi.fn(async ({page})=>({items:[{numero:String(page),empresa:'1',serie:'1'}],page,hasMore:page===1}))};
  render(<Cv2CteModal carga={{id:1,documentos:[]}} onClose={()=>{}} onSaved={()=>{}} />);
  fireEvent.click(screen.getByText('Placa e data'));
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});
  fireEvent.change(screen.getByLabelText('Data de emissão'),{target:{value:'2026-10-23'}});
  fireEvent.click(screen.getByText('Pesquisar'));
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByText('Carregar mais resultados'));
  await waitFor(()=>expect(screen.getAllByRole('checkbox')).toHaveLength(2));
  expect(screen.getAllByRole('checkbox',{checked:true})).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Data de emissão'),{target:{value:'2026-10-22'}});
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.getByText(/0 selecionado/)).toBeTruthy();
});
it('preserva CT-e e orçamento de mesmo número e séries diferentes ao salvar', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const options = [
    {numero:'123',empresa:'1',serie:'1',chave:'key'},
    {numero:'123',empresa:'1',serie:'O',chave:'',tipo:'Orçamento'},
    {numero:'123',empresa:'2',serie:'O',chave:'',tipo:'Orçamento'},
  ];
  window.RB_API = {
    searchViagemDocumentos: vi.fn(async () => options),
    saveCargaDocumentosV2: vi.fn(async (_id, documentos) => ({id:1,documentos})),
  };
  render(<Cv2CteModal carga={{id:1,documentos:[]}} onClose={() => {}} onSaved={() => {}} />);
  for (const item of [...options, options[1]]) {
    fireEvent.change(screen.getByPlaceholderText('Ex.: 4030'), {target:{value:'123'}});
    fireEvent.click(screen.getByRole('button', {name:'Pesquisar'}));
    fireEvent.click(await screen.findByRole('button', {name:new RegExp(`^${item.tipo || 'CT-e'} 123 · Série ${item.serie} · Empresa ${item.empresa}`)}));
  }
  fireEvent.click(screen.getByRole('button', {name:'Vincular documentos'}));
  await waitFor(() => expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalled());
  expect(window.RB_API.saveCargaDocumentosV2.mock.calls[0][1]).toEqual(
    options.map(item => ({...item,tipo:item.tipo || 'CT-e',observacoes:undefined})),
  );
});
it('permite desvincular o único CT-e, revisar e desfazer antes de salvar', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const original = { tipo: 'CT-e', numero: '4574' };
  const saved = vi.fn();
  window.RB_API = { saveCargaDocumentosV2: vi.fn(async () => ({id: 1, documentos: []})) };
  render(<Cv2CteModal carga={{id:1,codigo:'C-1',documentos:[original]}} onClose={() => {}} onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  expect(screen.getByRole('status').textContent).toContain('CT-e 4574');
  expect(window.RB_API.saveCargaDocumentosV2).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Desfazer remoções'));
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  fireEvent.click(screen.getByRole('button', {name:'Salvar alterações'}));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledWith(1, []);
});

it('mantém o outro CT-e e as NF-es ao desvincular somente o documento escolhido', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const docs = [{tipo:'CT-e',numero:'4574'},{tipo:'CT-e',numero:'4575'},{tipo:'NF-e',numero:'50'}];
  window.RB_API = {saveCargaDocumentosV2: vi.fn(async () => ({}))};
  render(<Cv2CteModal carga={{id:2,documentos:docs}} onClose={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  fireEvent.click(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledWith(2, docs.slice(1)));
});
it('preserva CT-e anterior, adiciona dois novos e evita duplicar CT-es e NF-es', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const original = { tipo: 'CT-e', numero: '100', chave: 'chave100' };
  const saved = vi.fn();
  window.RB_API = {
    searchViagemDocumentos: vi.fn(async numero => [{ numero, chave: `chave${numero}`, notasDocumentos: [{ numero: '50', chave: 'nf50' }] }]),
    saveCargaDocumentosV2: vi.fn(async (_id, documentos) => ({ id: 1, documentos })),
  };
  render(<Cv2CteModal carga={{ id: 1, codigo: 'C-1', documentos: [original] }} onClose={() => {}} onSaved={saved} />);
  for (const numero of ['200', '300', '200']) {
    fireEvent.change(screen.getByPlaceholderText('Ex.: 4030'), { target: { value: numero } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^CT-e ${numero}`) }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Vincular documentos' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const docs = window.RB_API.saveCargaDocumentosV2.mock.calls[0][1];
  expect(docs.filter(doc => doc.tipo === 'CT-e').map(doc => doc.numero)).toEqual(['100', '200', '300']);
  expect(docs.filter(doc => doc.tipo === 'NF-e')).toHaveLength(1);
  expect(docs[0]).toEqual(original);
});

// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
async function modal(api,docs=[]) {
  window.React=React;
  window.RB_API=api;
  const {Cv2CteModal}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2CteModal carga={{id:1,codigo:'C-QA',documentos:docs}} onClose={()=>{}} onSaved={()=>{}}/>);
}
it('valida busca vazia, informa ausência e permite tentar novamente após erro',async()=>{
  const search=vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('ERP indisponível')).mockResolvedValueOnce([{tipo:'Orçamento',numero:'1283',empresa:'2',serie:'O'}]);
  await modal({searchViagemDocumentos:search});
  fireEvent.click(screen.getByRole('button',{name:'Pesquisar'}));
  expect(search).not.toHaveBeenCalled();
  expect(screen.getByText('Informe o número ou a chave do documento.')).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText('Ex.: 4030'),{target:{value:'1283'}});
  fireEvent.click(screen.getByRole('button',{name:'Pesquisar'}));
  expect(await screen.findByText(/Nenhum documento ativo encontrado/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Pesquisar'}));
  expect(await screen.findByText('ERP indisponível')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Pesquisar'}));
  expect(await screen.findByRole('button',{name:/Orçamento 1283/})).toBeTruthy();
});
it('ignora resultado antigo quando o usuário altera a busca durante a consulta',async()=>{
  let resolve;
  await modal({searchViagemDocumentos:vi.fn(()=>new Promise(r=>{resolve=r;}))});
  const input=screen.getByPlaceholderText('Ex.: 4030');
  fireEvent.change(input,{target:{value:'123'}});
  fireEvent.click(screen.getByRole('button',{name:'Pesquisar'}));
  fireEvent.change(input,{target:{value:'456'}});
  await act(async()=>resolve([{numero:'123'}]));
  expect(screen.queryByRole('button',{name:/CT-e 123/})).toBeNull();
  expect(input.value).toBe('456');
});
it('mantém documentos após falha ao salvar e impede alterações durante envio',async()=>{
  let reject;
  const save=vi.fn(()=>new Promise((_r,j)=>{reject=j;}));
  const docs=[{tipo:'CT-e',numero:'123',empresa:'2',serie:'1'}];
  await modal({saveCargaDocumentosV2:save},docs);
  fireEvent.click(screen.getByRole('button',{name:'Vincular documentos'}));
  expect(screen.getByRole('button',{name:/Desvincular CT-e/}).disabled).toBe(true);
  expect(screen.getByRole('button',{name:'Pesquisar'}).disabled).toBe(true);
  await act(async()=>reject(new Error('Falha ao salvar')));
  expect(screen.getByText('Falha ao salvar')).toBeTruthy();
  expect(screen.getByRole('button',{name:/Desvincular CT-e/}).disabled).toBe(false);
  expect(save.mock.calls[0]).toEqual([1,docs]);
});
it('oferece vínculo em carga sem viagem e permite selecionar todos os responsáveis',async()=>{
  window.React=React;window.Icon=()=>null;
  window.RB_API={
    listCargasV2:vi.fn(async()=>({items:[{id:1,codigo:'C-QA',status:'aguardando_viagem',documentos:[],paradas:[],financeiro:{status:'sem_cte'}}],total:1,totalPages:1})),
    getCargasViagensV2Resumo:vi.fn(async()=>({cargas:1})),
    getCargasViagensV2Filtros:vi.fn(async()=>({empresas:['Cliente'],responsaveis:[{codigo:'1',empresa:'1',nome:'MAICON STEINBACH'}]})),
  };
  await import('./cargas-viagens-v2.jsx');
  const Screen=window.CargasViagensV2;
  render(<Screen user={{login:'maicon'}}/>);
  const link=await screen.findByRole('button',{name:'Vincular CT-e'});
  fireEvent.change(screen.getByRole('combobox',{name:'Responsável exibido'}),{target:{value:''}});
  await waitFor(()=>expect(window.RB_API.listCargasV2).toHaveBeenLastCalledWith(expect.objectContaining({responsavel:''})));
  expect(screen.getByRole('combobox',{name:'Responsável exibido'}).value).toBe('');
  fireEvent.click(link);
  expect(within(screen.getByRole('dialog')).getByText('Gerenciar CT-es · C-QA')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Fechar',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:/Veículo vinculado/}));
  await waitFor(()=>expect(window.RB_API.listCargasV2).toHaveBeenLastCalledWith(expect.objectContaining({status:'veiculo_vinculado'})));
});

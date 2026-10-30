// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
async function components(api={}) {
  window.React=React;window.Icon=()=>null;window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),searchCidades:vi.fn(async()=>[]),...api};
  return import('./cargas-viagens-v2.jsx');
}
it('remove apenas o CT-e legado 1283, desfaz e salva mantendo orçamento da série O',async()=>{
  const legacy={tipo:'CT-e',numero:'1283',observacoes:'ERP - CT-e O-1283'};
  const budget={tipo:'Orçamento',numero:'1283',empresa:'2',serie:'O'};
  const save=vi.fn(async()=>({id:1,documentos:[budget]}));
  const {Cv2CteModal}=await components({saveCargaDocumentosV2:save});
  render(<Cv2CteModal carga={{id:1,codigo:'C-004459',documentos:[legacy,budget]}} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Desvincular CT-e 1283',exact:true}));
  expect(screen.getByRole('button',{name:'Desvincular Orçamento 1283 série O empresa 2'})).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Desfazer remoções'}));
  fireEvent.click(screen.getByRole('button',{name:'Desvincular CT-e 1283',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(1,[budget]));
});
it('cadastra carga com parada, remove outra parada e preserva valores após erro',async()=>{
  const save=vi.fn().mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValueOnce({id:1});
  const {Cv2CargaForm}=await components({createCargaV2:save});
  render(<Cv2CargaForm user={{login:'maicon'}} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Valor do cliente (R$)'),{target:{value:'1250'}});
  fireEvent.click(screen.getByRole('button',{name:'+ Adicionar parada'}));
  fireEvent.change(screen.getByPlaceholderText('Cidade'),{target:{value:'Teste'}});
  fireEvent.click(screen.getByRole('button',{name:'+ Adicionar parada'}));
  fireEvent.click(screen.getAllByRole('button',{name:'Remover parada'})[1]);
  await screen.findByRole('option',{name:'Responsavel ERP'}); fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button',{name:'Cadastrar carga',exact:true}));
  await screen.findByText('Falha de rede');
  expect(screen.getByLabelText('Valor do cliente (R$)').value).toBe('1250');
  await screen.findByRole('option',{name:'Responsavel ERP'}); fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button',{name:'Cadastrar carga',exact:true}));
  await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toMatchObject({valorCliente:'1250',responsavel:{codigo:'1',empresa:'1',nome:'Responsavel ERP'},paradas:[{cidade:'Teste'}]});
});
it('edita carga sem recriar e consulta histórico de preço',async()=>{
  const history={historico:{quantidade:2,media:900},suficienteParaCusto:false};
  const update=vi.fn(async()=>({id:9}));
  const {Cv2CargaForm}=await components({updateCargaV2:update,calcularPrecoCargaV2:vi.fn(async()=>history)});
  render(<Cv2CargaForm initial={{id:9,codigo:'C-9',origem:'A',destino:'B',paradas:[]}} user={{}} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar histórico'}));
  await screen.findByText('2 frete(s)');
  await screen.findByRole('option',{name:'Responsavel ERP'}); fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(update).toHaveBeenCalledWith(9,expect.objectContaining({calculoPreco:history})));
});
it('edita viagem, seleciona carga e salva controle de documentos sem nova reserva',async()=>{
  const update=vi.fn(async()=>({id:7}));
  const {Cv2ViagemForm}=await components({updateViagemV2:update});
  render(<Cv2ViagemForm initial={{id:7,numero:'V-7',cargas:[]}} cargas={[{id:3,codigo:'C-3',cliente:'Cliente'}]} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:/C-3/}));
  fireEvent.click(screen.getByText('Controle de documentos recebidos'));
  fireEvent.click(screen.getByRole('checkbox',{name:'CNH do motorista'}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(update).toHaveBeenCalledWith(7,expect.objectContaining({cargaIds:[3],docs:expect.objectContaining({cnh:true})})));
});
it.each(['carga','viagem'])('exclusão de %s permite cancelar, mostra falha e tenta novamente',async(type)=>{
  const remove=vi.fn().mockRejectedValueOnce(new Error('Não foi possível excluir')).mockResolvedValueOnce(undefined);
  const closed=vi.fn(),deleted=vi.fn();
  const {Cv2DeleteModal}=await components({deleteCargaV2:remove,deleteViagemV2:remove});
  render(<Cv2DeleteModal type={type} item={{id:4}} onClose={closed} onDeleted={deleted}/>);
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(remove).not.toHaveBeenCalled();expect(closed).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Sim, excluir'}));await screen.findByText('Não foi possível excluir');
  expect(deleted).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Sim, excluir'}));await waitFor(()=>expect(deleted).toHaveBeenCalledOnce());
});
it('paginação limita extremos e permite mudar quantidade por página',async()=>{
  const next=vi.fn(),size=vi.fn();const {Cv2Pagination}=await components();
  const view=render(<Cv2Pagination page={1} totalPages={3} total={63} pageSize={25} onPage={next} onPageSize={size}/>);
  expect(screen.getByRole('button',{name:'Página anterior'}).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Próxima página'}));expect(next).toHaveBeenCalledWith(2);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'50'}});expect(size).toHaveBeenCalledWith(50);
  view.rerender(<Cv2Pagination page={3} totalPages={3} total={63} pageSize={25} onPage={next} onPageSize={size}/>);
  expect(screen.getByRole('button',{name:'Próxima página'}).disabled).toBe(true);
});
it('detalhes abrem documentos e geram impressão da carga e da viagem sem executar HTML do cliente',async()=>{
  const write=vi.fn();vi.spyOn(window,'open').mockReturnValue({document:{write,close:vi.fn(),getElementById:()=>null}});
  const link=vi.fn();const {Cv2TripDetails}=await components();
  const carga={id:1,codigo:'C-1',cliente:'<script>alert(1)</script>',peso:10,valorCliente:100,documentos:[{tipo:'Orçamento',numero:'1283'}]};
  render(<Cv2TripDetails viagem={{id:7,numero:'V-7',cargas:[carga]}} onClose={()=>{}} onLinkCte={link}/>);
  fireEvent.click(screen.getByRole('button',{name:'Gerenciar CT-es'}));expect(link).toHaveBeenCalledWith(carga);
  window.RB_API.getCargaV2=vi.fn(async()=>carga);
  fireEvent.click(screen.getByRole('button',{name:'Imprimir carga'}));
  await waitFor(()=>expect(write).toHaveBeenCalledTimes(2));
  write.mockClear();
  fireEvent.click(screen.getByRole('button',{name:'Imprimir folha da viagem'}));
  expect(write).toHaveBeenCalledTimes(1);
  for(const [html] of write.mock.calls){expect(html).toContain('Orç. 1283');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>alert(1)</script>');}
});

it('reserva de viagem com falha bloqueia salvar e permite tentar novamente',async()=>{
  const reserve=vi.fn().mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({numero:'V-10',reservaNumero:'token'});
  const {Cv2ViagemForm}=await components({reservarNumeroViagemV2:reserve});
  render(<Cv2ViagemForm cargas={[]} onClose={()=>{}} onSaved={()=>{}}/>);
  await screen.findByText('Sem conexão');
  expect(screen.getByRole('button',{name:'Criar viagem'}).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Tentar gerar novamente'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Criar viagem'}).disabled).toBe(false));
  expect(screen.getByLabelText('Identificador da viagem').value).toBe('V-10');
});

it('histórico de cotação informa falha e permite repetir a consulta',async()=>{
  const query=vi.fn().mockRejectedValueOnce(new Error('ERP offline')).mockResolvedValueOnce({fretes:[],hasMore:false});
  const {Cv2QuoteModal}=await components({consultarCotacaoFretesV2:query});
  render(<Cv2QuoteModal onClose={()=>{}}/>);
  await screen.findByText('ERP offline');
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  await waitFor(()=>expect(query).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByText('ERP offline')).toBeNull());
  expect(query.mock.calls[1][0]).toMatchObject({meses:'24',page:1,pageSize:25});
});

it('autocomplete ignora cliente de uma pesquisa anterior mais lenta',async()=>{
  let resolveOld;
  const search=vi.fn(q=>q==='Antigo'?new Promise(r=>{resolveOld=r;}):Promise.resolve([{nome:'Cliente novo',cidade:'Cidade nova'}]));
  const {Cv2CargaForm}=await components({searchViagemClientes:search});
  render(<Cv2CargaForm user={{}} onClose={()=>{}} onSaved={()=>{}}/>);
  const input=screen.getByPlaceholderText('Onde a carga começa');
  fireEvent.change(input,{target:{value:'Antigo'}});
  await waitFor(()=>expect(search).toHaveBeenCalledWith('Antigo'));
  fireEvent.change(input,{target:{value:'Novo'}});
  await screen.findByRole('button',{name:/Cliente novo/});
  await act(async()=>resolveOld([{nome:'Cliente antigo'}]));
  expect(screen.queryByRole('button',{name:/Cliente antigo/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Cliente novo/}));
  expect(input.value).toBe('Cliente novo');
});

it('todos os filtros operacionais, financeiros e avançados enviam a seleção e podem ser limpos',async()=>{
  const list=vi.fn(async()=>({items:[],total:0,totalPages:1}));
  await components({listCargasV2:list,listViagensV2:vi.fn(async()=>({items:[],total:0,totalPages:1})),
    getCargasViagensV2Resumo:vi.fn(async()=>({cargas:1,viagens:1})),
    getCargasViagensV2Filtros:vi.fn(async()=>({empresas:['Cliente'],origens:['A'],ufsOrigem:['SC'],destinos:['B'],ufsDestino:['SP'],materiais:['Carga'],vendedores:[]}))});
  const Screen=window.CargasViagensV2;render(<Screen user={{}}/>);
  await screen.findByText('Nenhuma carga encontrada.');
  for(const [name,status,financeiro] of [['Todas','',''],['Somente carga','aguardando_viagem',''],['Aguardando CT-e','aguardando_cte',''],['Em trânsito','em_transito',''],['Entregue','entregue',''],['Financeiro em aberto','','em_aberto'],['Quitado','','quitado']]) {
    fireEvent.click(screen.getByRole('button',{name,exact:true}));
    await waitFor(()=>expect(list).toHaveBeenLastCalledWith(expect.objectContaining({status,financeiro})));
  }
  fireEvent.click(screen.getByRole('button',{name:/^Filtros/}));
  for(const [label,value] of [['Empresa / cliente','Cliente'],['Origem','A'],['UF origem','SC'],['Destino','B'],['UF destino','SP'],['Material','Carga']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
  await waitFor(()=>expect(list).toHaveBeenLastCalledWith(expect.objectContaining({empresa:'Cliente',origem:'A',ufOrigem:'SC',destino:'B',ufDestino:'SP',material:'Carga'})));
  fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));
  await waitFor(()=>expect(list).toHaveBeenLastCalledWith(expect.objectContaining({empresa:'',origem:'',ufOrigem:'',destino:'',ufDestino:'',material:''})));
  fireEvent.click(screen.getByRole('button',{name:'Viagens 1'}));
  await waitFor(()=>expect(window.RB_API.listViagensV2).toHaveBeenCalledWith(expect.objectContaining({status:'',financeiro:''})));
});

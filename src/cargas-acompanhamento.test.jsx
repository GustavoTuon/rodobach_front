// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {ForecastFields,ForecastDashboard,ForecastHistory,NotLoadedForm} from './cargas-acompanhamento.jsx';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('reagendamento pede motivo e informa a previsao anterior inclusive ao remover',()=>{
  const set=vi.fn();render(<ForecastFields form={{previsaoCarregamento:''}} set={set} initial={{previsaoCarregamento:'2026-11-24T08:30'}} kind="carga"/>);
  expect(screen.getByLabelText('Motivo do reagendamento do carregamento').required).toBe(true);
  fireEvent.change(screen.getByLabelText(/Previsão de carregamento/),{target:{value:'2026-11-25T09:00'}});
  expect(set).toHaveBeenCalledWith('carregamentoAnterior','2026-11-24T08:30');
});
it('painel filtra pelo prazo e permite recuperar erro sem exibir contagem antiga',async()=>{
  const filter=vi.fn();window.RB_API={getPrevisoesV2:vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue({carga:{vencida:4,hoje:2,amanha:1,sem_previsao:8}})};
  render(<ForecastDashboard kind="carga" selected="" onFilter={filter}/>);
  await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  fireEvent.click(await screen.findByRole('button',{name:/Previsão vencida.*4/}));expect(filter).toHaveBeenCalledWith('vencida');
});
it('nao carregamento exige justificativa e preserva os campos ao falhar',async()=>{
  const saved=vi.fn();window.RB_API={markNaoCarregadaV2:vi.fn().mockRejectedValueOnce(new Error('Carga vinculada a uma viagem')).mockResolvedValue({ok:true})};
  render(<NotLoadedForm item={{id:8,status:'aguardando_viagem'}} onSaved={saved}/>);
  fireEvent.change(screen.getByLabelText('Motivo do não carregamento'),{target:{value:'Outro'}});
  expect(screen.getByLabelText('Observações').required).toBe(true);
  fireEvent.change(screen.getByLabelText('Observações'),{target:{value:'Cliente solicitou adiamento'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirmar não carregamento'}));await screen.findByRole('alert');
  expect(saved).not.toHaveBeenCalled();expect(screen.getByLabelText('Observações').value).toContain('Cliente');
  fireEvent.click(screen.getByRole('button',{name:'Confirmar não carregamento'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  expect(window.RB_API.markNaoCarregadaV2).toHaveBeenLastCalledWith(8,{motivo:'Outro',observacoes:'Cliente solicitou adiamento',reabrir:false});
});
it('reabertura usa acao explicita e nao apaga justificativa antiga',async()=>{
  window.RB_API={markNaoCarregadaV2:vi.fn(async()=>({ok:true}))};const saved=vi.fn();
  render(<NotLoadedForm item={{id:8,status:'nao_carregada'}} onSaved={saved}/>);
  fireEvent.change(screen.getByLabelText('Motivo da reabertura'),{target:{value:'Cliente retomou o pedido'}});
  fireEvent.click(screen.getByRole('button',{name:'Reabrir carga'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  expect(window.RB_API.markNaoCarregadaV2).toHaveBeenCalledWith(8,expect.objectContaining({reabrir:true}));
});
it('historico mostra autor, motivo e previsoes sem interpretar HTML',()=>{
  render(<ForecastHistory item={{acompanhamento:{historico:[{tipo:'previsao',em:'2026-11-24T01:00:00Z',anterior:'2026-11-24T10:00',previsao:'2026-11-25T11:00',motivo:'<b>Cliente reagendou</b>',usuario:'Operador'}]}}}/>);
  expect(screen.getByText('<b>Cliente reagendou</b>').querySelector('b')).toBeNull();
  expect(screen.getByText(/Operador/).textContent).toContain('23/11/2026');
});
it('cadastro envia previsao e duplicacao nao copia a programacao antiga',async()=>{
  window.React=React;window.Icon=()=>null;const save=vi.fn(async()=>({id:2}));
  window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:'1',empresa:'1',nome:'Responsável teste'}]),createCargaV2:save};
  const {Cv2CargaForm}=await import('./screens/cargas-viagens-v2.jsx');
  render(<Cv2CargaForm duplicateFrom={{codigo:'C-1',previsao:'2026-11-24T08:00',responsavel:{codigo:'1',empresa:'1'},paradas:[]}} onSaved={()=>{}}/>);
  expect(screen.queryByLabelText(/Previsão de carregamento/)).toBeNull();
  await screen.findByRole('option',{name:'Responsável teste'});
  fireEvent.click(screen.getByRole('button',{name:'Cadastrar carga',exact:true}));
  await waitFor(()=>expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].previsao).toBeUndefined();
});
it('as duas previsoes da viagem sao opcionais e independentes',()=>{
 const set=vi.fn();render(<><ForecastFields form={{}} set={set} kind="carregamento"/><ForecastFields form={{}} set={set} kind="viagem"/></>);
 const loading=screen.getByLabelText(/Previsão de carregamento/),delivery=screen.getByLabelText(/Previsão de entrega/);
 expect(loading.required).toBe(false);expect(delivery.required).toBe(false);
 fireEvent.change(loading,{target:{value:'2026-11-25T08:00'}});
 expect(set).toHaveBeenCalledWith('previsaoCarregamento','2026-11-25T08:00');expect(delivery.value).toBe('');
});

// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {calculateCommission,commissionDefaults,commissionDistance,commissionRows} from './cost-commission-model.js';
import {CostCommission} from './cost-commission.jsx';
import {EvolucaoCustos} from './evolucao-custos.jsx';

const row=(valor,extra={})=>({id:'DOC-1',valor,placa:'ABC1D23',data:'2026-08-10',proprietario:'frota',tipoCusto:'Abastecimento',descricao:'Diesel',fornecedor:'Posto',...extra});
const config={...commissionDefaults(),reference:'10000',reduction:'10',rate:'20'};
const period={startDate:'2026-08-01',endDate:'2026-08-31'},prior={startDate:'2026-07-01',endDate:'2026-07-31'};
const props={kind:'fuel',rows:[row(8000)],previous:[row(10000,{data:'2026-07-10'})],period,prior,months:[{key:'2026-08'}],plates:[],scopeKey:'august',distance:{available:true,monthly:[{placa:'ABC1D23',mes:'2026-08',km:4000}]}};
beforeEach(()=>{globalThis.React=React;window.localStorage.clear();window.RB_AUTH={getUser:()=>({id:1})};});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('regras de comissão',()=>{
  it('aplica meta, economia excedente, percentual e teto em centavos',()=>{
    const result=calculateCommission([row(8000)],config,null);
    expect(result).toMatchObject({ready:true,referenceCost:10000,target:9000,savings:2000,eligible:1000,commission:200,reached:true});
    expect(calculateCommission([row(8000)],{...config,basis:'all'},null).commission).toBe(400);
    expect(calculateCommission([row(8000)],{...config,cap:'150.35'},null).commission).toBe(150.35);
    expect(calculateCommission([row(8000)],{...config,cap:'0'},null).commission).toBe(0);
  });
  it('não comissiona meta não atingida e distingue atingir de superar',()=>{
    expect(calculateCommission([row(9500)],config,null)).toMatchObject({ready:true,reached:false,commission:0});
    expect(calculateCommission([row(9000)],config,null).commission).toBe(0);
    expect(calculateCommission([row(9000)],{...config,basis:'all'},null).commission).toBe(200);
    expect(calculateCommission([row(11000)],{...config,basis:'all'},null)).toMatchObject({savings:-1000,commission:0});
  });
  it('normaliza pela distância atual e preserva estornos válidos',()=>{
    expect(calculateCommission([row(8500),row(-500)],{...config,mode:'km',reference:'2.5'},4000)).toMatchObject({referenceCost:10000,currentPerKm:2,commission:200});
    expect(calculateCommission([row(-500)],config,null).ready).toBe(false);
    expect(calculateCommission([row(8000)],{...config,mode:'km'},0).ready).toBe(false);
    expect(calculateCommission([row(8000)],{...config,mode:'km'},null).ready).toBe(false);
    expect(calculateCommission([row(0)],{...config,reference:'0.000001'},null).ready).toBe(false);
  });
  it('bloqueia dados ausentes, valores inválidos e parâmetros fora da faixa',()=>{
    expect(calculateCommission([],config,null).ready).toBe(false);
    for(const valor of [NaN,Infinity,'100',null])expect(calculateCommission([row(valor)],config,null).ready).toBe(false);
    for(const changes of [{reference:''},{reference:'-1'},{reference:'Infinity'},{reduction:''},{reduction:'101'},{rate:'-1'},{rate:'101'},{cap:'-1'},{mode:'unknown'},{basis:'unknown'}])expect(calculateCommission([row(8000)],{...config,...changes},4000).ready).toBe(false);
  });
  it('separa combustível, manutenção, pneus e borracharia',()=>{
    const rows=[row(100),row(200,{tipoCusto:'Manutencao',descricao:'Freios'}),row(300,{tipoCusto:'Pneus'}),row(400,{tipoCusto:'Manutencao',descricao:'Borracharia'}),row(500,{tipoCusto:'Lavacao'})];
    expect(commissionRows(rows,'fuel',config).map(r=>r.valor)).toEqual([100]);
    expect(commissionRows(rows,'maintenance',config).map(r=>r.valor)).toEqual([200]);
    expect(commissionRows(rows,'maintenance',{...config,tires:true,tireService:true}).map(r=>r.valor)).toEqual([200,300,400]);
  });
  it('exige cobertura de todas as placas e meses, sem tratar falta como zero',()=>{
    expect(commissionDistance(props.rows,props.previous,[],props.months,props.distance)).toMatchObject({km:4000,complete:true});
    expect(commissionDistance(props.rows,props.previous,['XYZ9Z99'],props.months,props.distance).km).toBeNull();
    expect(commissionDistance(props.rows,[row(100,{placa:'XYZ9Z99'})],[],props.months,props.distance).km).toBeNull();
    expect(commissionDistance([row(100,{placa:''})],[],[],props.months,props.distance).km).toBeNull();
    expect(commissionDistance(props.rows,[],[],[...props.months,{key:'2026-09'}],props.distance).km).toBeNull();
  });
});

function fill(){
  fireEvent.change(screen.getByLabelText('Referência de custo do período (R$)'),{target:{value:'10000'}});
  fireEvent.change(screen.getByLabelText('Meta de redução (%)'),{target:{value:'10'}});
  fireEvent.change(screen.getByLabelText('Comissão sobre a economia (%)'),{target:{value:'20'}});
}
it('guarda parâmetros por usuário e modalidade, sem compartilhar a conferência',()=>{
  const first=render(<CostCommission {...props}/>);fill();
  fireEvent.click(screen.getByRole('checkbox',{name:/Conferi os lançamentos/}));
  expect(screen.getByText('Meta atingida na simulação')).toBeTruthy();
  first.unmount();
  const other=render(<CostCommission {...props} kind="maintenance"/>);
  expect(screen.getByLabelText('Referência de custo do período (R$)').value).toBe('');
  other.unmount();
  const again=render(<CostCommission {...props}/>);
  expect(screen.getByLabelText('Referência de custo do período (R$)').value).toBe('10000');
  expect(screen.getByRole('checkbox',{name:/Conferi os lançamentos/}).checked).toBe(false);
  again.unmount();window.RB_AUTH={getUser:()=>({id:2})};
  render(<CostCommission {...props}/>);
  expect(screen.getByLabelText('Referência de custo do período (R$)').value).toBe('');
});
it('reinicia conferência ao mudar escopo e exige verificação de preventivas',()=>{
  const page=render(<CostCommission {...props} kind="maintenance" rows={[row(8000,{tipoCusto:'Manutencao',descricao:'Freios'})]}/>);fill();
  fireEvent.click(screen.getByRole('checkbox',{name:/Conferi os lançamentos/}));
  expect(screen.getByText('Aguardando conferência')).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox',{name:/Conferi que as manutenções/}));
  expect(screen.getByText('Meta atingida na simulação')).toBeTruthy();
  page.rerender(<CostCommission {...props} kind="maintenance" scopeKey="another" rows={[row(8000,{tipoCusto:'Manutencao',descricao:'Freios'})]}/>);
  expect(screen.getByRole('checkbox',{name:/Conferi que as manutenções/}).checked).toBe(false);
});
it('oculta a comissão ao atualizar ou falhar a consulta e relata falha ao salvar',()=>{
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota');});
  render(<CostCommission {...props} unavailable/>);fill();
  expect(screen.getByText(/Não foi possível salvar neste navegador/)).toBeTruthy();
  expect(screen.getByRole('checkbox',{name:/Conferi os lançamentos/}).disabled).toBe(true);
  const result=screen.getByRole('region',{name:'Resultado da simulação'});
  expect(result.querySelector('.ec-commission-total strong').textContent).toBe('—');
});
it('abre as duas subtelas com categorias independentes sem novas consultas',async()=>{
  globalThis.readSavedFilters=(_key,fallback)=>({...fallback,dates:period,category:['Combustível']});
  globalThis.saveFilters=vi.fn();
  const api=vi.fn().mockResolvedValue({period,prior,launches:[row(8000),row(5000,{id:'M-1',tipoCusto:'Manutencao',descricao:'Freios'}),row(10000,{data:'2026-07-10'})],distance:props.distance});
  window.RB_API={getEvolucaoCustos:api,getCustosVeiculosFiltros:vi.fn().mockResolvedValue({veiculos:[]})};
  render(<EvolucaoCustos/>);
  await screen.findByRole('heading',{name:'Por onde começar?'});
  const nav=screen.getByRole('navigation',{name:'Simulações de comissão'});
  fireEvent.click(within(nav).getByRole('button',{name:'Comissão de abastecimento'}));
  await screen.findByRole('heading',{name:'Economia no abastecimento'});fill();
  fireEvent.click(within(nav).getByRole('button',{name:'Comissão de manutenção'}));
  expect(screen.getByRole('heading',{name:'Economia na manutenção'})).toBeTruthy();
  expect(screen.getByRole('region',{name:'Resultado da simulação'}).textContent).toContain('5.000,00');
  expect(screen.getByLabelText('Referência de custo do período (R$)').value).toBe('');
  fireEvent.click(within(nav).getByRole('button',{name:'Comissão de abastecimento'}));
  expect(screen.getByLabelText('Referência de custo do período (R$)').value).toBe('10000');
  fireEvent.click(screen.getByRole('button',{name:'Ver lançamentos do veículo'}));
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).queryByText('Freios')).toBeNull();
  expect(within(dialog).queryByRole('button',{name:'Filtrar a página por este veículo'})).toBeNull();
  await waitFor(()=>expect(api).toHaveBeenCalledTimes(1));
});

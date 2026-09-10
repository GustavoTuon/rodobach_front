// @vitest-environment jsdom
import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import './screens/evolucao-custos.jsx';
import {ecEvents,ecGroups,ecCategory,ecAlerts,ecSum,ecColor} from './screens/cost-analysis-model.js';
import {CostEvolutionChart,CostTransactionsTable,VehicleCostDrawer,ExecutiveSummary} from './screens/cost-analysis-components.jsx';
globalThis.React=React;
afterEach(cleanup);
const row=(id,valor=100,extra={})=>({id,data:'2026-08-02',placa:'RXO6C18',empresa:1,fornecedorCodigo:20,fornecedor:'Oficina',tipoCusto:'Manutencao',documento:'OS-12',valor,descricao:'Reparo',...extra});
describe('preservação dos valores e alertas',()=>{
 it('preserva estornos e conta itens da mesma OS uma vez',()=>{const rows=[row('1',100),row('2',-20),row('3',50,{documento:'OS-13'})];expect(ecSum(rows)).toBe(130);expect(ecGroups(rows,ecCategory)).toEqual([{name:'Manutenção',value:130}]);expect(ecEvents(rows)).toBe(2);});
 it('não compara placa única consigo mesma ou mês com período completo',()=>{const alerts=ecAlerts([row('1')],[row('old',10)],true);expect(alerts.some(a=>a.label==='Gasto por veículo'||a.label==='Variação de custo')).toBe(false);});
 it('cores de categoria são estáveis independentemente da seleção',()=>{const color=ecColor('Combustível');ecColor('Manutenção');expect(ecColor('Combustível')).toBe(color);});
});
describe('interações da análise',()=>{
 it('mostra duplicata sem campo documento e consulta itens apenas ao abrir',async()=>{
   const query=vi.fn().mockResolvedValue({documentos:[],itens:[{codigo:'1',descricao:'Balanceamento',quantidade:2,unitario:45,total:90,documento:'NF 1/961'}],aviso:'Itens da nota completa.'});
   window.RB_API={getCustoRastreabilidade:query};
   render(<CostTransactionsTable rows={[row('pagar:2:1:961:1:753:10:20',90,{documento:''})]}/>);
   expect(screen.getByText('Duplicata 1/961 · parcela 1')).toBeTruthy();expect(query).not.toHaveBeenCalled();
   fireEvent.click(screen.getByRole('button',{name:'Detalhar itens'}));
   expect(await screen.findByText('1 · Balanceamento')).toBeTruthy();
   expect(query).toHaveBeenCalledWith('pagar:2:1:961:1:753:10:20');
 });
 it('seleciona várias placas e categorias e restaura ao voltar sem consultas por clique',async()=>{
   let saved={dates:{startDate:'2026-08-01',endDate:'2026-08-31'},owner:'frota',plate:[],category:[]};
   globalThis.readSavedFilters=(_key,fallback)=>({...fallback,...saved});
   globalThis.saveFilters=(_key,value)=>{saved=JSON.parse(JSON.stringify(value));};
   const query=vi.fn().mockResolvedValue({period:saved.dates,prior:{startDate:'2026-07-01',endDate:'2026-07-31'},launches:[row('1',100,{proprietario:'frota'}),row('2',200,{placa:'SXY5D26',tipoCusto:'Abastecimento',proprietario:'frota'})]});
   window.RB_API={getEvolucaoCustos:query,getCustosVeiculosFiltros:vi.fn().mockResolvedValue({veiculos:[]})};
   const Page=window.EvolucaoCustos;
   const first=render(<Page/>);
   await waitFor(()=>expect(first.container.querySelectorAll('.ec-multi-menu input')).toHaveLength(4));
   first.container.querySelectorAll('.ec-multi').forEach(d=>d.setAttribute('open',''));
   first.container.querySelectorAll('.ec-multi-menu input').forEach(input=>fireEvent.click(input));
   await waitFor(()=>expect(saved.plate).toHaveLength(2));
   expect(saved.category).toHaveLength(2);expect(query).toHaveBeenCalledTimes(1);
   first.unmount();
   const second=render(<Page/>);
   await waitFor(()=>expect(second.container.querySelectorAll('.ec-multi-menu input:checked')).toHaveLength(4));
   expect(query).toHaveBeenCalledTimes(2);
   expect(saved.dates).toEqual({startDate:'2026-08-01',endDate:'2026-08-31'});
 });
 it('seleciona mês pelo teclado e troca visão do gráfico',()=>{const onSelect=vi.fn();render(<CostEvolutionChart months={[{key:'2026-08',rows:[row('1')]}]} onSelect={onSelect}/>);fireEvent.keyDown(screen.getByRole('button',{name:/ago.*100/}),{key:'Enter'});expect(onSelect).toHaveBeenCalledWith('2026-08');fireEvent.click(screen.getByRole('button',{name:'Por categoria'}));expect(screen.getByRole('button',{name:'Por categoria'}).getAttribute('aria-pressed')).toBe('true');});
 it('pagina e pesquisa documentos sem alterar os dados de origem',()=>{const rows=Array.from({length:60},(_,i)=>row(String(i),100,{documento:`DOC-${i}`}));render(<CostTransactionsTable rows={rows}/>);expect(screen.getAllByRole('row')).toHaveLength(26);fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(screen.getByText('2 de 3')).toBeTruthy();fireEvent.change(screen.getByRole('searchbox'),{target:{value:'DOC-59'}});expect(screen.getAllByRole('row')).toHaveLength(2);expect(screen.getByText('DOC-59')).toBeTruthy();expect(rows).toHaveLength(60);});
 it('mostra ausência de comparação para mês selecionado',()=>{render(<ExecutiveSummary rows={[row('1')]} previous={[row('old',10)]} month="2026-08"/>);expect(screen.getByText('Sem base comparável')).toBeTruthy();});
 it('drawer exibe apenas a placa escolhida e fecha com Escape',()=>{const close=vi.fn();render(<VehicleCostDrawer plate="RXO6C18" rows={[row('1'),row('2',200,{placa:'SXY5D26',fornecedor:'Outra oficina'})]} months={[]} onClose={close} onFilter={vi.fn()}/>);expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.queryByText('Outra oficina')).toBeNull();fireEvent.keyDown(document,{key:'Escape'});expect(close).toHaveBeenCalledOnce();});
});

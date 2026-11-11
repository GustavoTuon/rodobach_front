// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {EvolucaoCustos} from './evolucao-custos.jsx';
import {CostFocusActions} from './cost-focus-actions.jsx';

const dates={startDate:'2026-08-01',endDate:'2026-08-31'};
const launch=(id,placa,valor,extra={})=>({id,placa,valor,data:'2026-08-10',proprietario:'frota',tipoCusto:'Manutencao',fornecedor:'Oficina teste',fornecedorCodigo:'1',descricao:'Reparo',documento:id,...extra});
const data={period:dates,prior:{startDate:'2026-07-01',endDate:'2026-07-31'},launches:[launch('DOC-1','ABC1D23',300),launch('DOC-2','DEF4G56',100),launch('DOC-3','ABC1D23',100,{data:'2026-07-10'})]};
beforeEach(()=>{
  globalThis.React=React;
  globalThis.readSavedFilters=(_key,fallback)=>({...fallback,dates});
  globalThis.saveFilters=vi.fn();
  window.RB_API={getEvolucaoCustos:vi.fn().mockResolvedValue(data),getCustosVeiculosFiltros:vi.fn().mockResolvedValue({veiculos:[]})};
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const navButton=name=>within(screen.getByRole('navigation',{name:'Visões da análise de custos'})).getByRole('button',{name:new RegExp(name)});

it('separa investigações sem novas consultas e mantém filtros e contexto ao sair do foco',async()=>{
  const toggle=vi.fn();
  const page=render(<EvolucaoCustos onToggleFocus={toggle}/>);
  await screen.findByRole('heading',{name:'Por onde começar?'});
  expect(screen.queryByRole('heading',{name:'Detalhamento dos lançamentos'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/03 · RASTREAR A CATEGORIA/}));
  expect(navButton('Maiores gastos').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button',{name:'Remover filtro Manutenção'})).toBeTruthy();
  fireEvent.click(navButton('Documentos'));
  expect(screen.getByRole('heading',{name:'Detalhamento dos lançamentos'})).toBeTruthy();
  fireEvent.click(navButton('Desvios'));
  expect(screen.getByRole('heading',{name:'O que explica a variação dos custos?'})).toBeTruthy();
  fireEvent.click(navButton('Veículos'));
  expect(screen.queryByRole('heading',{name:'Detalhamento dos lançamentos'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Voltar ao sistema/}));
  expect(toggle).toHaveBeenCalledOnce();
  page.rerender(<EvolucaoCustos focused={false} onToggleFocus={toggle}/>);
  expect(navButton('Veículos').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button',{name:'Remover filtro Manutenção'})).toBeTruthy();
  expect(window.RB_API.getEvolucaoCustos).toHaveBeenCalledTimes(1);
});

it('abre o veículo destacado e preserva filtros ao fechar o detalhe',async()=>{
  render(<EvolucaoCustos/>);
  const action=await screen.findByRole('button',{name:/02 · EXPLORAR O VEÍCULO/});
  fireEvent.click(action);
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading',{name:'ABC1D23'})).toBeTruthy();
  expect(within(dialog).queryByText('DEF4G56')).toBeNull();
  fireEvent.keyDown(document,{key:'Escape'});
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(window.RB_API.getEvolucaoCustos).toHaveBeenCalledTimes(1);
});

it('aplica um atalho em uma consulta e avisa quando uma atualização falha',async()=>{
  render(<EvolucaoCustos/>);
  await screen.findByRole('heading',{name:'Por onde começar?'});
  window.RB_API.getEvolucaoCustos.mockRejectedValueOnce(new Error('Servidor indisponível'));
  fireEvent.click(screen.getByRole('button',{name:'Este mês'}));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('última consulta concluída');
  expect(screen.getByRole('heading',{name:'Resumo executivo'})).toBeTruthy();
  const requested=window.RB_API.getEvolucaoCustos.mock.calls[1][0];
  const now=new Date();
  expect(requested.startDate).toBe(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
  expect(requested.proprietario).toBe('todos');
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
  expect(window.RB_API.getEvolucaoCustos).toHaveBeenCalledTimes(3);
});

it('mostra filtros sob demanda e mantém o período editado pendente até aplicar',async()=>{
  render(<EvolucaoCustos/>);
  await screen.findByRole('heading',{name:'Por onde começar?'});
  expect(screen.queryByRole('button',{name:'Aplicar período'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/^Filtros/}));
  fireEvent.change(screen.getByLabelText('Data inicial'),{target:{value:'2026-08-05'}});
  expect(screen.getByText(/Período alterado/)).toBeTruthy();
  expect(window.RB_API.getEvolucaoCustos).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Aplicar período'}));
  await waitFor(()=>expect(window.RB_API.getEvolucaoCustos).toHaveBeenCalledTimes(2));
  expect(window.RB_API.getEvolucaoCustos.mock.calls[1][0].startDate).toBe('2026-08-05');
});

it('não inventa comparação ou ações para um recorte vazio',()=>{
  render(<CostFocusActions rows={[]} previous={[]} month="2026-08" onView={vi.fn()} onOpen={vi.fn()} onCategory={vi.fn()}/>);
  expect(screen.getByRole('button',{name:/02 · EXPLORAR O VEÍCULO/}).disabled).toBe(true);
  expect(screen.getByRole('button',{name:/03 · RASTREAR A CATEGORIA/}).disabled).toBe(true);
  expect(screen.getByText(/Remova o mês selecionado/)).toBeTruthy();
  expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
});

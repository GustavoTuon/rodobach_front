// @vitest-environment jsdom
import React from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {clientProfitRanking, clientProfitReport} from './client-profit-ranking.jsx';
import {ClientMargin} from './client-margin.jsx';

afterEach(cleanup);
const client = (id, saldo, covered=2, documentos=2) => ({id, cliente:id, empresa:1, atual:{documentos, documentosComCusto:covered, documentosSemReceita:0, receita:1000, receitaSemCusto:covered===documentos?0:500, custoDireto:saldo===null?null:1000-saldo, saldoParcial:saldo, margemParcial:saldo===null?null:saldo/10}, anterior:{}});
const clients = [client('Menor',100),client('Maior',400),client('Incompleto',900,1),client('Sem custo',null,0),client('Negativo',-10),client('Pior',-200),client('Zerado',0),client('Anterior',0,0,0)];
const periods = {current:{startDate:'2026-09-01',endDate:'2026-09-22'},previous:{startDate:'2026-08-10',endDate:'2026-08-31'}};

it('ranks complete direct-cost results and excludes missing costs, revenue and previous-only clients',()=>{
  const before=JSON.stringify(clients);
  const result=clientProfitRanking([...clients,{...client('Sem receita',500),atual:{...client('x',500).atual,documentosSemReceita:1}}]);
  expect(result.positive.map(r=>r.id)).toEqual(['Maior','Menor']);
  expect(result.negative.map(r=>r.id)).toEqual(['Pior','Negativo']);
  expect(result.neutral.map(r=>r.id)).toEqual(['Zerado']);
  expect(result.pending).toHaveLength(3);
  expect(result.positive[0].average).toBe(200);
  expect(result.pending.every(r=>r.average===null)).toBe(true);
  expect(JSON.stringify(clients)).toBe(before);
  expect(clientProfitRanking(clients,'MAIOR').positive).toHaveLength(1);
  expect(clientProfitRanking([]).positive).toEqual([]);
});

it('exports a standalone report with period, limitations, pending clients and escaped names',()=>{
  const report=clientProfitReport(clientProfitRanking([...clients,client('<script>alert(1)</script>',10)]),{periodos:periods,atualizadoEm:'2026-09-22T12:00:00Z',metodologia:'Custos diretos'},'<img>');
  expect(report).toContain('01/09/2026 a 22/09/2026');
  expect(report).toContain('não representa lucro líquido');
  expect(report).toContain('Apuração pendente (2)');
  expect(report).toContain('&lt;script&gt;');
  expect(report).not.toContain('<script>');
  expect(report).toContain('Busca aplicada: &lt;img&gt;');
});

it('opens the ranking and traces its client to the original document and plate',async()=>{
  window.RB_API={getClienteMargem:vi.fn().mockResolvedValue({clientes:clients,rotas:[],resumo:clients[0].atual,periodos:periods,atualizadoEm:'2026-09-22T12:00:00Z',metodologia:'Custos diretos',custosCompartilhados:[],documentosAnteriores:[],documentos:[{id:'1:A:10',clienteId:'Maior',cliente:'Maior',placa:'RAA8G18',cartas:[],receita:1000,custoDireto:600,saldoParcial:400}]})};
  render(<ClientMargin/>);
  fireEvent.click(await screen.findByRole('button',{name:'Ranking de clientes'}));
  const positive=screen.getByRole('region',{name:'Maiores saldos positivos'});
  fireEvent.click(within(positive).getAllByRole('button',{name:'Ver documentos'})[0]);
  const detail=screen.getByRole('region',{name:'Documentos da seleção'});
  expect(within(detail).getByText('RAA8G18')).toBeTruthy();
  expect(within(detail).getByText('1:A:10')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Incompleto'}});
  expect(within(screen.getByRole('region',{name:'Maiores saldos positivos'})).queryByRole('button')).toBeNull();
  expect(within(screen.getByRole('region',{name:'Apuração pendente'})).getByText('Incompleto · 1')).toBeTruthy();
});

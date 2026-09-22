// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {largestCosts} from './screens/cost-largest-model.js';
import {LargestCosts} from './screens/cost-largest.jsx';
globalThis.React=React;
afterEach(cleanup);
const row=(id,valor,placa='RAA8G18')=>({id,valor,placa,data:'2026-09-10',fornecedor:'Oficina A',tipoCusto:'Manutencao',descricao:'Reparo',origem:'financeiro.pagar'});
const rows=[row('pagar:1:1:100:1:2:3:4',100),row('pagar:1:1:100:2:2:3:4',-20),row('pagar:1:1:101:1:2:3:4',320,'RXW7J14')];
it('keeps signed costs and groups installments without double counting averages',()=>{
 const before=JSON.stringify(rows),model=largestCosts(rows,4);
 expect(model.total).toBe(400);expect(model.documents).toBe(2);
 expect(model.averageDocument).toBe(200);expect(model.averageVehicle).toBe(200);expect(model.averageMonth).toBe(100);
 expect(model.groups.map(g=>g.value)).toEqual([320,80]);expect(model.largestDocument.valor).toBe(320);
 expect(JSON.stringify(rows)).toBe(before);
 const suppliers=largestCosts(rows,4,'supplier');expect(suppliers.groups[0].plates).toEqual(['RAA8G18','RXW7J14']);
 expect(suppliers.groups[0].value).toBe(400);
});
it('does not include unassigned costs in average per identified vehicle and handles empty results',()=>{
 const model=largestCosts([...rows,row('unassigned',50,'CC 2')],1);
 expect(model.total).toBe(450);expect(model.averageVehicle).toBe(200);expect(model.vehicleCount).toBe(2);
 expect(largestCosts([],1).averageDocument).toBeNull();expect(largestCosts([],1).groups).toEqual([]);
});
it('drills down from the highest vehicle to the original ERP record and resets when grouping changes',async()=>{
 const trace=vi.fn().mockResolvedValue({documentos:[],itens:[],aviso:'Origem conferida'}),open=vi.fn();
 window.RB_API={getCustoRastreabilidade:trace};
 render(<LargestCosts rows={rows} monthCount={1} onOpenVehicle={open}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Abrir veículo'})[0]);expect(open).toHaveBeenCalledWith('RXW7J14');
 fireEvent.click(screen.getAllByRole('button',{name:'Ver lançamentos'})[0]);
 expect(screen.getByRole('heading',{name:'Rastrear: RXW7J14'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Detalhar itens'}));
 await screen.findByText('Origem conferida');expect(trace).toHaveBeenCalledWith(rows[2].id);
 fireEvent.click(screen.getByRole('button',{name:'Por fornecedor'}));
 expect(screen.getByRole('heading',{name:'Maiores documentos do período'})).toBeTruthy();
 expect(screen.getAllByRole('button',{name:'Detalhar itens'})).toHaveLength(2);
});

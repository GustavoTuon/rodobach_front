// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import PurchaseDecision from './purchases-decision.jsx';
import {purchasesApi} from './purchases-api.js';
vi.mock('./purchases-api.js',()=>({purchasesApi:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const quote={id:'q',status:'aberta',criado_em:'2026-10-20T12:00:00Z',itens:[{id:'p',nome:'Pneu',codigo:'10',empresa:'1',quantidade:2,unidade:'UN'}]};
const offer={productId:'p',available:true,price:90,requested:2,quantity:2,unit:'UN',supplier:'Fornecedor A',id:'a',inviteId:'a'};
const history=[{produto_id:'p',fornecedor:'Compra anterior',valor_unitario:100,quantidade:2,unidade:'UN',data:'2026-10-01'}];
it('shows cheapest supplier and prior purchase immediately; opens comparison and history on demand',async()=>{
 purchasesApi.mockResolvedValue(history);
 render(<PurchaseDecision quote={quote} rows={[offer,{...offer,id:'b',inviteId:'b',supplier:'Fornecedor B',price:110},{...offer,id:'c',inviteId:'c',supplier:'Parcial',price:1,quantity:1}]} onRefresh={vi.fn()}/>);
 expect(await screen.findByText(/Compra anterior/)).toBeTruthy();
 expect(screen.getByText('Fornecedor A')).toBeTruthy();
 expect(screen.getByText(/10% abaixo/)).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
 expect(screen.queryByText('Fornecedor B')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Comparar ofertas/}));
 expect(within(screen.getByRole('table')).getByText('Fornecedor B')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Escolher Parcial'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
 expect(screen.queryByRole('region',{name:'Propostas de Pneu'})).toBeNull();
 expect(screen.getByRole('heading',{name:'Compras anteriores'})).toBeTruthy();
});
it('a unique cheapest offer opens a review without saving automatically',async()=>{
 purchasesApi.mockResolvedValue([]);
 render(<PurchaseDecision quote={quote} rows={[offer]} onRefresh={vi.fn()}/>);
 await screen.findByText('Sem histórico anterior');
 fireEvent.click(screen.getByRole('button',{name:'Escolher fornecedor',exact:true}));
 expect(screen.getByLabelText('Fornecedor vencedor de Pneu').value).toBe('a');
 expect(purchasesApi.mock.calls.every(call=>call[1]===undefined)).toBe(true);
});
it('ties do not pick an arbitrary supplier and different units suppress percentage claims',async()=>{
 purchasesApi.mockResolvedValue([{...history[0],unidade:'CX'}]);
 render(<PurchaseDecision quote={quote} rows={[offer,{...offer,id:'b',inviteId:'b',supplier:'Fornecedor B'}]} onRefresh={vi.fn()}/>);
 await screen.findByText(/Compra anterior/);
 expect(screen.getByText('Menor preço · empate')).toBeTruthy();
 expect(screen.queryByText(/% abaixo/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Escolher fornecedor',exact:true}));
 expect(screen.getByLabelText('Fornecedor vencedor de Pneu').value).toBe('');
});

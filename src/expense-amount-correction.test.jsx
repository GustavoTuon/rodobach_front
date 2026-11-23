// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import ExpenseAmountCorrection from './expense-amount-correction.jsx';
import ExpenseHistory from './expense-history.jsx';
afterEach(cleanup);
const record={id:'1',version:2,plate:'ABC1234',amount:180,service:'Mecânica',date:'2026-11-19',expenseDate:'2026-11-19',paid:true,checked:true};
it('correcao exige motivo, preserva dados no erro e envia valor e versao',async()=>{
 const save=vi.fn().mockRejectedValueOnce(new Error('Registro alterado. Atualize a lista.')).mockResolvedValueOnce({}),close=vi.fn();
 render(<ExpenseAmountCorrection record={record} onSave={save} onClose={close}/>);
 expect(screen.getByRole('button',{name:'Confirmar correção'}).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Novo valor (R$)'),{target:{value:'200'}});
 fireEvent.change(screen.getByLabelText('Justificativa da correção'),{target:{value:'Valor informado errado'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirmar correção'}));
 await screen.findByRole('alert');expect(close).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Novo valor (R$)').value).toBe('200');
 fireEvent.click(screen.getByRole('button',{name:'Confirmar correção'}));
 await waitFor(()=>expect(close).toHaveBeenCalledOnce());
 expect(save).toHaveBeenLastCalledWith({version:2,amount:200,reason:'Valor informado errado'});
});
it('acao de correcao aparece em despesa paga e conferida apenas quando autorizada',()=>{
 const callback=vi.fn();const {rerender}=render(<ExpenseHistory records={[record]} renderRecord={()=>null}/>);
 expect(screen.queryByRole('button',{name:'Corrigir valor'})).toBeNull();
 rerender(<ExpenseHistory records={[record]} renderRecord={()=>null} onCorrectAmount={callback}/>);
 fireEvent.click(screen.getByRole('button',{name:'Corrigir valor'}));expect(callback).toHaveBeenCalledWith(record);
});

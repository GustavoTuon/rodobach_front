// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import ExpenseReportDialog,{filterReportRecords} from './expense-report-dialog.jsx';
import {expenseCsv} from './expense-report.js';
afterEach(cleanup);
const records=[{id:'a',plate:'ABC1234',amount:120,expenseDate:'2026-10-01',service:'Descarga',paid:true,checked:false,trip:{company:'1',number:'15'}},{id:'b',plate:'DEF5678',amount:80,expenseDate:'2026-09-10',service:'Outros',checked:true,trip:{company:'2',number:'15'}}];
const Dialog=({children})=><div role="dialog">{children}</div>;
it('aplica período e identidade da viagem e mantém conferência independente de pagamento',()=>{
  expect(filterReportRecords(records,{trip:'1:15',checked:'false'})).toEqual([records[0]]);
  expect(filterReportRecords(records,{trip:'2:15'})).toEqual([records[1]]);
  expect(filterReportRecords(records,{dateFrom:'2026-10-01',status:'pending'})).toEqual([]);
});
it('edita filtros sem baixar, seleciona colunas e só exporta ao confirmar',()=>{
  const download=vi.fn(),close=vi.fn();
  const initial={dateFrom:'2026-10-01'};
  render(<ExpenseReportDialog records={records} initialFilters={initial} Dialog={Dialog} onClose={close} onDownload={download}/>);
  expect(screen.getByText('1 despesa(s)')).toBeTruthy();expect(download).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Limpar filtros do relatório'}));
  expect(screen.getByText('2 despesa(s)')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox',{name:'Placa',exact:true}),{target:{value:'DEF'}});
  fireEvent.click(screen.getByRole('button',{name:'Desmarcar todas'}));
  expect(screen.getByRole('button',{name:'Baixar CSV'}).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox',{name:'Placa',exact:true}));
  fireEvent.click(screen.getByRole('checkbox',{name:'Valor (R$)',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'Baixar CSV'}));
  expect(download).toHaveBeenCalledWith([records[1]],['Placa','Valor (R$)']);expect(close).toHaveBeenCalledOnce();
  expect(initial).toEqual({dateFrom:'2026-10-01'});
  expect(expenseCsv([records[1]],['Placa','Valor (R$)'])).toBe('\uFEFF"Placa";"Valor (R$)"\r\n"DEF5678";"80,00"');
});
it('bloqueia período invertido e cancelar não exporta',()=>{
  const download=vi.fn(),close=vi.fn();
  render(<ExpenseReportDialog records={records} initialFilters={{dateFrom:'2026-10-20',dateTo:'2026-10-01'}} Dialog={Dialog} onClose={close} onDownload={download}/>);
  expect(screen.getByRole('alert').textContent).toContain('data inicial');
  expect(screen.getByRole('button',{name:'Baixar CSV'}).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
  expect(close).toHaveBeenCalledOnce();expect(download).not.toHaveBeenCalled();
});

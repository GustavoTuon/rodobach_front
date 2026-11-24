// @vitest-environment jsdom
import React,{useState} from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import ExpenseFilters,{matchesExpenseFlag,matchesExpenseSearch} from './expense-filters.jsx';
import {filterReportRecords} from './expense-report-dialog.jsx';
afterEach(cleanup);
const rows=[{id:1,plate:'ABC1D23',supplier:'Oficina São José',amount:180,paid:true,posted:false,checked:false,erpDocument:'NF-987',expenseDate:'2026-11-23'},{id:2,plate:'DEF4G56',amount:40,paid:false,posted:false,checked:true,expenseDate:'2026-11-22'},{id:3,plate:'ABC1D23',amount:20,paid:true,posted:true,checked:true,expenseDate:'2026-11-23'}];
const empty={text:'',dateFrom:'',dateTo:'',paid:'',posted:'',status:'all',trip:'',source:'',reimbursement:''};
function Harness(){const [v,set]=useState(empty);return <ExpenseFilters values={v} onChange={(key,value)=>set(x=>({...x,[key]:value}))} onClear={()=>set(empty)} trips={[]} manager today={()=>'2026-11-23'} records={filterReportRecords(rows,v)}/>;}
it('combina situacoes, mostra totais e remove filtros individualmente',()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Pagamento da despesa'),{target:{value:'true'}});
 fireEvent.change(screen.getByLabelText('Lançamento'),{target:{value:'pending'}});
 fireEvent.change(screen.getByLabelText('Conferência'),{target:{value:'unchecked'}});
 expect(screen.getByRole('status').textContent.replace(/\s/g,' ')).toContain('1 despesa · 1 veículo · R$ 180,00');
 expect(screen.getByLabelText('Pagamento da despesa').value).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Remover filtro Pagamento: Pago'}));
 expect(screen.getByLabelText('Pagamento da despesa').value).toBe('');expect(screen.getByLabelText('Lançamento').value).toBe('pending');
 fireEvent.click(screen.getByRole('button',{name:'Limpar tudo'}));
 expect(screen.getByLabelText('Conferência').value).toBe('all');expect(screen.queryByRole('button',{name:'Limpar tudo'})).toBeNull();
 expect(screen.getByRole('status').textContent.replace(/\s/g,' ')).toContain('3 despesas · 2 veículos · R$ 240,00');
});
it('busca placa com separador, fornecedor sem acento e documento ERP',()=>{
 for(const query of ['ABC-1D23','sao jose','nf-987'])expect(matchesExpenseSearch(rows[0],query)).toBe(true);
 expect(matchesExpenseSearch(rows[0],'xyz')).toBe(false);
 expect(matchesExpenseFlag(null,'pending')).toBe(true);expect(matchesExpenseFlag(null,'false')).toBe(false);
 expect(filterReportRecords(rows,{text:'nf-987',paid:'true',posted:'pending',status:'unchecked'}).map(r=>r.id)).toEqual([1]);
});
it('atalhos usam datas inclusivas e remover periodo preserva outras escolhas',()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Pagamento da despesa'),{target:{value:'true'}});
 fireEvent.click(screen.getByRole('button',{name:'Últimos 7 dias'}));
 expect(screen.getByLabelText('De').value).toBe('2026-11-17');expect(screen.getByLabelText('Até').value).toBe('2026-11-23');
 fireEvent.click(screen.getByRole('button',{name:/Remover filtro Período/}));expect(screen.getByLabelText('De').value).toBe('');expect(screen.getByLabelText('Pagamento da despesa').value).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Hoje'}));expect(screen.getByLabelText('De').value).toBe('2026-11-23');
 fireEvent.click(screen.getByRole('button',{name:'Mês atual'}));expect(screen.getByLabelText('De').value).toBe('2026-11-01');
 fireEvent.click(screen.getByRole('button',{name:'Todo o período'}));expect(screen.getByLabelText('Até').value).toBe('');
});

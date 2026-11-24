// @vitest-environment jsdom
import React,{useState} from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import ExpenseFilters,{matchesExpenseFlag,matchesExpenseSearch} from './expense-filters.jsx';
import {filterReportRecords} from './expense-report-dialog.jsx';
afterEach(cleanup);
it('atalhos combinam pendencias sem acumular e limpar campo preserva as demais escolhas',()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Buscar despesas'),{target:{value:'ABC'}});
 fireEvent.click(screen.getByRole('button',{name:'Hoje',exact:true}));
 fireEvent.click(screen.getByText('Mais filtros'));
 fireEvent.click(screen.getByRole('button',{name:'Pagas, falta lançar',exact:true}));
 expect(screen.getByLabelText('Pagamento da despesa').value).toBe('true');
 expect(screen.getByLabelText('Lançamento').value).toBe('pending');
 expect(screen.getByRole('status').textContent).toContain('1 despesa');
 fireEvent.click(screen.getByRole('button',{name:'Pagas, falta reembolso',exact:true}));
 expect(screen.getByLabelText('Lançamento').value).toBe('');
 expect(screen.getByLabelText('Reembolso').value).toBe('aguardando');
 fireEvent.click(screen.getByRole('button',{name:'Limpar Pagamento da despesa',exact:true}));
 expect(screen.getByLabelText('Pagamento da despesa').value).toBe('');
 expect(screen.getByLabelText('Reembolso').value).toBe('aguardando');
 expect(screen.getByLabelText('Buscar despesas').value).toBe('ABC');
 expect(screen.getByLabelText('De').value).toBe('2026-11-23');
 fireEvent.click(screen.getByRole('button',{name:'Falta conferir',exact:true}));
 expect(screen.getByLabelText('Reembolso').value).toBe('');
 expect(screen.getByLabelText('Conferência').value).toBe('unchecked');
});
it('limpa opcoes adicionais preservando busca e periodo e explica pagamento',()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Buscar despesas'),{target:{value:'ABC'}});
 fireEvent.click(screen.getByRole('button',{name:'Hoje',exact:true}));
 fireEvent.click(screen.getByText('Mais filtros'));
 fireEvent.change(screen.getByLabelText('Pagamento da despesa'),{target:{value:'pending'}});
 fireEvent.change(screen.getByLabelText('Conferência'),{target:{value:'checked'}});
 expect(screen.getByText('2 ativos')).toBeTruthy();
 const payment=screen.getByLabelText('Pagamento da despesa');
 expect(document.getElementById(payment.getAttribute('aria-describedby')).textContent).toContain('sem pagamento informado');
 fireEvent.click(screen.getByRole('button',{name:'Limpar opções adicionais'}));
 expect(payment.value).toBe('');expect(screen.getByLabelText('Conferência').value).toBe('all');
 expect(screen.getByLabelText('Buscar despesas').value).toBe('ABC');expect(screen.getByLabelText('De').value).toBe('2026-11-23');
 expect(screen.getByRole('button',{name:'Limpar opções adicionais'}).disabled).toBe(true);
});
const rows=[{id:1,plate:'ABC1D23',supplier:'Oficina São José',amount:180,paid:true,posted:false,checked:false,erpDocument:'NF-987',expenseDate:'2026-11-23'},{id:2,plate:'DEF4G56',amount:40,paid:false,posted:false,checked:true,expenseDate:'2026-11-22'},{id:3,plate:'ABC1D23',amount:20,paid:true,posted:true,checked:true,expenseDate:'2026-11-23'}];
const empty={text:'',dateFrom:'',dateTo:'',paid:'',posted:'',status:'all',trip:'',source:'',reimbursement:''};
function Harness(){const [v,set]=useState(empty);return <ExpenseFilters values={v} onChange={(key,value)=>set(x=>({...x,[key]:value}))} onClear={()=>set(empty)} trips={[]} manager today={()=>'2026-11-23'} records={filterReportRecords(rows,v)} cardRecords={filterReportRecords(rows,{...v,paid:"",posted:"",status:"all",reimbursement:""})}/>;}
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

it('cartoes trocam a pendencia sem acumular filtros e preservam busca e periodo',()=>{
 render(<Harness/>);
 fireEvent.change(screen.getByLabelText('Buscar despesas'),{target:{value:'ABC'}});
 fireEvent.click(screen.getByRole('button',{name:'Hoje',exact:true}));
 const all=screen.getByRole('button',{name:'Todas',exact:true});
 expect(all.textContent).toContain('2');
 fireEvent.click(screen.getByRole('button',{name:'Falta pagar',exact:true}));
 expect(screen.getByRole('status').textContent).toContain('0 despesas');
 fireEvent.click(screen.getByRole('button',{name:'Falta lan\u00e7ar no ERP',exact:true}));
 expect(screen.getByRole('status').textContent).toContain('1 despesa');
 expect(screen.getByLabelText('Pagamento da despesa').value).toBe('');
 expect(all.textContent).toContain('2');
 fireEvent.click(all);expect(screen.getByRole('status').textContent).toContain('2 despesas');
 expect(screen.getByLabelText('Buscar despesas').value).toBe('ABC');expect(screen.getByLabelText('De').value).toBe('2026-11-23');
});
it('pendente de cobranca inclui somente a cobrar, sem misturar cobrado e recebido',()=>{
 const data=['a_cobrar','cobrado','recebido','nao_aplicavel'].map((status,i)=>({...rows[0],id:i,amount:100,reimbursement:{status}}));
 function View(){const [v,set]=useState(empty);return <ExpenseFilters values={v} onChange={(key,value)=>set(x=>({...x,[key]:value}))} onClear={()=>set(empty)} trips={[]} manager today={()=>'2026-11-23'} records={filterReportRecords(data,v)} cardRecords={data}/>;}
 render(<View/>);const card=screen.getByRole('button',{name:/Pendente de cobran/});
 expect(card.textContent).toContain('1');fireEvent.click(card);
 expect(screen.getByRole('status').textContent).toContain('1 despesa');expect(card.getAttribute('aria-pressed')).toBe('true');
});

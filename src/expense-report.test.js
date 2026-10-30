import {expect,it} from 'vitest';
import {expenseCsv,reimbursementOf} from './expense-report.js';
it('exporta identificadores, valores, pagamento e conferência independentes e protege células',()=>{
  const csv=expenseCsv([{id:'1',expenseDate:'2026-10-29',plate:'ABC1234',amount:123.45,supplier:'=SUM(A1)',paid:true,checked:false,trip:{company:'2',number:'45'},reimbursement:{status:'recebido',customer:'Cliente; "Teste"',document:'CT-e 123',receivedDate:'2026-10-30'}}]);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"123,45"');expect(csv).toContain('"\'=SUM(A1)"');
  expect(csv).toContain('"Cliente; ""Teste"""');expect(csv).toContain('"Reembolso recebido"');
  expect(csv).toContain('"Sim";"";"";"Não"');
});
it('descargas existentes com reembolso aparecem como a cobrar',()=>{
  expect(reimbursementOf({unloading:{reimbursement:true,cte:{customerName:'Cliente'}}})).toMatchObject({status:'a_cobrar',customer:'Cliente'});
  expect(reimbursementOf({})).toMatchObject({status:'nao_aplicavel'});
});
it('preserva status financeiros desconhecidos e usa o dia local no CSV',()=>{
  const csv=expenseCsv([{id:'old',date:'2026-10-01T01:30:00Z',amount:10,paid:null,posted:undefined}],['Data da despesa','Pago','Lançado no ERP']);
  expect(csv).toContain('"2026-09-30";"Não informado";"Não informado"');
  const explicit=expenseCsv([{expenseDate:'2026-10-01',date:'2026-10-01T01:30:00Z',amount:10,paid:false,posted:true}],['Data da despesa','Pago','Lançado no ERP']);
  expect(explicit).toContain('"2026-10-01";"Não";"Sim"');
});

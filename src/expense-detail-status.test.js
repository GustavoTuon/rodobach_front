import {expect,it} from 'vitest';
import {expenseDetailStatuses} from './expense-detail-status.jsx';
it('separa pagamento, conferência, lançamento e reembolso previsto',()=>{
  const status=expenseDetailStatuses({paid:true,posted:false,checked:false,unloading:{reimbursement:true}});
  expect(status.map(item=>item.value)).toEqual(['Não lançado','A conferir','Pago','Não recebido']);
  expect(status[3].detail).toBe('A cobrar do cliente');
});
it('mostra recebimento real e autoria da conferência sem inventar datas',()=>{
  const status=expenseDetailStatuses({paid:true,checked:true,checkedBy:'Maria Eduarda',posted:true,paymentDate:'2026-10-28',reimbursement:{status:'recebido',receivedDate:'2026-10-30',document:'CT-e 123'}});
  expect(status.map(item=>item.value)).toEqual(['Lançado','Conferido','Pago','Reembolsado']);
  expect(status[1].detail).toContain('Maria Eduarda');
  expect(status[3].detail).toBe('Recebido em 30/10/2026 · CT-e 123');
  expect(expenseDetailStatuses({})[0].value).toBe('Não informado');
  expect(expenseDetailStatuses({})[3].value).toBe('Não se aplica');
});

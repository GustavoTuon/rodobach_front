import React from 'react';
import {reimbursementOf} from './expense-report.js';

const day=value=>value ? String(value).slice(0,10).split('-').reverse().join('/') : '';
export function expenseDetailStatuses(record) {
  const refund=reimbursementOf(record);
  const refunds={nao_aplicavel:['Não se aplica','Sem previsão de reembolso','neutral'],a_cobrar:['Não recebido','A cobrar do cliente','pending'],cobrado:['Não recebido','Cobrança realizada · aguardando recebimento','pending'],recebido:['Reembolsado',refund.receivedDate ? `Recebido em ${day(refund.receivedDate)}` : 'Recebimento registrado','done']};
  const [refundValue,refundDetail,refundTone]=refunds[refund.status] || ['Não informado','Verifique o reembolso','neutral'];
  return [
    {label:'Lançamento no ERP',value:record.posted===true ? 'Lançado' : record.posted===false ? 'Não lançado' : 'Não informado',detail:record.posted===true ? 'Marcado como lançado no sistema' : 'Lançamento no ERP ainda não confirmado',tone:record.posted===true ? 'done' : 'pending'},
    {label:'Conferência',value:record.checked ? 'Conferido' : 'A conferir',detail:record.checked ? [record.checkedBy ? `Por ${record.checkedBy}` : 'Conferência registrada',record.checkedAt ? new Date(record.checkedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : ''].filter(Boolean).join(' · ') : 'Aguardando revisão do comprovante e dos valores',tone:record.checked ? 'done' : 'pending'},
    {label:'Pagamento',value:record.paid===true ? 'Pago' : record.paid===false ? 'Não pago' : 'Não informado',detail:record.paid ? [record.paymentDate ? `Em ${day(record.paymentDate)}` : 'Data não informada',record.paymentMethod?.name].filter(Boolean).join(' · ') : 'Pagamento ainda não confirmado',tone:record.paid===true ? 'done' : 'pending'},
    {label:'Reembolso',value:refundValue,detail:[refundDetail,refund.document].filter(Boolean).join(' · '),tone:refundTone},
  ];
}
export default function ExpenseDetailStatus({record}) {
  return <section className="mp-detail-statuses" aria-label="Situação da despesa">{expenseDetailStatuses(record).map(item=><div key={item.label} className={`mp-detail-status ${item.tone}`}><span>{item.label}</span><strong><i aria-hidden="true">{item.tone==='done' ? '✓' : item.tone==='pending' ? '○' : '—'}</i>{item.value}</strong><small>{item.detail}</small></div>)}</section>;
}

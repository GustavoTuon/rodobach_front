import React from 'react';
import {reimbursementOf,reportExpenseDate} from './expense-report.js';
export default function ExpenseReimbursementList({records,onEdit,disabled}) {
  const labels={a_cobrar:'A cobrar',cobrado:'Aguardando recebimento',recebido:'Recebido'};
  return <section className="mp-reimbursement-list" aria-label="Lista de reembolsos">
    <p className="mp-reimbursement-value-note">Os valores abaixo são os das despesas vinculadas, não um saldo de reembolso ou recebimentos parciais.</p>
    {records.map(record=>{const value=reimbursementOf(record);return <article className="mp-reimbursement-row" key={record.id}>
      <div><span className="mp-reimbursement-customer">{value.customer || 'Cliente não informado'}</span><strong>{record.plate} · {record.service}</strong><small>{reportExpenseDate(record).split('-').reverse().join('/')} · {record.supplier || 'Fornecedor não informado'}</small><small>{value.document?`Cobrança: ${value.document}`:'Documento de cobrança não informado'}</small>{value.receivedDate&&<small>Recebido em {value.receivedDate.split('-').reverse().join('/')}</small>}</div>
      <div className="mp-reimbursement-row-value"><small>Valor da despesa</small><strong>{Number(record.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><span className={`mp-reimbursement-stage ${value.status}`}>{labels[value.status] || value.status}</span></div>
      {onEdit&&<div className="mp-reimbursement-row-actions">{value.status==='a_cobrar'&&<button type="button" disabled={disabled} onClick={()=>onEdit(record,'cobrado')}>Registrar cobrança</button>}{value.status!=='recebido'&&<button type="button" className="primary" disabled={disabled} onClick={()=>onEdit(record,'recebido')}>Registrar recebimento</button>}<button type="button" disabled={disabled} onClick={()=>onEdit(record)}>Ver / editar reembolso</button></div>}
    </article>;})}
  </section>;
}

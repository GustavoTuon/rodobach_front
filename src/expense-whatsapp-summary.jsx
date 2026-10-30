import React, {useState} from 'react';
import {cteLabel, documentItinerary} from './expense-unloading.jsx';

export function formatExpenseWhatsapp(record) {
  if (!record) return '';
  const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  const trip = record.unloading?.trip || record.trip;
  const lines = ['*Rodobach | Resumo da despesa*', '',
    `*${clean(record.service)} · ${clean(record.plate)}*`,
    `Data: ${clean(record.expenseDate).split('-').reverse().join('/')}`,
    `Valor: ${Number(record.amount || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`,
    `Fornecedor: ${clean(record.supplier)}`];
  if (trip) lines.push(`Viagem: ${clean(trip.number)} · Empresa ${clean(trip.company)}`);
  if (record.unloading?.cte) lines.push(`Documento: ${cteLabel(record.unloading.cte)}`, `Rota: ${documentItinerary(record.unloading.cte)}`);
  if (record.location) lines.push(`Local: ${clean(record.location)}`);
  if (record.note) lines.push(`Descrição: ${clean(record.note)}`);
  lines.push('', `Pagamento: ${record.paid ? 'Pago' : 'Aguardando pagamento'}`);
  if (record.paymentDetails) lines.push('', '*Dados para pagamento via PIX*', `Titular: ${clean(record.paymentDetails.holderName)}`, `Chave PIX: ${clean(record.paymentDetails.pixKey)}`);
  return lines.join('\n');
}

export default function ExpenseWhatsappSummary({record,compact=false}) {
  const [expanded,setExpanded] = useState(!compact);
  const [message,setMessage] = useState('');
  if (!record) return null;
  const summary = formatExpenseWhatsapp(record);
  async function copy() {
    try { await navigator.clipboard.writeText(summary); setMessage('Resumo copiado. Cole na conversa com o financeiro.'); }
    catch { setExpanded(true); setMessage('Não foi possível copiar automaticamente. Selecione o texto abaixo e copie.'); }
  }
  return <section className="expense-whatsapp-summary">
    <h3>Resumo para o financeiro</h3>
    <p>Copie e envie pelo WhatsApp. Confira os dados antes de compartilhar.</p>
    <button type="button" className="mp-summary-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded ? "Ocultar texto" : "Visualizar texto do resumo"}</button>
    {expanded && <textarea aria-label="Resumo para enviar no WhatsApp" readOnly value={summary} rows={7} onFocus={event=>event.target.select()}/>}
    <button type="button" className="mp-cancel-edit" onClick={copy}>Copiar resumo para WhatsApp</button>
    {message && <p role="status">{message}</p>}
  </section>;
}

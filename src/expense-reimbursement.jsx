import React,{useState} from 'react';
import {reimbursementOf,reimbursementLabels} from './expense-report.js';
import ReimbursementDocument from './expense-reimbursement-document.jsx';

export default function ExpenseReimbursement({record,onSave,disabled=false}) {
  const [value,setValue]=useState(()=>reimbursementOf(record));
  const [error,setError]=useState('');
  const update=(key,val)=>setValue(current=>({...current,[key]:val}));
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  async function save() {
    setError('');
    if(value.status!=='nao_aplicavel' && !value.customer.trim()) return setError('Informe o cliente do reembolso.');
    if(['cobrado','recebido'].includes(value.status) && !value.document.trim()) return setError('Informe o documento de cobrança.');
    if(value.status==='recebido' && (!value.receivedDate || value.receivedDate>today)) return setError('Informe a data de recebimento, sem data futura.');
    try {
      if(await onSave(value) === false) setError('Não foi possível salvar o reembolso. Confira a mensagem da operação e tente novamente.');
    } catch(error) {
      setError(error.message || 'Não foi possível salvar o reembolso. Tente novamente.');
    }
  }
  return <section className="mp-detail-section mp-reimbursement"><h4>Reembolso pelo cliente</h4>
    <p>Controle a cobrança desta despesa. Quando o cliente pagar, selecione “Reembolso recebido”, informe a data e salve.</p>
    <fieldset className="mp-reimbursement-status" disabled={disabled}><legend>Situação do reembolso</legend>
      {Object.entries(reimbursementLabels).map(([key,label])=><label key={key} className={value.status===key ? `is-selected ${key}` : ''}>
        <input type="radio" name={`reimbursement-${record.id}`} checked={value.status===key} onChange={()=>setValue(current=>({...current,status:key,receivedDate:key==='recebido' ? current.receivedDate : null}))}/><span>{label}</span>
      </label>)}
    </fieldset>
    <div className="mp-cost-filters">
      {value.status!=='nao_aplicavel' && <>
        <label>Cliente do reembolso<input disabled={disabled} maxLength={160} value={value.customer} onChange={e=>update('customer',e.target.value)}/></label>
        <ReimbursementDocument record={record} disabled={disabled} value={value.document} onChange={(document,customer)=>setValue(current=>({...current,document,...(customer ? {customer} : {})}))}/>
        {value.status==='recebido' && <label>Data do recebimento<input disabled={disabled} type="date" max={today} value={value.receivedDate || ''} onChange={e=>update('receivedDate',e.target.value || null)}/></label>}
        <label>Observações do reembolso<input disabled={disabled} maxLength={300} value={value.note} onChange={e=>update('note',e.target.value)}/></label>
      </>}
    </div>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="mp-cancel-edit" disabled={disabled} onClick={save}>Salvar reembolso</button>
  </section>;
}

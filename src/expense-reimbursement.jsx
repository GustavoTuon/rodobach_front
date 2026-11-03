import React,{useRef,useState} from 'react';
import {reimbursementOf,reimbursementLabels} from './expense-report.js';
import ReimbursementDocument from './expense-reimbursement-document.jsx';

export default function ExpenseReimbursement({record,onSave,disabled=false}) {
  const [value,setValue]=useState(()=>reimbursementOf(record));
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(()=>reimbursementOf(record));
  const [pending,setPending]=useState(false);
  const [success,setSuccess]=useState(false);
  const savingRef=useRef(false);
  const busy=disabled || pending;
  const dirty=JSON.stringify(value)!==JSON.stringify(saved);
  const descriptions={nao_aplicavel:'Esta despesa não será cobrada do cliente.',a_cobrar:'A cobrança ainda precisa ser enviada.',cobrado:'Cobrança enviada. Aguardando o cliente pagar.',recebido:'O cliente já pagou. Informe a data do recebimento.'};
  const update=(key,val)=>setValue(current=>({...current,[key]:val}));
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  async function save() {
    if(busy || savingRef.current) return;
    setError('');setSuccess(false);
    if(value.status!=='nao_aplicavel' && !value.customer.trim()) return setError('Informe o cliente do reembolso.');
    if(['cobrado','recebido'].includes(value.status) && !value.document.trim()) return setError('Informe o documento de cobrança.');
    if(value.status==='recebido' && (!value.receivedDate || value.receivedDate>today)) return setError('Informe a data de recebimento, sem data futura.');
    savingRef.current=true;setPending(true);
    try {
      if(await onSave(value) === false) setError('Não foi possível salvar o reembolso. Confira a mensagem da operação e tente novamente.');
      else {setSaved({...value});setSuccess(true);}
    } catch(error) {
      setError(error.message || 'Não foi possível salvar o reembolso. Tente novamente.');
    } finally {savingRef.current=false;setPending(false);}
  }
  return <section className="mp-detail-section mp-reimbursement"><h4>Reembolso pelo cliente</h4>
    <p className="mp-reimbursement-intro">Acompanhe o valor que o cliente deve devolver à empresa. Selecione a etapa e salve a alteração.</p>
    <fieldset className="mp-reimbursement-status" disabled={busy}><legend>Situação do reembolso</legend>
      {Object.entries(reimbursementLabels).map(([key,label])=><label key={key} className={value.status===key ? `is-selected ${key}` : ''}>
        <input type="radio" aria-label={label} name={`reimbursement-${record.id}`} checked={value.status===key} onChange={()=>setValue(current=>({...current,status:key,receivedDate:key==='recebido' ? current.receivedDate : null}))}/><span><strong>{label}</strong><small>{descriptions[key]}</small></span>
      </label>)}
    </fieldset>
    {value.status!=='nao_aplicavel' && <p className="mp-field-help">{value.status==='a_cobrar' ? 'Informe o cliente. O documento é opcional nesta etapa.' : 'Cliente e documento de cobrança são obrigatórios.'}{value.status==='recebido' && ' A data do recebimento também é obrigatória.'}</p>}
    <div className="mp-cost-filters">
      {value.status!=='nao_aplicavel' && <>
        <label>Cliente do reembolso<input disabled={busy} maxLength={160} value={value.customer} onChange={e=>update('customer',e.target.value)}/></label>
        <ReimbursementDocument record={record} disabled={busy} value={value.document} onChange={(document,customer)=>setValue(current=>({...current,document,...(customer ? {customer} : {})}))}/>
        {value.status==='recebido' && <label>Data do recebimento<input disabled={busy} type="date" max={today} value={value.receivedDate || ''} onChange={e=>update('receivedDate',e.target.value || null)}/></label>}
        <label>Observações do reembolso<input disabled={busy} maxLength={300} value={value.note} onChange={e=>update('note',e.target.value)}/></label>
      </>}
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="mp-reimbursement-footer">
      <span role="status">{pending ? 'Salvando reembolso…' : dirty ? 'Alterações ainda não salvas' : success ? 'Reembolso salvo.' : 'Nenhuma alteração pendente'}</span>
      <div className="mp-reimbursement-actions">
        {dirty && <button type="button" className="mp-cancel-edit" disabled={busy} onClick={()=>{setValue({...saved});setError('');setSuccess(false);}}>Descartar alterações</button>}
        <button type="button" className="mp-finance-action" disabled={busy} onClick={save}>{pending ? 'Salvando…' : 'Salvar reembolso'}</button>
      </div>
    </div>
  </section>;
}

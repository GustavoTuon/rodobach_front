import React,{useState} from 'react';

export default function ExpenseAmountCorrection({record,onSave,onClose}) {
  const [amount,setAmount]=useState(String(record.amount)),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  async function save(event) {
    event.preventDefault();if(busy)return;
    if(Math.round(Number(amount)*100)===Math.round(Number(record.amount)*100)){setError('Informe um valor diferente do atual.');return;}
    setBusy(true);setError('');
    try {await onSave({version:record.version,amount:Number(amount),reason:reason.trim()});onClose();}
    catch(error){setError(error.message || 'Não foi possível corrigir o valor.');}
    finally{setBusy(false);}
  }
  return <form className="mp-form mp-payment-modal mp-amount-correction" onSubmit={save}>
    <header className="mp-section-title"><h2 id="mp-edit-title" data-step-title tabIndex={-1}>Corrigir valor</h2></header>
    <p>{record.plate} · {record.service} · {record.supplier}</p>
    <p>Valor atual: <strong>{money(record.amount)}</strong></p>
    <label>Novo valor (R$)<input autoFocus type="number" min="0.01" max="999999.99" step="0.01" required disabled={busy} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <label>Justificativa da correção<textarea required minLength={5} maxLength={500} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <p>A correção ficará no histórico com seu usuário, data e valores anterior e novo. Pagamento, conferência e documentos do ERP serão preservados; o valor no ERP não será alterado.</p>
    {error&&<p role="alert">{error}</p>}
    <footer className="mp-payment-modal-actions"><button type="button" className="mp-cancel" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="mp-submit" disabled={busy || reason.trim().length<5}>{busy?'Salvando…':'Confirmar correção'}</button></footer>
  </form>;
}

import React,{useState,useRef,useEffect} from 'react';
import './expense-posting.css';

const documentKey=item=>item.legacy ? `legacy:${item.number}` : JSON.stringify([item.company,item.series,item.number,item.installment,item.supplierCode]);
const documentIdentity=item=>item.legacy ? {legacy:true,number:item.number} : {company:item.company,series:item.series,number:item.number,installment:item.installment,supplierCode:item.supplierCode};
const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function ExpensePosting({record,onSave,onClose,saving,review=false}) {
  const [documents,setDocuments]=useState(()=>record.erpDocuments?.length ? record.erpDocuments : record.erpDocument ? [{legacy:true,number:record.erpDocument}] : []);
  const [posted,setPosted]=useState(record.posted === true);
  const [query,setQuery]=useState(record.document || '');
  const [series,setSeries]=useState('');
  const [results,setResults]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const request=useRef(0);
  const totalCents=documents.reduce((sum,item)=>sum+(item.legacy ? 0 : Math.round(Number(item.amount)*100)),0);
  const hasLegacy=documents.some(item=>item.legacy);
  const differenceCents=Math.round(Number(record.amount)*100)-totalCents;
  useEffect(()=>()=>{request.current++;},[]);
  async function search() {
    const id=++request.current;
    setLoading(true);setError('');setResults(null);
    try {
      const data=await window.RB_API.searchPlantaoErpDocuments({q:query.trim(),plate:record.plate,series:series.trim()});
      if(id===request.current)setResults(data);
    } catch(error) {if(id===request.current)setError(error.message || 'Não foi possível buscar os documentos. Tente novamente.');}
    finally {if(id===request.current)setLoading(false);}
  }
  return <form className="mp-form mp-payment-modal mp-posting-modal" onSubmit={async event=>{
    event.preventDefault();setError('');
    if(await onSave(record,'posted',posted,{erpDocuments:documents.map(documentIdentity)}))onClose();
    else setError('Não foi possível salvar. Feche e atualize a lista antes de tentar novamente.');
  }}>
    <header className="mp-section-title"><h2 id="mp-edit-title" data-step-title tabIndex={-1}>{review ? "Conferir despesa e vincular documento" : "Lançamento no ERP"}</h2><button type="button" className="mp-close" aria-label="Fechar lançamento" disabled={saving} onClick={onClose}>×</button></header>
    <div className="mp-posting-body">
    <div className="mp-posting-summary"><div><strong>{record.plate}</strong><span>{record.supplier}</span></div><strong>{Number(record.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
    <label>Documentos no financeiro<input value={documents.map(item=>item.number).join(', ')} readOnly placeholder="Adicione documentos pela busca"/></label>
    <p className="mp-field-help">Adicione um ou mais documentos de contas a pagar da placa {record.plate}, por exemplo diesel e Arla. O documento fiscal da despesa permanece separado.</p>
    {documents.length > 0 && <section className="mp-posting-selected" aria-label="Documentos vinculados">
      {documents.map(item=><div className="mp-posting-selected-item" key={documentKey(item)}>
        <div><strong>Documento {item.number}</strong>
          {item.legacy ? <small>Referência antiga preservada. Selecione novamente na busca para conferir valor e identificação.</small> : <>
            <small>Empresa {item.company} · Série {item.series || '—'} · Parcela {item.installment} · Fornecedor {item.supplierCode}</small>
            <small>{item.supplier} · {money(item.amount)}</small>
            {item.plateSource === 'invoice' && <small>Placa identificada na nota de entrada</small>}
            {item.plateConflict && <small>Atenção: financeiro {item.financialPlate}; nota de entrada {item.invoicePlate}. Confira a divergência.</small>}
          </>}
        </div>
        <button type="button" disabled={saving} aria-label={`Remover documento ${item.number}, empresa ${item.company || 'antiga'}, série ${item.series || '—'}, parcela ${item.installment || '—'}`} onClick={()=>{setDocuments(current=>current.filter(other=>documentKey(other)!==documentKey(item)));setError('');}}>Remover</button>
      </div>)}
      <div className="mp-posting-total" role="status">
        <strong>{hasLegacy ? 'Subtotal dos documentos com valor' : 'Total dos documentos'}: {money(totalCents/100)}</strong>
        {hasLegacy ? <span>Há referência antiga sem valor. A soma completa ainda não pode ser conferida.</span>
          : differenceCents===0 ? <span>Total confere com a despesa.</span>
            : <span>Valores diferentes: {differenceCents>0 ? 'faltam' : 'excedem'} {money(Math.abs(differenceCents)/100)} em relação à despesa. Confira antes de salvar.</span>}
      </div>
    </section>}
    <div className="mp-posting-search">
    <label>Buscar no financeiro<input value={query} maxLength={80} disabled={saving} placeholder="Número ou fornecedor" onChange={event=>{request.current++;setLoading(false);setResults(null);setQuery(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!saving && !loading)search();}}}/></label>
    <label>Série — opcional<input value={series} maxLength={20} disabled={saving} placeholder="Todas as séries" onChange={event=>{request.current++;setLoading(false);setResults(null);setSeries(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!saving && !loading)search();}}}/></label>
    <button type="button" className="mp-finance-action" disabled={saving || loading || !record.plate} onClick={search}>{loading ? 'Buscando…' : 'Buscar documentos'}</button>
    </div>
    {results && <div className="mp-posting-results" aria-label="Documentos financeiros" aria-live="polite">
      {!results.documents.length && <p>Nenhum documento encontrado para esta placa. Tente outro número, fornecedor ou série.</p>}
      {results.documents.map((item,index)=><button type="button" className="mp-fleet-option" key={index} disabled={saving || documents.length>=20 || documents.some(other=>documentKey(other)===documentKey(item))} onClick={()=>{
        if(documents.some(other=>other.legacy && other.number===item.number)){setError('Remova a referência antiga desse número antes de adicionar o documento completo.');return;}
        setDocuments(current=>current.some(other=>documentKey(other)===documentKey(item)) ? current : [...current,item]);setPosted(true);setError('');
      }}>
        <strong>Documento {item.number} · Empresa {item.company} · Série {item.series || '—'} · Parcela {item.installment}</strong>
        <small>{item.supplier} · {item.plate || 'Sem placa'} · {Number(item.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</small>
        {item.plateSource === 'invoice' && <small>Placa identificada na nota de entrada</small>}
        {item.plateConflict && <small role="status">Atenção: placas diferentes no ERP. Financeiro: {item.financialPlate}; nota de entrada: {item.invoicePlate}. Confira antes de vincular.</small>}
        <small>Referência: {item.document || '—'} · Emissão: {item.date ? String(item.date).slice(0,10).split('-').reverse().join('/') : '—'}</small>
      </button>)}
      {results.hasMore && <p>Exibindo 30 resultados. Refine a busca para encontrar o documento.</p>}
      {documents.length>=20 && <p>Limite de 20 documentos por despesa.</p>}
    </div>}
    <label className="mp-posted-action"><input type="checkbox" checked={posted} disabled={saving} onChange={event=>setPosted(event.target.checked)}/><span>Lançamento confirmado no ERP</span></label>
    <p className="mp-field-help">{review ? "Confira o documento antes de salvar. A despesa será marcada como conferida somente ao confirmar abaixo." : "O registro mantém pagamento e conferência independentes."}</p>
    {error && <p role="alert" className="mp-feedback error">{error}</p>}
    </div>
    <div className="mp-payment-modal-actions"><button type="button" className="mp-cancel-edit" disabled={saving} onClick={onClose}>Cancelar</button><button className="mp-submit" disabled={saving}>{saving ? 'Salvando…' : review ? 'Salvar e conferir' : 'Salvar lançamento'}</button></div>
  </form>;
}

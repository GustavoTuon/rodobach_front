import React,{useState,useRef,useEffect} from 'react';
import './expense-posting.css';

export default function ExpensePosting({record,onSave,onClose,saving,review=false}) {
  const [document,setDocument]=useState(record.erpDocument || '');
  const [posted,setPosted]=useState(record.posted === true);
  const [query,setQuery]=useState(record.document || '');
  const [series,setSeries]=useState('');
  const [results,setResults]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const request=useRef(0);
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
    if(await onSave(record,'posted',posted,{erpDocument:document.trim()}))onClose();
    else setError('Não foi possível salvar. Feche e atualize a lista antes de tentar novamente.');
  }}>
    <header className="mp-section-title"><h2 id="mp-edit-title" data-step-title tabIndex={-1}>{review ? "Conferir despesa e vincular documento" : "Lançamento no ERP"}</h2><button type="button" className="mp-close" aria-label="Fechar lançamento" disabled={saving} onClick={onClose}>×</button></header>
    <div className="mp-posting-summary"><div><strong>{record.plate}</strong><span>{record.supplier}</span></div><strong>{Number(record.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
    <label>Número do documento no financeiro<input value={document} readOnly placeholder="Selecione um documento na busca"/></label>
    <p className="mp-field-help">Selecione um documento de contas a pagar da placa {record.plate}. O documento fiscal da despesa permanece separado.</p>
    <div className="mp-posting-search">
    <label>Buscar no financeiro<input value={query} maxLength={80} disabled={saving} placeholder="Número ou fornecedor" onChange={event=>{request.current++;setLoading(false);setResults(null);setQuery(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!saving && !loading)search();}}}/></label>
    <label>Série — opcional<input value={series} maxLength={20} disabled={saving} placeholder="Todas as séries" onChange={event=>{request.current++;setLoading(false);setResults(null);setSeries(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!saving && !loading)search();}}}/></label>
    <button type="button" className="mp-finance-action" disabled={saving || loading || !record.plate} onClick={search}>{loading ? 'Buscando…' : 'Buscar documentos'}</button>
    </div>
    {results && <div className="mp-posting-results" aria-label="Documentos financeiros" aria-live="polite">
      {!results.documents.length && <p>Nenhum documento encontrado para esta placa. Tente outro número, fornecedor ou série.</p>}
      {results.documents.map((item,index)=><button type="button" className="mp-fleet-option" key={index} disabled={saving} onClick={()=>{setDocument(String(item.number || item.document || ''));setPosted(true);setResults(null);}}>
        <strong>Documento {item.number} · Empresa {item.company} · Série {item.series || '—'} · Parcela {item.installment}</strong>
        <small>{item.supplier} · {item.plate || 'Sem placa'} · {Number(item.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</small>
        <small>Referência: {item.document || '—'} · Emissão: {item.date ? String(item.date).slice(0,10).split('-').reverse().join('/') : '—'}</small>
      </button>)}
      {results.hasMore && <p>Exibindo 30 resultados. Refine a busca para encontrar o documento.</p>}
    </div>}
    <label className="mp-posted-action"><input type="checkbox" checked={posted} disabled={saving} onChange={event=>setPosted(event.target.checked)}/><span>Lançamento confirmado no ERP</span></label>
    <p className="mp-field-help">{review ? "Confira o documento antes de salvar. A despesa será marcada como conferida somente ao confirmar abaixo." : "O registro mantém pagamento e conferência independentes."}</p>
    {error && <p role="alert" className="mp-feedback error">{error}</p>}
    <div className="mp-payment-modal-actions"><button type="button" className="mp-cancel-edit" disabled={saving} onClick={onClose}>Cancelar</button><button className="mp-submit" disabled={saving}>{saving ? 'Salvando…' : review ? 'Salvar e conferir' : 'Salvar lançamento'}</button></div>
  </form>;
}

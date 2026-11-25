import React, {useEffect,useId,useState} from 'react';
import {cteLabel} from './expense-unloading.jsx';

export default function ReimbursementDocument({record,value,onChange,disabled}) {
  const id=useId();
  const [open,setOpen]=useState(false), [query,setQuery]=useState('');
  const [series,setSeries]=useState('');
  const [documents,setDocuments]=useState([]), [loading,setLoading]=useState(false), [error,setError]=useState(false);
  const [active,setActive]=useState(-1), [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    if(!open) return;
    let live=true;
    setLoading(true);setError(false);setDocuments([]);
    const timer=setTimeout(()=>Promise.resolve().then(()=>window.RB_API.listPlantaoReimbursementDocuments(record.id,query,series.trim())).then(data=>{
      if(live) setDocuments(data.ctes || []);
    }).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setLoading(false);}),300);
    return()=>{live=false;clearTimeout(timer);};
  },[open,record.id,query,series,attempt]);
  const options=documents;
  function choose(doc){onChange(cteLabel(doc),doc.customerName,{company:doc.company,series:doc.series,code:doc.code});setOpen(false);setActive(-1);}
  return <div className="mp-fleet-select mp-reimbursement-document" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <label htmlFor={`${id}-series`}>Série do CT-e — opcional</label>
    <input id={`${id}-series`} disabled={disabled} value={series} maxLength={20} placeholder="Todas as séries" autoComplete="off"
      onChange={event=>{setSeries(event.target.value);setDocuments([]);setActive(-1);setOpen(true);}}/>
    <label htmlFor={id}>CT-e / documento de cobrança</label>
    <input id={id} role="combobox" disabled={disabled} value={value} maxLength={100} autoComplete="off"
      aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
      placeholder="Digite o número do CT-e complementar" onFocus={()=>{setOpen(true);setActive(-1);}}
      onClick={()=>setOpen(true)} onChange={event=>{onChange(event.target.value);setQuery(event.target.value.replace(/\D/g,''));setOpen(true);setActive(-1);}}
      onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();setOpen(false);}
        if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);setActive(index=>options.length ? (index+(event.key==='ArrowDown' ? 1 : -1)+options.length)%options.length : -1);}
        if(event.key==='Enter' && open){event.preventDefault();if(options[active])choose(options[active]);}
      }}/>
    <p className="mp-field-help">Busque pelo número e, se necessário, pela série. Confira também a empresa antes de selecionar. {record.plate ? "Mesma placa" : "Busca sem restrição de placa"}, de 30 dias antes da despesa até hoje; até 50 resultados.</p>
    {open && <div className="mp-fleet-dropdown">
      <div className="mp-fleet-caption">CT-e complementar · {record.plate || "Sem veículo"}</div>
      {loading && <p role="status" className="mp-fleet-empty">Consultando o ERP…</p>}
      {error && <p role="alert" className="mp-fleet-empty">Não foi possível consultar. <button type="button" onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></p>}
      <div role="listbox" id={`${id}-list`} aria-label="Documentos para reembolso">
        {!loading && !error && options.map((doc,index)=><div role="option" id={`${id}-${index}`} key={JSON.stringify([doc.company,doc.series,doc.code])}
          aria-selected={value===cteLabel(doc)} className={`mp-fleet-option ${active===index ? 'is-active' : ''}`}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(doc)}>
          <strong>{cteLabel(doc)}</strong><small>{doc.customerName}</small><small>{doc.date?.split('-').reverse().join('/')}</small>
        </div>)}
      </div>
      {!loading && !error && !options.length && <p className="mp-fleet-empty">Nenhum CT-e complementar encontrado para esta placa e período.</p>}
    </div>}
  </div>;
}

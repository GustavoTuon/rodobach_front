import React, {useEffect,useId,useState} from 'react';
import {cteLabel,documentItinerary} from './expense-unloading.jsx';

export default function ReimbursementDocument({record,value,onChange,disabled}) {
  const id=useId();
  const [open,setOpen]=useState(false), [query,setQuery]=useState('');
  const [documents,setDocuments]=useState([]), [loading,setLoading]=useState(false), [error,setError]=useState(false);
  const [active,setActive]=useState(-1), [attempt,setAttempt]=useState(0);
  const trip=record.unloading?.trip || record.trip;
  const company=trip?.company, number=trip?.number;
  useEffect(()=>{
    if(!open || !company || !number) return;
    let live=true;
    setLoading(true);setError(false);setDocuments([]);
    Promise.resolve().then(()=>window.RB_API.listPlantaoUnloadingTrips(record.plate,{company,number})).then(data=>{
      if(live) setDocuments(data.ctes || []);
    }).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[open,company,number,record.plate,attempt]);
  const normalize=text=>String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const options=documents.filter(doc=>normalize(`${cteLabel(doc)} ${doc.customerName} ${documentItinerary(doc)}`).includes(normalize(query)));
  function choose(doc){onChange(cteLabel(doc),doc.customerName);setOpen(false);setActive(-1);}
  return <div className="mp-fleet-select mp-reimbursement-document" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <label htmlFor={id}>CT-e / documento de cobrança</label>
    <input id={id} role="combobox" disabled={disabled} value={value} maxLength={100} autoComplete="off"
      aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
      placeholder="Buscar documento da viagem…" onFocus={()=>{setQuery('');setOpen(true);setActive(-1);}}
      onClick={()=>setOpen(true)} onChange={event=>{onChange(event.target.value);setQuery(event.target.value);setOpen(true);setActive(-1);}}
      onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();setOpen(false);}
        if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);setActive(index=>options.length ? (index+(event.key==='ArrowDown' ? 1 : -1)+options.length)%options.length : -1);}
        if(event.key==='Enter' && open){event.preventDefault();if(options[active])choose(options[active]);}
      }}/>
    {open && <div className="mp-fleet-dropdown">
      <div className="mp-fleet-caption">DOCUMENTOS DA VIAGEM {number}</div>
      {loading && <p role="status" className="mp-fleet-empty">Consultando o ERP…</p>}
      {error && <p role="alert" className="mp-fleet-empty">Não foi possível consultar. <button type="button" onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></p>}
      <div role="listbox" id={`${id}-list`} aria-label="Documentos para reembolso">
        {!loading && !error && options.map((doc,index)=><div role="option" id={`${id}-${index}`} key={JSON.stringify([doc.company,doc.series,doc.code])}
          aria-selected={value===cteLabel(doc)} className={`mp-fleet-option ${active===index ? 'is-active' : ''}`}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(doc)}>
          <strong>{cteLabel(doc)}</strong><small>{doc.customerName}</small><small>{documentItinerary(doc)}</small>
        </div>)}
      </div>
      {!loading && !error && !options.length && <p className="mp-fleet-empty">{trip ? 'Nenhum documento encontrado. Você pode digitar outro documento de cobrança.' : 'Sem viagem vinculada. Digite o documento de cobrança.'}</p>}
    </div>}
  </div>;
}

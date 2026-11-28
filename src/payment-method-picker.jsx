import React, {useEffect,useId,useRef,useState} from 'react';

const keyOf = method => `${method.company}:${method.code}`;
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function MethodIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>;
}

export default function PaymentMethodPicker({methods,value,onChange,disabled,loading}) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState(''), [active,setActive]=useState(0);
  const id=useId(), trigger=useRef(null), search=useRef(null), list=useRef(null), root=useRef(null), pointerInside=useRef(false);
  const selected=methods.find(method=>keyOf(method)===value);
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered=methods.filter(method=>{
    const text=normalize(`${method.name} ${method.company}`),compact=text.replace(/\s/g,'');
    return terms.every(term=>text.includes(term)||compact.includes(term));
  });
  const multipleCompanies=new Set(methods.map(method=>method.company)).size>1;
  useEffect(()=>{if(open)search.current?.focus();},[open]);
  useEffect(()=>{
    const container=list.current?.closest('.mp-payment-entry-body')||list.current;
    const option=list.current?.querySelector('[aria-selected="true"]');
    if(!container||!option)return;
    const box=container.getBoundingClientRect(),item=option.getBoundingClientRect();
    const header=root.current?.querySelector('.mp-method-search-area');
    const top=box.top+(container===list.current?0:header?.getBoundingClientRect().height||0);
    if(item.top<top)container.scrollTop-=top-item.top;
    else if(item.bottom>box.bottom)container.scrollTop+=item.bottom-box.bottom;
  },[active,query,open]);
  useEffect(()=>{
    if(!open)return;
    pointerInside.current=false;
    const outside=event=>{
      // A native scrollbar targets its scrolling element; it is not an outside click.
      if(event.target===root.current?.closest('.mp-payment-entry-body')){pointerInside.current=true;return;}
      if(!root.current?.contains(event.target))setOpen(false);
    };
    const release=()=>{pointerInside.current=false;};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('pointerup',release);
    document.addEventListener('pointercancel',release);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('pointerup',release);document.removeEventListener('pointercancel',release);};
  },[open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  function choose(method) {onChange(keyOf(method));setOpen(false);trigger.current?.focus();}
  return <div ref={root} className="mp-method-picker" onPointerDownCapture={()=>{pointerInside.current=true;}} onBlur={event=>{if(!pointerInside.current&&event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <span className="mp-method-label" id={`${id}-label`}>Forma de pagamento</span>
    <button ref={trigger} type="button" className={`mp-method-trigger ${selected ? 'has-value' : ''}`} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`} disabled={disabled}
      onClick={()=>{setQuery('');setActive(0);setOpen(!open);}}>
      <span className="mp-method-icon"><MethodIcon/></span>
      <span className="mp-method-trigger-copy"><strong id={`${id}-value`}>{loading ? 'Carregando formas de pagamento…' : selected?.name || 'Selecione a forma de pagamento'}</strong><small>{selected ? 'Forma selecionada' : 'Busque pelo banco ou tipo de pagamento'}</small></span>
      <span className={`mp-method-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
    </button>
    {open && <div id={`${id}-panel`} className="mp-method-panel">
      <div className="mp-method-search-area">
      <div className="mp-method-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        <input ref={search} role="combobox" aria-label="Buscar forma de pagamento" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
          placeholder="Buscar banco, boleto, depósito…" value={query} onChange={event=>{setQuery(event.target.value);setActive(0);}}
          onKeyDown={event=>{
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}
            if(event.key==='ArrowDown'){event.preventDefault();setActive(index=>Math.min(index+1,filtered.length-1));}
            if(event.key==='ArrowUp'){event.preventDefault();setActive(index=>Math.max(0,index-1));}
            if(event.key==='Enter'){event.preventDefault();if(filtered[active])choose(filtered[active]);}
          }}/>
      </div>
      <div className="mp-method-count" role="status">{filtered.length} {filtered.length===1 ? 'opção disponível' : 'opções disponíveis'}</div>
      </div>
      <div ref={list} id={`${id}-list`} role="listbox" aria-label="Formas de pagamento" className="mp-method-list">
        {filtered.map((method,index)=><button type="button" tabIndex={-1} role="option" id={`${id}-option-${index}`} key={keyOf(method)} aria-selected={active===index}
          className={`mp-method-option ${keyOf(method)===value ? 'is-selected' : ''}`} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(method)}>
          <span className="mp-method-option-icon"><MethodIcon/></span><span><strong>{method.name}</strong>{multipleCompanies && <small>Empresa {method.company}</small>}</span>
          {keyOf(method)===value && <span className="mp-method-check" aria-label="Selecionada">✓</span>}
        </button>)}
      </div>
      {!filtered.length && <p className="mp-method-empty">Nenhuma forma encontrada. Tente outro banco ou tipo de pagamento.</p>}
    </div>}
  </div>;
}

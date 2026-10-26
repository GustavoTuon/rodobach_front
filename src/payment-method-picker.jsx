import React, {useEffect,useId,useRef,useState} from 'react';

const keyOf = method => `${method.company}:${method.code}`;
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function MethodIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>;
}

export default function PaymentMethodPicker({methods,value,onChange,disabled,loading}) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState(''), [active,setActive]=useState(0);
  const id=useId(), trigger=useRef(null), search=useRef(null), list=useRef(null);
  const selected=methods.find(method=>keyOf(method)===value);
  const filtered=methods.filter(method=>normalize(`${method.name} ${method.company}`).includes(normalize(query)));
  const multipleCompanies=new Set(methods.map(method=>method.company)).size>1;
  useEffect(()=>{if(open)search.current?.focus();},[open]);
  useEffect(()=>{list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest'});},[active,query]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  function choose(method) {onChange(keyOf(method));setOpen(false);trigger.current?.focus();}
  return <div className="mp-method-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <span className="mp-method-label" id={`${id}-label`}>Forma de pagamento</span>
    <button ref={trigger} type="button" className={`mp-method-trigger ${selected ? 'has-value' : ''}`} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`} disabled={disabled}
      onClick={()=>{setQuery('');setActive(0);setOpen(!open);}}>
      <span className="mp-method-icon"><MethodIcon/></span>
      <span className="mp-method-trigger-copy"><strong id={`${id}-value`}>{loading ? 'Carregando formas de pagamento…' : selected?.name || 'Selecione a forma de pagamento'}</strong><small>{selected ? 'Forma selecionada' : 'Busque pelo banco ou tipo de pagamento'}</small></span>
      <span className={`mp-method-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
    </button>
    {open && <div id={`${id}-panel`} className="mp-method-panel">
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

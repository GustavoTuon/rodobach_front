import React, {useEffect, useId, useState} from 'react';

// Use the same menu and option styling as the trip form.
export default function MultaAutocomplete({label, value, onChange, options, placeholder, uppercase=false}) {
  const id=useId();
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(-1);
  const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const matches=options.filter(option=>normalize(option).includes(normalize(value))).slice(0,30);
  useEffect(()=>{if(open&&active>=0)document.getElementById(`${id}-${active}`)?.scrollIntoView?.({block:"nearest"});},[active,open,id]);
  const select=option=>{onChange(option);setOpen(false);setActive(-1);};
  return <div className="trip-autocomplete-field multa-autocomplete" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setActive(-1);}}}>
    <input aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open&&matches[active]?`${id}-${active}`:undefined}
      value={value} placeholder={placeholder} autoComplete="off"
      onFocus={()=>setOpen(true)} onChange={event=>{onChange(uppercase?event.target.value.toUpperCase():event.target.value);setOpen(true);setActive(-1);}}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActive(index=>Math.min(index+1,matches.length-1));}
        else if(event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(index=>Math.max(index-1,0));}
        else if(event.key==='Enter'&&open&&matches[active]){event.preventDefault();select(matches[active]);}
        else if(event.key==='Escape'){event.preventDefault();setOpen(false);setActive(-1);}
      }}/>
    {open&&<div id={`${id}-options`} className="trip-autocomplete-list" role="listbox">
      {matches.map((option,index)=><button key={option} id={`${id}-${index}`} type="button" role="option" aria-selected={active===index} tabIndex={-1}
        onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>select(option)}><span>{option}</span></button>)}
      {!matches.length&&<div className="trip-autocomplete-empty">Nenhum resultado encontrado.</div>}
    </div>}
  </div>;
}

import React,{useRef,useState} from 'react';

export default function ExpenseTripFilter({value,onChange,options}) {
  const ref=useRef(null);
  const [search,setSearch]=useState('');
  const items=[['','Todas as viagens'],['unlinked','Sem viagem vinculada'],...options.map(([key,trip])=>[key,`Viagem ${trip.number} · Empresa ${trip.company}`])];
  const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const choose=key=>{onChange(key);setSearch('');ref.current.open=false;ref.current.querySelector('summary').focus();};
  return <div className="mp-trip-filter"><span>Viagem</span><details ref={ref} onKeyDown={e=>{if(e.key==='Escape'){ref.current.open=false;ref.current.querySelector('summary').focus();}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))ref.current.open=false;}}>
    <summary aria-label="Filtrar por viagem">{items.find(([key])=>key===value)?.[1] || 'Todas as viagens'}<span aria-hidden="true">⌄</span></summary>
    <div className="mp-trip-filter-panel"><label>Buscar viagem ou empresa<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número da viagem ou empresa" /></label>
      <div className="mp-trip-filter-options" role="group" aria-label="Opções de viagem">{items.filter(([,label])=>normalize(label).includes(normalize(search))).map(([key,label])=><button type="button" key={key} aria-pressed={key===value} onClick={()=>choose(key)}>{label}<span aria-hidden="true">{key===value?'✓':''}</span></button>)}</div>
      {!items.some(([,label])=>normalize(label).includes(normalize(search))) && <p role="status">Nenhuma viagem encontrada.</p>}
    </div>
  </details></div>;
}

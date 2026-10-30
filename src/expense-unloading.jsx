import React, {useEffect,useRef,useState} from 'react';

const tripKey = trip => trip ? `${trip.company}:${trip.number}` : '';
const cteKey = cte => cte ? JSON.stringify([cte.company,cte.series,cte.code]) : '';
export const transportDocumentType = doc => doc?.type || (['O','OC'].includes(String(doc?.series || '').trim().toUpperCase()) ? 'Orçamento' : 'CT-e');
export const transportDocumentTitle = doc => doc ? `${transportDocumentType(doc)} ${transportDocumentType(doc)==='Orçamento' ? doc.code || doc.number : doc.number || doc.code}` : '';
export const cteLabel = doc => doc ? `${transportDocumentTitle(doc)} · Série ${doc.series} · Empresa ${doc.company}` : '';
export const documentItinerary = doc => {
  const place=(city,state)=>[city,state].filter(Boolean).join(' - ');
  const origin=place(doc?.originCity,doc?.originState), destination=place(doc?.destinationCity,doc?.destinationState);
  return origin || destination ? `${origin || 'Origem não informada'} → ${destination || 'Destino não informado'}` : 'Itinerário não informado';
};

export default function ExpenseUnloading({plate,value,onChange,tripOnly=false,required=false}) {
  const [search,setSearch]=useState('');
  const [tripOpen,setTripOpen]=useState(false);
  const [cteOpen,setCteOpen]=useState(false);
  const [cteSearch,setCteSearch]=useState('');
  const [trips,setTrips]=useState([]);
  const [ctes,setCtes]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const request=useRef(0);
  const selectedTrip=tripKey(value?.trip);
  useEffect(()=>{
    const id=++request.current;
    setLoading(true);setError('');setTrips([]);setCtes([]);
    const params=selectedTrip ? {company:value.trip.company,number:value.trip.number,...(tripOnly ? {tripOnly:true} : {})} : {number:search};
    Promise.resolve().then(()=>window.RB_API.listPlantaoUnloadingTrips(plate,params)).then(data=>{
      if(id!==request.current)return;
      if(selectedTrip) setCtes(data.ctes || []);
      else setTrips(data.trips);
    }).catch(()=>{if(id===request.current)setError('Não foi possível consultar o ERP. Tente novamente.');})
      .finally(()=>{if(id===request.current)setLoading(false);});
    return()=>{request.current++;};
    // Stable primitive keys keep the request independent from reimbursement changes.
  },[plate,selectedTrip,search,attempt,tripOnly]);
  const selectedDocument=ctes.find(doc=>cteKey(doc)===cteKey(value?.cte)) || value?.cte;
  const selectTrip=trip=>{onChange({...value,trip,cte:null});setTripOpen(false);setCteOpen(!tripOnly);setCteSearch('');};
  const normalize=text=>String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filteredCtes=ctes.filter(cte=>normalize(`${cteLabel(cte)} ${cte.customerName} ${documentItinerary(cte)}`).includes(normalize(cteSearch)));
  const dateLabel=trip=>trip.departure?.slice(0,10).split('-').reverse().join('/') || 'Data não informada';
  const changeTrip=()=>{onChange({...value,trip:null,cte:null});setTripOpen(true);setCteOpen(false);};
  return <section aria-label={tripOnly ? "Viagem da despesa" : "Vínculo da descarga"} className="driver-unloading">
    <div className="unload-heading"><span className="unload-heading-icon" aria-hidden="true">↗</span><div><h3>{tripOnly ? `Viagem da despesa — ${required ? 'obrigatória' : 'opcional'}` : "Vincule esta descarga"}</h3><p>{tripOnly ? required ? "Selecione a viagem desta placa para registrar o abastecimento." : "Selecione uma viagem desta placa, se a despesa estiver relacionada a ela." : "Identifique a viagem e o cliente para a conferência."}</p></div></div>
    <div className="unload-links">
      <div className={`unload-link-card ${value?.trip ? 'is-linked' : ''}`}>
        <div className="unload-card-top"><span className="unload-step">1</span><span>VIAGEM DO ERP</span>{value?.trip && <span className="unload-linked">✓ Vinculada</span>}</div>
        {value?.trip ? <div className="unload-selected"><div><strong>Viagem {value.trip.number}</strong><small>Empresa {value.trip.company} · {dateLabel(value.trip)}</small></div><button type="button" onClick={changeTrip}>Trocar viagem</button></div> : <>
          <button type="button" className="unload-choose" aria-expanded={tripOpen} onClick={()=>setTripOpen(!tripOpen)}><span><strong>Selecionar viagem</strong><small>Busque uma viagem da placa {plate}</small></span><span aria-hidden="true">{tripOpen ? '⌃' : '⌄'}</span></button>
          {tripOpen && <div className="unload-options-panel">
            <label className="unload-search"><span>Buscar viagem pelo número</span><input autoFocus inputMode="numeric" maxLength={9} value={search} onChange={event=>setSearch(event.target.value.replace(/\D/g,''))} placeholder="Digite o número da viagem…" /></label>
            {!loading && !error && <><p className="unload-result-count">{trips.length} {trips.length===1 ? 'viagem encontrada' : 'viagens encontradas'}</p><div className="unload-options" role="group" aria-label="Viagens disponíveis">{trips.map(trip=><button type="button" key={tripKey(trip)} onClick={()=>selectTrip(trip)}><span className="unload-option-symbol" aria-hidden="true">↗</span><span><strong>Viagem {trip.number}</strong><small>{dateLabel(trip)} · Empresa {trip.company}</small></span><span className="unload-option-arrow" aria-hidden="true">↗</span></button>)}</div></>}
            {!loading && !error && !trips.length && <p className="unload-empty">Nenhuma viagem encontrada para esta placa.</p>}
            <p className="unload-hint">Últimas 50 viagens. Busque pelo número para localizar uma anterior.</p>
          </div>}
        </>}
      </div>
      {!tripOnly && <div className={`unload-link-card ${value?.cte ? 'is-linked' : ''} ${!value?.trip ? 'is-waiting' : ''}`}>
        <div className="unload-card-top"><span className="unload-step">2</span><span>DOCUMENTO E CLIENTE</span>{value?.cte && <span className="unload-linked">✓ Vinculado</span>}</div>
        {value?.cte ? <div className="unload-selected"><div><strong>{cteLabel(selectedDocument)}</strong><small className="unload-itinerary">{documentItinerary(selectedDocument)}</small><small className="unload-customer">{selectedDocument.customerName}</small></div><button type="button" aria-expanded={cteOpen} onClick={()=>setCteOpen(!cteOpen)}>Trocar documento</button></div> : <button type="button" className="unload-choose" disabled={!value?.trip} aria-expanded={cteOpen} onClick={()=>setCteOpen(!cteOpen)}><span><strong>Selecionar CT-e ou orçamento</strong><small>{value?.trip ? 'Escolha o documento e confira o cliente' : 'Primeiro, vincule a viagem acima'}</small></span><span aria-hidden="true">⌄</span></button>}
        {value?.trip && cteOpen && <div className="unload-options-panel">
          <label className="unload-search"><span>Buscar documento, cliente ou itinerário</span><input autoFocus value={cteSearch} onChange={event=>setCteSearch(event.target.value)} placeholder="CT-e, orçamento, cliente ou cidade…" /></label>
          {!loading && !error && <div className="unload-options" role="group" aria-label="Documentos disponíveis">{filteredCtes.map(cte=><button type="button" key={cteKey(cte)} aria-pressed={cteKey(value.cte)===cteKey(cte)} onClick={()=>{onChange({...value,cte});setCteOpen(false);}}><span className="unload-option-symbol" aria-hidden="true">▤</span><span className="unload-document-copy"><span className="unload-document-row"><strong className={`unload-document-tag ${transportDocumentType(cte)==='Orçamento' ? 'is-budget' : ''}`}>{transportDocumentTitle(cte)}</strong><span className="unload-itinerary">{documentItinerary(cte)}</span></span><small>{cte.customerName}</small><small>Série {cte.series} · Empresa {cte.company}</small></span><span className="unload-option-arrow" aria-hidden="true">{cteKey(value.cte)===cteKey(cte) ? '✓' : '→'}</span></button>)}</div>}
          {!loading && !error && !filteredCtes.length && <p className="unload-empty">{ctes.length ? 'Nenhum documento corresponde à busca.' : 'Nenhum CT-e ou orçamento ativo vinculado. Confira a viagem no ERP.'}</p>}
        </div>}
      </div>}
    </div>
    {tripOnly && !required && value?.trip && <button className="unload-remove-link" type="button" onClick={()=>onChange(null)}><span aria-hidden="true">×</span> Remover vínculo da viagem</button>}
    {loading && <p className="unload-hint" role="status">Consultando o ERP…</p>}
    {error && <p className="unload-empty" role="alert">{error} <button type="button" onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></p>}
    {!tripOnly && <fieldset className="unload-reimbursement"><legend>Haverá reembolso da descarga?</legend><p>Informe como este custo será tratado.</p>
      <div className="unload-reimbursement-options">{[{value:true,title:'Sim, haverá reembolso',detail:'Custo a ser reembolsado',symbol:'↩'},{value:false,title:'Não haverá reembolso',detail:'Custo sem reembolso',symbol:'−'}].map(option=><button key={String(option.value)} type="button" aria-pressed={value?.reimbursement===option.value} onClick={()=>onChange({...value,reimbursement:option.value})}><span className="unload-reimbursement-icon" aria-hidden="true">{option.symbol}</span><span><strong>{option.title}</strong><small>{option.detail}</small></span><span className="unload-radio" aria-hidden="true">{value?.reimbursement===option.value ? '✓' : ''}</span></button>)}</div>
    </fieldset>}
  </section>;
}

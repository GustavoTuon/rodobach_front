import {vehicleOptions} from './expense-vehicle.js';
import React,{useId} from 'react';
import ExpenseTripFilter from './expense-trip-filter.jsx';
import {matchesReimbursement} from './expense-report.js';
import './expense-filters.css';

export const normalizeExpenseSearch=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function matchesExpenseSearch(row,query) {
  const term=normalizeExpenseSearch(query);
  const trip=row.unloading?.trip || row.trip;
  const text=normalizeExpenseSearch([row.plate,row.supplier,row.document,row.erpDocument,...(row.erpDocuments || []).map(d=>d.number),row.reimbursement?.customer,row.reimbursement?.document,row.author,row.note,row.tireFireNumber,trip?.number,row.service,row.unloading?.cte?.number || row.unloading?.cte?.code,row.unloading?.cte?.customerName].join(' '));
  return !term || text.includes(term) || (/^[a-z0-9 -]+$/.test(term) && /[a-z0-9]/.test(term) && normalizeExpenseSearch(row.plate).replace(/[^a-z0-9]/g,'').includes(term.replace(/[^a-z0-9]/g,'')));
}
export const matchesExpenseFlag=(value,filter)=>!filter || (filter==='pending' ? value!==true : String(value ?? 'unknown')===filter);
export const paymentOptions=[['','Todos'],['true','Pago'],['pending','Aguardando pagamento'],['false','Não pago'],['unknown','Não informado']];
export const postingOptions=[['','Todos'],['true','Lançado no ERP'],['pending','Aguardando lançamento'],['false','Não lançado'],['unknown','Não informado']];
const reviewOptions=[['all','Todas'],['unchecked','Aguardando conferência'],['checked','Conferidas']];
const reimbursementOptions=[['','Todos'],['com_reembolso','Todos com reembolso'],['sem_vinculo','Falta vincular CT-e'],['verificar_vinculo','Verificar vínculo'],['a_cobrar','A cobrar'],['cobrado','Aguardando recebimento'],['aguardando','Aguardando reembolso'],['recebido','Reembolsado']];
const sourceOptions=[['','Todos'],['colaborador','Colaborador'],['motorista','Motorista'],['unknown','Perfil não registrado']];
const labelOf=(options,value)=>options.find(([key])=>key===value)?.[1] || value;
export default function ExpenseFilters({values:v,onChange:set,onClear,trips,manager,today,records,cardRecords=records,loading}) {
  const helpId=useId();
  const advancedCount=[v.paid,v.posted,v.status==='all'?'':v.status,v.reimbursement,v.source].filter(Boolean).length;
  const clearAdvanced=()=>{set('paid','');set('posted','');set('status','all');set('reimbursement','');set('source','');};
  const presets=[{label:'Pagas, falta lançar',paid:'true',posted:'pending',reimbursement:'',status:'all'},{label:'Pagas, falta reembolso',paid:'true',posted:'',reimbursement:'aguardando',status:'all'},{label:'Falta conferir',paid:'',posted:'',reimbursement:'',status:'unchecked'}];
  const usePreset=preset=>{for(const key of ['paid','posted','reimbursement','status'])set(key,preset[key]);};
  const expenseCards=[{key:'all',label:'Todas',match:()=>true},{key:'paid',label:'Falta pagar',match:row=>row.paid!==true},{key:'posted',label:'Falta lançar no ERP',match:row=>row.posted!==true}];
  const cards=expenseCards;
  const active=v.status==='all' ? (!v.paid&&!v.posted&&!v.reimbursement?'all':v.paid==='pending'&&!v.posted&&!v.reimbursement?'paid':v.posted==='pending'&&!v.paid&&!v.reimbursement?'posted':v.reimbursement==='aguardando'&&!v.paid&&!v.posted?'reimbursement':'') : '';
  const choose=key=>{set('paid',key==='paid'?'pending':'');set('posted',key==='posted'?'pending':'');set('reimbursement',key==='reimbursement'?'aguardando':['com_reembolso','sem_vinculo','verificar_vinculo'].includes(key)?key:'');set('status','all');};
  const select=(label,key,options,help)=>{const selected=key==='status'?v[key]!=='all':Boolean(v[key]);return <div className={`mp-advanced-field ${selected?'is-filtered':''}`}><div className="mp-field-heading"><label htmlFor={`${helpId}-input-${key}`}><span className="mp-field-symbol" aria-hidden="true">{{paid:'R$',posted:'ERP',reimbursement:'↩',status:'✓',source:'ID'}[key]}</span>{label}</label>{selected&&<button type="button" className="mp-field-reset" aria-label={`Limpar ${label}`} onClick={()=>set(key,key==='status'?'all':'')}>Limpar</button>}</div><select id={`${helpId}-input-${key}`} aria-label={label} aria-describedby={help?`${helpId}-${key}`:undefined} value={v[key]} onChange={e=>set(key,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>{help&&<small id={`${helpId}-${key}`}>{help}</small>}</div>;};
  const range=days=>{const end=today();const date=new Date(`${end}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-(days-1));set('dateFrom',date.toISOString().slice(0,10));set('dateTo',end);};
  const chips=[];
  const add=(key,text,empty='')=>chips.push({key,text,remove:()=>set(key,empty)});
  if(v.vehicle)add('vehicle',`Veículo: ${labelOf(vehicleOptions,v.vehicle)}`);
  if(v.text)add('text',`Busca: ${v.text}`);
  if(v.dateFrom||v.dateTo)chips.push({key:'period',text:`Período: ${v.dateFrom?v.dateFrom.split('-').reverse().join('/'):'início'} até ${v.dateTo?v.dateTo.split('-').reverse().join('/'):'sem data final'}`,remove:()=>{set('dateFrom','');set('dateTo','');}});
  if(v.paid)add('paid',`Pagamento: ${labelOf(paymentOptions,v.paid)}`);
  if(v.posted)add('posted',`ERP: ${labelOf(postingOptions,v.posted)}`);
  if(v.status!=='all')add('status',`Conferência: ${labelOf(reviewOptions,v.status)}`,'all');
  if(v.reimbursement)add('reimbursement',labelOf(reimbursementOptions,v.reimbursement));
  if(v.source)add('source',`Perfil: ${labelOf(sourceOptions,v.source)}`);
  if(v.trip){const trip=trips.find(([key])=>key===v.trip)?.[1];add('trip',v.trip==='unlinked'?'Sem viagem vinculada':`Viagem ${trip?.number || v.trip} · Empresa ${trip?.company || '—'}`);}
  const total=records.reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)/100;
  return <section className="mp-expense-filters" aria-label="Filtros das despesas">
    <div className="mp-pending-cards" aria-label="Filtrar por pendência">{cards.map(card=>{const items=cardRecords.filter(card.match),amount=items.reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)/100;return <button type="button" key={card.key} className={`mp-pending-card ${card.key}`} aria-pressed={active===card.key} aria-label={card.label} disabled={loading} onClick={()=>choose(card.key)}><span className="mp-pending-card-title">{card.label}<span aria-hidden="true">{active===card.key?'✓':'→'}</span></span><strong>{loading?'—':items.length}<small> {items.length===1?'despesa':'despesas'}</small></strong><span>{loading?'Carregando…':amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></button>;})}</div>
    <p className="mp-card-help">Selecione o que precisa resolver. Os indicadores respeitam a busca, o período, o veículo, a viagem e o perfil. Ao clicar, os filtros de pagamento, lançamento e conferência são limpos.</p>
    <section className="mp-reimbursement-indicators" aria-label="Indicadores de reembolso">
      <div><h3>Reembolsos</h3><p>Total inclui recebidos. Falta vincular inclui reembolsos sem CT-e selecionado no ERP.</p></div>
      <div className="mp-reimbursement-counts">{[['com_reembolso','Total com reembolso'],['sem_vinculo','Falta vincular CT-e']].map(([key,label])=><button type="button" key={key} disabled={loading} aria-pressed={v.reimbursement===key&&!v.paid&&!v.posted&&v.status==='all'} onClick={()=>choose(v.reimbursement===key?'all':key)}><span>{label}</span><strong>{loading?'—':cardRecords.filter(row=>matchesReimbursement(row,key)).length}</strong><small>lançamentos <span aria-hidden="true">→</span></small></button>)}</div>
    </section>
    {cardRecords.some(row=>matchesReimbursement(row,'verificar_vinculo')) && <button type="button" className="mp-reimbursement-review" aria-pressed={v.reimbursement==='verificar_vinculo'} disabled={loading} onClick={()=>choose(v.reimbursement==='verificar_vinculo'?'all':'verificar_vinculo')}>Verificar vínculo: {cardRecords.filter(row=>matchesReimbursement(row,'verificar_vinculo')).length} lançamento(s) sem confirmação financeira no ERP</button>}
    <div className="mp-period-filters"><label className="mp-unified-search">Buscar despesas<input type="search" placeholder="Placa, fornecedor, nota ou responsável" value={v.text} onChange={e=>set('text',e.target.value)}/></label>
      <label>Veículo<select aria-label="Veículo" value={v.vehicle || ''} onChange={e=>set('vehicle',e.target.value)}>{vehicleOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <ExpenseTripFilter value={v.trip} onChange={value=>set('trip',value)} options={trips}/>
      <label>De<input type="date" value={v.dateFrom} onChange={e=>set('dateFrom',e.target.value)}/></label><label>Até<input type="date" min={v.dateFrom} value={v.dateTo} onChange={e=>set('dateTo',e.target.value)}/></label>
    </div>
    <div className="mp-date-shortcuts" aria-label="Atalhos de período"><button type="button" onClick={()=>range(1)}>Hoje</button><button type="button" onClick={()=>range(7)}>Últimos 7 dias</button><button type="button" onClick={()=>{set('dateFrom',`${today().slice(0,7)}-01`);set('dateTo',today());}}>Mês atual</button><button type="button" onClick={()=>{set('dateFrom','');set('dateTo','');}}>Todo o período</button></div>
    <details className="mp-filter-panel mp-advanced-panel"><summary><span>Mais filtros</span>{advancedCount>0&&<span className="mp-advanced-count">{advancedCount} {advancedCount===1?'ativo':'ativos'}</span>}</summary>
      <div className="mp-advanced-body">
        <div className="mp-advanced-topline"><p className="mp-advanced-intro">Refine sua consulta</p><span className="mp-auto-filter"><span aria-hidden="true">●</span> Atualiza ao selecionar</span></div>
        <div className="mp-filter-presets" aria-label="Combinações rápidas"><span>Atalhos úteis</span><div>{presets.filter(preset=>manager||!preset.posted).map(preset=><button type="button" key={preset.label} aria-pressed={['paid','posted','reimbursement','status'].every(key=>v[key]===preset[key])} onClick={()=>usePreset(preset)}><span aria-hidden="true">↗</span>{preset.label}</button>)}</div></div>
        <fieldset><legend>Pagamento, ERP e reembolso</legend><div className="mp-advanced-grid">
          {select('Pagamento da despesa','paid',paymentOptions,v.paid==='pending'?'Inclui despesas não pagas e aquelas sem pagamento informado.':v.paid==='unknown'?'Ainda não foi informado se a despesa foi paga.':v.paid==='false'?'Mostra apenas despesas marcadas como não pagas.':'Indica se a despesa está marcada como paga no sistema. Não é o reembolso.')}
          {manager&&select('Lançamento','posted',postingOptions,v.posted==='pending'?'Inclui despesas não lançadas e aquelas sem lançamento informado.':'Indica se a despesa foi marcada como lançada no ERP, mesmo que já esteja paga.')}
          {select('Reembolso','reimbursement',reimbursementOptions,'Valor a receber de volta. “Aguardando reembolso” inclui valores a cobrar e já cobrados.')}
        </div></fieldset>
        <fieldset><legend>Conferência e identificação</legend><div className="mp-advanced-grid">
          {select('Conferência','status',reviewOptions,'Indica se a equipe já conferiu a despesa e seus comprovantes.')}
          {manager&&select('Perfil de quem lançou','source',sourceOptions,'Filtra pelo perfil de quem registrou a despesa.')}
        </div></fieldset>
        <div className="mp-advanced-footer"><span>Busca, veículo, viagem e período são mantidos ao limpar estas opções.</span><button type="button" disabled={!advancedCount} onClick={clearAdvanced}>Limpar opções adicionais</button></div>
      </div>
    </details>
    {chips.length>0&&<div className="mp-active-filters" aria-label="Filtros ativos">{chips.map(chip=><button type="button" key={chip.key} onClick={chip.remove} aria-label={`Remover filtro ${chip.text}`}>{chip.text}<span aria-hidden="true"> ×</span></button>)}<button type="button" className="mp-clear-filters" onClick={onClear}>Limpar tudo</button></div>}
    {v.dateFrom&&v.dateTo&&v.dateFrom>v.dateTo&&<p role="alert">O início do período deve ser anterior ao fim.</p>}
    {!loading&&<p className="mp-filter-result" role="status">{active&&active!=='all'?`${cards.find(c=>c.key===active)?.label || labelOf(reimbursementOptions,active)}: `:''}{records.length} {records.length===1?'despesa':'despesas'} · {new Set(records.map(r=>r.plate).filter(Boolean)).size} {new Set(records.map(r=>r.plate).filter(Boolean)).size===1?'veículo':'veículos'} · {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}{records.some(r=>!r.plate) && ` · ${records.filter(r=>!r.plate).length} sem veículo`}</p>}
  </section>;
}

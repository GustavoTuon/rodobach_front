import React from 'react';
import ExpenseTripFilter from './expense-trip-filter.jsx';
import {matchesReimbursement} from './expense-report.js';
import './expense-filters.css';

export const normalizeExpenseSearch=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function matchesExpenseSearch(row,query) {
  const term=normalizeExpenseSearch(query);
  const trip=row.unloading?.trip || row.trip;
  const text=normalizeExpenseSearch([row.plate,row.supplier,row.document,row.erpDocument,...(row.erpDocuments || []).map(d=>d.number),row.author,row.note,row.tireFireNumber,trip?.number,row.service,row.unloading?.cte?.number || row.unloading?.cte?.code,row.unloading?.cte?.customerName].join(' '));
  return !term || text.includes(term) || (/^[a-z0-9 -]+$/.test(term) && /[a-z0-9]/.test(term) && normalizeExpenseSearch(row.plate).replace(/[^a-z0-9]/g,'').includes(term.replace(/[^a-z0-9]/g,'')));
}
export const matchesExpenseFlag=(value,filter)=>!filter || (filter==='pending' ? value!==true : String(value ?? 'unknown')===filter);
export const paymentOptions=[['','Todos'],['true','Pago'],['pending','Aguardando pagamento'],['false','Não pago'],['unknown','Não informado']];
export const postingOptions=[['','Todos'],['true','Lançado no ERP'],['pending','Aguardando lançamento'],['false','Não lançado'],['unknown','Não informado']];
const reviewOptions=[['all','Todas'],['unchecked','Aguardando conferência'],['checked','Conferidas']];
const reimbursementOptions=[['','Todos'],['aguardando','Aguardando reembolso'],['recebido','Reembolsado']];
const sourceOptions=[['','Todos'],['colaborador','Colaborador'],['motorista','Motorista'],['unknown','Perfil não registrado']];
const labelOf=(options,value)=>options.find(([key])=>key===value)?.[1] || value;
export default function ExpenseFilters({values:v,onChange:set,onClear,trips,manager,today,records,cardRecords=records,loading}) {
  const cards=[{key:'all',label:'Todas',match:()=>true},{key:'paid',label:'Falta pagar',match:row=>row.paid!==true},{key:'posted',label:'Falta lançar no ERP',match:row=>row.posted!==true},{key:'reimbursement',label:'Falta reembolsar',match:row=>matchesReimbursement(row,'aguardando')}];
  const active=v.status==='all' ? (!v.paid&&!v.posted&&!v.reimbursement?'all':v.paid==='pending'&&!v.posted&&!v.reimbursement?'paid':v.posted==='pending'&&!v.paid&&!v.reimbursement?'posted':v.reimbursement==='aguardando'&&!v.paid&&!v.posted?'reimbursement':'') : '';
  const choose=key=>{set('paid',key==='paid'?'pending':'');set('posted',key==='posted'?'pending':'');set('reimbursement',key==='reimbursement'?'aguardando':'');set('status','all');};
  const select=(label,key,options)=><label>{label}<select aria-label={label} value={v[key]} onChange={e=>set(key,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
  const range=days=>{const end=today();const date=new Date(`${end}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-(days-1));set('dateFrom',date.toISOString().slice(0,10));set('dateTo',end);};
  const chips=[];
  const add=(key,text,empty='')=>chips.push({key,text,remove:()=>set(key,empty)});
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
    <p className="mp-card-help">Selecione o que precisa resolver. Quantidades e valores das despesas respeitam a busca, o período, a viagem e o perfil.</p>
    <div className="mp-period-filters"><label className="mp-unified-search">Buscar despesas<input type="search" placeholder="Placa, fornecedor, nota ou responsável" value={v.text} onChange={e=>set('text',e.target.value)}/></label>
      <label>De<input type="date" value={v.dateFrom} onChange={e=>set('dateFrom',e.target.value)}/></label><label>Até<input type="date" min={v.dateFrom} value={v.dateTo} onChange={e=>set('dateTo',e.target.value)}/></label>
    </div>
    <div className="mp-date-shortcuts" aria-label="Atalhos de período"><button type="button" onClick={()=>range(1)}>Hoje</button><button type="button" onClick={()=>range(7)}>Últimos 7 dias</button><button type="button" onClick={()=>{set('dateFrom',`${today().slice(0,7)}-01`);set('dateTo',today());}}>Mês atual</button><button type="button" onClick={()=>{set('dateFrom','');set('dateTo','');}}>Todo o período</button></div>
    <details className="mp-filter-panel"><summary>Mais filtros</summary><div className="mp-cost-filters">{select('Pagamento da despesa','paid',paymentOptions)}{manager&&select('Lançamento','posted',postingOptions)}{select('Conferência','status',reviewOptions)}<ExpenseTripFilter value={v.trip} onChange={value=>set('trip',value)} options={trips}/>{select('Reembolso','reimbursement',reimbursementOptions)}{manager&&select('Perfil de quem lançou','source',sourceOptions)}</div></details>
    {chips.length>0&&<div className="mp-active-filters" aria-label="Filtros ativos">{chips.map(chip=><button type="button" key={chip.key} onClick={chip.remove} aria-label={`Remover filtro ${chip.text}`}>{chip.text}<span aria-hidden="true"> ×</span></button>)}<button type="button" className="mp-clear-filters" onClick={onClear}>Limpar tudo</button></div>}
    {v.dateFrom&&v.dateTo&&v.dateFrom>v.dateTo&&<p role="alert">O início do período deve ser anterior ao fim.</p>}
    {!loading&&<p className="mp-filter-result" role="status">{active&&active!=='all'?`${cards.find(c=>c.key===active).label}: `:''}{records.length} {records.length===1?'despesa':'despesas'} · {new Set(records.map(r=>r.plate)).size} {new Set(records.map(r=>r.plate)).size===1?'veículo':'veículos'} · {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>}
  </section>;
}

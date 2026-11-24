import React,{useId} from 'react';
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
  const helpId=useId();
  const advancedCount=[v.paid,v.posted,v.status==='all'?'':v.status,v.reimbursement,v.trip,v.source].filter(Boolean).length;
  const clearAdvanced=()=>{set('paid','');set('posted','');set('status','all');set('reimbursement','');set('trip','');set('source','');};
  const cards=[{key:'all',label:'Todas',match:()=>true},{key:'paid',label:'Falta pagar',match:row=>row.paid!==true},{key:'posted',label:'Falta lançar no ERP',match:row=>row.posted!==true},{key:'reimbursement',label:'Falta reembolsar',match:row=>matchesReimbursement(row,'aguardando')}];
  const active=v.status==='all' ? (!v.paid&&!v.posted&&!v.reimbursement?'all':v.paid==='pending'&&!v.posted&&!v.reimbursement?'paid':v.posted==='pending'&&!v.paid&&!v.reimbursement?'posted':v.reimbursement==='aguardando'&&!v.paid&&!v.posted?'reimbursement':'') : '';
  const choose=key=>{set('paid',key==='paid'?'pending':'');set('posted',key==='posted'?'pending':'');set('reimbursement',key==='reimbursement'?'aguardando':'');set('status','all');};
  const select=(label,key,options,help)=><label className="mp-advanced-field"><span>{label}</span><select aria-label={label} aria-describedby={help?`${helpId}-${key}`:undefined} value={v[key]} onChange={e=>set(key,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>{help&&<small id={`${helpId}-${key}`}>{help}</small>}</label>;
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
    <details className="mp-filter-panel mp-advanced-panel"><summary><span>Mais filtros</span>{advancedCount>0&&<span className="mp-advanced-count">{advancedCount} {advancedCount===1?'ativo':'ativos'}</span>}</summary>
      <div className="mp-advanced-body">
        <p className="mp-advanced-intro">Combine as opções abaixo. A lista é atualizada automaticamente.</p>
        <fieldset><legend>Pagamento, ERP e reembolso</legend><div className="mp-advanced-grid">
          {select('Pagamento da despesa','paid',paymentOptions,v.paid==='pending'?'Inclui despesas não pagas e aquelas sem pagamento informado.':v.paid==='unknown'?'Ainda não foi informado se a despesa foi paga.':v.paid==='false'?'Mostra apenas despesas marcadas como não pagas.':'Indica se a despesa está marcada como paga no sistema. Não é o reembolso.')}
          {manager&&select('Lançamento','posted',postingOptions,v.posted==='pending'?'Inclui despesas não lançadas e aquelas sem lançamento informado.':'Indica se a despesa foi marcada como lançada no ERP, mesmo que já esteja paga.')}
          {select('Reembolso','reimbursement',reimbursementOptions,'Valor a receber de volta. “Aguardando reembolso” inclui valores a cobrar e já cobrados.')}
        </div></fieldset>
        <fieldset><legend>Conferência e identificação</legend><div className="mp-advanced-grid">
          {select('Conferência','status',reviewOptions,'Indica se a equipe já conferiu a despesa e seus comprovantes.')}
          <div className="mp-advanced-field"><ExpenseTripFilter value={v.trip} onChange={value=>set('trip',value)} options={trips}/><small>Encontre despesas de uma viagem ou sem viagem vinculada.</small></div>
          {manager&&select('Perfil de quem lançou','source',sourceOptions,'Filtra pelo perfil de quem registrou a despesa.')}
        </div></fieldset>
        <div className="mp-advanced-footer"><span>Busca e período são mantidos ao limpar estas opções.</span><button type="button" disabled={!advancedCount} onClick={clearAdvanced}>Limpar opções adicionais</button></div>
      </div>
    </details>
    {chips.length>0&&<div className="mp-active-filters" aria-label="Filtros ativos">{chips.map(chip=><button type="button" key={chip.key} onClick={chip.remove} aria-label={`Remover filtro ${chip.text}`}>{chip.text}<span aria-hidden="true"> ×</span></button>)}<button type="button" className="mp-clear-filters" onClick={onClear}>Limpar tudo</button></div>}
    {v.dateFrom&&v.dateTo&&v.dateFrom>v.dateTo&&<p role="alert">O início do período deve ser anterior ao fim.</p>}
    {!loading&&<p className="mp-filter-result" role="status">{active&&active!=='all'?`${cards.find(c=>c.key===active).label}: `:''}{records.length} {records.length===1?'despesa':'despesas'} · {new Set(records.map(r=>r.plate)).size} {new Set(records.map(r=>r.plate)).size===1?'veículo':'veículos'} · {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>}
  </section>;
}

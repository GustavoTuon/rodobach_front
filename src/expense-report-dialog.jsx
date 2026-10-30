import React,{useState} from 'react';
import {downloadExpenseReport,expenseReportColumns,reimbursementLabels,reimbursementOf,reportExpenseDate} from './expense-report.js';
import ExpenseTripFilter from './expense-trip-filter.jsx';

const empty={dateFrom:'',dateTo:'',plate:'',trip:'',service:'',paid:'',checked:'',posted:'',reimbursement:'',text:'',source:'',status:'all'};
const normalize=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterReportRecords(records,filters) {
  const f={...empty,...filters};
  return records.filter(row=>{
    const trip=row.unloading?.trip || row.trip;
    const date=reportExpenseDate(row);
    return (!f.dateFrom || date>=f.dateFrom) && (!f.dateTo || date<=f.dateTo)
      && normalize(row.plate).replace(/[^a-z0-9]/g,'').includes(normalize(f.plate).replace(/[^a-z0-9]/g,''))
      && (!f.trip || f.trip===(trip ? `${trip.company}:${trip.number}` : 'unlinked'))
      && (!f.service || row.service===f.service)
      && (!f.paid || String(row.paid ?? 'unknown')===f.paid)
      && (!f.posted || String(row.posted ?? 'unknown')===f.posted)
      && (!f.checked || String(Boolean(row.checked))===f.checked)
      && (!f.source || (row.authorProfile || 'unknown')===f.source)
      && (!f.reimbursement || reimbursementOf(row).status===f.reimbursement)
      && (f.status==='all' || (f.status==='pending' ? row.paid!==true : f.status==='unposted' ? row.posted!==true : !row.checked))
      && normalize([row.supplier,row.document,row.author,row.note,row.tireFireNumber,trip?.number,row.service,row.unloading?.cte?.number || row.unloading?.cte?.code,row.unloading?.cte?.customerName].join(' ')).includes(normalize(f.text));
  });
}

export default function ExpenseReportDialog({records,initialFilters,Dialog,onClose,onDownload=downloadExpenseReport}) {
  const [filters,setFilters]=useState({...empty,...initialFilters});
  const [columns,setColumns]=useState([...expenseReportColumns]);
  const [error,setError]=useState('');
  const set=(key,value)=>setFilters(current=>({...current,[key]:value}));
  const invalid=filters.dateFrom && filters.dateTo && filters.dateFrom>filters.dateTo;
  const rows=invalid ? [] : filterReportRecords(records,filters);
  const trips=[...new Map(records.map(row=>row.unloading?.trip || row.trip).filter(Boolean).map(trip=>[`${trip.company}:${trip.number}`,trip])).entries()];
  const services=[...new Set(records.map(row=>row.service))].sort();
  function download(event) {
    event.preventDefault();setError('');
    if(invalid || !rows.length || !columns.length) return;
    try {onDownload(rows,columns);onClose();} catch(error) {setError(error.message || 'Não foi possível gerar o relatório.');}
  }
  return <Dialog onClose={onClose} saving={false} step="report">
    <form className="mp-report-dialog" onSubmit={download}>
      <header className="mp-report-heading"><div><p className="mp-eyebrow">EXPORTAÇÃO DE DESPESAS</p><h2 id="mp-edit-title" data-step-title tabIndex={-1}>Configurar relatório</h2><p>Os filtros começam iguais aos da tela. Ajuste o recorte e escolha as colunas para baixar.</p></div><button className="mp-close" type="button" aria-label="Fechar relatório" onClick={onClose}>×</button></header>
      <fieldset><legend>Quais despesas incluir?</legend><div className="mp-report-filters">
        <label>Data inicial<input type="date" value={filters.dateFrom} onChange={e=>set('dateFrom',e.target.value)}/></label>
        <label>Data final<input type="date" value={filters.dateTo} min={filters.dateFrom} onChange={e=>set('dateTo',e.target.value)}/></label>
        <label>Placa<input value={filters.plate} placeholder="Todas as placas" maxLength={8} onChange={e=>set('plate',e.target.value.toUpperCase())}/></label>
        <ExpenseTripFilter value={filters.trip} onChange={value=>set('trip',value)} options={trips}/>
        <label>Tipo de despesa<select value={filters.service} onChange={e=>set('service',e.target.value)}><option value="">Todos os tipos</option>{services.map(service=><option key={service}>{service}</option>)}</select></label>
        {[['paid','Pagamento'],['checked','Conferência'],['posted','Lançado no ERP']].map(([key,label])=><label key={key}>{label}<select value={filters[key]} onChange={e=>set(key,e.target.value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option>{key!=='checked' && <option value="unknown">Não informado</option>}</select></label>)}
        <label>Reembolso<select value={filters.reimbursement} onChange={e=>set('reimbursement',e.target.value)}><option value="">Todas as situações</option>{Object.entries(reimbursementLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Perfil de quem lançou<select value={filters.source} onChange={e=>set('source',e.target.value)}><option value="">Todos</option><option value="colaborador">Colaborador</option><option value="motorista">Motorista</option><option value="unknown">Perfil não registrado</option></select></label>
        <label>Pendência<select value={filters.status} onChange={e=>set('status',e.target.value)}><option value="all">Todas</option><option value="pending">Aguardando pagamento</option><option value="unposted">Aguardando lançamento</option><option value="unchecked">Aguardando conferência</option></select></label>
        <label>Buscar fornecedor, documento ou descrição<input value={filters.text} onChange={e=>set('text',e.target.value)}/></label>
      </div><button type="button" className="mp-cancel-edit" onClick={()=>setFilters({...empty})}>Limpar filtros do relatório</button></fieldset>
      <fieldset><legend>Informações no arquivo</legend><div className="mp-report-column-actions"><button type="button" onClick={()=>setColumns([...expenseReportColumns])}>Selecionar todas</button><button type="button" onClick={()=>setColumns([])}>Desmarcar todas</button></div><div className="mp-report-columns">{expenseReportColumns.map(label=><label key={label}><input type="checkbox" checked={columns.includes(label)} onChange={e=>setColumns(current=>e.target.checked ? [...current,label] : current.filter(item=>item!==label))}/>{label}</label>)}</div></fieldset>
      {invalid && <p role="alert">A data inicial deve ser anterior ou igual à data final.</p>}
      {!columns.length && <p role="alert">Selecione pelo menos uma coluna.</p>}
      {!invalid && !rows.length && <p role="status">Nenhuma despesa corresponde aos filtros. Ajuste a seleção.</p>}
      {error && <p role="alert">{error}</p>}
      <footer className="mp-report-footer"><div aria-live="polite"><strong>{rows.length} despesa(s)</strong></div><span className="mp-report-total">Total: {(rows.reduce((sum,row)=>sum+Math.round(Number(row.amount)*100),0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · {columns.length} colunas</span><div><button type="button" className="mp-cancel-edit" onClick={onClose}>Cancelar</button><button type="submit" className="mp-submit" disabled={Boolean(invalid) || !rows.length || !columns.length}>Baixar CSV</button></div></footer>
    </form>
  </Dialog>;
}

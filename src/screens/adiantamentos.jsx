import React,{useState,useEffect} from 'react';
import './adiantamentos.css';
const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=value=>value?value.split('-').reverse().join('/'):'Não informado';
const labels={overdue:'Vencido',today:'Vence hoje',future:'A vencer',undated:'Sem vencimento',settled:'Sem saldo em aberto'};
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterAdvances(rows,{query='',status='open',type='',from='',to=''}){
 return rows.filter(row=>(status==='all'||(status==='open'?row.open>0:row.status===status))&&(!type||row.type===type)&&(!from||(row.due&&row.due>=from))&&(!to||(row.due&&row.due<=to))&&normalize([row.driver,row.plate,row.document,row.note].join(' ')).includes(normalize(query)));
}
export default function Adiantamentos(){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const [filters,setFilters]=useState({query:'',status:'open',type:'',from:'',to:''}),[page,setPage]=useState(1);
 useEffect(()=>{let live=true;setLoading(true);setError('');setData(null);window.RB_API.listDriverAdvances().then(result=>{if(live){setData(result);setPage(1);}}).catch(err=>{if(live)setError(err.message||'Não foi possível consultar o ERP.');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[attempt]);
 const set=(key,value)=>{setFilters(current=>({...current,[key]:value}));setPage(1);};
 const rows=filterAdvances(data?.records||[],filters);
 const sum=items=>items.reduce((total,row)=>total+Math.round(row.open*100),0)/100;
 const pages=Math.max(1,Math.ceil(rows.length/50));
 return <div className="adv-page adv-live">
  <header className="adv-heading"><div><span className="adv-eyebrow">OPERAÇÃO · MOTORISTAS</span><h1>Adiantamentos e saldos</h1><p>Vencimentos e valores pendentes dos motoristas, direto do financeiro.</p></div><button onClick={()=>setAttempt(n=>n+1)} disabled={loading}>{loading?'Consultando ERP…':'Atualizar dados'}</button></header>
  <div className="adv-notice"><div><strong>ERP · Somente consulta</strong><p>Títulos a pagar vinculados ao fornecedor do motorista. Pendências de qualquer data e títulos sem saldo emitidos nos últimos 12 meses. Pagamentos e alterações são feitos no ERP.</p></div></div>
  {loading&&<p role="status" className="adv-empty">Consultando adiantamentos e saldos no ERP…</p>}
  {error&&<div role="alert" className="adv-notice"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></div>}
  {!loading&&!error&&data&&<>
   <section className="adv-kpis adv-live-kpis" aria-label="Resumo dos filtros selecionados">
    {[['Saldo a pagar',sum(rows),'Total em aberto nos filtros atuais'],['Vencidos',sum(rows.filter(row=>row.status==='overdue')),'Vencimento anterior a hoje'],['Vencem hoje',sum(rows.filter(row=>row.status==='today')),date(data.today)],['A vencer',sum(rows.filter(row=>row.status==='future')),'Vencimento após hoje']].map(([label,value,help])=><article className="adv-kpi" key={label}><span>{label}</span><strong>{money(value)}</strong><small>{help}</small></article>)}
   </section>
   <section className="adv-list-panel" aria-label="Títulos dos motoristas">
    <div className="adv-list-filters">
     <label>Motorista, placa ou documento<input type="search" value={filters.query} placeholder="Buscar na lista" onChange={e=>set('query',e.target.value)}/></label>
     <label>Situação<select value={filters.status} onChange={e=>set('status',e.target.value)}><option value="open">Pendentes de pagamento</option><option value="overdue">Vencidos</option><option value="today">Vencem hoje</option><option value="future">A vencer</option><option value="undated">Sem vencimento</option><option value="settled">Sem saldo em aberto</option><option value="all">Todos</option></select></label>
     <label>Tipo<select value={filters.type} onChange={e=>set('type',e.target.value)}><option value="">Todos os títulos</option><option value="advance">Adiantamentos</option><option value="other">Outros títulos do motorista</option></select></label>
     <label>Vencimento de<input type="date" value={filters.from} max={filters.to||undefined} onChange={e=>set('from',e.target.value)}/></label>
     <label>Vencimento até<input type="date" value={filters.to} min={filters.from||undefined} onChange={e=>set('to',e.target.value)}/></label>
    </div>
    <div className="adv-section-title"><h2>{rows.length} títulos encontrados</h2><span>Vencimentos mais antigos primeiro · Atualizado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})}</span></div>
    <div className="adv-table-wrap" tabIndex={0} role="region" aria-label="Lista de títulos, deslize para ver todas as colunas"><table><thead><tr><th>Situação</th><th>Vencimento</th><th>Motorista / placa</th><th>Documento / parcela</th><th>Tipo / referência</th><th>Valor do título</th><th>Falta pagar</th></tr></thead><tbody>
     {rows.slice((page-1)*50,page*50).map(row=><tr key={row.id}><td><span className={`adv-status ${row.status}`}>{labels[row.status]}</span></td><td>{date(row.due)}{row.status==='overdue'&&<small>{Math.round((Date.parse(data.today)-Date.parse(row.due))/86400000)} dias em atraso</small>}</td><td><strong>{row.driver}</strong><small>{row.plate||'Sem placa no título'}</small></td><td><strong>{row.document} / {row.installment}</strong><small>Série {row.series} · Empresa {row.company}</small></td><td>{row.category}<small>Emissão: {date(row.issued)}</small>{row.note&&<details><summary>Observação</summary><p>{row.note}</p></details>}</td><td className="adv-numeric">{money(row.amount)}</td><td className="adv-numeric"><strong>{money(row.open)}</strong></td></tr>)}
    </tbody></table></div>
    {!rows.length&&<p className="adv-empty">Nenhum título encontrado com esses filtros.</p>}
    <footer className="adv-pagination"><span>Página {page} de {pages} · até 50 títulos por página</span><div><button disabled={page===1} onClick={()=>setPage(n=>n-1)}>Anterior</button><button disabled={page>=pages} onClick={()=>setPage(n=>n+1)}>Próxima</button></div></footer>
   </section>
   <p className="adv-help">“Falta pagar” é o saldo em aberto informado pelo ERP. “Sem saldo em aberto” não indica necessariamente pagamento em dinheiro: pode incluir baixas e compensações. Adiantamentos são identificados pela descrição da série no ERP. Esta lista não representa saldo de prestação de contas do motorista.</p>
  </>}
 </div>;
}
window.Adiantamentos=Adiantamentos;

const { useEffect, useMemo, useState } = React;

const ecNumber = (value) => new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
const ecMoney = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const ecToday = () => { const parts = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Sao_Paulo'}).formatToParts(new Date()); return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-'); };
const ecCurrentMonth = () => ecToday().slice(0,7);
const ecMonthEnd = () => { const [y,m]=ecCurrentMonth().split('-').map(Number); return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10); };

function EcConferenciaDocumentos({ audits }) {
  const [period, setPeriod] = useState(0);
  const [query, setQuery] = useState('');
  const audit = audits[period] || {};
  const documents = audit.documentos || [];
  const date = value => value ? value.split('-').reverse().join('/') : 'Não informada';
  const visible = documents.filter(d=>[d.cliente,d.placa,d.codigo,d.categoria].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <section className="ec-review ec-no-print">
    <div className="ec-title-line"><div><h2>Documentos contabilizados</h2><p>{audit.ctes || 0} CT-es + {audit.orcamentos || 0} orçamentos = {documents.length} documentos</p></div><label>Período<select aria-label="Período da conferência" value={period} onChange={e=>setPeriod(Number(e.target.value))}>{audits.map((a,i)=><option key={i} value={i}>{date(a.periodo.startDate)} a {date(a.periodo.endDate)}</option>)}</select></label></div>
    <div className="ec-review-toolbar"><input aria-label="Buscar documentos" placeholder="Buscar cliente, placa ou documento" value={query} onChange={e=>setQuery(e.target.value)}/><span>{visible.length} documentos encontrados</span></div>
    <div className="ec-table-wrap"><table className="data-table"><thead><tr><th>Tipo</th><th>Documento</th><th>Emissão</th><th>Cliente</th><th>Placa</th><th>Origem → destino</th><th>Registros vinculados, sem contagem extra</th></tr></thead><tbody>{visible.map(d=><tr key={d.id}><td>{d.categoria}</td><td>{d.empresa}/{d.serie}/{d.codigo}</td><td>{date(d.data)}</td><td>{d.cliente}</td><td>{d.placa || 'Não informada'}</td><td>{d.origem || 'Não informada'} → {d.destino || 'Não informado'}</td><td>{(d.vinculados || []).map(v=>`${v.empresa}/${v.serie}/${v.codigo}`).join(', ') || '—'}</td></tr>)}{!visible.length && <tr><td colSpan={7}>Nenhum documento encontrado.</td></tr>}</tbody></table></div>
  </section>;
}

function EmbarquesClientes() {
  const [startDate, setStart] = useState(() => ecCurrentMonth()+'-01');
  const [endDate, setEnd] = useState(ecMonthEnd);
  const [applied,setApplied] = useState({startDate,endDate,regioes:'',vendedor:''});
  const [regiao, setRegiao] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    setData(null);
    window.RB_API.getEmbarquesClientes(applied)
      .then((payload) => { if (!Array.isArray(payload?.periodo?.periodos) || payload.periodo.periodos.length !== 3) throw new Error("O backend está desatualizado. Reinicie a API para consultar os três períodos."); if (active) setData(payload); })
      .catch((err) => { if (active) setError(err?.message || "Não foi possível carregar os embarques."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);

  const dirty = startDate!==applied.startDate || endDate!==applied.endDate || regiao!==applied.regioes || vendedor!==applied.vendedor;
  const rows = data?.rows || [];
  const options = data?.filtros || {};
  const summary = data?.resumo || {};
  const printDate = useMemo(() => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()), [data]);

  const periods=data?.periodo?.periodos || [];
  const periodLabel=p=>p ? p.startDate.split('-').reverse().join('/')+' a '+p.endDate.split('-').reverse().join('/') : '';
  function printReport(){
    const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(frame);
    const doc=frame.contentDocument;doc.open();doc.write('<html><head><title>Documentos por cliente</title></head><body></body></html>');doc.close();
    const style=doc.createElement('style');style.textContent='@page{size:A4 landscape;margin:8mm}body{font:9px Arial;color:#111}h1{font-size:14px;margin:0 0 5px}p{margin:4px 0 8px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:3px 4px;text-align:right}td:first-child,th:first-child{text-align:left;width:27%}thead{display:table-header-group}tr{break-inside:avoid}th{background:#eee}';doc.head.appendChild(style);
    const heading=doc.createElement('h1');heading.textContent='Comparativo de documentos por cliente';doc.body.appendChild(heading);
    const meta=doc.createElement('p');meta.textContent='Regiões: '+(applied.regioes||'Todas')+' | Vendedor: '+(applied.vendedor||'Todos')+' | Emitido em '+printDate;doc.body.appendChild(meta);
    const table=doc.createElement('table'),head=table.createTHead(),h1=head.insertRow(),h2=head.insertRow();
    const th=(row,text,span=1)=>{const cell=doc.createElement('th');cell.textContent=text;cell.colSpan=span;row.appendChild(cell);return cell;};
    th(h1,'Cliente').rowSpan=2;
    periods.forEach((p,i)=>th(h1,['Selecionado','1 mês antes','2 meses antes'][i]+' — '+periodLabel(p),2));
    th(h1,'Diferença',2);periods.forEach(()=>{th(h2,'Documentos');th(h2,'Valor R$');});th(h2,'Qtd.');th(h2,'%');
    const body=table.createTBody();
    const add=(section,values)=>{const tr=section.insertRow();values.forEach(v=>{const td=tr.insertCell();td.textContent=String(v);});};
    rows.forEach(r=>add(body,[r.cliente,...['Atual','Anterior','Retrasado'].flatMap(k=>[ecNumber(r['embarques'+k]),ecMoney(r['faturamento'+k])]),r.diferenca,r.variacaoPct==null?'—':r.variacaoPct.toLocaleString('pt-BR')+'%']));
    add(table.createTFoot(),['TOTAL',...['Atual','Anterior','Retrasado'].flatMap(k=>[ecNumber(summary['embarques'+k]),ecMoney(summary['faturamento'+k])]),summary.diferenca,'']);
    doc.body.appendChild(table);
    const note=doc.createElement('p');note.textContent='Receita pela data financeira. CT-es e orçamentos pela própria emissão; orçamento vinculado a CT-e válido não conta novamente. Complementos, anulações e cancelados não acrescentam documentos.';doc.body.appendChild(note);
    frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();},150);
  }
  return <div className="page ec-page">
    <style>{`
      .ec-review{padding:20px;margin:16px 0}.ec-review h2{margin:0 0 6px}.ec-review p{line-height:1.6}.ec-review label{display:grid;gap:8px}.ec-review select,.ec-review-toolbar input{padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:inherit}.ec-review-toolbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:20px 0}.ec-review-toolbar input{width:300px;max-width:100%}.ec-trip{border:1px solid var(--border);border-radius:10px;margin:10px 0;overflow:hidden}.ec-trip summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;cursor:pointer;flex-wrap:wrap}.ec-trip summary:hover{background:var(--surface-2)}.ec-trip summary small,.ec-review td small{display:block;margin-top:6px;color:var(--text-3)}.ec-trip-badge{padding:7px 10px;border-radius:20px;background:var(--surface-2);color:#60a5fa;font-size:12px}.ec-review table{width:100%;min-width:760px}.ec-review td,.ec-review th{padding:12px;text-align:left}.ec-draft-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}.ec-draft{padding:18px;border:1px solid #3b82f6;border-radius:10px;margin:16px 0}.ec-review .ec-pending-select{display:flex;align-items:center;gap:10px;padding:14px;background:var(--surface-2)}.ec-pending-select input{width:18px;height:18px}
      .ec-title-line{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.ec-filters{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.ec-filters label{display:grid;gap:5px;font-size:12px;color:var(--text-3)}.ec-filters input,.ec-filters select{min-width:170px}.ec-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.ec-kpi{padding:15px}.ec-kpi small{display:block;color:var(--text-3);margin-bottom:7px}.ec-kpi strong{font-size:24px}.ec-table td,.ec-table th{white-space:nowrap}.ec-table td:first-child,.ec-table th:first-child{white-space:normal}.ec-neg{color:#dc2626;font-weight:700}.ec-pos{color:#16a34a;font-weight:700}.ec-zero{color:#64748b}.ec-print-head{display:none}.ec-note{font-size:11px;color:var(--text-3);padding:10px 14px}.ec-actions{display:flex;gap:8px}.ec-table-wrap{overflow:auto}
      @media(max-width:900px){.ec-kpis{grid-template-columns:repeat(2,1fr)}}
      @media print{body *{visibility:hidden}.ec-page,.ec-page *{visibility:visible}.ec-page{position:absolute;inset:0;padding:0!important;background:#fff!important;color:#111!important}.sidebar,.topbar,.screen-tabs,.ec-no-print{display:none!important}.ec-print-head{display:block;margin-bottom:14px}.ec-print-head h1{font-size:20px;margin:0 0 4px}.ec-kpis{grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.ec-kpi{border:1px solid #bbb!important;box-shadow:none!important;padding:8px}.ec-kpi strong{font-size:17px}.card{box-shadow:none!important;border:0!important}.ec-table-wrap{overflow:visible}.ec-table{font-size:9px;width:100%;border-collapse:collapse}.ec-table th,.ec-table td{border:1px solid #bbb!important;padding:4px!important;color:#111!important}.ec-table thead{display:table-header-group}.ec-table tr{break-inside:avoid}.ec-note{color:#333!important}@page{size:A4 landscape;margin:10mm}}
      .ec-page{padding:24px;width:100%;min-width:0;box-sizing:border-box}.ec-title-line{flex-wrap:wrap;align-items:center}.ec-regions{border:1px solid var(--border);border-radius:6px;display:flex;gap:12px;flex-wrap:wrap;padding:10px}.ec-regions label{display:flex;align-items:center;gap:6px}.ec-regions input{min-width:0;width:16px;height:16px}.ec-table{table-layout:fixed;min-width:850px;width:100%;font-size:13px}.ec-table th,.ec-table td{white-space:normal;overflow-wrap:anywhere;padding:12px;vertical-align:top}.ec-table th:first-child{width:29%}.ec-table small{display:block;margin-top:6px;font-size:12px}.ec-filters input,.ec-filters select{padding:8px}.ec-print-head{margin-bottom:16px}@media(max-width:800px){.ec-page{padding:14px}}
      .ec-page{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable}.ec-page>.card{flex-shrink:0}.ec-table th{position:sticky;top:0;background:var(--surface-2)}.ec-table th:nth-child(2){border-top:3px solid #3b82f6}.ec-table th:nth-child(3){border-top:3px solid #a78bfa}.ec-table th:nth-child(4){border-top:3px solid #94a3b8}.ec-table tbody tr:nth-child(even){background:var(--surface-2)}
    `}</style>
    <div className="ec-print-head"><h1>Comparativo de documentos por cliente</h1><div>{periods.map(periodLabel).join(' • ')} · Emitido em {printDate}</div></div>
    <div className="ec-title-line ec-no-print">
      <div><h1>Documentos por cliente</h1><p>CT-es e orçamentos por data de emissão. Orçamento convertido em CT-e conta uma vez; complementos não aumentam a quantidade.</p></div>
      <div className="ec-actions"><button className="btn primary" disabled={loading || !data || dirty} onClick={printReport}>Imprimir / Salvar PDF</button></div>
    </div>
    <div className="card ec-filters ec-no-print" style={{padding:14,marginTop:14}}>
      <label>Data inicial<input type="date" value={startDate} onChange={e=>setStart(e.target.value)}/></label>
      <label>Data final<input type="date" value={endDate} onChange={e=>setEnd(e.target.value)}/></label>
      <button className="btn" disabled={loading || !startDate} onClick={()=>{ const month=startDate.slice(0,7); const [y,m]=month.split('-').map(Number); const first=month+'-01'; const last=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10); setStart(first);setEnd(last);setApplied({startDate:first,endDate:last,regioes:regiao,vendedor}); }}>Mês inteiro</button>
      <small>Do primeiro ao último dia: compara meses completos. Intervalos menores: compara os mesmos dias.</small>
      <fieldset className="ec-regions"><legend>Regiões (selecione várias)</legend>{["Norte","Nordeste","Centro-Oeste","Sudeste","Sul","Não informada","Múltiplas regiões"].map(x=><label key={x}><input type="checkbox" checked={regiao.split(',').includes(x)} onChange={e=>setRegiao(e.target.checked?[...regiao.split(',').filter(Boolean),x].join(','):regiao.split(',').filter(r=>r!==x).join(','))}/>{x}</label>)}</fieldset>
      <label>Vendedor<select value={vendedor} onChange={(e) => setVendedor(e.target.value)}><option value="">Todos os vendedores</option>{[...new Set([...(options.vendedores || []),"Não informado","Múltiplos vendedores",vendedor].filter(Boolean))].map((x) => <option key={x}>{x}</option>)}</select></label>
      <button className="btn primary" disabled={loading || !startDate || !endDate || startDate>endDate || startDate.slice(0,7)!==endDate.slice(0,7)} onClick={()=>setApplied({startDate,endDate,regioes:regiao,vendedor})}>Consultar período</button>
      {(regiao || vendedor) && <button className="btn" onClick={() => { setRegiao(""); setVendedor(""); }}>Limpar filtros</button>}
    </div>
    <p className="ec-note">Regiões aplicadas: {applied.regioes || 'Todas'} · Vendedor: {applied.vendedor || 'Todos'}. Selecione datas dentro do mesmo mês e clique em Consultar período.</p>
    {dirty && <p role="status" className="ec-note">Filtros alterados: clique em Consultar período para atualizar os resultados.</p>}
    {loading && <p role="status">Carregando os três períodos…</p>}
    {error && <div className="notice error" style={{marginTop:14}}>{error}</div>}
    {data && <>
    <details className="card ec-no-print" style={{padding:16,marginBottom:12}}><summary>Conferir documentos contabilizados</summary><EcConferenciaDocumentos audits={data.conciliacao || []}/></details>
    <details className="card" style={{padding:16,marginBottom:16}}><summary>Detalhes da receita e conciliação com o DRE</summary>
      <p>Receita pela emissão do título financeiro; documentos pela própria emissão. A receita inclui complementos, mas eles não aumentam a quantidade. Os filtros financeiros por região e vendedor seguem os vínculos do título e podem diferir dos documentos.</p>
      {(data.conciliacao || []).map((audit,i)=><div key={i} style={{marginTop:12}}><b>{periodLabel(audit.periodo)}</b>
        <p>Receita bruta DRE (sem região/vendedor): {ecMoney(audit.receitaDre)} · Receita sem frete identificado no filtro: {ecMoney(audit.receitaSemFrete)} · Receita com múltiplas atribuições: {ecMoney(audit.receitaMultiplasAtribuicoes)}</p>
        <p>{audit.ctes || 0} CT-es e {audit.orcamentos || 0} orçamentos contabilizados. Não é necessário vínculo com uma viagem.</p>
        <details><summary>Fretes sem título financeiro: {audit.fretesSemTitulo?.count || 0} — fora do faturamento (todos os clientes e regiões)</summary>
          <div style={{overflowX:'auto'}}><table><thead><tr><th>Data</th><th>Cliente</th><th>Documento</th><th>Valor</th></tr></thead><tbody>{(audit.fretesSemTitulo?.rows || []).map((r,n)=><tr key={n}><td>{r.data}</td><td>{r.pessoaNome}</td><td>{r.documento}</td><td>{ecMoney(r.valor)}</td></tr>)}</tbody></table></div>
        </details>
      </div>)}
    </details>
    {periods[0]?.startDate <= ecToday() && periods[0]?.endDate >= ecToday() && <p className="ec-note" role="status">Mês em andamento: os dados atuais ainda não representam um mês fechado.</p>}
    <div className="ec-kpis">
      <div className="card ec-kpi"><small>{periodLabel(periods[0])}</small><strong>{ecNumber(summary.embarquesAtual)}</strong></div>
      <div className="card ec-kpi"><small>{periodLabel(periods[1])}</small><strong>{ecNumber(summary.embarquesAnterior)}</strong></div>
      <div className="card ec-kpi"><small>Diferença</small><strong className={summary.diferenca < 0 ? "ec-neg" : "ec-pos"}>{summary.diferenca > 0 ? "+" : ""}{ecNumber(summary.diferenca)}</strong></div>
      <div className="card ec-kpi"><small>{periodLabel(periods[2])}</small><strong>{ecNumber(summary.embarquesRetrasado)}</strong></div>
    </div>
    <div className="card card-flush">
      <div className="card-header"><div><h3>Lista comparativa</h3><span className="muted">{periods.map(periodLabel).join(' • ')}</span></div><span className="muted">{rows.length} clientes</span></div>
      <div className="ec-table-wrap"><table className="data-table ec-table"><thead><tr><th>Cliente / Região / Vendedor</th>{periods.map((p,i)=><th key={i}>{['Período selecionado','1 mês antes','2 meses antes'][i]}<small>{periodLabel(p)}</small><small>Documentos / Receita financeira</small></th>)}<th>Diferença vs. mês anterior</th></tr></thead><tbody>
      {rows.map((r,i)=><tr key={r.clienteCodigo??i}><td><b>{r.cliente}</b><small>{r.regiao}</small><small>{r.vendedor}</small></td>{['Atual','Anterior','Retrasado'].map(k=><td key={k}><b>{ecNumber(r['embarques'+k])} documentos</b><small>{ecMoney(r['faturamento'+k])}</small></td>)}<td><b>{r.diferenca>0?'+':''}{r.diferenca}</b><small>{r.variacaoPct==null?'Sem base anterior':r.variacaoPct.toLocaleString('pt-BR')+'%'}</small></td></tr>)}
      {!loading&&!rows.length&&<tr><td colSpan={5}>Nenhum embarque encontrado.</td></tr>}
      </tbody><tfoot><tr><td>Total</td>{['Atual','Anterior','Retrasado'].map(k=><td key={k}>{ecNumber(summary['embarques'+k])}<small>{ecMoney(summary['faturamento'+k])}</small></td>)}<td>{summary.diferenca}</td></tr></tfoot></table></div>
      <div className="ec-note">{data?.criterio || "CT-es e orçamentos contabilizados pela própria emissão, sem repetir orçamento convertido em CT-e."} A receita financeira pode pertencer a outro mês e não representa necessariamente o valor dos documentos exibidos. Em meses mais curtos, as datas são limitadas ao último dia disponível.</div>
    </div>
    </>}
  </div>;
}

window.EmbarquesClientes = EmbarquesClientes;

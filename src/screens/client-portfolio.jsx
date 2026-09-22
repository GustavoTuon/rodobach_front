import React, {useEffect, useMemo, useRef, useState} from 'react';
import {csvCell} from './client-analysis-model.js';

export const PORTFOLIO_BANDS = [
  ['todas','Todos os títulos'], ['aVencer','A vencer (inclui hoje)'], ['ate15','1 a 15 dias'],
  ['de16a30','16 a 30 dias'], ['de31a60','31 a 60 dias'], ['acima60','Mais de 60 dias'], ['semVencimento','Sem vencimento'],
];
const money = value => value == null ? 'Não informado' : Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date = value => value ? value.slice(0,10).split('-').reverse().join('/') : 'Não informado';
const sum = (rows, key) => rows.reduce((total,row) => total + Math.round(Number(row[key] || 0) * 100),0)/100;

export function filterPortfolio(rows, search) {
  const q = search.trim().toLocaleLowerCase('pt-BR');
  const digits = q.replace(/\D/g,'');
  return rows.filter(row => !q || row.nome.toLocaleLowerCase('pt-BR').includes(q) || row.filiais.some(branch =>
    branch.nome.toLocaleLowerCase('pt-BR').includes(q) || (digits.length >= 3 && String(branch.documento || '').replace(/\D/g,'').includes(digits))));
}

export function ClientPortfolio() {
  const [empresa,setEmpresa] = useState('todas');
  const [search,setSearch] = useState('');
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [reload,setReload] = useState(0);
  const [selected,setSelected] = useState(null);
  const [faixa,setFaixa] = useState('todas');
  const [page,setPage] = useState(1);
  const [detail,setDetail] = useState(null);
  const [detailError,setDetailError] = useState('');
  const [detailLoading,setDetailLoading] = useState(false);
  const detailRef = useRef(null);

  useEffect(() => {
    if (selected) {
      detailRef.current?.focus({preventScroll:true});
      detailRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'});
    }
  },[selected]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setData(null);
    window.RB_API.getClienteCarteira({empresa}).then(result => {if(active)setData(result);})
      .catch(err => {if(active)setError(err.message || 'Não foi possível carregar a carteira.');})
      .finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  },[empresa,reload]);

  useEffect(() => {
    let active = true;
    setDetail(null); setDetailError('');
    if (!selected) {setDetailLoading(false);return () => {active=false;};}
    setDetailLoading(true);
    window.RB_API.getClienteCarteira({empresa,cliente:selected,faixa,pagina:page}).then(result => {
      if(active) {setDetail({...result.detalhe,dataReferencia:result.dataReferencia});setData(result);}
    }).catch(err => {if(active)setDetailError(err.message || 'Não foi possível carregar os títulos.');})
      .finally(() => {if(active)setDetailLoading(false);});
    return () => {active=false;};
  },[empresa,selected,faixa,page,reload]);

  const rows = useMemo(() => filterPortfolio(data?.clientes || [],search),[data,search]);
  const select = (identity, band='todas') => {setSelected(identity);setFaixa(band);setPage(1);};
  const exportSummary = () => {
    const headers = ['Cliente','Saldo total','A vencer incluindo hoje','Vencido','1-15 dias','16-30 dias','31-60 dias','Mais de 60 dias','Sem vencimento','Títulos','Data da posição'];
    const values = rows.map(row => [row.nome,...['total','aVencer','vencido','ate15','de16a30','de31a60','acima60','semVencimento'].map(key=>row[key]),row.titulos,data.dataReferencia]);
    const blob = new Blob(['\uFEFF'+[headers,...values].map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const link=document.createElement('a');link.href=url;link.download=`carteira-clientes-${data.dataReferencia}.csv`;link.click();URL.revokeObjectURL(url);
  };

  return <div className="view cp-page">
    <style>{`
      .cp-page .cp-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:16px 0}
      .cp-page label{display:grid;gap:5px;font-size:12px}
      .cp-page input,.cp-page select{padding:8px;border-radius:6px;border:1px solid var(--border);color:var(--text);background:var(--surface-2)}
      .cp-page .cp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}
      .cp-page .cp-scroll{overflow:auto;max-height:560px}
      .cp-page th{white-space:nowrap;position:sticky;top:0;background:var(--surface-2);z-index:1}
      .cp-page .cp-name{border:0;background:none;color:var(--accent);cursor:pointer;text-align:left;font:inherit;padding:6px 0}
      .cp-page .cp-notice{padding:12px 16px;line-height:1.6;border:1px solid var(--border);border-radius:8px}
      .cp-page .cp-late{color:#ef4444}
      .cp-page .cp-bands{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0}
      .cp-page .cp-detail{padding:18px;margin-top:20px;scroll-margin-top:20px}
      .cp-page .cp-detail:focus{outline:2px solid var(--accent)}
    `}</style>
    <div className="page-head"><div><h1>Carteira financeira de clientes</h1><div className="sub">Saldos atuais de todas as emissões, incluindo títulos antigos.</div></div></div>
    <div className="cp-controls">
      <label>Empresa<select value={empresa} onChange={e=>{setEmpresa(e.target.value);setSelected(null);setPage(1);}}><option value="todas">Todas as empresas</option><option value="2">RB Transportes</option><option value="1">Empresa 1</option></select></label>
      <label>Cliente ou documento<input value={search} onChange={e=>{setSearch(e.target.value);setSelected(null);}} placeholder="Nome, CPF ou CNPJ"/></label>
      <button className="btn" disabled={loading||detailLoading} onClick={()=>setReload(v=>v+1)}>Atualizar carteira</button>
      <button className="btn" disabled={!data||loading} onClick={exportSummary}>Exportar resumo</button>
    </div>
    <div className="cp-notice">Esta carteira não usa o período, o status comercial ou o corte de 2025 da análise de faturamento. Vencido é qualquer saldo com vencimento anterior à data da posição, sem tolerância de cinco dias.</div>
    {loading && <p role="status">Carregando carteira…</p>}
    {error && <div role="alert"><p>{error}</p><button className="btn" onClick={()=>setReload(v=>v+1)}>Tentar novamente</button></div>}
    {!loading && data && <>
      <p className="muted">Posição em {date(data.dataReferencia)} · consultada às {new Date(data.atualizadoEm).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})} (Brasília) · {rows.length} grupos/clientes · totais da seleção abaixo.</p>
      <div className="cp-kpis">{[['total','Saldo total em aberto'],['aVencer','A vencer, incluindo hoje'],['vencido','Total vencido'],['semVencimento','Sem vencimento informado']].map(([key,label])=><div className="kpi" key={key}><div className="kpi-label">{label}</div><div className={`kpi-value ${key==='vencido'?'cp-late':''}`}>{money(sum(rows,key))}</div></div>)}</div>
      <div className="cp-kpis">{PORTFOLIO_BANDS.slice(2,6).map(([key,label])=><div className="kpi" key={key}><div className="kpi-label">Vencido há {label.toLowerCase()}</div><div className="kpi-value">{money(sum(rows,key))}</div></div>)}</div>
      <details className="cp-notice"><summary>Como calculamos e agrupamos</summary><p>{data.metodologia}</p><p>O último recebimento é a última baixa positiva registrada no ERP para o cliente ou suas filiais, dentro da empresa selecionada, até hoje. Não representa necessariamente a quitação dos títulos listados.</p></details>
      <div className="card" style={{marginTop:16}}><div className="card-header"><h2>Clientes com saldo em aberto</h2><span className="muted">Clique no cliente para consultar os títulos</span></div>
        <div className="cp-scroll"><table className="tbl"><thead><tr><th>Cliente / grupo</th><th className="num">Títulos</th><th className="num">Saldo total</th><th className="num">A vencer</th><th className="num">Vencido</th><th className="num">1–15 dias</th><th className="num">16–30 dias</th><th className="num">31–60 dias</th><th className="num">Mais de 60 dias</th><th className="num">Sem vencimento</th></tr></thead><tbody>
          {rows.map(row=><tr key={row.identidade}><td><button className="cp-name" onClick={()=>select(row.identidade)}>{row.nome}</button><small style={{display:'block'}}>{row.filiais.length} cadastro(s) com saldo</small></td><td className="num">{row.titulos}</td>{['total','aVencer','vencido','ate15','de16a30','de31a60','acima60','semVencimento'].map(key=><td key={key} className="num"><button className="cp-name" aria-label={`${row.nome}: ${key==='total'?'todos os títulos':key==='vencido'?'vencidos':PORTFOLIO_BANDS.find(b=>b[0]===key)?.[1]}`} onClick={()=>select(row.identidade,key==='total'?'todas':key)}>{money(row[key])}</button></td>)}</tr>)}
          {!rows.length && <tr><td colSpan={10} style={{padding:20}}>Nenhum saldo em aberto para esta seleção.</td></tr>}
        </tbody></table></div>
      </div>
    </>}
    {selected && <section ref={detailRef} tabIndex={-1} className="card cp-detail" aria-label="Títulos do cliente">
      <div className="card-header"><h2>Títulos do cliente</h2><button className="btn" onClick={()=>setSelected(null)}>Fechar títulos</button></div>
      <div className="cp-bands">{[...PORTFOLIO_BANDS,['vencido','Todos os vencidos']].map(([key,label])=><button key={key} className={`btn${faixa===key?' primary':''}`} aria-pressed={faixa===key} onClick={()=>{setFaixa(key);setPage(1);}}>{label}</button>)}</div>
      {detailLoading && <p role="status">Carregando títulos…</p>}
      {detailError && <div role="alert"><p>{detailError}</p><button className="btn" onClick={()=>setReload(v=>v+1)}>Recarregar títulos</button></div>}
      {!detailLoading && detail && <>
        <h3>{detail.cliente.nome}</h3><p>Último recebimento: <strong>{detail.ultimoRecebimento?date(detail.ultimoRecebimento):'Nenhuma baixa positiva encontrada'}</strong> · Posição em {date(detail.dataReferencia)}</p>
        <p><strong>{money(detail.saldo)}</strong> em {detail.quantidade} título(s) nesta faixa · saldo total do cliente: {money(detail.cliente.total)}</p>
        <details><summary>Cadastros com saldo neste grupo</summary><ul>{detail.cliente.filiais.map((branch,index)=><li key={`${branch.empresa}:${branch.codigo}:${index}`}>{branch.nome} · {branch.documento || 'Sem documento'} · Empresa {branch.empresa} · Cadastro {branch.codigo ?? 'não informado'}</li>)}</ul></details>
        <div className="cp-scroll"><table className="tbl"><thead><tr><th>Empresa</th><th>Série / título / parcela</th><th>Cliente / filial</th><th>Emissão</th><th>Vencimento</th><th className="num">Valor original</th><th className="num">Saldo atual</th><th>Situação</th></tr></thead><tbody>{detail.titulos.map((title,index)=><tr key={`${title.empresa}:${title.serie}:${title.numero}:${title.parcela}:${index}`}><td>{title.empresa}</td><td>{title.serie} / {title.numero} / {title.parcela}</td><td>{title.nome}</td><td>{date(title.emissao)}</td><td>{date(title.vencimento)}</td><td className="num">{money(title.original)}</td><td className="num">{money(title.saldo)}</td><td>{title.faixa==='semVencimento'?'Sem vencimento':title.diasAtraso>0?`${title.diasAtraso} dias de atraso`:'A vencer / hoje'}</td></tr>)}{!detail.titulos.length&&<tr><td colSpan={8}>Nenhum título nesta faixa.</td></tr>}</tbody></table></div>
        <div className="cp-controls"><button className="btn" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Anterior</button><span>Página {page} de {Math.max(1,Math.ceil(detail.quantidade/detail.porPagina))}</span><button className="btn" disabled={page*detail.porPagina>=detail.quantidade} onClick={()=>setPage(v=>v+1)}>Próxima</button><span className="muted">Até 50 títulos por página; os totais incluem todas as páginas.</span></div>
      </>}
    </section>}
  </div>;
}

// Análise de Clientes — faturamento real via financeiro.receber

// ── Helpers de data ───────────────────────────────────────────────────────────
function acTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function acNMonthsAgoISO(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function acNDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function acDateFmt(v) {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0,10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}
function acBRL(v) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
}
function acNum(v) { const n=Number(v); return Number.isFinite(n)?n:0; }
function acPct(v) { return `${acNum(v).toFixed(1)}%`; }

// ── Períodos disponíveis ──────────────────────────────────────────────────────
const AC_PERIODS = [
  { key:"30d",  label:"30 dias", getRange:()=>({ start:acNDaysAgoISO(29), end:acTodayISO() }) },
  { key:"3m",   label:"3 meses", getRange:()=>({ start:acNMonthsAgoISO(3), end:acTodayISO() }) },
  { key:"6m",   label:"6 meses", getRange:()=>({ start:acNMonthsAgoISO(6), end:acTodayISO() }) },
  { key:"12m",  label:"12 meses",getRange:()=>({ start:acNMonthsAgoISO(12), end:acTodayISO() }) },
];

// Períodos para Histórico de Fretes
const HF_PERIODS = [
  { key:"hoje",    label:"Hoje",         getRange:()=>({ s:acTodayISO(), e:acTodayISO() }) },
  { key:"7d",      label:"7 dias",        getRange:()=>({ s:acNDaysAgoISO(6), e:acTodayISO() }) },
  { key:"30d",     label:"30 dias",       getRange:()=>({ s:acNDaysAgoISO(29), e:acTodayISO() }) },
  { key:"mes",     label:"Este mês",      getRange:()=>{ const d=new Date(); return { s:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`, e:acTodayISO() }; } },
  { key:"mes-ant", label:"Mês anterior",  getRange:()=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),last=new Date(y,d.getMonth()+1,0); return { s:`${y}-${m}-01`, e:`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,"0")}-${String(last.getDate()).padStart(2,"0")}` }; } },
  { key:"custom",  label:"Personalizado", getRange:null },
];

const HF_SITUACOES = {
  faltando_dados: { label:"Faltando Dados",  cls:"warn" },
  aguardando:     { label:"Aguardando",       cls:"info" },
  aguardando_cte: { label:"Aguardando CT-e",  cls:"info" },
  em_transito:    { label:"Em Trânsito",      cls:"ok"   },
  entregue:       { label:"Entregue",         cls:"ok"   },
  cancelado:      { label:"Cancelado",        cls:"crit" },
};

// ── Componente Histórico de Fretes ────────────────────────────────────────────
const HistoricoFretes = () => {
  const { useState, useEffect, useMemo } = React;

  const init30d = HF_PERIODS.find(x => x.key === "30d").getRange();

  const [fCliente,   setFCliente]   = useState("");
  const [fOrigem,    setFOrigem]    = useState("");
  const [fDestino,   setFDestino]   = useState("");
  const [fMaterial,  setFMaterial]  = useState("");
  const [fPeriodo,   setFPeriodo]   = useState("30d");
  const [fDataInicio,setFDataInicio]= useState(init30d.s);
  const [fDataFim,   setFDataFim]   = useState(init30d.e);

  const [opcoes,     setOpcoes]     = useState({ clientes:[], origens:[], destinos:[], materiais:[] });
  const [fretes,     setFretes]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const [busca,      setBusca]      = useState("");
  const [sortCol,    setSortCol]    = useState("data");
  const [sortDir,    setSortDir]    = useState("desc");
  const [page,       setPage]       = useState(0);
  const PAGE_SIZE = 20;

  const [applied,    setApplied]    = useState({ dataInicio: init30d.s, dataFim: init30d.e });

  useEffect(() => {
    window.RB_API.listOpcoes()
      .then(d => { if (d) setOpcoes({ clientes:d.clientes||[], origens:d.origens||[], destinos:d.destinos||[], materiais:d.materiais||[] }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setPage(0);
    const params = {};
    if (applied.cliente)    params.cliente    = applied.cliente;
    if (applied.origem)     params.origem     = applied.origem;
    if (applied.destino)    params.destino    = applied.destino;
    if (applied.material)   params.material   = applied.material;
    if (applied.dataInicio) params.dataInicio = applied.dataInicio;
    if (applied.dataFim)    params.dataFim    = applied.dataFim;
    params.limit = 500;
    window.RB_API.listViagens(params)
      .then(d => { if (active) setFretes(Array.isArray(d) ? d : []); })
      .catch(e => { if (active) { setFretes([]); setError(e?.message || "Erro ao carregar fretes."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied]);

  const applyPeriodShortcut = (key) => {
    const p = HF_PERIODS.find(x => x.key === key);
    setFPeriodo(key);
    if (p && p.getRange) { const r = p.getRange(); setFDataInicio(r.s); setFDataFim(r.e); }
  };

  const applyFilters = () => {
    setApplied({
      cliente:    fCliente.trim()   || undefined,
      origem:     fOrigem.trim()    || undefined,
      destino:    fDestino.trim()   || undefined,
      material:   fMaterial.trim()  || undefined,
      dataInicio: fDataInicio       || undefined,
      dataFim:    fDataFim          || undefined,
    });
  };

  const clearFilters = () => {
    const r = HF_PERIODS.find(x => x.key === "30d").getRange();
    setFCliente(""); setFOrigem(""); setFDestino(""); setFMaterial("");
    setFPeriodo("30d"); setFDataInicio(r.s); setFDataFim(r.e);
    setBusca("");
    setApplied({ dataInicio: r.s, dataFim: r.e });
  };

  const sorted = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let list = fretes;
    if (q) list = list.filter(v =>
      [v.numero, v.cliente, v.clienteFinal, v.origem, v.destino, v.material, v.placa, v.motorista]
        .some(x => (x || "").toLowerCase().includes(q))
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortCol === "data")         return dir * ((a.data || "") < (b.data || "") ? -1 : 1);
      if (sortCol === "cliente")      return dir * ((a.cliente || "") < (b.cliente || "") ? -1 : 1);
      if (sortCol === "valorCliente") return dir * (acNum(a.valorCliente) - acNum(b.valorCliente));
      if (sortCol === "rota")         return dir * ((a.origem || "") < (b.origem || "") ? -1 : 1);
      return 0;
    });
  }, [fretes, busca, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };

  const valorTotal  = fretes.reduce((s, v) => s + acNum(v.valorCliente), 0);
  const ticketMedio = fretes.length > 0 ? valorTotal / fretes.length : 0;
  const ultimaData  = fretes.reduce((lat, v) => (!lat || (v.data && v.data > lat) ? v.data : lat), null);

  const exportCsv = () => {
    const h = ["Data","N°","Cliente","Origem","Destino","Material","Placa","Motorista","Peso (kg)","Valor","Status"];
    const rows = sorted.map(v => [
      acDateFmt(v.data), v.numero||"", v.cliente||"",
      [v.origem, v.ufOrigem].filter(Boolean).join("/"),
      [v.destino, v.ufDestino].filter(Boolean).join("/"),
      v.material||"", v.placa||"", v.motorista||"",
      v.peso||"", acNum(v.valorCliente).toFixed(2), v.situacao||"",
    ]);
    const csv = [h, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "historico-fretes.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const iS = { height:32, padding:"0 10px", border:"1px solid var(--border)", borderRadius:"var(--r)", background:"var(--surface)", color:"var(--text)", fontSize:12.5, outline:"none", boxSizing:"border-box", width:"100%" };
  const SortArrow = ({ col }) => (
    <span style={{ marginLeft:4, opacity:sortCol===col?1:0.3, color:sortCol===col?"var(--accent)":"inherit" }}>
      {sortCol===col?(sortDir==="asc"?"↑":"↓"):"↕"}
    </span>
  );

  const activeFiltersCount = [applied.cliente, applied.origem, applied.destino, applied.material].filter(Boolean).length;

  return (
    <div>
      {/* ── Painel de filtros ── */}
      <div className="card" style={{ marginBottom:16, padding:"16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <span style={{ fontSize:11.5, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
            Filtros{activeFiltersCount > 0 && <span className="badge info" style={{ marginLeft:8, fontSize:10 }}>{activeFiltersCount} ativo{activeFiltersCount>1?"s":""}</span>}
          </span>
        </div>

        {/* Linha 1: campos de texto */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
          {[
            { label:"Cliente",  value:fCliente,  set:setFCliente,  listId:"hf-clientes",  opts:opcoes.clientes  },
            { label:"Origem",   value:fOrigem,   set:setFOrigem,   listId:"hf-origens",   opts:opcoes.origens   },
            { label:"Destino",  value:fDestino,  set:setFDestino,  listId:"hf-destinos",  opts:opcoes.destinos  },
            { label:"Material", value:fMaterial, set:setFMaterial, listId:"hf-materiais", opts:opcoes.materiais },
          ].map(({ label, value, set, listId, opts }) => (
            <div key={label}>
              <div style={{ fontSize:11, color:"var(--text-3)", fontWeight:500, marginBottom:4 }}>{label}</div>
              <input list={listId} value={value} onChange={e => set(e.target.value)} placeholder="Todos" style={iS}/>
              <datalist id={listId}>{opts.map(o => <option key={o} value={o}/>)}</datalist>
            </div>
          ))}
        </div>

        {/* Linha 2: período */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"var(--text-3)", fontWeight:500, flexShrink:0, marginRight:2 }}>Período:</span>
          {HF_PERIODS.map(p => (
            <button key={p.key}
              className={`btn${fPeriodo===p.key?" primary":""}`}
              style={{ padding:"3px 10px", fontSize:11.5 }}
              onClick={() => applyPeriodShortcut(p.key)}>
              {p.label}
            </button>
          ))}
          <input type="date" value={fDataInicio} onChange={e => { setFDataInicio(e.target.value); setFPeriodo("custom"); }}
            style={{ height:30, border:"1px solid var(--border)", borderRadius:"var(--r)", background:"var(--surface)", color:"var(--text)", fontSize:12, padding:"0 8px", outline:"none" }}/>
          <span className="muted" style={{ fontSize:12 }}>até</span>
          <input type="date" value={fDataFim} onChange={e => { setFDataFim(e.target.value); setFPeriodo("custom"); }}
            style={{ height:30, border:"1px solid var(--border)", borderRadius:"var(--r)", background:"var(--surface)", color:"var(--text)", fontSize:12, padding:"0 8px", outline:"none" }}/>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button className="btn" onClick={clearFilters}><Icon name="x" size={12}/> Limpar</button>
            <button className="btn primary" onClick={applyFilters}><Icon name="search" size={12}/> Filtrar</button>
          </div>
        </div>
      </div>

      {/* Banner de status */}
      {(loading || error) && (
        <div className="card" style={{ marginBottom:12, padding:"9px 14px", borderColor:error?"var(--crit-border)":"var(--border)" }}>
          <span className={error?"kpi-delta down":"muted"} style={{ fontSize:12.5 }}>
            {loading ? "Carregando fretes…" : `⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs resumo ── */}
      <div className="grid cols-4" style={{ marginBottom:14 }}>
        <div className="kpi" style={{ borderLeft:"3px solid #4f7fab" }}>
          <div className="kpi-label"><Icon name="route"/><span>Fretes encontrados</span></div>
          <div className="kpi-value">{fretes.length}</div>
          <span className="kpi-delta flat">{sorted.length !== fretes.length ? `${sorted.length} exibidos` : "no período"}</span>
        </div>
        <div className="kpi" style={{ borderLeft:"3px solid #22c55e" }}>
          <div className="kpi-label"><Icon name="money"/><span>Valor total</span></div>
          <div className="kpi-value">{acBRL(valorTotal)}</div>
          <span className="kpi-delta flat">soma dos fretes</span>
        </div>
        <div className="kpi" style={{ borderLeft:"3px solid #818cf8" }}>
          <div className="kpi-label"><Icon name="gauge"/><span>Ticket médio</span></div>
          <div className="kpi-value">{acBRL(ticketMedio)}</div>
          <span className="kpi-delta flat">por frete</span>
        </div>
        <div className="kpi" style={{ borderLeft:"3px solid #fbbf24" }}>
          <div className="kpi-label"><Icon name="clock"/><span>Último frete</span></div>
          <div className="kpi-value" style={{ fontSize:17 }}>{acDateFmt(ultimaData)}</div>
          <span className="kpi-delta flat">data mais recente</span>
        </div>
      </div>

      {/* ── Tabela de fretes ── */}
      <div className="card card-flush" style={{ marginBottom:16 }}>
        <div className="card-header">
          <h3>Fretes</h3>
          <div className="row" style={{ gap:8 }}>
            <div style={{ position:"relative" }}>
              <Icon name="search" size={13} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"var(--text-4)", pointerEvents:"none" }}/>
              <input type="text" placeholder="Buscar em todos os campos…"
                value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }}
                style={{ height:28, paddingLeft:27, paddingRight:8, border:"1px solid var(--border)", borderRadius:"var(--r)", background:"var(--surface-2)", fontSize:12.5, width:220, outline:"none" }}/>
            </div>
            <span className="muted" style={{ fontSize:11.5 }}>{sorted.length} frete{sorted.length!==1?"s":""}</span>
            <button className="btn" style={{ padding:"3px 10px", fontSize:12 }} onClick={exportCsv}><Icon name="download" size={12}/> CSV</button>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ cursor:"pointer", whiteSpace:"nowrap" }} onClick={() => toggleSort("data")}>Data <SortArrow col="data"/></th>
              <th>N°</th>
              <th style={{ cursor:"pointer" }} onClick={() => toggleSort("cliente")}>Cliente <SortArrow col="cliente"/></th>
              <th style={{ cursor:"pointer" }} onClick={() => toggleSort("rota")}>Rota <SortArrow col="rota"/></th>
              <th>Material</th>
              <th>Placa</th>
              <th>Motorista</th>
              <th className="num">Peso</th>
              <th className="num" style={{ cursor:"pointer" }} onClick={() => toggleSort("valorCliente")}>Valor <SortArrow col="valorCliente"/></th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan="10" className="muted" style={{ padding:24, textAlign:"center", fontSize:12.5 }}>
                {loading ? "Carregando…" : busca ? "Nenhum resultado para a busca." : "Nenhum frete encontrado com os filtros aplicados."}
              </td></tr>
            )}
            {pageRows.map(v => {
              const sit = HF_SITUACOES[v.situacao] || { label:v.situacao||"—", cls:"" };
              return (
                <tr key={v.id}>
                  <td className="date" style={{ whiteSpace:"nowrap" }}>
                    {v.data ? new Date(v.data+"T12:00:00").toLocaleDateString("pt-BR",{ day:"2-digit", month:"2-digit", year:"2-digit" }) : "—"}
                  </td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:12, whiteSpace:"nowrap" }}>{v.numero || "—"}</td>
                  <td style={{ maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={v.cliente}>{v.cliente || "—"}</td>
                  <td style={{ fontSize:12, whiteSpace:"nowrap" }}>
                    <span>{[v.origem, v.ufOrigem].filter(Boolean).join("/") || "—"}</span>
                    <span className="muted" style={{ margin:"0 4px" }}>→</span>
                    <span>{[v.destino, v.ufDestino].filter(Boolean).join("/") || "—"}</span>
                  </td>
                  <td style={{ maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.material || "—"}</td>
                  <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{v.placa || "—"}</td>
                  <td style={{ maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.motorista || "—"}</td>
                  <td className="num">{v.peso ? `${acNum(v.peso).toLocaleString("pt-BR")} kg` : "—"}</td>
                  <td className="num" style={{ fontWeight:500 }}>{v.valorCliente ? acBRL(v.valorCliente) : "—"}</td>
                  <td><span className={`badge ${sit.cls}`}><span className="dot"/>{sit.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="tbl-footer">
            <span>Página {page+1} de {totalPages} · {sorted.length} fretes</span>
            <div className="pager">
              <button onClick={() => setPage(0)} disabled={page===0}>«</button>
              <button onClick={() => setPage(p => p-1)} disabled={page===0}>‹</button>
              <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages-1}>›</button>
              <button onClick={() => setPage(totalPages-1)} disabled={page>=totalPages-1}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Cores ─────────────────────────────────────────────────────────────────────
const AC_COLORS = {
  estrategico: "#22c55e",
  ativo:       "#38bdf8",
  potencial:   "#818cf8",
  atencao:     "#fbbf24",
  parado:      "#f87171",
  bar:         "#4f7fab",
  barHov:      "#6a98c4",
};

// ── Labels de status / ação ───────────────────────────────────────────────────
const STATUS_LABELS = {
  estrategico: "Estratégico",
  ativo:       "Ativo",
  potencial:   "Potencial",
  atencao:     "Atenção",
  parado:      "Parado",
};
const ACAO_LABELS = {
  "manter-relacionamento": "Manter relacionamento",
  "entrar-contato":        "Entrar em contato",
  "cliente-parado":        "Cliente parado",
  "recuperar-cliente":     "Recuperar cliente",
  "potencial":             "Cliente potencial",
};

// ── Injeção de CSS (animações) ────────────────────────────────────────────────
function acInjectStyles() {
  const id = "rb-ac-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    @keyframes acFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .ac-bar-in  { animation: acFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; }
    .ac-card-in { animation: acFadeUp 0.35s ease forwards; }
    .ac-prog { transition: width 0.6s ease; }
    .tbl tbody tr.clickable:hover td { background: var(--hover); }
    .ac-rank-tab.active { color: var(--brand-blue); border-bottom: 2px solid var(--brand-blue); }
    .ac-rank-tab { border-bottom: 2px solid transparent; padding: 6px 12px; cursor:pointer; font-size:12.5px; font-weight:500; color:var(--text-3); transition:color 0.15s; }
    .ac-rank-tab:hover { color: var(--text); }
  `;
  document.head.appendChild(s);
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
const AcStatusBadge = ({ status }) => {
  const COLOR = {
    estrategico: "ok",
    ativo:       "info",
    potencial:   "",
    atencao:     "warn",
    parado:      "crit",
  };
  const cls = COLOR[status] || "";
  return (
    <span className={`badge ${cls}`} style={status==="potencial"?{background:"rgba(129,140,248,0.15)",color:"#818cf8",border:"1px solid rgba(129,140,248,0.3)"}:{}}>
      <span className="dot"/>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

// ── AcaoBadge ─────────────────────────────────────────────────────────────────
const AcAcaoBadge = ({ acao }) => {
  const MAP = {
    "manter-relacionamento": { cls:"ok",     icon:"check" },
    "entrar-contato":        { cls:"warn",   icon:"bell" },
    "cliente-parado":        { cls:"crit",   icon:"alert" },
    "recuperar-cliente":     { cls:"crit",   icon:"trending-up" },
    "potencial":             { cls:"",       icon:"trending-up" },
  };
  const { cls, icon } = MAP[acao] || { cls:"", icon:"info" };
  return (
    <span className={`badge ${cls}`} style={acao==="potencial"?{background:"rgba(129,140,248,0.15)",color:"#818cf8",border:"1px solid rgba(129,140,248,0.3)"}:{}}>
      <Icon name={icon} size={11}/> {ACAO_LABELS[acao] || acao}
    </span>
  );
};

// ── Modal de detalhe do cliente ───────────────────────────────────────────────
const AcClienteModal = ({ row, onClose }) => {
  if (!row) return null;
  const fields = [
    ["Cliente",            row.nome],
    ["Documento",          row.documento || "—"],
    ["Status comercial",   <AcStatusBadge status={row.statusComercial}/>],
    ["Ação sugerida",      <AcAcaoBadge acao={row.acaoSugerida}/>],
    ["Total no período",   acBRL(row.totalPeriodo)],
    ["Total anterior",     acBRL(row.totalAnterior)],
    ["Crescimento",        row.crescimento !== null ? (
      <span className={`kpi-delta ${acNum(row.crescimento)>=0?"up":"down"}`}>
        {acNum(row.crescimento)>=0?"▲":"▼"} {Math.abs(acNum(row.crescimento)).toFixed(1)}%
      </span>
    ) : "—"],
    ["Lançamentos",        row.lancamentos],
    ["Ticket médio",       acBRL(row.ticketMedio)],
    ["Último faturamento", acDateFmt(row.ultimoFaturamento)],
    ["Dias sem faturar",   row.diasSemFaturar != null ? `${row.diasSemFaturar} dias` : "—"],
    ["1º faturamento",     acDateFmt(row.primeiroFaturamento)],
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
         onClick={onClose}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",width:460,maxWidth:"100%",maxHeight:"82vh",overflowY:"auto"}}
           onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:"-0.01em"}}>Detalhe do cliente</span>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        {fields.map(([label,value])=>(
          <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--divider)",fontSize:13}}>
            <span style={{color:"var(--text-3)"}}>{label}</span>
            <span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const AnaliseClientes = () => {
  const defaultRange = AC_PERIODS[3].getRange(); // 12 meses

  const [viewMode,     setViewMode]     = React.useState("fretes"); // "clientes" | "fretes"
  const [periodo,      setPeriodo]      = React.useState("12m");
  const [dataInicio,   setDataInicio]   = React.useState(defaultRange.start);
  const [dataFim,      setDataFim]      = React.useState(defaultRange.end);
  const [manualFilter, setManualFilter] = React.useState(null);
  const [clienteSearch,setClienteSearch]= React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("todos");

  const [data,         setData]         = React.useState(null);
  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState("");

  const [hoveredBar,   setHoveredBar]   = React.useState(null);
  const [hoveredClient,setHoveredClient]= React.useState(null);
  const [selectedRow,  setSelectedRow]  = React.useState(null);
  const [tableSearch,  setTableSearch]  = React.useState("");
  const [sortCol,      setSortCol]      = React.useState("totalPeriodo");
  const [sortDir,      setSortDir]      = React.useState("desc");
  const [tablePage,    setTablePage]    = React.useState(0);
  const [chartKey,     setChartKey]     = React.useState(0);
  const [rankTab,      setRankTab]      = React.useState("top");
  const PAGE_SIZE = 20;

  React.useEffect(() => { acInjectStyles(); }, []);

  // ── Fetch de dados ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setTablePage(0);
    const filters = manualFilter
      ? { dataInicio: manualFilter.dataInicio, dataFim: manualFilter.dataFim }
      : { period: periodo };
    if (statusFilter !== "todos") filters.status = statusFilter;
    window.RB_API.getAnaliseClientes(filters)
      .then(d => { if (active) { setData(d); setChartKey(k=>k+1); } })
      .catch(e => { if (active) { setData(null); setError(e?.message || "Não foi possível carregar dados."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, manualFilter, statusFilter]);

  const periodLabel = manualFilter
    ? `${acDateFmt(manualFilter.dataInicio)} a ${acDateFmt(manualFilter.dataFim)}`
    : AC_PERIODS.find(p=>p.key===periodo)?.label || "12 meses";

  const applyManualFilter = () => {
    if (!dataInicio && !dataFim) return;
    setPeriodo("custom"); setManualFilter({ dataInicio, dataFim });
  };
  const clearFilter = () => {
    const r = AC_PERIODS[3].getRange();
    setDataInicio(r.start); setDataFim(r.end);
    setManualFilter(null); setPeriodo("12m"); setStatusFilter("todos");
    setClienteSearch("");
  };
  const selectShortcut = (key) => {
    const p = AC_PERIODS.find(x=>x.key===key);
    if (p) { const r=p.getRange(); setDataInicio(r.start); setDataFim(r.end); }
    setManualFilter(null); setPeriodo(key);
  };

  // ── Dados derivados ─────────────────────────────────────────────────────────
  const summary  = data?.summary  || {};
  const monthly  = data?.monthly  || [];
  const topCli   = data?.topClientesMonthly || [];
  const clients  = data?.clients  || [];

  const totalFaturado   = acNum(summary.totalFaturado);
  const clientesAtivos  = acNum(summary.clientesAtivos);
  const ticketMedio     = acNum(summary.ticketMedio);
  const inativo30       = acNum(summary.inativo30);
  const inativo60       = acNum(summary.inativo60);
  const inativo90       = acNum(summary.inativo90);
  const inativo120      = acNum(summary.inativo120);

  // Máximos para gráficos
  const maxMonthly = Math.max(1, ...monthly.map(m=>acNum(m.valorTotal)));

  // Top 10 clientes no período (calculado do array de clients)
  const top10 = React.useMemo(() => {
    return [...clients]
      .filter(c=>acNum(c.totalPeriodo)>0)
      .sort((a,b)=>acNum(b.totalPeriodo)-acNum(a.totalPeriodo))
      .slice(0,10);
  }, [clients]);

  // Rankings
  const rankTop = React.useMemo(()=>
    [...clients].filter(c=>acNum(c.totalPeriodo)>0).sort((a,b)=>acNum(b.totalPeriodo)-acNum(a.totalPeriodo)).slice(0,8),
    [clients]);
  const rankGrowth = React.useMemo(()=>
    [...clients].filter(c=>c.crescimento!==null&&acNum(c.crescimento)>0&&acNum(c.totalPeriodo)>0)
      .sort((a,b)=>acNum(b.crescimento)-acNum(a.crescimento)).slice(0,8),
    [clients]);
  const rankDecline = React.useMemo(()=>
    [...clients].filter(c=>c.crescimento!==null&&acNum(c.crescimento)<0&&acNum(c.totalAnterior)>0)
      .sort((a,b)=>acNum(a.crescimento)-acNum(b.crescimento)).slice(0,8),
    [clients]);
  const rankInactive = React.useMemo(()=>
    [...clients].filter(c=>acNum(c.diasSemFaturar)>30)
      .sort((a,b)=>acNum(b.diasSemFaturar)-acNum(a.diasSemFaturar)).slice(0,8),
    [clients]);

  // Dados do ranking ativo
  const rankData = { top:rankTop, crescimento:rankGrowth, queda:rankDecline, parados:rankInactive };
  const rankTabs = [
    { key:"top",        label:"Top faturamento" },
    { key:"crescimento",label:"Maior crescimento" },
    { key:"queda",      label:"Maior queda" },
    { key:"parados",    label:"Mais tempo parado" },
  ];

  // Evolução dos top 5 clientes (para mini sparklines)
  const top5Codes = React.useMemo(()=>top10.slice(0,5).map(c=>c.codigo), [top10]);
  const top5Names = React.useMemo(()=>{
    const map={};
    top10.slice(0,5).forEach(c=>{ map[c.codigo]=c.nome; });
    return map;
  }, [top10]);
  const top5Monthly = React.useMemo(()=>{
    const months = [...new Set(monthly.map(m=>m.mes))].sort();
    return top5Codes.map(cod=>{
      const vals = months.map(mes=>{
        const row=topCli.find(r=>r.codigo===cod&&r.mes===mes);
        return row?acNum(row.valor):0;
      });
      return { codigo:cod, nome:top5Names[cod]||"?", vals };
    });
  }, [top5Codes, top5Names, topCli, monthly]);

  // Distribuição do faturamento (top N + outros)
  const distribData = React.useMemo(()=>{
    const top5 = [...clients].filter(c=>acNum(c.totalPeriodo)>0).sort((a,b)=>acNum(b.totalPeriodo)-acNum(a.totalPeriodo)).slice(0,5);
    const othersVal = totalFaturado - top5.reduce((s,c)=>s+acNum(c.totalPeriodo),0);
    const colors = ["#4f7fab","#22c55e","#818cf8","#fbbf24","#f87171","#71717a"];
    const items = top5.map((c,i)=>({ nome:c.nome, valor:acNum(c.totalPeriodo), color:colors[i]||colors[0] }));
    if (othersVal>0) items.push({ nome:"Outros", valor:othersVal, color:colors[5] });
    return items;
  }, [clients, totalFaturado]);

  // Tabela de clientes (filtrada + paginada)
  const sortedClients = React.useMemo(()=>{
    const q = tableSearch.trim().toLowerCase();
    let list = clients;
    if (q) list = list.filter(c=>(c.nome||"").toLowerCase().includes(q)||(c.documento||"").includes(q));
    if (clienteSearch.trim()) {
      const s = clienteSearch.trim().toLowerCase();
      list = list.filter(c=>(c.nome||"").toLowerCase().includes(s));
    }
    const dir = sortDir==="asc"?1:-1;
    return [...list].sort((a,b)=>{
      if (sortCol==="nome")           return dir*((a.nome||"")<(b.nome||"")?-1:1);
      if (sortCol==="totalPeriodo")   return dir*(acNum(a.totalPeriodo)-acNum(b.totalPeriodo));
      if (sortCol==="diasSemFaturar") return dir*(acNum(a.diasSemFaturar)-acNum(b.diasSemFaturar));
      if (sortCol==="ticketMedio")    return dir*(acNum(a.ticketMedio)-acNum(b.ticketMedio));
      if (sortCol==="lancamentos")    return dir*(acNum(a.lancamentos)-acNum(b.lancamentos));
      if (sortCol==="statusComercial")return dir*((a.statusComercial||"")<(b.statusComercial||"")?-1:1);
      return 0;
    });
  }, [clients, tableSearch, clienteSearch, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedClients.length/PAGE_SIZE));
  const pageRows   = sortedClients.slice(tablePage*PAGE_SIZE, (tablePage+1)*PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("desc"); }
    setTablePage(0);
  };
  const SortArrow = ({col})=>(
    <span style={{marginLeft:4,opacity:sortCol===col?1:0.3,color:sortCol===col?"var(--accent)":"inherit"}}>
      {sortCol===col?(sortDir==="asc"?"↑":"↓"):"↕"}
    </span>
  );

  const exportCsv = () => {
    const header = ["Cliente","Documento","Último Faturamento","Total Período","Total Anterior","Crescimento %","Lançamentos","Ticket Médio","Dias Sem Faturar","Status","Ação"];
    const lines = sortedClients.map(c=>[
      c.nome||"",c.documento||"",acDateFmt(c.ultimoFaturamento),
      acNum(c.totalPeriodo).toFixed(2),acNum(c.totalAnterior).toFixed(2),
      c.crescimento!==null?acNum(c.crescimento).toFixed(1):"",
      c.lancamentos,acNum(c.ticketMedio).toFixed(2),
      c.diasSemFaturar,
      STATUS_LABELS[c.statusComercial]||c.statusComercial,
      ACAO_LABELS[c.acaoSugerida]||c.acaoSugerida,
    ]);
    const csv=[header,...lines].map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url; a.download=`analise-clientes-${periodLabel.replace(/\s+/g,"-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="view">
      <AcClienteModal row={selectedRow} onClose={()=>setSelectedRow(null)}/>

      {/* ── Cabeçalho ── */}
      <div className="page-head">
        <div>
          <h1>Análise de Clientes</h1>
          <div className="sub">{viewMode==="fretes" ? "Histórico de fretes · viagens cadastradas" : `financeiro.receber · ${periodLabel}`}</div>
        </div>
        <div className="actions">
          {viewMode==="clientes" && AC_PERIODS.map(p=>(
            <button key={p.key}
                    className={`btn${!manualFilter&&periodo===p.key?" primary":""}`}
                    onClick={()=>selectShortcut(p.key)}>{p.label}</button>
          ))}
          {viewMode==="clientes" && <button className="btn" onClick={exportCsv}><Icon name="download"/> Exportar</button>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="card" style={{ padding:0, marginBottom:16, overflow:"hidden" }}>
        <div style={{ display:"flex", borderBottom:"1px solid var(--divider)" }}>
          {[
            { key:"fretes",   label:"Histórico de Fretes", icon:"route"  },
            { key:"clientes", label:"Análise de Clientes",  icon:"user"  },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setViewMode(tab.key)}
              style={{
                flex:1, padding:"12px 16px", background:"transparent",
                borderBottom:`2px solid ${viewMode===tab.key?"var(--brand-blue)":"transparent"}`,
                color: viewMode===tab.key ? "var(--brand-blue)" : "var(--text-3)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                fontSize:13, fontWeight:viewMode===tab.key?600:400, transition:"all 120ms",
              }}>
              <Icon name={tab.icon} size={14}/>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Histórico de Fretes ── */}
      {viewMode === "fretes" && <HistoricoFretes/>}

      {/* ── Análise de Clientes (conteúdo original, só mostra se aba ativa) ── */}
      {viewMode === "clientes" && <>

      {/* ── Filtros ── */}
      <div className="period-filter">
        <label>Data inicial
          <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)}/>
        </label>
        <label>Data final
          <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)}/>
        </label>
        <select
          value={statusFilter}
          onChange={e=>setStatusFilter(e.target.value)}
          style={{height:30,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",fontSize:12.5,padding:"0 8px",color:"var(--text)"}}>
          <option value="todos">Todos os clientes</option>
          <option value="ativo">Faturando ativamente</option>
          <option value="sem-faturamento">Sem faturamento recente</option>
        </select>
        <button className="btn primary" onClick={applyManualFilter}>Aplicar</button>
        <button className="btn" onClick={clearFilter}><Icon name="x" size={12}/> Limpar</button>
        {manualFilter && <span className="badge info">Filtro personalizado ativo</span>}
        <span className="muted" style={{marginLeft:"auto",fontSize:11.5}}>Base: dataemissaorec · financeiro.receber</span>
      </div>

      {/* ── Banner de status ── */}
      {(loading||error) && (
        <div className="card" style={{marginBottom:16,padding:"9px 14px",borderColor:error?"var(--crit-border)":"var(--border)"}}>
          <span className={error?"kpi-delta down":"muted"} style={{fontSize:12.5}}>
            {loading?"Carregando análise de clientes…":`⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs — Linha 1 ── */}
      <div className="grid cols-4" style={{marginBottom:14}}>
        <div className="kpi" style={{borderLeft:"3px solid #22c55e"}}>
          <div className="kpi-label"><Icon name="money"/><span>Total faturado</span></div>
          <div className="kpi-value">{acBRL(totalFaturado)}</div>
          <span className="kpi-delta flat">{periodLabel}</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #38bdf8"}}>
          <div className="kpi-label"><Icon name="user"/><span>Clientes ativos</span></div>
          <div className="kpi-value">{clientesAtivos}</div>
          <span className="kpi-delta flat">faturaram no período</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #818cf8"}}>
          <div className="kpi-label"><Icon name="gauge"/><span>Ticket médio / cliente</span></div>
          <div className="kpi-value">{acBRL(ticketMedio)}</div>
          <span className="kpi-delta flat">faturamento ÷ clientes</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #f59e0b"}}>
          <div className="kpi-label"><Icon name="trending-up"/><span>Top cliente</span></div>
          <div className="kpi-value" style={{fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {summary.topCliente?.nome || "—"}
          </div>
          <span className="kpi-delta up" style={{fontSize:11}}>{summary.topCliente?acBRL(summary.topCliente.valor):""}</span>
        </div>
      </div>

      {/* ── KPIs — Linha 2 (inativos) ── */}
      <div className="grid cols-4" style={{marginBottom:16}}>
        {[
          { label:"Sem faturar 30–60d", val:inativo30,  color:"#fbbf24", desc:"atenção comercial" },
          { label:"Sem faturar 60–90d", val:inativo60,  color:"#f97316", desc:"contato urgente" },
          { label:"Sem faturar 90–120d",val:inativo90,  color:"#ef4444", desc:"cliente parado" },
          { label:"Sem faturar 120d+",  val:inativo120, color:"#b91c1c", desc:"recuperar" },
        ].map(({label,val,color,desc})=>(
          <div key={label} className="kpi" style={{borderLeft:`3px solid ${color}`}}>
            <div className="kpi-label"><Icon name="clock"/><span>{label}</span></div>
            <div className="kpi-value" style={{color:val>0?color:"inherit"}}>{val}</div>
            <span className="kpi-delta flat" style={{color:val>0?color:"var(--text-4)"}}>{desc}</span>
          </div>
        ))}
      </div>

      {/* ── Gráfico mensal + Distribuição ── */}
      <div className="grid cols-2-1" style={{marginBottom:16}}>

        {/* Faturamento mensal */}
        <div className="card card-flush chart-card">
          <div className="card-header">
            <h3>Faturamento por mês</h3>
            <div className="row" style={{gap:8,fontSize:11.5}}>
              <span className="muted">{monthly.length} meses</span>
            </div>
          </div>
          <div className="card-body" style={{paddingTop:16,paddingBottom:12}}>
            {monthly.length===0&&!loading&&(
              <div className="muted" style={{textAlign:"center",padding:"28px 0",fontSize:12.5}}>Sem dados no período</div>
            )}
            {monthly.length>0&&(
              <div key={chartKey} className="chart-plot" style={{
                display:"grid",
                gridTemplateColumns:`repeat(${monthly.length}, minmax(24px, 1fr))`,
                gap:5,height:170,alignItems:"flex-end",
              }}>
                {monthly.map((item,idx)=>{
                  const val=acNum(item.valorTotal);
                  const barH=val>0?Math.max(Math.round((val/maxMonthly)*148),6):2;
                  const isHov=hoveredBar===idx;
                  return (
                    <div key={`${item.mes}-${chartKey}`}
                         className="ac-bar-in"
                         style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,justifyContent:"flex-end",height:"100%",position:"relative",cursor:"default",animationDelay:`${idx*25}ms`}}
                         onMouseEnter={()=>setHoveredBar(idx)}
                         onMouseLeave={()=>setHoveredBar(null)}>
                      {/* Tooltip */}
                      {isHov&&(
                        <div className="chart-tooltip" style={{bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"var(--surface)",border:"1px solid var(--border-strong)",borderRadius:8,padding:"10px 13px",fontSize:12,whiteSpace:"nowrap",boxShadow:"var(--shadow-lg)",lineHeight:1.8,minWidth:200}}>
                          <div style={{fontWeight:600,fontSize:12.5,marginBottom:6,color:"var(--text)"}}>{item.label}</div>
                          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"1px 12px"}}>
                            <span style={{color:"var(--text-3)"}}>Faturado</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{acBRL(val)}</span>
                            <span style={{color:"var(--text-3)"}}>Clientes</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{item.clientesCount}</span>
                            <span style={{color:"var(--text-3)"}}>Lançamentos</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{item.lancamentos}</span>
                          </div>
                        </div>
                      )}
                      <div style={{
                        width:"100%",height:barH,borderRadius:4,
                        background:isHov?AC_COLORS.barHov:AC_COLORS.bar,
                        transition:"background 0.15s, opacity 0.15s",
                        opacity:isHov?1:0.85,
                      }}/>
                      <span style={{fontSize:9.5,color:"var(--text-3)",textAlign:"center",lineHeight:1.2}}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Distribuição do faturamento */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Distribuição</h3>
            <span className="meta muted">{clients.filter(c=>acNum(c.totalPeriodo)>0).length} clientes</span>
          </div>
          <div className="card-body">
            {distribData.length===0&&(
              <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>
            )}
            {distribData.length>0&&(
              <>
                {/* Stacked bar */}
                <div style={{display:"flex",height:12,borderRadius:6,overflow:"hidden",marginBottom:16,gap:1}}>
                  {distribData.map(d=>{
                    const pct=totalFaturado>0?(d.valor/totalFaturado*100):0;
                    return <div key={d.nome} style={{flex:pct,background:d.color,minWidth:4,transition:"flex 0.6s ease"}} title={`${d.nome}: ${pct.toFixed(1)}%`}/>;
                  })}
                </div>
                {/* Legend + bars */}
                {distribData.map(d=>{
                  const pct=totalFaturado>0?(d.valor/totalFaturado*100):0;
                  const maxVal=distribData[0]?.valor||1;
                  const relPct=d.valor/maxVal*100;
                  return (
                    <div key={d.nome} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3,gap:6}}>
                        <span style={{display:"flex",alignItems:"center",gap:6,overflow:"hidden",minWidth:0}}>
                          <span style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0,display:"inline-block"}}/>
                          <span style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text-2)"}}>{d.nome}</span>
                        </span>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)",flexShrink:0}}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden",marginLeft:14}}>
                        <div className="ac-prog" style={{width:`${relPct.toFixed(1)}%`,height:"100%",background:d.color,borderRadius:2}}/>
                      </div>
                      <div style={{fontSize:11,color:"var(--text-3)",marginTop:2,textAlign:"right",fontFamily:"var(--font-mono)"}}>{acBRL(d.valor)}</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Top 10 clientes + Evolução clientes ativos ── */}
      <div className="grid cols-2" style={{marginBottom:16}}>

        {/* Top 10 por faturamento */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Top 10 Clientes</h3>
            <span className="meta muted">por valor no período</span>
          </div>
          <div className="card-body">
            {top10.length===0&&(
              <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>
            )}
            {top10.map((c,i)=>{
              const maxVal=top10[0]?.totalPeriodo||1;
              const pct=acNum(c.totalPeriodo)/acNum(maxVal)*100;
              const isHov=hoveredClient===c.codigo;
              return (
                <div key={c.codigo||i} style={{marginBottom:i<top10.length-1?12:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:3}}>
                    <span style={{display:"flex",gap:7,alignItems:"center",overflow:"hidden",minWidth:0}}>
                      <span style={{color:"var(--text-4)",fontFamily:"var(--font-mono)",fontSize:10.5,width:18,flexShrink:0,textAlign:"right"}}>{i+1}.</span>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5}}
                            onMouseEnter={()=>setHoveredClient(c.codigo)}
                            onMouseLeave={()=>setHoveredClient(null)}
                            title={c.nome}>{c.nome}</span>
                    </span>
                    <span style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      <AcStatusBadge status={c.statusComercial}/>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-2)"}}>{acBRL(c.totalPeriodo)}</span>
                    </span>
                  </div>
                  <div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden",marginLeft:25}}>
                    <div className="ac-prog" style={{width:`${pct.toFixed(1)}%`,height:"100%",background:AC_COLORS.estrategico,borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clientes sem faturamento — distribuição por faixa */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Inatividade de clientes</h3>
            <span className="meta muted">por faixa de dias sem faturar</span>
          </div>
          <div className="card-body">
            <div style={{marginBottom:20}}>
              {[
                { label:"30 – 60 dias", val:inativo30,  color:"#fbbf24", desc:"Atenção — monitorar" },
                { label:"60 – 90 dias", val:inativo60,  color:"#f97316", desc:"Urgente — contatar" },
                { label:"90 – 120 dias",val:inativo90,  color:"#ef4444", desc:"Parado — recuperar" },
                { label:"Mais de 120d", val:inativo120, color:"#b91c1c", desc:"Inativo — critical" },
              ].map(({label,val,color,desc})=>{
                const total=(inativo30+inativo60+inativo90+inativo120)||1;
                const pct=val/total*100;
                return (
                  <div key={label} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:12.5,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:10,height:10,borderRadius:2,background:color,display:"inline-block"}}/>
                        {label}
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:12,color}}>
                          {val} cliente{val!==1?"s":""}
                        </span>
                        <span className="muted" style={{fontSize:11}}>{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div style={{height:8,background:"var(--surface-3)",borderRadius:4,overflow:"hidden"}}>
                      <div className="ac-prog" style={{width:val>0?`${Math.max(pct,3)}%`:"0%",height:"100%",background:color,borderRadius:4}}/>
                    </div>
                    <div className="muted" style={{fontSize:11,marginTop:3}}>{desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Mini-sparklines dos top 5 */}
            {top5Monthly.length>0&&(
              <>
                <div style={{borderTop:"1px solid var(--divider)",paddingTop:12,marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:500,color:"var(--text-3)"}}>Evolução dos top 5 clientes</span>
                </div>
                {top5Monthly.map((c,i)=>{
                  const colors=["#4f7fab","#22c55e","#818cf8","#fbbf24","#f87171"];
                  return (
                    <div key={c.codigo||i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:colors[i],flexShrink:0,display:"inline-block"}}/>
                      <span style={{fontSize:11.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:"var(--text-2)"}}>{c.nome}</span>
                      <div style={{width:64,flexShrink:0}}>
                        <MiniBar values={c.vals} accent={colors[i]} height={18}/>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Rankings ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header" style={{borderBottom:"1px solid var(--divider)",paddingBottom:0}}>
          <h3>Rankings de clientes</h3>
          <div className="row" style={{gap:0}}>
            {rankTabs.map(t=>(
              <button key={t.key} className={`ac-rank-tab ${rankTab===t.key?"active":""}`}
                      onClick={()=>setRankTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{paddingTop:12}}>
          {(rankData[rankTab]||[]).length===0&&(
            <div className="muted" style={{fontSize:12.5,textAlign:"center",padding:"16px 0"}}>Sem dados para este ranking</div>
          )}
          {(rankData[rankTab]||[]).map((c,i)=>{
            const maxVal=rankTab==="top"?acNum(rankTop[0]?.totalPeriodo)||1
              :rankTab==="crescimento"?Math.max(1,...rankGrowth.map(x=>acNum(x.crescimento)))
              :rankTab==="queda"?Math.abs(Math.min(-1,...rankDecline.map(x=>acNum(x.crescimento))))
              :acNum(rankInactive[0]?.diasSemFaturar)||1;
            const rawVal=rankTab==="top"?acNum(c.totalPeriodo)
              :rankTab==="crescimento"?acNum(c.crescimento)
              :rankTab==="queda"?Math.abs(acNum(c.crescimento))
              :acNum(c.diasSemFaturar);
            const pct=rawVal/maxVal*100;
            const barColor=rankTab==="crescimento"?AC_COLORS.estrategico
              :rankTab==="queda"?AC_COLORS.parado
              :rankTab==="parados"?AC_COLORS.parado
              :AC_COLORS.bar;
            return (
              <div key={c.codigo||i} style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:"var(--text-4)",fontFamily:"var(--font-mono)",fontSize:10.5,width:18,flexShrink:0,textAlign:"right"}}>{i+1}.</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5,flex:1,minWidth:0}}>{c.nome}</span>
                <div style={{flex:2,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:5,background:"var(--surface-3)",borderRadius:2,overflow:"hidden"}}>
                    <div className="ac-prog" style={{width:`${Math.min(pct,100).toFixed(1)}%`,height:"100%",background:barColor,borderRadius:2}}/>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:11.5,flexShrink:0,width:96,textAlign:"right",color:"var(--text-2)"}}>
                    {rankTab==="top"?acBRL(c.totalPeriodo)
                    :rankTab==="crescimento"?`+${acNum(c.crescimento).toFixed(1)}%`
                    :rankTab==="queda"?`${acNum(c.crescimento).toFixed(1)}%`
                    :`${acNum(c.diasSemFaturar)}d`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabela de clientes ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Clientes</h3>
          <div className="row" style={{gap:8}}>
            <div style={{position:"relative"}}>
              <Icon name="search" size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text-4)",pointerEvents:"none"}}/>
              <input type="text" placeholder="Buscar cliente…"
                     value={tableSearch}
                     onChange={e=>{setTableSearch(e.target.value);setTablePage(0);}}
                     style={{height:28,paddingLeft:27,paddingRight:8,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",fontSize:12.5,width:200,outline:"none"}}/>
            </div>
            <span className="muted" style={{fontSize:11.5}}>{sortedClients.length} clientes</span>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{cursor:"pointer"}} onClick={()=>toggleSort("nome")}>Cliente <SortArrow col="nome"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("totalPeriodo")}>Total período <SortArrow col="totalPeriodo"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("lancamentos")}>Lançamentos <SortArrow col="lancamentos"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("ticketMedio")}>Ticket médio <SortArrow col="ticketMedio"/></th>
              <th>Último fat.</th>
              <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("diasSemFaturar")}>Dias sem fat. <SortArrow col="diasSemFaturar"/></th>
              <th style={{cursor:"pointer"}} onClick={()=>toggleSort("statusComercial")}>Status <SortArrow col="statusComercial"/></th>
              <th>Ação sugerida</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length===0&&(
              <tr><td colSpan="8" className="muted" style={{padding:20,textAlign:"center",fontSize:12.5}}>
                {tableSearch?"Nenhum resultado para a busca.":"Nenhum cliente encontrado."}
              </td></tr>
            )}
            {pageRows.map(row=>(
              <tr key={row.codigo}
                  className="clickable"
                  onClick={()=>setSelectedRow(row)}>
                <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                    title={row.nome}>{row.nome}</td>
                <td className="num">{acBRL(row.totalPeriodo)}</td>
                <td className="num">{row.lancamentos}</td>
                <td className="num">{acBRL(row.ticketMedio)}</td>
                <td className="date">{acDateFmt(row.ultimoFaturamento)}</td>
                <td className="num" style={{
                  color:acNum(row.diasSemFaturar)>90?"#ef4444":acNum(row.diasSemFaturar)>60?"#f97316":acNum(row.diasSemFaturar)>30?"#fbbf24":"inherit",
                  fontWeight:acNum(row.diasSemFaturar)>30?500:400,
                }}>
                  {row.diasSemFaturar!=null?`${row.diasSemFaturar}d`:"—"}
                </td>
                <td className="cell-badge"><AcStatusBadge status={row.statusComercial}/></td>
                <td className="cell-badge"><AcAcaoBadge acao={row.acaoSugerida}/></td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages>1&&(
          <div className="tbl-footer">
            <span>Página {tablePage+1} de {totalPages} · {sortedClients.length} registros</span>
            <div className="pager">
              <button onClick={()=>setTablePage(0)} disabled={tablePage===0}>«</button>
              <button onClick={()=>setTablePage(p=>p-1)} disabled={tablePage===0}>‹</button>
              <button onClick={()=>setTablePage(p=>p+1)} disabled={tablePage>=totalPages-1}>›</button>
              <button onClick={()=>setTablePage(totalPages-1)} disabled={tablePage>=totalPages-1}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* fim do bloco "clientes" */}
      </>}
    </div>
  );
};

window.AnaliseClientes = AnaliseClientes;

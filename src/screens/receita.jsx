// Analise de Receita — dados reais de financeiro.receber.

// ── Date helpers ──────────────────────────────────────────────────────────────
function receitaTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function receitaDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function receitaMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

// ── Period config ─────────────────────────────────────────────────────────────
const RECEITA_PERIODS = [
  { key: "7d",    label: "7 dias",    getRange: () => ({ start: receitaDaysAgoISO(7),   end: receitaTodayISO() }) },
  { key: "30d",   label: "30 dias",   getRange: () => ({ start: receitaDaysAgoISO(30),  end: receitaTodayISO() }) },
  { key: "month", label: "Este mês",  getRange: () => ({ start: receitaMonthStartISO(), end: receitaTodayISO() }) },
];

const RECEITA_COLORS = {
  received: "#22c55e",
  open:     "#38bdf8",
  overdue:  "#f87171",
  category: "#60a5fa",
};

const RECEITA_EMPTY = {
  period: { key: "30d", label: "30 dias", startDate: "", endDate: "" },
  summary: {
    totalLancamentos: 0, valorDocumento: 0, valorAberto: 0, valorPago: 0,
    valorVencido: 0, valorDesconto: 0, valorJuros: 0,
    lancamentosAbertos: 0, lancamentosVencidos: 0, lancamentosPagos: 0,
  },
  monthly: [], classifications: [], rows: [],
};

// ── Format helpers ────────────────────────────────────────────────────────────
function receitaNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function receitaBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receitaNum(v));
}
function receitaDate(v) {
  if (!v) return "-";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}
function receitaNormalize(data, fallbackPeriod) {
  const base = data && typeof data === "object" ? data : {};
  return {
    ...RECEITA_EMPTY, ...base,
    period: { ...RECEITA_EMPTY.period, key: fallbackPeriod, ...(base.period || {}) },
    summary: { ...RECEITA_EMPTY.summary, ...(base.summary || {}) },
    monthly: Array.isArray(base.monthly) ? base.monthly : [],
    classifications: Array.isArray(base.classifications) ? base.classifications : [],
    rows: Array.isArray(base.rows) ? base.rows : [],
  };
}
function receitaExportCsv(resumo, periodLabel) {
  const header = ["Empresa","Duplicata","Parcela","Cliente","Vencimento","Status","Valor","Recebido","Aberto","Vencido"];
  const lines = (resumo.rows || []).map((r) => [
    r.empresa || "", r.duplicata || "", r.parcela || "", r.pessoaNome || "",
    r.dataVencimento || "", r.statusCalculado || r.status || "",
    receitaNum(r.valorDocumento), receitaNum(r.valorPago), receitaNum(r.valorAberto), receitaNum(r.valorVencido),
  ]);
  const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `receitas-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Status badge ──────────────────────────────────────────────────────────────
const ReceitaStatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const MAP = { pago: ["ok","Pago"], recebido: ["ok","Recebido"], aberto: ["info","A Receber"], vencido: ["crit","Vencido"], cancelado: ["","Cancelado"] };
  const [cls, lbl] = MAP[s] || ["", status || "-"];
  return <span className={`badge ${cls}`}><span className="dot"/>{lbl}</span>;
};

// ── Detail modal ──────────────────────────────────────────────────────────────
const ReceitaModal = ({ row, onClose }) => {
  if (!row) return null;
  const f = [
    ["Cliente", row.pessoaNome || "-"],
    ["CNPJ / CPF", row.pessoaDocumento || "-"],
    ["Documento", row.documento || row.duplicata || "-"],
    ["Parcela", row.parcela || "-"],
    ["Empresa", row.empresa || "-"],
    ["Emissão", receitaDate(row.dataEmissao)],
    ["Vencimento", receitaDate(row.dataVencimento)],
    ["Status", <ReceitaStatusBadge status={row.statusCalculado || row.status}/>],
    ["Valor", receitaBRL(row.valorDocumento)],
    ["Recebido", receitaBRL(row.valorPago)],
    ["Em aberto", receitaBRL(row.valorAberto)],
    ["Vencido", receitaBRL(row.valorVencido)],
    ["Desconto", receitaBRL(row.valorDesconto)],
    ["Juros", receitaBRL(row.valorJuros)],
    ["Categoria", row.classificacaoNome || "-"],
    ["Observação", row.observacao || "-"],
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
         onClick={onClose}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",width:460,maxWidth:"100%",maxHeight:"82vh",overflowY:"auto"}}
           onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:"-0.01em"}}>Detalhes do recebimento</span>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        {f.map(([label, value]) => (
          <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--divider)",fontSize:13}}>
            <span style={{color:"var(--text-3)"}}>{label}</span>
            <span style={{fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Receita = () => {
  const defaultRange = RECEITA_PERIODS[1].getRange(); // 30d

  const [periodo,     setPeriodo]     = React.useState("30d");
  const [dataInicio,  setDataInicio]  = React.useState(defaultRange.start);
  const [dataFim,     setDataFim]     = React.useState(defaultRange.end);
  const [manualFilter, setManualFilter] = React.useState(null);
  const [resumo,      setResumo]      = React.useState(() => receitaNormalize(null, "30d"));
  const [loading,     setLoading]     = React.useState(false);
  const [error,       setError]       = React.useState("");
  const [hoveredBar,  setHoveredBar]  = React.useState(null);
  const [selectedRow, setSelectedRow] = React.useState(null);
  const [tableSearch, setTableSearch] = React.useState("");
  const [sortCol,     setSortCol]     = React.useState("dataVencimento");
  const [sortDir,     setSortDir]     = React.useState("asc");
  const [tablePage,   setTablePage]   = React.useState(0);
  const [chartKey,    setChartKey]    = React.useState(0);
  const PAGE_SIZE = 15;

  // Inject animation CSS once
  React.useEffect(() => {
    const id = "rb-receita-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes rbFadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .rb-bar-in { animation: rbFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; }
        .rb-card-in { animation: rbFadeUp 0.35s ease forwards; }
        .tbl tbody tr.clickable:hover td { background: var(--hover); }
      `;
      document.head.appendChild(s);
    }
  }, []);

  // Data fetch
  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setTablePage(0);
    const filters = manualFilter
      ? { dataInicio: manualFilter.dataInicio, dataFim: manualFilter.dataFim }
      : { period: periodo };
    window.RB_API.getReceitasResumo(filters)
      .then(data => { if (active) { setResumo(receitaNormalize(data, periodo)); setChartKey(k => k + 1); } })
      .catch(err => { if (!active) return; setResumo(receitaNormalize(null, periodo)); setError(err?.message || "Não foi possível carregar receitas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, manualFilter]);

  const periodLabel = manualFilter
    ? `${receitaDate(manualFilter.dataInicio)} a ${receitaDate(manualFilter.dataFim)}`
    : RECEITA_PERIODS.find(p => p.key === periodo)?.label || "30 dias";

  const summary         = resumo.summary;
  const monthly         = resumo.monthly;
  const classifications = resumo.classifications;
  const rows            = resumo.rows;

  const totalRecebido = receitaNum(summary.valorPago);
  const totalVencido  = receitaNum(summary.valorVencido);
  const totalAberto   = receitaNum(summary.valorAberto);
  const totalAReceber = Math.max(totalAberto - totalVencido, 0);
  const totalPrevisto = receitaNum(summary.valorDocumento);
  const taxaRecebimento   = totalPrevisto > 0 ? Math.min(100, totalRecebido / totalPrevisto * 100) : 0;
  const taxaInadimplencia = totalPrevisto > 0 ? Math.min(100, totalVencido  / totalPrevisto * 100) : 0;

  // Month-over-month trend
  const trend = monthly.length >= 2 ? (() => {
    const cur = monthly[monthly.length - 1];
    const prv = monthly[monthly.length - 2];
    const cv = receitaNum(cur.valorDocumento);
    const pv = receitaNum(prv.valorDocumento);
    return { curLabel: cur.label, prvLabel: prv.label, cv, pv, delta: pv > 0 ? (cv - pv) / pv * 100 : null };
  })() : null;

  // Chart
  const maxMonthly = Math.max(1, ...monthly.map(m => receitaNum(m.valorDocumento)));
  const maxClass   = Math.max(1, ...classifications.map(c => receitaNum(c.valorDocumento)));

  // Top 10 clientes (aggregated from rows)
  const topClientes = React.useMemo(() => {
    const map = {};
    for (const r of rows) {
      const k = r.pessoaNome || "Sem identificação";
      if (!map[k]) map[k] = { nome: k, valor: 0, recebido: 0, aberto: 0, count: 0 };
      map[k].valor    += receitaNum(r.valorDocumento);
      map[k].recebido += receitaNum(r.valorPago);
      map[k].aberto   += receitaNum(r.valorAberto);
      map[k].count++;
    }
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [rows]);

  // Table
  const sortedRows = React.useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r =>
          (r.pessoaNome || "").toLowerCase().includes(q) ||
          (r.documento || r.duplicata || "").toLowerCase().includes(q) ||
          (r.statusCalculado || r.status || "").toLowerCase().includes(q))
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortCol === "dataVencimento") return dir * ((a.dataVencimento || "") < (b.dataVencimento || "") ? -1 : 1);
      if (sortCol === "valorDocumento") return dir * (receitaNum(a.valorDocumento) - receitaNum(b.valorDocumento));
      if (sortCol === "status")         return dir * ((a.statusCalculado || "") < (b.statusCalculado || "") ? -1 : 1);
      if (sortCol === "pessoaNome")     return dir * ((a.pessoaNome || "") < (b.pessoaNome || "") ? -1 : 1);
      return 0;
    });
  }, [rows, tableSearch, sortCol, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows   = sortedRows.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setTablePage(0);
  };
  const SortArrow = ({ col }) => (
    <span style={{marginLeft:4,opacity:sortCol===col?1:0.3,color:sortCol===col?"var(--accent)":"inherit"}}>
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const applyManualFilter = () => {
    if (!dataInicio && !dataFim) return;
    setPeriodo("custom");
    setManualFilter({ dataInicio, dataFim });
  };
  const clearManualFilter = () => {
    const r = RECEITA_PERIODS[1].getRange();
    setDataInicio(r.start); setDataFim(r.end);
    setManualFilter(null); setPeriodo("30d");
  };
  const selectShortcut = (key) => {
    const p = RECEITA_PERIODS.find(item => item.key === key);
    if (p) { const r = p.getRange(); setDataInicio(r.start); setDataFim(r.end); }
    setManualFilter(null); setPeriodo(key);
  };

  return (
    <div className="view">
      <ReceitaModal row={selectedRow} onClose={() => setSelectedRow(null)}/>

      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <h1>Análise de Receita</h1>
          <div className="sub">financeiro.receber · {periodLabel}</div>
        </div>
        <div className="actions">
          {RECEITA_PERIODS.map(p => (
            <button key={p.key}
                    className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`}
                    onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
          <button className="btn" onClick={() => receitaExportCsv(resumo, periodLabel)}>
            <Icon name="download"/> Exportar
          </button>
        </div>
      </div>

      {/* ── Period filter ── */}
      <div className="period-filter">
        <label>Data inicial<input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}/></label>
        <button className="btn primary" onClick={applyManualFilter}>Aplicar</button>
        <button className="btn" onClick={clearManualFilter}>Limpar</button>
        {manualFilter && <span className="badge info">Filtro personalizado ativo</span>}
        <span className="muted" style={{marginLeft:"auto",fontSize:11.5}}>Base: data de vencimento · financeiro.receber</span>
      </div>

      {/* ── Status banner ── */}
      {(loading || error) && (
        <div className="card" style={{marginBottom:16,padding:"9px 14px",borderColor:error?"var(--crit-border)":"var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize:12.5}}>
            {loading ? "Carregando receitas…" : `⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs row 1 — valores principais ── */}
      <div className="grid cols-4" style={{marginBottom:14}}>
        <div className="kpi" style={{borderLeft:"3px solid #22c55e"}}>
          <div className="kpi-label"><Icon name="trending-up"/><span>Total recebido</span></div>
          <div className="kpi-value">{receitaBRL(totalRecebido)}</div>
          <span className="kpi-delta up">▲ {receitaNum(summary.lancamentosPagos)} baixados</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #38bdf8"}}>
          <div className="kpi-label"><Icon name="calendar"/><span>A receber (não vencido)</span></div>
          <div className="kpi-value">{receitaBRL(totalAReceber)}</div>
          <span className="kpi-delta flat">{receitaNum(summary.lancamentosAbertos)} em aberto</span>
        </div>
        <div className="kpi" style={{borderLeft:totalVencido > 0 ? "3px solid #f87171" : "3px solid var(--border)"}}>
          <div className="kpi-label"><Icon name="alert"/><span>Vencido</span></div>
          <div className="kpi-value" style={{color:totalVencido>0?"#f87171":"inherit"}}>{receitaBRL(totalVencido)}</div>
          <span className={`kpi-delta ${totalVencido > 0 ? "down" : "flat"}`}>{totalVencido > 0 ? "▼ " : ""}{receitaNum(summary.lancamentosVencidos)} vencidos</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid var(--border-strong)"}}>
          <div className="kpi-label"><Icon name="chart"/><span>Total previsto</span></div>
          <div className="kpi-value">{receitaBRL(totalPrevisto)}</div>
          <span className="kpi-delta flat">{receitaNum(summary.totalLancamentos)} lançamentos</span>
        </div>
      </div>

      {/* ── KPIs row 2 — indicadores secundários ── */}
      <div className="grid cols-4" style={{marginBottom:16}}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="gauge"/><span>Taxa de recebimento</span></div>
          <div className="kpi-value" style={{color:taxaRecebimento >= 80 ? "#22c55e" : taxaRecebimento >= 50 ? "#fbbf24" : "#f87171"}}>
            {taxaRecebimento.toFixed(1)}%
          </div>
          <span className="kpi-delta flat">recebido / previsto</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alert"/><span>Inadimplência</span></div>
          <div className="kpi-value" style={{color:taxaInadimplencia > 15 ? "#f87171" : taxaInadimplencia > 5 ? "#fbbf24" : "inherit"}}>
            {taxaInadimplencia.toFixed(1)}%
          </div>
          <span className="kpi-delta flat">vencido / previsto</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="money"/><span>Descontos concedidos</span></div>
          <div className="kpi-value">{receitaBRL(summary.valorDesconto)}</div>
          <span className="kpi-delta flat">campo valordescontorec</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="trending-up"/><span>Juros cobrados</span></div>
          <div className="kpi-value">{receitaBRL(summary.valorJuros)}</div>
          <span className="kpi-delta up">campo valorjurosrec</span>
        </div>
      </div>

      {/* ── Gráfico mensal + Distribuição por categoria ── */}
      <div className="grid cols-2-1" style={{marginBottom:16}}>

        {/* Monthly bar chart */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Evolução mensal</h3>
            <div className="row" style={{gap:12,fontSize:11.5}}>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:RECEITA_COLORS.received,display:"inline-block"}}/> Recebido</span>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:RECEITA_COLORS.open,display:"inline-block"}}/> A receber</span>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:RECEITA_COLORS.overdue,display:"inline-block"}}/> Vencido</span>
            </div>
          </div>
          <div className="card-body" style={{paddingTop:16,paddingBottom:12}}>
            {monthly.length === 0 && !loading && (
              <div className="muted" style={{textAlign:"center",padding:"28px 0",fontSize:12.5}}>Sem dados no período selecionado</div>
            )}
            {monthly.length > 0 && (
              <div key={chartKey} style={{
                display:"grid",
                gridTemplateColumns:`repeat(${monthly.length}, minmax(32px, 1fr))`,
                gap:6,height:170,alignItems:"flex-end",
              }}>
                {monthly.map((item, index) => {
                  const total   = receitaNum(item.valorDocumento);
                  const paid    = receitaNum(item.valorPago);
                  const overdue = receitaNum(item.valorVencido);
                  const open    = Math.max(receitaNum(item.valorAberto) - overdue, 0);
                  const barH    = total > 0 ? Math.max(Math.round((total / maxMonthly) * 148), 6) : 2;
                  const isHov   = hoveredBar === index;
                  return (
                    <div key={`${item.mes || index}-${chartKey}`}
                         className="rb-bar-in"
                         style={{
                           display:"flex",flexDirection:"column",alignItems:"center",
                           gap:4,justifyContent:"flex-end",height:"100%",
                           position:"relative",cursor:"default",
                           animationDelay:`${index * 30}ms`,
                         }}
                         onMouseEnter={() => setHoveredBar(index)}
                         onMouseLeave={() => setHoveredBar(null)}>
                      {/* Tooltip */}
                      {isHov && (
                        <div style={{
                          position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",
                          background:"var(--surface)",border:"1px solid var(--border-strong)",borderRadius:8,
                          padding:"10px 13px",fontSize:12,whiteSpace:"nowrap",zIndex:30,
                          boxShadow:"var(--shadow-lg)",lineHeight:1.8,minWidth:190,
                        }}>
                          <div style={{fontWeight:600,fontSize:12.5,marginBottom:6,color:"var(--text)"}}>{item.label}</div>
                          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"1px 12px"}}>
                            <span style={{color:"var(--text-3)"}}>Total previsto</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right",color:"var(--text)"}}>{receitaBRL(total)}</span>
                            <span style={{color:RECEITA_COLORS.received}}>● Recebido</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{receitaBRL(paid)}</span>
                            <span style={{color:RECEITA_COLORS.open}}>● A receber</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{receitaBRL(open)}</span>
                            <span style={{color:RECEITA_COLORS.overdue}}>● Vencido</span>
                            <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{receitaBRL(overdue)}</span>
                          </div>
                        </div>
                      )}
                      {/* Bar */}
                      <div style={{
                        width:"100%",height:barH,
                        display:"flex",flexDirection:"column",
                        borderRadius:4,overflow:"hidden",
                        transition:"opacity 0.15s",
                        opacity: isHov ? 1 : 0.85,
                      }}>
                        {paid    > 0 && <div style={{flex:paid,    background:RECEITA_COLORS.received}}/>}
                        {open    > 0 && <div style={{flex:open,    background:RECEITA_COLORS.open}}/>}
                        {overdue > 0 && <div style={{flex:overdue, background:RECEITA_COLORS.overdue}}/>}
                        {total === 0  && <div style={{flex:1,      background:"var(--surface-3)"}}/>}
                      </div>
                      <span style={{fontSize:9.5,color:"var(--text-3)",textAlign:"center",lineHeight:1.2}}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Category distribution */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Por categoria</h3>
            <span className="meta muted">{classifications.length} cat.</span>
          </div>
          <div className="card-body">
            {classifications.length === 0 && (
              <div className="muted" style={{fontSize:12.5}}>Sem categorias no período</div>
            )}
            {classifications.slice(0, 8).map((item) => {
              const val = receitaNum(item.valorDocumento);
              const pct = maxClass > 0 ? Math.min(100, val / maxClass * 100) : 0;
              const pctTotal = totalPrevisto > 0 ? Math.min(100, val / totalPrevisto * 100) : 0;
              return (
                <div key={item.classificacaoCodigo ?? item.classificacaoNome} style={{marginBottom:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,gap:6}}>
                    <span style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,color:"var(--text-2)"}}
                          title={item.classificacaoNome}>{item.classificacaoNome || "Sem categoria"}</span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-3)",flexShrink:0}}>{pctTotal.toFixed(1)}%</span>
                  </div>
                  <div style={{height:5,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${pct.toFixed(1)}%`,height:"100%",background:RECEITA_COLORS.category,borderRadius:3,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginTop:3,textAlign:"right",fontFamily:"var(--font-mono)"}}>{receitaBRL(val)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Top 10 Clientes + Comparativo ── */}
      <div className="grid cols-2" style={{marginBottom:16}}>

        {/* Top 10 clientes */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Top 10 Clientes</h3>
            <span className="meta muted">por valor previsto no período</span>
          </div>
          <div className="card-body">
            {topClientes.length === 0 && (
              <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>
            )}
            {topClientes.map((c, i) => {
              const maxVal = topClientes[0]?.valor || 1;
              const pct = c.valor / maxVal * 100;
              return (
                <div key={c.nome} style={{marginBottom:i < topClientes.length - 1 ? 12 : 0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
                    <span style={{display:"flex",gap:7,alignItems:"center",overflow:"hidden",minWidth:0}}>
                      <span style={{color:"var(--text-4)",fontFamily:"var(--font-mono)",fontSize:10.5,width:18,flexShrink:0,textAlign:"right"}}>{i+1}.</span>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5}}>{c.nome}</span>
                    </span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:12,flexShrink:0,color:"var(--text-2)"}}>{receitaBRL(c.valor)}</span>
                  </div>
                  <div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden",marginLeft:25}}>
                    <div style={{width:`${pct.toFixed(1)}%`,height:"100%",background:RECEITA_COLORS.received,borderRadius:2,transition:"width 0.6s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparativo mensal */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Comparativo mensal</h3>
            <span className="meta muted">{trend ? `${trend.prvLabel} → ${trend.curLabel}` : "—"}</span>
          </div>
          <div className="card-body">
            {!trend && (
              <div className="muted" style={{fontSize:12.5}}>Período sem dados suficientes para comparativo.</div>
            )}
            {trend && (
              <div style={{display:"grid",gap:14}}>
                {/* Current month */}
                <div style={{padding:"12px 14px",background:"var(--surface-2)",borderRadius:8,border:"1px solid var(--border)"}}>
                  <div style={{fontSize:11.5,color:"var(--text-3)",marginBottom:5}}>{trend.curLabel} (atual)</div>
                  <div style={{fontSize:21,fontFamily:"var(--font-mono)",fontWeight:500,letterSpacing:"-0.02em"}}>{receitaBRL(trend.cv)}</div>
                  {trend.delta !== null && (
                    <span className={`kpi-delta ${trend.delta >= 0 ? "up" : "down"}`} style={{marginTop:5,display:"inline-flex"}}>
                      {trend.delta >= 0 ? "▲" : "▼"} {Math.abs(trend.delta).toFixed(1)}% vs mês anterior
                    </span>
                  )}
                </div>
                {/* Previous month */}
                <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)"}}>
                  <div style={{fontSize:11.5,color:"var(--text-3)",marginBottom:4}}>{trend.prvLabel} (anterior)</div>
                  <div style={{fontSize:17,fontFamily:"var(--font-mono)",color:"var(--text-2)"}}>{receitaBRL(trend.pv)}</div>
                </div>
                {/* Visual bars */}
                <div style={{display:"grid",gap:8}}>
                  {[
                    { label: trend.curLabel, val: trend.cv, color: RECEITA_COLORS.received },
                    { label: trend.prvLabel, val: trend.pv, color: "#71717a" },
                  ].map(bar => {
                    const max = Math.max(trend.cv, trend.pv, 1);
                    return (
                      <div key={bar.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:11.5}}>
                        <span style={{width:36,color:"var(--text-3)",flexShrink:0,textAlign:"right"}}>{bar.label}</span>
                        <div style={{flex:1,height:7,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{width:`${(bar.val/max*100).toFixed(1)}%`,height:"100%",background:bar.color,borderRadius:3,transition:"width 0.6s ease"}}/>
                        </div>
                        <span style={{width:96,fontFamily:"var(--font-mono)",fontSize:11,textAlign:"right",flexShrink:0}}>{receitaBRL(bar.val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabela de recebimentos ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Recebimentos</h3>
          <div className="row" style={{gap:8}}>
            {/* Search */}
            <div style={{position:"relative"}}>
              <Icon name="search" size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text-4)",pointerEvents:"none"}}/>
              <input
                type="text"
                placeholder="Buscar cliente, doc…"
                value={tableSearch}
                onChange={e => { setTableSearch(e.target.value); setTablePage(0); }}
                style={{height:28,paddingLeft:27,paddingRight:8,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",fontSize:12.5,width:200,outline:"none"}}
              />
            </div>
            <span className="muted" style={{fontSize:11.5}}>{sortedRows.length} registros</span>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("pessoaNome")}>
                Cliente <SortArrow col="pessoaNome"/>
              </th>
              <th>Documento</th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("dataVencimento")}>
                Vencimento <SortArrow col="dataVencimento"/>
              </th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("status")}>
                Status <SortArrow col="status"/>
              </th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("valorDocumento")}>
                Valor <SortArrow col="valorDocumento"/>
              </th>
              <th className="num">Recebido</th>
              <th className="num">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan="7" className="muted" style={{padding:20,textAlign:"center",fontSize:12.5}}>
                {tableSearch ? "Nenhum resultado para a busca." : "Nenhum recebimento encontrado no período."}
              </td></tr>
            )}
            {pageRows.map(row => (
              <tr key={row.id}
                  className={`clickable ${row.statusCalculado === "vencido" ? "row-warn" : ""}`}
                  onClick={() => setSelectedRow(row)}>
                <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.pessoaNome || "-"}</td>
                <td className="muted">{row.documento || row.duplicata || "-"}</td>
                <td>{receitaDate(row.dataVencimento)}</td>
                <td><ReceitaStatusBadge status={row.statusCalculado || row.status}/></td>
                <td className="num">{receitaBRL(row.valorDocumento)}</td>
                <td className="num">{receitaBRL(row.valorPago)}</td>
                <td className="num">{receitaBRL(row.valorAberto)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="tbl-footer">
            <span>Página {tablePage + 1} de {totalPages} · {sortedRows.length} registros</span>
            <div className="pager">
              <button onClick={() => setTablePage(0)} disabled={tablePage === 0}>«</button>
              <button onClick={() => setTablePage(p => p - 1)} disabled={tablePage === 0}>‹</button>
              <button onClick={() => setTablePage(p => p + 1)} disabled={tablePage >= totalPages - 1}>›</button>
              <button onClick={() => setTablePage(totalPages - 1)} disabled={tablePage >= totalPages - 1}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.Receita = Receita;

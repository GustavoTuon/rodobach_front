// Despesas e Custos — dados reais de financeiro.pagar.

// ── Date helpers ──────────────────────────────────────────────────────────────
function custosTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function custosDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function custosMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

// ── Period config ─────────────────────────────────────────────────────────────
const CUSTOS_PERIODS = [
  { key: "7d",    label: "7 dias",    getRange: () => ({ start: custosDaysAgoISO(7),   end: custosTodayISO() }) },
  { key: "30d",   label: "30 dias",   getRange: () => ({ start: custosDaysAgoISO(30),  end: custosTodayISO() }) },
  { key: "month", label: "Este mês",  getRange: () => ({ start: custosMonthStartISO(), end: custosTodayISO() }) },
];

const CUSTOS_COLORS = {
  paid:     "#38bdf8",
  open:     "#fbbf24",
  overdue:  "#f87171",
  category: "#f59e0b",
};

const CUSTOS_EMPTY = {
  period: { key: "30d", label: "30 dias", startDate: "", endDate: "" },
  summary: {
    totalLancamentos: 0, valorDocumento: 0, valorAberto: 0, valorPago: 0,
    valorVencido: 0, valorDesconto: 0, valorJuros: 0,
    lancamentosAbertos: 0, lancamentosVencidos: 0, lancamentosPagos: 0,
  },
  monthly: [], classifications: [], rows: [],
};

// ── Format helpers ────────────────────────────────────────────────────────────
function custosNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function custosBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(custosNum(v));
}
function custosDate(v) {
  if (!v) return "-";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}
function custosAbbrev(v) {
  const num = custosNum(v);
  if (num >= 1e6) return `R$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `R$${Math.round(num / 1e3)}k`;
  return `R$${Math.round(num)}`;
}
function custosNormalize(data, fallbackPeriod) {
  const base = data && typeof data === "object" ? data : {};
  return {
    ...CUSTOS_EMPTY, ...base,
    period: { ...CUSTOS_EMPTY.period, key: fallbackPeriod, ...(base.period || {}) },
    summary: { ...CUSTOS_EMPTY.summary, ...(base.summary || {}) },
    monthly: Array.isArray(base.monthly) ? base.monthly : [],
    classifications: Array.isArray(base.classifications) ? base.classifications : [],
    rows: Array.isArray(base.rows) ? base.rows : [],
  };
}
function custosExportCsv(resumo, periodLabel) {
  const header = ["Empresa","Duplicata","Parcela","Fornecedor","Vencimento","Status","Valor","Pago","Aberto","Vencido"];
  const lines = (resumo.rows || []).map((r) => [
    r.empresa || "", r.duplicata || "", r.parcela || "", r.pessoaNome || "",
    r.dataVencimento || "", r.statusCalculado || r.status || "",
    custosNum(r.valorDocumento), custosNum(r.valorPago), custosNum(r.valorAberto), custosNum(r.valorVencido),
  ]);
  const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `custos-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Status badge ──────────────────────────────────────────────────────────────
const CustosStatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const MAP = { pago: ["ok","Pago"], aberto: ["info","A Pagar"], vencido: ["crit","Vencido"], cancelado: ["","Cancelado"] };
  const [cls, lbl] = MAP[s] || ["", status || "-"];
  return <span className={`badge ${cls}`}><span className="dot"/>{lbl}</span>;
};

// ── Detail modal ──────────────────────────────────────────────────────────────
const CustosModal = ({ row, onClose }) => {
  if (!row) return null;
  const f = [
    ["Fornecedor", row.pessoaNome || "-"],
    ["CNPJ / CPF", row.pessoaDocumento || "-"],
    ["Documento", row.documento || row.duplicata || "-"],
    ["Parcela", row.parcela || "-"],
    ["Empresa", row.empresa || "-"],
    ["Emissão", custosDate(row.dataEmissao)],
    ["Vencimento", custosDate(row.dataVencimento)],
    ["Status", <CustosStatusBadge status={row.statusCalculado || row.status}/>],
    ["Valor", custosBRL(row.valorDocumento)],
    ["Pago", custosBRL(row.valorPago)],
    ["Em aberto", custosBRL(row.valorAberto)],
    ["Vencido", custosBRL(row.valorVencido)],
    ["Desconto", custosBRL(row.valorDesconto)],
    ["Juros", custosBRL(row.valorJuros)],
    ["Categoria", row.classificacaoNome || "-"],
    ["Observação", row.observacao || "-"],
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
         onClick={onClose}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",width:460,maxWidth:"100%",maxHeight:"82vh",overflowY:"auto"}}
           onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:"-0.01em"}}>Detalhes do lançamento</span>
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
const Custos = () => {
  const defaultRange = CUSTOS_PERIODS[1].getRange(); // 30d

  const [periodo,      setPeriodo]      = React.useState("30d");
  const [dataInicio,   setDataInicio]   = React.useState(defaultRange.start);
  const [dataFim,      setDataFim]      = React.useState(defaultRange.end);
  const [manualFilter, setManualFilter] = React.useState(null);
  const [resumo,       setResumo]       = React.useState(() => custosNormalize(null, "30d"));
  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState("");
  const [hoveredBar,   setHoveredBar]   = React.useState(null);
  const [selectedRow,  setSelectedRow]  = React.useState(null);
  const [tableSearch,  setTableSearch]  = React.useState("");
  const [sortCol,      setSortCol]      = React.useState("dataVencimento");
  const [sortDir,      setSortDir]      = React.useState("asc");
  const [tablePage,    setTablePage]    = React.useState(0);
  const [chartKey,     setChartKey]     = React.useState(0);
  const PAGE_SIZE = 15;

  // Inject animation CSS once
  React.useEffect(() => {
    const id = "rb-custos-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes rbCFadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .rbc-bar-in { animation: rbCFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; }
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
    window.RB_API.getCustosResumo(filters)
      .then(data => { if (active) { setResumo(custosNormalize(data, periodo)); setChartKey(k => k + 1); } })
      .catch(err => { if (!active) return; setResumo(custosNormalize(null, periodo)); setError(err?.message || "Não foi possível carregar custos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, manualFilter]);

  const periodLabel = manualFilter
    ? `${custosDate(manualFilter.dataInicio)} a ${custosDate(manualFilter.dataFim)}`
    : CUSTOS_PERIODS.find(p => p.key === periodo)?.label || "30 dias";

  const summary         = resumo.summary;
  const monthly         = resumo.monthly;
  const classifications = resumo.classifications;
  const rows            = resumo.rows;

  const totalPago     = custosNum(summary.valorPago);
  const totalVencido  = custosNum(summary.valorVencido);
  const totalAberto   = custosNum(summary.valorAberto);
  const totalAPagar   = Math.max(totalAberto - totalVencido, 0);
  const totalPrevisto = custosNum(summary.valorDocumento);
  const taxaPagamento = totalPrevisto > 0 ? Math.min(100, totalPago / totalPrevisto * 100) : 0;
  const taxaVencido   = totalPrevisto > 0 ? Math.min(100, totalVencido / totalPrevisto * 100) : 0;

  // Month-over-month trend
  const trend = monthly.length >= 2 ? (() => {
    const cur = monthly[monthly.length - 1];
    const prv = monthly[monthly.length - 2];
    const cv = custosNum(cur.valorDocumento);
    const pv = custosNum(prv.valorDocumento);
    return { curLabel: cur.label, prvLabel: prv.label, cv, pv, delta: pv > 0 ? (cv - pv) / pv * 100 : null };
  })() : null;

  // Chart
  const maxMonthly = Math.max(1, ...monthly.map(m => custosNum(m.valorDocumento)));
  const maxClass   = Math.max(1, ...classifications.map(c => custosNum(c.valorDocumento)));

  // Vencidos para alerta
  const vencidos = rows.filter(r => (r.statusCalculado || r.status || "").toLowerCase() === "vencido");

  // Top 10 fornecedores (aggregated from rows)
  const topFornecedores = React.useMemo(() => {
    const map = {};
    for (const r of rows) {
      const k = r.pessoaNome || "Sem identificação";
      if (!map[k]) map[k] = { nome: k, valor: 0, pago: 0, aberto: 0, count: 0 };
      map[k].valor  += custosNum(r.valorDocumento);
      map[k].pago   += custosNum(r.valorPago);
      map[k].aberto += custosNum(r.valorAberto);
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
      if (sortCol === "valorDocumento") return dir * (custosNum(a.valorDocumento) - custosNum(b.valorDocumento));
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
    const r = CUSTOS_PERIODS[1].getRange();
    setDataInicio(r.start); setDataFim(r.end);
    setManualFilter(null); setPeriodo("30d");
  };
  const selectShortcut = (key) => {
    const p = CUSTOS_PERIODS.find(item => item.key === key);
    if (p) { const r = p.getRange(); setDataInicio(r.start); setDataFim(r.end); }
    setManualFilter(null); setPeriodo(key);
  };

  return (
    <div className="view">
      <CustosModal row={selectedRow} onClose={() => setSelectedRow(null)}/>

      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <h1>Despesas e Custos</h1>
          <div className="sub">financeiro.pagar · {periodLabel}</div>
        </div>
        <div className="actions">
          {CUSTOS_PERIODS.map(p => (
            <button key={p.key}
                    className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`}
                    onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
          <button className="btn" onClick={() => custosExportCsv(resumo, periodLabel)}>
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
        <span className="muted" style={{marginLeft:"auto",fontSize:11.5}}>Base: data de vencimento · financeiro.pagar</span>
      </div>

      {/* ── Status banner ── */}
      {(loading || error) && (
        <div className="card" style={{marginBottom:16,padding:"9px 14px",borderColor:error?"var(--crit-border)":"var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize:12.5}}>
            {loading ? "Carregando custos…" : `⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs row 1 — valores principais ── */}
      <div className="grid cols-4" style={{marginBottom:14}}>
        <div className="kpi" style={{borderLeft:"3px solid #38bdf8"}}>
          <div className="kpi-label"><Icon name="money"/><span>Total pago</span></div>
          <div className="kpi-value">{custosBRL(totalPago)}</div>
          <span className="kpi-delta up">▲ {custosNum(summary.lancamentosPagos)} baixados</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #fbbf24"}}>
          <div className="kpi-label"><Icon name="calendar"/><span>A pagar (não vencido)</span></div>
          <div className="kpi-value">{custosBRL(totalAPagar)}</div>
          <span className="kpi-delta flat">{custosNum(summary.lancamentosAbertos)} em aberto</span>
        </div>
        <div className="kpi" style={{borderLeft:totalVencido > 0 ? "3px solid #f87171" : "3px solid var(--border)"}}>
          <div className="kpi-label"><Icon name="alert"/><span>Custos vencidos</span></div>
          <div className="kpi-value" style={{color:totalVencido>0?"#f87171":"inherit"}}>{custosBRL(totalVencido)}</div>
          <span className={`kpi-delta ${totalVencido > 0 ? "down" : "flat"}`}>{totalVencido > 0 ? "▼ " : ""}{custosNum(summary.lancamentosVencidos)} vencidos</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid var(--border-strong)"}}>
          <div className="kpi-label"><Icon name="chart"/><span>Total previsto</span></div>
          <div className="kpi-value">{custosBRL(totalPrevisto)}</div>
          <span className="kpi-delta flat">{custosNum(summary.totalLancamentos)} lançamentos</span>
        </div>
      </div>

      {/* ── KPIs row 2 — indicadores secundários ── */}
      <div className="grid cols-4" style={{marginBottom:16}}>
        <div className="kpi">
          <div className="kpi-label"><Icon name="gauge"/><span>Taxa de pagamento</span></div>
          <div className="kpi-value" style={{color:taxaPagamento >= 80 ? "#38bdf8" : taxaPagamento >= 50 ? "#fbbf24" : "#f87171"}}>
            {taxaPagamento.toFixed(1)}%
          </div>
          <span className="kpi-delta flat">pago / previsto</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alert"/><span>Inadimplência</span></div>
          <div className="kpi-value" style={{color:taxaVencido > 15 ? "#f87171" : taxaVencido > 5 ? "#fbbf24" : "inherit"}}>
            {taxaVencido.toFixed(1)}%
          </div>
          <span className="kpi-delta flat">vencido / previsto</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="money"/><span>Descontos obtidos</span></div>
          <div className="kpi-value">{custosBRL(summary.valorDesconto)}</div>
          <span className="kpi-delta up">campo valordescontopag</span>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="trending-up"/><span>Juros pagos</span></div>
          <div className="kpi-value" style={{color:custosNum(summary.valorJuros)>0?"#f87171":"inherit"}}>{custosBRL(summary.valorJuros)}</div>
          <span className={`kpi-delta ${custosNum(summary.valorJuros) > 0 ? "down" : "flat"}`}>campo valorjurospag</span>
        </div>
      </div>

      {/* ── Gráfico mensal + Distribuição ── */}
      <div className="grid cols-2-1" style={{marginBottom:16}}>

        {/* Monthly bar chart */}
        <div className="card card-flush chart-card">
          <div className="card-header">
            <h3>Evolução mensal</h3>
            <div className="row" style={{gap:12,fontSize:11.5}}>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:CUSTOS_COLORS.paid,display:"inline-block"}}/> Pago</span>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:CUSTOS_COLORS.open,display:"inline-block"}}/> A pagar</span>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:CUSTOS_COLORS.overdue,display:"inline-block"}}/> Vencido</span>
            </div>
          </div>
          <div className="card-body" style={{paddingTop:16,paddingBottom:12}}>
            {monthly.length === 0 && !loading && (
              <div className="muted" style={{textAlign:"center",padding:"28px 0",fontSize:12.5}}>Sem dados no período selecionado</div>
            )}
            {monthly.length > 0 && (
              <div className="chart-plot" style={{position:"relative"}}>
                {/* Gridlines */}
                {[0.75,0.5,0.25].map(pct => (
                  <div key={pct} style={{
                    position:"absolute",left:0,right:0,
                    bottom:`${26 + pct * 196}px`,
                    borderTop:"1px dashed var(--border)",
                    pointerEvents:"none",zIndex:0,
                  }}/>
                ))}
                <div key={chartKey} style={{
                  display:"grid",
                  gridTemplateColumns:`repeat(${monthly.length}, minmax(28px, 1fr))`,
                  gap:5,height:240,alignItems:"flex-end",position:"relative",zIndex:1,
                }}>
                  {monthly.map((item, index) => {
                    const total   = custosNum(item.valorDocumento);
                    const paid    = custosNum(item.valorPago);
                    const overdue = custosNum(item.valorVencido);
                    const open    = Math.max(custosNum(item.valorAberto) - overdue, 0);
                    const barH    = total > 0 ? Math.max(Math.round((total / maxMonthly) * 196), 12) : 4;
                    const isHov   = hoveredBar === index;
                    return (
                      <div key={`${item.mes || index}-${chartKey}`}
                           className="rbc-bar-in"
                           style={{
                             display:"flex",flexDirection:"column",alignItems:"center",
                             gap:3,justifyContent:"flex-end",height:"100%",
                             position:"relative",cursor:"default",
                             animationDelay:`${index * 30}ms`,
                           }}
                           onMouseEnter={() => setHoveredBar(index)}
                           onMouseLeave={() => setHoveredBar(null)}>
                        {/* Tooltip */}
                        {isHov && (
                          <div className="chart-tooltip" style={{
                            bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",
                            background:"var(--surface)",border:"1px solid var(--border-strong)",borderRadius:8,
                            padding:"10px 13px",fontSize:12,whiteSpace:"nowrap",
                            boxShadow:"var(--shadow-lg)",lineHeight:1.8,minWidth:190,
                          }}>
                            <div style={{fontWeight:600,fontSize:12.5,marginBottom:6,color:"var(--text)"}}>{item.label}</div>
                            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"1px 12px"}}>
                              <span style={{color:"var(--text-3)"}}>Total previsto</span>
                              <span style={{fontFamily:"var(--font-mono)",textAlign:"right",color:"var(--text)"}}>{custosBRL(total)}</span>
                              <span style={{color:CUSTOS_COLORS.paid}}>● Pago</span>
                              <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{custosBRL(paid)}</span>
                              <span style={{color:CUSTOS_COLORS.open}}>● A pagar</span>
                              <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{custosBRL(open)}</span>
                              <span style={{color:CUSTOS_COLORS.overdue}}>● Vencido</span>
                              <span style={{fontFamily:"var(--font-mono)",textAlign:"right"}}>{custosBRL(overdue)}</span>
                            </div>
                          </div>
                        )}
                        {/* Abbreviated value label */}
                        {total > 0 && (
                          <div style={{fontSize:8.5,color:"var(--text-3)",lineHeight:1,fontFamily:"var(--font-mono)",textAlign:"center",opacity:0.85}}>
                            {custosAbbrev(total)}
                          </div>
                        )}
                        {/* Bar */}
                        <div style={{
                          width:"100%",height:barH,
                          display:"flex",flexDirection:"column",
                          borderRadius:4,overflow:"hidden",
                          transition:"opacity 0.15s",
                          opacity: isHov ? 1 : 0.82,
                        }}>
                          {paid    > 0 && <div style={{flex:paid,    background:CUSTOS_COLORS.paid}}/>}
                          {open    > 0 && <div style={{flex:open,    background:CUSTOS_COLORS.open}}/>}
                          {overdue > 0 && <div style={{flex:overdue, background:CUSTOS_COLORS.overdue}}/>}
                          {total === 0  && <div style={{flex:1,      background:"var(--surface-3)"}}/>}
                        </div>
                        <span style={{fontSize:9.5,color:"var(--text-3)",textAlign:"center",lineHeight:1.2}}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
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
              const val = custosNum(item.valorDocumento);
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
                    <div style={{width:`${pct.toFixed(1)}%`,height:"100%",background:CUSTOS_COLORS.category,borderRadius:3,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:11,color:"var(--text-3)",marginTop:3,textAlign:"right",fontFamily:"var(--font-mono)"}}>{custosBRL(val)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Top 10 Fornecedores + Alertas ── */}
      <div className="grid cols-2" style={{marginBottom:16}}>

        {/* Top 10 fornecedores */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Top 10 Fornecedores</h3>
            <span className="meta muted">por valor previsto no período</span>
          </div>
          <div className="card-body">
            {topFornecedores.length === 0 && (
              <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>
            )}
            {topFornecedores.map((c, i) => {
              const maxVal = topFornecedores[0]?.valor || 1;
              const pct = c.valor / maxVal * 100;
              return (
                <div key={c.nome} style={{marginBottom:i < topFornecedores.length - 1 ? 12 : 0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
                    <span style={{display:"flex",gap:7,alignItems:"center",overflow:"hidden",minWidth:0}}>
                      <span style={{color:"var(--text-4)",fontFamily:"var(--font-mono)",fontSize:10.5,width:18,flexShrink:0,textAlign:"right"}}>{i+1}.</span>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5}}>{c.nome}</span>
                    </span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:12,flexShrink:0,color:"var(--text-2)"}}>{custosBRL(c.valor)}</span>
                  </div>
                  <div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden",marginLeft:25}}>
                    <div style={{width:`${pct.toFixed(1)}%`,height:"100%",background:CUSTOS_COLORS.paid,borderRadius:2,transition:"width 0.6s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas de custo */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Alertas de custo</h3>
            <span className="meta muted">{periodLabel}</span>
          </div>
          <div className="card-body">
            <div style={{display:"grid",gap:10,marginBottom:16}}>

              {/* Vencidos */}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                padding:"11px 14px",background:"var(--crit-bg)",
                border:"1px solid var(--crit-border)",borderRadius:8,
              }}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span className="dot crit"/>
                    <span style={{fontWeight:600,fontSize:13,color:"var(--crit)"}}>Pagamentos vencidos</span>
                  </div>
                  <div style={{fontSize:11.5,color:"var(--text-3)"}}>{custosNum(summary.lancamentosVencidos)} lançamento{custosNum(summary.lancamentosVencidos) !== 1 ? "s" : ""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:17,fontWeight:600,color:"var(--crit)"}}>{custosBRL(totalVencido)}</div>
                </div>
              </div>

              {/* Em aberto (não vencido) */}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                padding:"11px 14px",background:"var(--warn-bg)",
                border:"1px solid var(--warn-border)",borderRadius:8,
              }}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span className="dot warn"/>
                    <span style={{fontWeight:600,fontSize:13,color:"var(--warn)"}}>Em aberto</span>
                  </div>
                  <div style={{fontSize:11.5,color:"var(--text-3)"}}>{custosNum(summary.lancamentosAbertos)} lançamento{custosNum(summary.lancamentosAbertos) !== 1 ? "s" : ""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:17,fontWeight:600,color:"var(--warn)"}}>{custosBRL(totalAPagar)}</div>
                </div>
              </div>

              {/* Pagos */}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                padding:"11px 14px",background:"var(--ok-bg)",
                border:"1px solid var(--ok-border)",borderRadius:8,
              }}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                    <span className="dot ok"/>
                    <span style={{fontWeight:600,fontSize:13,color:"var(--ok)"}}>Pagamentos realizados</span>
                  </div>
                  <div style={{fontSize:11.5,color:"var(--text-3)"}}>{custosNum(summary.lancamentosPagos)} lançamento{custosNum(summary.lancamentosPagos) !== 1 ? "s" : ""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:17,fontWeight:600,color:"var(--ok)"}}>{custosBRL(totalPago)}</div>
                </div>
              </div>
            </div>

            {/* Lista de vencidos */}
            {vencidos.length > 0 && (
              <div style={{borderTop:"1px solid var(--divider)",paddingTop:12}}>
                <div style={{fontSize:11,color:"var(--text-4)",fontWeight:600,letterSpacing:"0.04em",marginBottom:8,textTransform:"uppercase"}}>
                  Vencimentos pendentes
                </div>
                {vencidos.slice(0, 6).map(row => (
                  <div key={row.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12.5,marginBottom:8,gap:12}}>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{row.pessoaNome || "-"}</span>
                    <span style={{fontFamily:"var(--font-mono)",flexShrink:0,color:"var(--crit)",fontSize:12}}>
                      {custosBRL(row.valorAberto)} · {custosDate(row.dataVencimento)}
                    </span>
                  </div>
                ))}
                {vencidos.length > 6 && (
                  <div className="muted" style={{fontSize:11.5,marginTop:4}}>+{vencidos.length - 6} outros vencidos</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Comparativo mensal ── */}
      {trend && (
        <div className="card card-flush" style={{marginBottom:16}}>
          <div className="card-header">
            <h3>Comparativo mensal</h3>
            <span className="meta muted">{trend.prvLabel} → {trend.curLabel}</span>
          </div>
          <div className="card-body" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{padding:"12px 14px",background:"var(--surface-2)",borderRadius:8,border:"1px solid var(--border)"}}>
              <div style={{fontSize:11.5,color:"var(--text-3)",marginBottom:5}}>{trend.curLabel} (atual)</div>
              <div style={{fontSize:21,fontFamily:"var(--font-mono)",fontWeight:500,letterSpacing:"-0.02em"}}>{custosBRL(trend.cv)}</div>
              {trend.delta !== null && (
                <span className={`kpi-delta ${trend.delta >= 0 ? "down" : "up"}`} style={{marginTop:5,display:"inline-flex"}}>
                  {trend.delta >= 0 ? "▲" : "▼"} {Math.abs(trend.delta).toFixed(1)}% vs mês anterior
                </span>
              )}
            </div>
            <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)"}}>
              <div style={{fontSize:11.5,color:"var(--text-3)",marginBottom:4}}>{trend.prvLabel} (anterior)</div>
              <div style={{fontSize:17,fontFamily:"var(--font-mono)",color:"var(--text-2)"}}>{custosBRL(trend.pv)}</div>
              <div style={{display:"grid",gap:7,marginTop:10}}>
                {[
                  { label: trend.curLabel, val: trend.cv, color: CUSTOS_COLORS.paid },
                  { label: trend.prvLabel, val: trend.pv, color: "#71717a" },
                ].map(bar => {
                  const max = Math.max(trend.cv, trend.pv, 1);
                  return (
                    <div key={bar.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:11.5}}>
                      <span style={{width:36,color:"var(--text-3)",flexShrink:0,textAlign:"right"}}>{bar.label}</span>
                      <div style={{flex:1,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${(bar.val/max*100).toFixed(1)}%`,height:"100%",background:bar.color,borderRadius:3,transition:"width 0.6s ease"}}/>
                      </div>
                      <span style={{width:96,fontFamily:"var(--font-mono)",fontSize:11,textAlign:"right",flexShrink:0}}>{custosBRL(bar.val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela de pagamentos ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Pagamentos</h3>
          <div className="row" style={{gap:8}}>
            <div style={{position:"relative"}}>
              <Icon name="search" size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text-4)",pointerEvents:"none"}}/>
              <input
                type="text"
                placeholder="Buscar fornecedor, doc…"
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
                Fornecedor <SortArrow col="pessoaNome"/>
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
              <th className="num">Pago</th>
              <th className="num">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan="7" className="muted" style={{padding:20,textAlign:"center",fontSize:12.5}}>
                {tableSearch ? "Nenhum resultado para a busca." : "Nenhum pagamento encontrado no período."}
              </td></tr>
            )}
            {pageRows.map(row => (
              <tr key={row.id}
                  className={`clickable ${row.statusCalculado === "vencido" ? "row-warn" : ""}`}
                  onClick={() => setSelectedRow(row)}>
                <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.pessoaNome || "-"}</td>
                <td className="muted">{row.documento || row.duplicata || "-"}</td>
                <td>{custosDate(row.dataVencimento)}</td>
                <td><CustosStatusBadge status={row.statusCalculado || row.status}/></td>
                <td className="num">{custosBRL(row.valorDocumento)}</td>
                <td className="num">{custosBRL(row.valorPago)}</td>
                <td className="num">{custosBRL(row.valorAberto)}</td>
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

window.Custos = Custos;

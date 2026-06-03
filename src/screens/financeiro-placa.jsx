// Financeiro por Placa — receita, custo e resultado agrupados por veículo.

// ── Date helpers ──────────────────────────────────────────────────────────────
function fpTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function fpDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function fpMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

const FP_PERIODS = [
  { key: "7d",    label: "7 dias",   getRange: () => ({ start: fpDaysAgoISO(6),   end: fpTodayISO() }) },
  { key: "30d",   label: "30 dias",  getRange: () => ({ start: fpDaysAgoISO(29),  end: fpTodayISO() }) },
  { key: "month", label: "Este mês", getRange: () => ({ start: fpMonthStartISO(), end: fpTodayISO() }) },
];

// ── Format helpers ─────────────────────────────────────────────────────────────
const FP_TIPOS_PROPRIETARIO = [
  { key: "frota", label: "Frota" },
  { key: "terceiros", label: "Terceiros" },
  { key: "todos", label: "Todos" },
];

function fpNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fpBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fpNum(v));
}
function fpAbbrev(v) {
  const n = fpNum(v);
  if (n >= 1e6) return `R$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `R$${Math.round(n / 1e3)}k`;
  return `R$${Math.round(n)}`;
}
function fpDate(v) {
  if (!v) return "-";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}
function fpPct(v) { return `${fpNum(v).toFixed(1)}%`; }
function fpLabel(item) { return item?.label || item?.placa || "Sem centro de custo"; }
function fpScale(value, max) {
  const v = Math.max(0, Math.abs(fpNum(value)));
  const m = Math.max(1, Math.abs(fpNum(max)));
  return Math.min(100, Math.max(v > 0 ? 5 : 0, Math.sqrt(v / m) * 100));
}

const FP_EMPTY = {
  period: { key: "30d", startDate: "", endDate: "" },
  totals: { receita: 0, custo: 0, saldo: 0, margem: 0, placas: 0, placasPositivas: 0, placasNegativas: 0 },
  placas: [],
};

function fpNormalize(data, fallbackKey) {
  const base = data && typeof data === "object" ? data : {};
  return {
    ...FP_EMPTY, ...base,
    period: { ...FP_EMPTY.period, key: fallbackKey, ...(base.period || {}) },
    totals: { ...FP_EMPTY.totals, ...(base.totals || {}) },
    placas: Array.isArray(base.placas) ? base.placas : [],
  };
}

// ── Saldo badge ────────────────────────────────────────────────────────────────
const FpSaldoBadge = ({ saldo }) => {
  const s = fpNum(saldo);
  if (s > 0) return <span className="badge ok"><span className="dot"/>Lucro</span>;
  if (s < 0) return <span className="badge crit"><span className="dot"/>Prejuízo</span>;
  return <span className="badge"><span className="dot"/>Neutro</span>;
};

// ── Mini monthly chart in modal ───────────────────────────────────────────────
const FpEntityLabel = ({ item, compact = false }) => {
  const label = fpLabel(item);
  const title = [
    `Grupo: ${label}`,
    item?.placaVeiculo ? `Placa: ${item.placaVeiculo}` : null,
    item?.nomeVeiculo ? `Veiculo: ${item.nomeVeiculo}` : null,
    item?.nomeCentroCusto ? `Centro: ${item.nomeCentroCusto}` : null,
    item?.centroCodigo ? `Codigo CC: ${item.centroCodigo}` : null,
  ].filter(Boolean).join("\n");

  if (item?.placaVeiculo) return <span title={title}><Plate value={label} lg={!compact}/></span>;

  return (
    <span
      title={title}
      className="badge"
      style={{
        maxWidth: compact ? 180 : 260,
        display: "inline-flex",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      {label}
    </span>
  );
};

const FpMiniChart = ({ monthly }) => {
  if (!monthly || monthly.length === 0) {
    return <div className="muted" style={{fontSize:12.5,padding:"8px 0"}}>Sem dados mensais para o período.</div>;
  }
  const maxVal = Math.max(1, ...monthly.map(m => Math.max(fpNum(m.receita), fpNum(m.custo))));
  const H = 80;
  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:10,fontSize:11.5}}>
        <span style={{display:"flex",gap:4,alignItems:"center"}}><span style={{width:8,height:8,borderRadius:1,background:"#22c55e",display:"inline-block"}}/> Receita</span>
        <span style={{display:"flex",gap:4,alignItems:"center"}}><span style={{width:8,height:8,borderRadius:1,background:"#f87171",display:"inline-block"}}/> Custo</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${monthly.length}, minmax(20px, 1fr))`,gap:4,height:H+20,alignItems:"flex-end"}}>
        {monthly.map((m, i) => {
          const rec = fpNum(m.receita);
          const cus = fpNum(m.custo);
          const rH = rec > 0 ? Math.max(Math.round((rec / maxVal) * H), 4) : 2;
          const cH = cus > 0 ? Math.max(Math.round((cus / maxVal) * H), 4) : 2;
          return (
            <div key={m.mes || i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,justifyContent:"flex-end",height:"100%"}}>
              <div style={{width:"100%",display:"flex",gap:1,alignItems:"flex-end",justifyContent:"center"}}>
                <div style={{width:"45%",height:rH,background:"#22c55e",borderRadius:"2px 2px 0 0",opacity:0.85}}/>
                <div style={{width:"45%",height:cH,background:"#f87171",borderRadius:"2px 2px 0 0",opacity:0.85}}/>
              </div>
              <span style={{fontSize:8.5,color:"var(--text-3)",textAlign:"center",lineHeight:1}}>{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Detail modal ──────────────────────────────────────────────────────────────
const FpModal = ({ placa: item, onClose }) => {
  if (!item) return null;
  const saldo = fpNum(item.saldo);
  const saldoColor = saldo > 0 ? "#22c55e" : saldo < 0 ? "#f87171" : "var(--text)";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.58)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
         onClick={onClose}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px",width:520,maxWidth:"100%",maxHeight:"88vh",overflowY:"auto"}}
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <FpEntityLabel item={item}/>
              <FpSaldoBadge saldo={item.saldo}/>
            </div>
            <div className="muted" style={{fontSize:12,marginTop:4}}>
              {item.recLancamentos + item.pagLancamentos} lançamentos no período
            </div>
          </div>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>

        {/* Summary grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            { label: "Total Receita", value: fpBRL(item.receita), color: "#22c55e" },
            { label: "Total Custo",   value: fpBRL(item.custo),   color: "#f87171" },
            { label: "Saldo",         value: fpBRL(item.saldo),   color: saldoColor },
            { label: "Margem",        value: fpPct(item.margem),  color: saldoColor },
          ].map(r => (
            <div key={r.label} style={{padding:"10px 12px",background:"var(--surface-2)",borderRadius:8,border:"1px solid var(--border)"}}>
              <div style={{fontSize:11,color:"var(--text-3)",marginBottom:4}}>{r.label}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:16,fontWeight:600,color:r.color}}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Monthly chart */}
        {item.monthly && item.monthly.length > 0 && (
          <div style={{marginBottom:16,padding:"12px 14px",background:"var(--surface-2)",borderRadius:8,border:"1px solid var(--border)"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-2)",marginBottom:10}}>Evolução mensal</div>
            <FpMiniChart monthly={item.monthly}/>
          </div>
        )}

        {/* Receita details */}
        <div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-2)",marginBottom:8}}>
            Receita — {item.recLancamentos} lançamentos
          </div>
          {[
            { label: "A receber", value: item.recAberto },
            { label: "Recebido",  value: item.recPago   },
            { label: "Vencido",   value: item.recVencido, crit: true },
          ].map(r => r.value > 0 && (
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,borderBottom:"1px solid var(--divider)"}}>
              <span style={{color:"var(--text-3)"}}>{r.label}</span>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:500,color:r.crit?"var(--crit)":"inherit"}}>{fpBRL(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Custo details */}
        <div style={{padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-2)",marginBottom:8}}>
            Custo — {item.pagLancamentos} lançamentos
          </div>
          {[
            { label: "A pagar",     value: item.pagAberto  },
            { label: "Pago",        value: item.pagPago    },
            { label: "Vencido",     value: item.pagVencido, crit: true },
          ].map(r => r.value > 0 && (
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,borderBottom:"1px solid var(--divider)"}}>
              <span style={{color:"var(--text-3)"}}>{r.label}</span>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:500,color:r.crit?"var(--crit)":"inherit"}}>{fpBRL(r.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Horizontal ranking chart ──────────────────────────────────────────────────
const FpRanking = ({ items, valueKey, color, label }) => {
  if (!items || items.length === 0) {
    return <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>;
  }
  const maxVal = Math.max(1, ...items.map(it => Math.abs(fpNum(it[valueKey]))));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {items.map((it, i) => {
        const val = fpNum(it[valueKey]);
        const absVal = Math.abs(val);
        const pct = fpScale(absVal, maxVal);
        const tooltip = `${fpLabel(it)}\nReceita: ${fpBRL(it.receita)}\nCusto: ${fpBRL(it.custo)}\nSaldo: ${fpBRL(it.saldo)}`;
        return (
          <div key={it.groupKey || it.placa} title={tooltip}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:4}}>
              <span style={{display:"flex",gap:6,alignItems:"center",overflow:"hidden",minWidth:0}}>
                <span style={{color:"var(--text-4)",fontFamily:"var(--font-mono)",fontSize:10,width:16,flexShrink:0,textAlign:"right"}}>{i+1}.</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12,fontWeight:500}}>{fpLabel(it)}</span>
              </span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11.5,flexShrink:0,color:typeof color === "function" ? color(val) : color}}>
                {label === "%" ? fpPct(val) : fpBRL(val)}
              </span>
            </div>
            <div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden"}}>
              <div style={{width:`${pct.toFixed(1)}%`,height:"100%",background:typeof color === "function" ? color(val) : color,borderRadius:2,transition:"width 0.6s ease"}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const FinanceiroPlaca = () => {
  const defaultRange = FP_PERIODS[1].getRange();

  const [periodo,      setPeriodo]      = React.useState("30d");
  const [dataInicio,   setDataInicio]   = React.useState(defaultRange.start);
  const [dataFim,      setDataFim]      = React.useState(defaultRange.end);
  const [manualFilter, setManualFilter] = React.useState(null);
  const [dados,        setDados]        = React.useState(() => fpNormalize(null, "30d"));
  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState("");
  const [selectedPlaca, setSelectedPlaca] = React.useState(null);
  const [tableSearch,  setTableSearch]  = React.useState("");
  const [sortCol,      setSortCol]      = React.useState("receita");
  const [sortDir,      setSortDir]      = React.useState("desc");
  const [tablePage,    setTablePage]    = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState("todos");
  const [placaFilter,  setPlacaFilter]  = React.useState("");
  const [tipoProprietario, setTipoProprietario] = React.useState("frota");
  const PAGE_SIZE = 15;

  // Inject animation CSS once
  React.useEffect(() => {
    const id = "rb-fp-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes rbFpIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        .rb-fp-in { animation: rbFpIn 0.35s ease forwards; }
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
    filters.tipoProprietario = tipoProprietario;
    window.RB_API.getFinanceiroPorPlaca(filters)
      .then(data => { if (active) setDados(fpNormalize(data, periodo)); })
      .catch(err => { if (!active) return; setDados(fpNormalize(null, periodo)); setError(err?.message || "Não foi possível carregar dados por placa."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, manualFilter, tipoProprietario]);

  const periodLabel = manualFilter
    ? `${fpDate(manualFilter.dataInicio)} a ${fpDate(manualFilter.dataFim)}`
    : FP_PERIODS.find(p => p.key === periodo)?.label || "30 dias";

  const { totals, placas } = dados;

  const applyManualFilter = () => {
    if (!dataInicio && !dataFim) return;
    setPeriodo("custom"); setManualFilter({ dataInicio, dataFim });
  };
  const clearManualFilter = () => {
    const r = FP_PERIODS[1].getRange();
    setDataInicio(r.start); setDataFim(r.end);
    setManualFilter(null); setPeriodo("30d");
  };
  const selectShortcut = (key) => {
    const p = FP_PERIODS.find(item => item.key === key);
    if (p) { const r = p.getRange(); setDataInicio(r.start); setDataFim(r.end); }
    setManualFilter(null); setPeriodo(key);
  };

  // Table sort + filter
  const sortedRows = React.useMemo(() => {
    let list = placas;
    if (placaFilter.trim()) {
      const q = placaFilter.trim().toLowerCase();
      list = list.filter(p => [p.label, p.placa, p.placaVeiculo, p.nomeCentroCusto, p.nomeVeiculo].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    if (statusFilter === "lucro")    list = list.filter(p => fpNum(p.saldo) > 0);
    if (statusFilter === "prejuizo") list = list.filter(p => fpNum(p.saldo) < 0);
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortCol === "placa")   return dir * (fpLabel(a).localeCompare(fpLabel(b)));
      return dir * (fpNum(a[sortCol]) - fpNum(b[sortCol]));
    });
  }, [placas, placaFilter, statusFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows   = sortedRows.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setTablePage(0);
  };
  const SortArrow = ({ col }) => (
    <span style={{marginLeft:4,opacity:sortCol===col?1:0.3}}>
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  // Ranking lists
  const top10Receita  = [...placas].sort((a, b) => b.receita - a.receita).slice(0, 10);
  const top10Custo    = [...placas].sort((a, b) => b.custo   - a.custo  ).slice(0, 10);
  const top10Prejuizo = [...placas].filter(p => fpNum(p.saldo) < 0).sort((a, b) => a.saldo - b.saldo).slice(0, 10);
  const top10Saldo    = [...placas].sort((a, b) => b.saldo - a.saldo).slice(0, 10);

  // Comparativo chart ordered by the strongest financial movement.
  const comparativoList = [...placas]
    .sort((a, b) => Math.max(b.receita, b.custo) - Math.max(a.receita, a.custo))
    .slice(0, 12);
  const maxComparativo  = Math.max(1, ...comparativoList.map(p => Math.max(fpNum(p.receita), fpNum(p.custo))));

  // Colors
  const saldoColor = (v) => fpNum(v) > 0 ? "#22c55e" : fpNum(v) < 0 ? "#f87171" : "var(--text-3)";
  const margemColor = (v) => fpNum(v) >= 20 ? "#22c55e" : fpNum(v) >= 5 ? "#fbbf24" : "#f87171";

  return (
    <div className="view">
      <FpModal placa={selectedPlaca} onClose={() => setSelectedPlaca(null)}/>

      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <h1>Financeiro por Placa</h1>
          <div className="sub">Receita: conhecimentos/CT-e · Custo: financeiro.pagar · {periodLabel}</div>
        </div>
        <div className="actions">
          {FP_PERIODS.map(p => (
            <button key={p.key}
                    className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`}
                    onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* ── Period filter ── */}
      <div className="period-filter">
        <label>Data inicial<input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}/></label>
        <div className="row" style={{gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span className="muted" style={{fontSize:11.5}}>Proprietário</span>
          {FP_TIPOS_PROPRIETARIO.map(tipo => (
            <button
              key={tipo.key}
              className={`tbl-filter${tipoProprietario === tipo.key ? " active" : ""}`}
              onClick={() => {
                setTipoProprietario(tipo.key);
                setTablePage(0);
              }}>
              {tipo.label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={applyManualFilter}>Aplicar</button>
        <button className="btn" onClick={clearManualFilter}>Limpar</button>
        {manualFilter && <span className="badge info">Filtro personalizado ativo</span>}
        <span className="muted" style={{marginLeft:"auto",fontSize:11.5}}>Receita: data emissão do conhecimento/CT-e · Custo: data vencimento financeiro.pagar</span>
      </div>

      {/* ── Status banner ── */}
      {(loading || error) && (
        <div className="card" style={{marginBottom:16,padding:"9px 14px",borderColor:error?"var(--crit-border)":"var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize:12.5}}>
            {loading ? "Carregando dados por placa…" : `⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid cols-4" style={{marginBottom:14}}>
        <div className="kpi" style={{borderLeft:"3px solid #22c55e"}}>
          <div className="kpi-label"><Icon name="trending-up"/><span>Total Receita</span></div>
          <div className="kpi-value">{fpBRL(totals.receita)}</div>
          <span className="kpi-delta flat">{totals.placas} grupos com receita/custo</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #f87171"}}>
          <div className="kpi-label"><Icon name="money"/><span>Total Custo</span></div>
          <div className="kpi-value">{fpBRL(totals.custo)}</div>
          <span className="kpi-delta flat">período selecionado</span>
        </div>
        <div className="kpi" style={{borderLeft:`3px solid ${fpNum(totals.saldo) >= 0 ? "#22c55e" : "#f87171"}`}}>
          <div className="kpi-label"><Icon name="chart"/><span>Saldo Total</span></div>
          <div className="kpi-value" style={{color:saldoColor(totals.saldo)}}>{fpBRL(totals.saldo)}</div>
          <span className={`kpi-delta ${fpNum(totals.saldo) >= 0 ? "up" : "down"}`}>
            {fpNum(totals.saldo) >= 0 ? "▲" : "▼"} Margem geral: {fpPct(totals.margem)}
          </span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid var(--border-strong)"}}>
          <div className="kpi-label"><Icon name="truck"/><span>Grupos</span></div>
          <div className="kpi-value">{totals.placas}</div>
          <span className="kpi-delta flat">
            <span style={{color:"#22c55e"}}>{totals.placasPositivas} lucro</span>
            {" · "}
            <span style={{color:"#f87171"}}>{totals.placasNegativas} prejuízo</span>
          </span>
        </div>
      </div>

      {/* ── Rankings grid ── */}
      <div className="grid cols-4" style={{marginBottom:16}}>
        <div className="card card-flush">
          <div className="card-header"><h3>Top Receita</h3><span className="meta muted">maiores faturamentos</span></div>
          <div className="card-body">
            <FpRanking items={top10Receita} valueKey="receita" color="#22c55e"/>
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Top Custo</h3><span className="meta muted">maiores despesas</span></div>
          <div className="card-body">
            <FpRanking items={top10Custo} valueKey="custo" color="#f87171"/>
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Melhor Resultado</h3><span className="meta muted">maior saldo positivo</span></div>
          <div className="card-body">
            <FpRanking items={top10Saldo} valueKey="saldo" color={saldoColor}/>
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Top Prejuízo</h3><span className="meta muted">maiores déficits</span></div>
          <div className="card-body">
            {top10Prejuizo.length === 0
              ? <div className="muted" style={{fontSize:12.5}}>Nenhuma placa com prejuízo no período.</div>
              : <FpRanking items={top10Prejuizo} valueKey="saldo" color="#f87171"/>
            }
          </div>
        </div>
      </div>

      {/* ── Comparativo Receita × Custo ── */}
      {comparativoList.length > 0 && (
        <div className="card card-flush" style={{marginBottom:16}}>
          <div className="card-header">
            <h3>Comparativo Receita × Custo</h3>
            <div className="row" style={{gap:12,fontSize:11.5}}>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:"#22c55e",display:"inline-block"}}/> Receita</span>
              <span className="row" style={{gap:4}}><span style={{width:8,height:8,borderRadius:1,background:"#f87171",display:"inline-block"}}/> Custo</span>
            </div>
          </div>
          <div className="card-body">
            {comparativoList.map((p, i) => {
              const saldo = fpNum(p.saldo);
              return (
                <div key={p.groupKey || p.placa} title={`${fpLabel(p)}\nReceita: ${fpBRL(p.receita)}\nCusto: ${fpBRL(p.custo)}\nSaldo: ${fpBRL(p.saldo)}`} style={{marginBottom: i < comparativoList.length - 1 ? 14 : 0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,gap:8}}>
                    <span style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
                      {fpLabel(p)}
                    </span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:11.5,flexShrink:0,color:saldoColor(saldo)}}>
                      {saldo >= 0 ? "+" : ""}{fpBRL(saldo)}
                    </span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    <div style={{height:8,background:"var(--surface-3)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${fpScale(p.receita, maxComparativo).toFixed(1)}%`,height:"100%",background:"#22c55e",borderRadius:4,opacity:0.85,transition:"width 0.6s ease"}}/>
                    </div>
                    <div style={{height:8,background:"var(--surface-3)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${fpScale(p.custo, maxComparativo).toFixed(1)}%`,height:"100%",background:"#f87171",borderRadius:4,opacity:0.85,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:10.5,color:"var(--text-3)"}}>
                    <span style={{fontFamily:"var(--font-mono)",color:"#22c55e"}}>{fpBRL(p.receita)}</span>
                    <span style={{fontFamily:"var(--font-mono)",color:"#f87171"}}>{fpBRL(p.custo)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabela de placas ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Resultado por Placa</h3>
          <div className="row" style={{gap:8,flexWrap:"wrap"}}>
            {/* Busca por placa */}
            <div style={{position:"relative"}}>
              <Icon name="search" size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text-4)",pointerEvents:"none"}}/>
              <input
                type="text"
                placeholder="Buscar placa ou centro..."
                value={placaFilter}
                onChange={e => { setPlacaFilter(e.target.value); setTablePage(0); }}
                style={{height:28,paddingLeft:27,paddingRight:8,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",fontSize:12.5,width:180,outline:"none"}}
              />
            </div>
            {/* Filtro de status */}
            {["todos","lucro","prejuizo"].map(s => (
              <button key={s}
                className={`tbl-filter${statusFilter === s ? " active" : ""}`}
                onClick={() => { setStatusFilter(s); setTablePage(0); }}>
                {s === "todos" ? "Todos" : s === "lucro" ? "Lucro" : "Prejuízo"}
              </button>
            ))}
            <span className="muted" style={{fontSize:11.5}}>{sortedRows.length} grupos</span>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("placa")}>Placa / Centro <SortArrow col="placa"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("receita")}>Receita <SortArrow col="receita"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("custo")}>Custo <SortArrow col="custo"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("saldo")}>Saldo <SortArrow col="saldo"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("margem")}>Margem <SortArrow col="margem"/></th>
              <th className="num">Lanç. Rec.</th>
              <th className="num">Lanç. Pag.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan="8" className="muted" style={{padding:20,textAlign:"center",fontSize:12.5}}>
                {loading ? "Carregando…" : placaFilter || statusFilter !== "todos" ? "Nenhum grupo encontrado para os filtros aplicados." : "Nenhum grupo com dados no período."}
              </td></tr>
            )}
            {pageRows.map(row => {
              const saldo = fpNum(row.saldo);
              const margem = fpNum(row.margem);
              return (
                <tr key={row.groupKey || row.placa} className="clickable" onClick={() => setSelectedPlaca(row)}>
                  <td><FpEntityLabel item={row} compact/></td>
                  <td className="num" style={{color:"#22c55e",fontWeight:500}}>{fpBRL(row.receita)}</td>
                  <td className="num" style={{color:"#f87171"}}>{fpBRL(row.custo)}</td>
                  <td className="num">
                    <span style={{fontWeight:600,color:saldoColor(saldo)}}>{saldo >= 0 ? "+" : ""}{fpBRL(saldo)}</span>
                  </td>
                  <td className="num">
                    <span style={{color:margemColor(margem),fontWeight:500}}>{fpPct(margem)}</span>
                  </td>
                  <td className="num muted">{row.recLancamentos}</td>
                  <td className="num muted">{row.pagLancamentos}</td>
                  <td><FpSaldoBadge saldo={saldo}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="tbl-footer">
            <span>Página {tablePage + 1} de {totalPages} · {sortedRows.length} grupos</span>
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

window.FinanceiroPlaca = FinanceiroPlaca;

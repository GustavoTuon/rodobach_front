// Manutenções e Custos por Veículo
// Fontes: abastecimentos, OS externas (peças+serviços), NF entrada, pneus, multas, despesas de viagem

// ── Helpers de data e formatação ─────────────────────────────────────────────
function mvTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function mvNMonthsAgoISO(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function mvNDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function mvDateFmt(v) {
  if (!v) return "—";
  const [y, m, d] = String(v).slice(0,10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}
function mvBRL(v) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
}
function mvNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function mvPct(v) { return `${mvNum(v).toFixed(1)}%`; }

// ── Períodos disponíveis ──────────────────────────────────────────────────────
const MV_PERIODS = [
  { key:"30d", label:"30 dias",  getRange:()=>({ start:mvNDaysAgoISO(29),    end:mvTodayISO() }) },
  { key:"3m",  label:"3 meses",  getRange:()=>({ start:mvNMonthsAgoISO(3),   end:mvTodayISO() }) },
  { key:"6m",  label:"6 meses",  getRange:()=>({ start:mvNMonthsAgoISO(6),   end:mvTodayISO() }) },
  { key:"12m", label:"12 meses", getRange:()=>({ start:mvNMonthsAgoISO(12),  end:mvTodayISO() }) },
];

// ── Metadados de categorias: cor e ícone ──────────────────────────────────────
const MV_CATEGORIA_META = {
  abastecimento:       { color:"#fbbf24", icon:"fuel"    },
  pecas_manutencao:    { color:"#38bdf8", icon:"package" },
  servicos_manutencao: { color:"#818cf8", icon:"wrench"  },
  pecas_estoque:       { color:"#4f7fab", icon:"package" },
  pneus:               { color:"#22c55e", icon:"compass" },
  multas:              { color:"#ef4444", icon:"alert"   },
  despesas_viagem:     { color:"#f97316", icon:"route"   },
};
const MV_COLOR_FALLBACK = "#71717a";
function mvCatColor(categoria) { return MV_CATEGORIA_META[categoria]?.color || MV_COLOR_FALLBACK; }
function mvCatIcon(categoria)  { return MV_CATEGORIA_META[categoria]?.icon  || "info"; }

// Mapa de label → cor (para produtos onde só temos categoria_label)
const MV_LABEL_COLOR = {
  "Abastecimento":             "#fbbf24",
  "Pecas/Produtos (OS Externa)":"#38bdf8",
  "Servicos (OS Externa)":     "#818cf8",
  "Pecas/Produtos (NF)":       "#4f7fab",
  "Pneus":                     "#22c55e",
  "Multas de transito":        "#ef4444",
  "Despesas de viagem":        "#f97316",
};
function mvLabelColor(label) { return MV_LABEL_COLOR[label] || MV_COLOR_FALLBACK; }

// Rótulo curto para coluna "Origem" (tabela DB → nome amigável)
function mvOrigemLabel(origem) {
  if (!origem) return "—";
  const parts = String(origem).split(".");
  const raw = parts[parts.length-1] || origem;
  const map = {
    abastecimentos:                     "Abastecimentos",
    ordensservicosexternaprodutos:       "OS Ext. Peças",
    ordensservicosexternaservicos:       "OS Ext. Serviços",
    "notasfiscaisentradaprodutos":       "NF Entrada",
    multastransito:                      "Multas",
    movimentacaopneus:                   "Mov. Pneus",
    controleviagensdespesas:             "Desp. Viagem",
  };
  return map[raw] || raw;
}

// ── CSS injetado: animações + componentes MV ──────────────────────────────────
function mvInjectStyles() {
  const id = "rb-mv-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    @keyframes mvFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .mv-bar-in { animation: mvFadeUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; }
    .mv-prog { transition: width 0.6s ease; }
    .mv-rankbar { display:block; width:100%; text-align:left; background:none; border:none; padding:0; margin:0 0 12px; font:inherit; color:inherit; cursor:default; }
    .mv-rankbar.clickable { cursor:pointer; }
    .mv-rankbar.clickable:hover .mv-rankbar-head span:first-child { color: var(--accent); }
    .mv-rankbar.active .mv-rankbar-track { box-shadow: 0 0 0 1.5px var(--accent) inset; border-radius:3px; }
    .mv-rankbar-head { display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-size:12.5px; margin-bottom:4px; }
    .mv-rankbar-head span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-2); }
    .mv-rankbar-head strong { font-family:var(--font-mono); font-weight:500; flex-shrink:0; font-size:12px; color:var(--text); }
    .mv-rankbar-track { height:6px; background:var(--surface-3); border-radius:3px; overflow:hidden; }
    .mv-rankbar-track > div { height:100%; border-radius:3px; }
    .mv-kpi-click { cursor:pointer; transition:border-color 0.15s; }
    .mv-kpi-click:hover { border-color:var(--border-strong); }
    .mv-kpi-click.active { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent) inset; }
    .mv-cat-row { display:flex; align-items:center; gap:6px; cursor:pointer; padding:2px 0; }
    .mv-cat-row:hover .mv-cat-name { color:var(--text); }
    .mv-cat-row.active .mv-cat-name { color:var(--text); font-weight:600; }
  `;
  document.head.appendChild(s);
}

// ── MvRankBar ─────────────────────────────────────────────────────────────────
const MvRankBar = ({ label, value, max, color, meta, onClick, active }) => {
  const pct = max > 0 ? Math.min(100, mvNum(value)/max*100) : 0;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`mv-rankbar${onClick ? " clickable" : ""}${active ? " active" : ""}`} onClick={onClick}>
      <div className="mv-rankbar-head">
        <span title={label}>{label}</span>
        <strong>{mvBRL(value)}</strong>
      </div>
      <div className="mv-rankbar-track">
        <div className="mv-prog" style={{width:`${pct.toFixed(1)}%`, background:color||"var(--accent)"}}/>
      </div>
      {meta && <div className="muted" style={{fontSize:11, marginTop:3}}>{meta}</div>}
    </Tag>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const ManutencoesVeiculos = () => {
  const defaultRange = MV_PERIODS[0].getRange();

  // ── Filtros de período + campos ──────────────────────────────────────────────
  const [periodo,    setPeriodo]    = React.useState("30d");
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim,    setDataFim]    = React.useState(defaultRange.end);
  const [placa,      setPlaca]      = React.useState("");
  const [categoria,  setCategoria]  = React.useState("");
  const [fornecedor, setFornecedor] = React.useState("");
  const [centro,     setCentro]     = React.useState("");
  const [produto,    setProduto]    = React.useState("");
  const [proprietario, setProprietario] = React.useState("todos");

  // Filtros aplicados (trigger de fetch)
  const [filters,    setFilters]    = React.useState({ dataInicio: defaultRange.start, dataFim: defaultRange.end });

  // ── Opções de autocomplete ────────────────────────────────────────────────────
  const [opcoes,   setOpcoes]   = React.useState({ placas:[], categorias:[], fornecedores:[], centrosCusto:[], produtos:[] });

  // ── Dados principais ─────────────────────────────────────────────────────────
  const [data,    setData]    = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState("");
  const [chartKey,setChartKey]= React.useState(0);
  const [hoveredMonth, setHoveredMonth] = React.useState(null);

  // ── Painel de detalhe por veículo ─────────────────────────────────────────────
  const [selectedPlaca, setSelectedPlaca] = React.useState("");
  const [detailData,    setDetailData]    = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError,   setDetailError]   = React.useState("");
  const detailRef = React.useRef(null);

  // ── Tabela ────────────────────────────────────────────────────────────────────
  const [tableSearch, setTableSearch] = React.useState("");
  const [sortCol,     setSortCol]     = React.useState("data");
  const [sortDir,     setSortDir]     = React.useState("desc");
  const [tablePage,   setTablePage]   = React.useState(0);
  const PAGE_SIZE = 20;

  // ── Effects ───────────────────────────────────────────────────────────────────
  React.useEffect(() => { mvInjectStyles(); }, []);

  React.useEffect(() => {
    window.RB_API.getManutencoesVeiculosFiltros()
      .then(d => {
        if (d) setOpcoes({ placas:d.placas||[], categorias:d.categorias||[], fornecedores:d.fornecedores||[], centrosCusto:d.centrosCusto||[], produtos:d.produtos||[] });
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setTablePage(0);
    window.RB_API.getManutencoesVeiculos({ ...filters, limit: 500 })
      .then(d => { if (active) { setData(d); setChartKey(k => k+1); } })
      .catch(e => { if (active) { setData(null); setError(e?.message || "Não foi possível carregar os dados de manutenção."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  React.useEffect(() => {
    if (!selectedPlaca) { setDetailData(null); return; }
    let active = true;
    setDetailLoading(true); setDetailError("");
    window.RB_API.getManutencaoVeiculoDetalhe(selectedPlaca, { dataInicio: filters.dataInicio, dataFim: filters.dataFim })
      .then(d => { if (active) setDetailData(d); })
      .catch(e => { if (active) { setDetailData(null); setDetailError(e?.message || "Não foi possível carregar o detalhe do veículo."); } })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedPlaca, filters.dataInicio, filters.dataFim]);

  React.useEffect(() => {
    if (selectedPlaca && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
    }
  }, [selectedPlaca]);

  // ── Dados derivados ───────────────────────────────────────────────────────────
  const resumo        = data?.resumo        || {};
  const evolucaoMensal= data?.evolucaoMensal|| [];
  const rankingPlacas = data?.rankingPlacas || [];
  const categorias    = data?.categorias    || [];
  const fornecedores  = data?.fornecedores  || [];
  const produtos      = data?.produtos      || [];
  const lancamentos   = data?.lancamentos   || [];

  const totalGeral      = mvNum(resumo.totalGeral);
  const maxMonthly      = Math.max(1, ...evolucaoMensal.map(m => mvNum(m.valor)));
  const maxRanking      = Math.max(1, ...rankingPlacas.map(r => mvNum(r.valor)));
  const maxFornecedor   = Math.max(1, ...fornecedores.map(f => mvNum(f.valor)));
  const maxProduto      = Math.max(1, ...produtos.map(p => mvNum(p.valor)));

  const comparativo = React.useMemo(() => {
    return rankingPlacas.slice(0, 8).map(r => ({
      placa:      r.placa,
      valor:      mvNum(r.valor),
      lancamentos:mvNum(r.lancamentos),
      custoMedio: mvNum(r.lancamentos) > 0 ? mvNum(r.valor)/mvNum(r.lancamentos) : 0,
    }));
  }, [rankingPlacas]);
  const maxComparativoValor = Math.max(1, ...comparativo.map(c => c.valor));
  const maxComparativoMedio = Math.max(1, ...comparativo.map(c => c.custoMedio));

  const sortedLancamentos = React.useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    let list = lancamentos;
    if (q) list = list.filter(l =>
      [l.placa, l.veiculoNome, l.fornecedor, l.produto, l.centroCusto, l.categoriaLabel, l.numeroDocumento, l.origem]
        .some(x => (x||"").toLowerCase().includes(q))
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortCol === "data")         return dir * ((a.data||"")         < (b.data||"")         ? -1 : 1);
      if (sortCol === "placa")        return dir * ((a.placa||"")        < (b.placa||"")        ? -1 : 1);
      if (sortCol === "categoria")    return dir * ((a.categoriaLabel||"") < (b.categoriaLabel||"") ? -1 : 1);
      if (sortCol === "fornecedor")   return dir * ((a.fornecedor||"")   < (b.fornecedor||"")   ? -1 : 1);
      if (sortCol === "produto")      return dir * ((a.produto||"")      < (b.produto||"")      ? -1 : 1);
      if (sortCol === "valorUnitario")return dir * (mvNum(a.valorUnitario) - mvNum(b.valorUnitario));
      if (sortCol === "valorTotal")   return dir * (mvNum(a.valorTotal)   - mvNum(b.valorTotal));
      if (sortCol === "centroCusto")  return dir * ((a.centroCusto||"")  < (b.centroCusto||"")  ? -1 : 1);
      return 0;
    });
  }, [lancamentos, tableSearch, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLancamentos.length / PAGE_SIZE));
  const pageRows   = sortedLancamentos.slice(tablePage * PAGE_SIZE, (tablePage+1) * PAGE_SIZE);

  const activeFiltersCount = ["placa","categoria","fornecedor","centro","produto","proprietario"].filter(k => filters[k] && filters[k] !== "todos").length;
  const periodLabel = `${mvDateFmt(filters.dataInicio)} a ${mvDateFmt(filters.dataFim)}`;

  // ── Ações ─────────────────────────────────────────────────────────────────────
  const selectShortcut = (key) => {
    const p = MV_PERIODS.find(x => x.key === key);
    if (!p) return;
    const r = p.getRange();
    setDataInicio(r.start); setDataFim(r.end); setPeriodo(key);
    setFilters(f => ({ ...f, dataInicio:r.start, dataFim:r.end }));
  };

  const applyFilters = () => {
    const next = { dataInicio, dataFim };
    if (placa.trim())     next.placa     = placa.trim();
    if (categoria)        next.categoria = categoria;
    if (fornecedor.trim())next.fornecedor= fornecedor.trim();
    if (centro.trim())    next.centro    = centro.trim();
    if (produto.trim())   next.produto   = produto.trim();
    if (proprietario && proprietario !== "todos") next.proprietario = proprietario;
    setFilters(next);
    setTablePage(0);
  };

  const clearFilters = () => {
    const r = MV_PERIODS[0].getRange();
    setDataInicio(r.start); setDataFim(r.end); setPeriodo("30d");
    setPlaca(""); setCategoria(""); setFornecedor(""); setCentro(""); setProduto(""); setProprietario("todos");
    setTableSearch(""); setSelectedPlaca("");
    setFilters({ dataInicio: r.start, dataFim: r.end });
  };

  const quickFilter = (patch) => {
    setFilters(f => {
      const next = { ...f };
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === "") delete next[k];
        else next[k] = v;
      });
      return next;
    });
    if ("placa"     in patch) setPlaca(patch.placa     || "");
    if ("categoria" in patch) setCategoria(patch.categoria || "");
    if ("fornecedor"in patch) setFornecedor(patch.fornecedor || "");
    setTablePage(0);
  };

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setTablePage(0);
  };

  const SortArrow = ({ col }) => (
    <span style={{marginLeft:4, opacity:sortCol===col?1:0.3, color:sortCol===col?"var(--accent)":"inherit"}}>
      {sortCol===col ? (sortDir==="asc"?"↑":"↓") : "↕"}
    </span>
  );

  const exportCsv = () => {
    const header = ["Data","Placa","Categoria","Fornecedor","Produto/Servico","Quantidade","Valor unitario","Valor total","Centro de custo","Documento","Origem"];
    const rows = sortedLancamentos.map(l => [
      mvDateFmt(l.data), l.placa||"", l.categoriaLabel||"", l.fornecedor||"", l.produto||"",
      mvNum(l.quantidade).toFixed(2), mvNum(l.valorUnitario).toFixed(2), mvNum(l.valorTotal).toFixed(2),
      l.centroCusto||"", [l.numeroDocumento,l.serieDocumento].filter(Boolean).join("/"), mvOrigemLabel(l.origem),
    ]);
    const csv = [header,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const a = document.createElement("a");
    a.href = url;
    a.download = `manutencoes-veiculos-${filters.dataInicio}-a-${filters.dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="view">

      {/* ── Cabeçalho ── */}
      <div className="page-head">
        <div>
          <h1>Manutenções por Veículo</h1>
          <div className="sub">Abastecimentos, OS externas, NF, pneus, multas e despesas de viagem · {periodLabel}</div>
        </div>
        <div className="actions">
          {MV_PERIODS.map(p => (
            <button key={p.key}
                    className={`btn${filters.dataInicio === p.getRange().start && !activeFiltersCount && periodo===p.key ? " primary" : ""}`}
                    onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
          <button className="btn" onClick={exportCsv}><Icon name="download" size={13}/> Exportar</button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="period-filter">
        <label>Data inicial
          <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPeriodo("custom"); }}/>
        </label>
        <label>Data final
          <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPeriodo("custom"); }}/>
        </label>
        <label>Placa
          <RBCombobox value={placa} onChange={setPlaca} options={opcoes.placas} placeholder="Todas" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/>
        </label>
        <label>Categoria
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  style={{height:30,minWidth:148,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",color:"var(--text)",fontSize:12.5,padding:"0 8px"}}>
            <option value="">Todas</option>
            {opcoes.categorias.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
          </select>
        </label>
        <label>Fornecedor
          <RBCombobox value={fornecedor} onChange={setFornecedor} options={opcoes.fornecedores} placeholder="Todos" getLabel={(f) => f.nome} getValue={(f) => f.nome} tag={() => "Fornecedor"}/>
        </label>
        <label>Centro de custo
          <RBCombobox value={centro} onChange={setCentro} options={opcoes.centrosCusto} placeholder="Todos" getLabel={(c) => c.nome} getValue={(c) => c.nome} tag={() => "Centro"}/>
        </label>
        <label>Produto/Serviço
          <RBCombobox value={produto} onChange={setProduto} options={opcoes.produtos} placeholder="Todos" getLabel={(p) => p.nome} getValue={(p) => p.nome} tag={() => "Produto"}/>
        </label>
        <label>Proprietário
          <select value={proprietario} onChange={e => setProprietario(e.target.value)}
                  style={{height:30,minWidth:122,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface-2)",color:"var(--text)",fontSize:12.5,padding:"0 8px"}}>
            <option value="todos">Todos</option>
            <option value="frota">Frota</option>
            <option value="terceiro">Terceiros</option>
          </select>
        </label>
        <button className="btn primary" onClick={applyFilters}><Icon name="filter" size={12}/> Aplicar</button>
        <button className="btn" onClick={clearFilters}><Icon name="x" size={12}/> Limpar</button>
        {activeFiltersCount > 0 && (
          <span className="badge info">{activeFiltersCount} filtro{activeFiltersCount>1?"s":""} ativo{activeFiltersCount>1?"s":""}</span>
        )}
      </div>

      {/* ── Banner de status ── */}
      {(loading || error) && (
        <div className="card" style={{marginBottom:16, padding:"9px 14px", borderColor:error?"var(--crit-border)":"var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize:12.5}}>
            {loading ? "Carregando manutenções e custos…" : `⚠ ${error}`}
          </span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid cols-5" style={{marginBottom:16}}>
        <div className="kpi" style={{borderLeft:"3px solid #ef4444"}}>
          <div className="kpi-label"><Icon name="money"/><span>Total gasto no período</span></div>
          <div className="kpi-value">{mvBRL(totalGeral)}</div>
          <span className="kpi-delta flat">{mvNum(resumo.totalLancamentos)} lançamentos</span>
        </div>
        <div className={`kpi${resumo.placaMaiorGasto && resumo.placaMaiorGasto !== "-" ? " mv-kpi-click" : ""}`}
             style={{borderLeft:"3px solid #3b82f6"}}
             onClick={resumo.placaMaiorGasto && resumo.placaMaiorGasto !== "-" ? () => setSelectedPlaca(resumo.placaMaiorGasto) : undefined}>
          <div className="kpi-label"><Icon name="truck"/><span>Veículo com maior gasto</span></div>
          <div className="kpi-value" style={{fontFamily:"var(--font-mono)", fontSize:20}}>{resumo.placaMaiorGasto || "—"}</div>
          <span className="kpi-delta flat">{mvBRL(resumo.valorPlacaMaiorGasto)} · {totalGeral>0?mvPct(mvNum(resumo.valorPlacaMaiorGasto)/totalGeral*100):"0%"}</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #a855f7"}}>
          <div className="kpi-label"><Icon name="chart"/><span>Categoria com maior gasto</span></div>
          <div className="kpi-value" style={{fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}
               title={resumo.categoriaMaiorGasto}>{resumo.categoriaMaiorGasto || "—"}</div>
          <span className="kpi-delta flat">{mvBRL(resumo.valorCategoriaMaiorGasto)}</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #0ea5e9"}}>
          <div className="kpi-label"><Icon name="wrench"/><span>Total de lançamentos</span></div>
          <div className="kpi-value">{mvNum(resumo.totalLancamentos)}</div>
          <span className="kpi-delta flat">{mvNum(resumo.totalVeiculos)} veículo{mvNum(resumo.totalVeiculos)!==1?"s":""}</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #f59e0b"}}>
          <div className="kpi-label"><Icon name="gauge"/><span>Média por veículo</span></div>
          <div className="kpi-value">{mvBRL(resumo.mediaPorVeiculo)}</div>
          <span className="kpi-delta flat">no período filtrado</span>
        </div>
      </div>

      {/* ── Seção A: Evolução mensal + Custos por categoria ── */}
      <div className="grid cols-2-1" style={{marginBottom:16}}>

        {/* Evolução mensal */}
        <div className="card card-flush chart-card">
          <div className="card-header">
            <h3>Evolução mensal dos custos</h3>
            <span className="meta muted">{evolucaoMensal.length} meses</span>
          </div>
          <div className="card-body" style={{paddingTop:16, paddingBottom:12}}>
            {evolucaoMensal.length===0 && !loading && (
              <div className="muted" style={{textAlign:"center", padding:"28px 0", fontSize:12.5}}>Sem dados no período</div>
            )}
            {evolucaoMensal.length>0 && (
              <div key={chartKey} className="chart-plot" style={{
                display:"grid",
                gridTemplateColumns:`repeat(${evolucaoMensal.length}, minmax(24px, 1fr))`,
                gap:5, height:170, alignItems:"flex-end",
              }}>
                {evolucaoMensal.map((item, idx) => {
                  const val  = mvNum(item.valor);
                  const barH = val>0 ? Math.max(Math.round((val/maxMonthly)*148), 6) : 2;
                  const isHov= hoveredMonth===idx;
                  return (
                    <div key={`${item.mes}-${chartKey}`}
                         className="mv-bar-in"
                         style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,justifyContent:"flex-end",height:"100%",position:"relative",animationDelay:`${idx*25}ms`}}
                         onMouseEnter={() => setHoveredMonth(idx)}
                         onMouseLeave={() => setHoveredMonth(null)}>
                      {isHov && (
                        <div className="chart-tooltip" style={{bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"var(--surface)",border:"1px solid var(--border-strong)",borderRadius:8,padding:"10px 13px",fontSize:12,whiteSpace:"nowrap",boxShadow:"var(--shadow-lg)",lineHeight:1.8,minWidth:180}}>
                          <div style={{fontWeight:600, fontSize:12.5, marginBottom:6, color:"var(--text)"}}>{item.mesLabel}</div>
                          <div style={{display:"grid", gridTemplateColumns:"auto 1fr", gap:"1px 12px"}}>
                            <span style={{color:"var(--text-3)"}}>Custo</span>
                            <span style={{fontFamily:"var(--font-mono)", textAlign:"right"}}>{mvBRL(val)}</span>
                            <span style={{color:"var(--text-3)"}}>Lançamentos</span>
                            <span style={{fontFamily:"var(--font-mono)", textAlign:"right"}}>{item.lancamentos}</span>
                          </div>
                        </div>
                      )}
                      <div style={{
                        width:"100%", height:barH, borderRadius:4,
                        background: isHov ? "#6a98c4" : "#4f7fab",
                        transition:"background 0.15s, opacity 0.15s",
                        opacity: isHov ? 1 : 0.85,
                      }}/>
                      <span style={{fontSize:9.5, color:"var(--text-3)", textAlign:"center", lineHeight:1.2}}>{item.mesLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Custos por categoria */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Por categoria</h3>
            <span className="meta muted">{categorias.length} categorias</span>
          </div>
          <div className="card-body">
            {categorias.length===0 && (
              <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>
            )}
            {categorias.length>0 && (
              <>
                {/* Stacked bar */}
                <div style={{display:"flex", height:10, borderRadius:5, overflow:"hidden", marginBottom:14, gap:1}}>
                  {categorias.map(c => {
                    const pct = totalGeral>0 ? (mvNum(c.valor)/totalGeral*100) : 0;
                    return <div key={c.categoria} style={{flex:pct||0.001, background:mvCatColor(c.categoria), minWidth:3, transition:"flex 0.6s ease"}} title={`${c.label}: ${mvPct(pct)}`}/>;
                  })}
                </div>
                {categorias.map(c => {
                  const pct    = totalGeral>0 ? (mvNum(c.valor)/totalGeral*100) : 0;
                  const maxVal = mvNum(categorias[0]?.valor)||1;
                  const relPct = mvNum(c.valor)/maxVal*100;
                  const active = filters.categoria === c.categoria;
                  return (
                    <div key={c.categoria} className={`mv-cat-row${active?" active":""}`} style={{marginBottom:10}}
                         onClick={() => quickFilter({categoria: active ? undefined : c.categoria})}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3, gap:6}}>
                          <span style={{display:"flex", alignItems:"center", gap:6, overflow:"hidden", minWidth:0}}>
                            <span style={{width:8, height:8, borderRadius:2, background:mvCatColor(c.categoria), flexShrink:0, display:"inline-block"}}/>
                            <span className="mv-cat-name" style={{fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:active?"var(--text)":"var(--text-2)", fontWeight:active?600:400}}>{c.label}</span>
                          </span>
                          <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)", flexShrink:0}}>{mvPct(pct)}</span>
                        </div>
                        <div style={{height:4, background:"var(--surface-3)", borderRadius:2, overflow:"hidden"}}>
                          <div className="mv-prog" style={{width:`${relPct.toFixed(1)}%`, height:"100%", background:mvCatColor(c.categoria), borderRadius:2}}/>
                        </div>
                        <div style={{fontSize:11, color:"var(--text-3)", marginTop:2, textAlign:"right", fontFamily:"var(--font-mono)"}}>{mvBRL(c.valor)} · {c.lancamentos} lanç.</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Seção B: Ranking de placas + Comparativo ── */}
      <div className="grid cols-2" style={{marginBottom:16}}>

        {/* Ranking de placas */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Ranking de placas</h3>
            <span className="meta muted">por valor no período · clique para detalhes</span>
          </div>
          <div className="card-body">
            {rankingPlacas.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>}
            {rankingPlacas.slice(0,10).map((r, i) => (
              <MvRankBar key={r.placa}
                         label={`${i+1}. ${r.placa}${r.veiculoNome ? ` — ${r.veiculoNome}` : ""}`}
                         value={r.valor} max={maxRanking} color="#4f7fab"
                         meta={`${r.lancamentos} lanç. · ${mvPct(r.percentual)} do total`}
                         onClick={() => setSelectedPlaca(selectedPlaca===r.placa ? "" : r.placa)}
                         active={selectedPlaca===r.placa}/>
            ))}
          </div>
        </div>

        {/* Comparativo entre veículos */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Comparativo entre veículos</h3>
            <span className="meta muted">total vs. custo médio por lançamento</span>
          </div>
          <div className="card-body">
            {comparativo.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>}
            {comparativo.map(c => (
              <div key={c.placa} style={{marginBottom:14}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4}}>
                  <span style={{fontSize:12.5, fontWeight:600, fontFamily:"var(--font-mono)"}}>{c.placa}</span>
                  <span className="muted" style={{fontSize:11}}>{c.lancamentos} lanç.</span>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:3}}>
                  <span className="muted" style={{fontSize:10.5, width:70, flexShrink:0}}>Total</span>
                  <div style={{flex:1, height:5, background:"var(--surface-3)", borderRadius:2, overflow:"hidden"}}>
                    <div className="mv-prog" style={{width:`${(c.valor/maxComparativoValor*100).toFixed(1)}%`, height:"100%", background:"#4f7fab", borderRadius:2}}/>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:11, width:90, textAlign:"right"}}>{mvBRL(c.valor)}</span>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:6}}>
                  <span className="muted" style={{fontSize:10.5, width:70, flexShrink:0}}>Médio/lanç.</span>
                  <div style={{flex:1, height:5, background:"var(--surface-3)", borderRadius:2, overflow:"hidden"}}>
                    <div className="mv-prog" style={{width:`${(c.custoMedio/maxComparativoMedio*100).toFixed(1)}%`, height:"100%", background:"#f59e0b", borderRadius:2}}/>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:11, width:90, textAlign:"right"}}>{mvBRL(c.custoMedio)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Seção C: Top fornecedores + Top produtos ── */}
      <div className="grid cols-2" style={{marginBottom:16}}>

        {/* Top fornecedores */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Top fornecedores</h3>
            <span className="meta muted">{fornecedores.length} fornecedores</span>
          </div>
          <div className="card-body">
            {fornecedores.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>}
            {fornecedores.slice(0,8).map((f, i) => (
              <MvRankBar key={`${f.codigo}-${f.nome}`}
                         label={`${i+1}. ${f.nome}`}
                         value={f.valor} max={maxFornecedor} color="#22c55e"
                         meta={`${f.lancamentos} lanç.`}
                         onClick={() => quickFilter({fornecedor: filters.fornecedor===f.nome ? undefined : f.nome})}
                         active={filters.fornecedor===f.nome}/>
            ))}
          </div>
        </div>

        {/* Top produtos/serviços */}
        <div className="card card-flush">
          <div className="card-header">
            <h3>Top produtos/serviços</h3>
            <span className="meta muted">{produtos.length} itens</span>
          </div>
          <div className="card-body">
            {produtos.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados no período</div>}
            {produtos.slice(0,8).map((p, i) => (
              <MvRankBar key={`${p.codigo}-${p.nome}-${i}`}
                         label={`${i+1}. ${p.nome}`}
                         value={p.valor} max={maxProduto} color={mvLabelColor(p.categoriaLabel)}
                         meta={`${p.categoriaLabel} · qtd ${mvNum(p.quantidade).toLocaleString("pt-BR",{maximumFractionDigits:2})}`}
                         onClick={() => quickFilter({produto: filters.produto===p.nome ? undefined : p.nome})}
                         active={filters.produto===p.nome}/>
            ))}
          </div>
        </div>
      </div>

      {/* ── Seção D: Análise detalhada por veículo ── */}
      {selectedPlaca && (
        <div className="card card-flush" style={{marginBottom:16}} ref={detailRef}>
          <div className="card-header">
            <div>
              <h3>Veículo: {selectedPlaca}</h3>
              {detailData?.veiculoNome && (
                <span className="meta muted">{detailData.veiculoNome}{detailData.tipoPropriedade ? ` · ${detailData.tipoPropriedade}` : ""}</span>
              )}
            </div>
            <div className="row" style={{gap:8}}>
              <button className="btn sm" onClick={() => quickFilter({placa: filters.placa===selectedPlaca ? undefined : selectedPlaca})}>
                <Icon name="filter" size={12}/> {filters.placa===selectedPlaca ? "Remover filtro" : "Filtrar por esta placa"}
              </button>
              <button className="btn sm ghost" onClick={() => setSelectedPlaca("")}><Icon name="x" size={13}/></button>
            </div>
          </div>
          <div className="card-body">
            {detailLoading && <div className="muted" style={{fontSize:12.5, padding:"8px 0"}}>Carregando detalhe…</div>}
            {detailError && <div className="kpi-delta down" style={{fontSize:12.5}}>⚠ {detailError}</div>}
            {!detailLoading && !detailError && detailData && (
              <>
                {/* KPIs do veículo */}
                <div className="grid cols-4" style={{marginBottom:16}}>
                  <div className="kpi" style={{borderLeft:"3px solid #ef4444"}}>
                    <div className="kpi-label"><Icon name="money"/><span>Total gasto</span></div>
                    <div className="kpi-value">{mvBRL(detailData.totalGasto)}</div>
                    <span className="kpi-delta flat">{detailData.totalLancamentos} lançamentos</span>
                  </div>
                  <div className="kpi" style={{borderLeft:"3px solid #f59e0b"}}>
                    <div className="kpi-label"><Icon name="gauge"/><span>Custo médio mensal</span></div>
                    <div className="kpi-value">{mvBRL(detailData.custoMedioMensal)}</div>
                    <span className="kpi-delta flat">{detailData.evolucaoMensal.length} meses</span>
                  </div>
                  <div className="kpi" style={{borderLeft:"3px solid #3b82f6"}}>
                    <div className="kpi-label"><Icon name="calendar"/><span>1º lançamento</span></div>
                    <div className="kpi-value" style={{fontSize:17}}>{mvDateFmt(detailData.primeiraData)}</div>
                    <span className="kpi-delta flat">no período filtrado</span>
                  </div>
                  <div className="kpi" style={{borderLeft:"3px solid #a855f7"}}>
                    <div className="kpi-label"><Icon name="clock"/><span>Último lançamento</span></div>
                    <div className="kpi-value" style={{fontSize:17}}>{mvDateFmt(detailData.ultimaData)}</div>
                    <span className="kpi-delta flat">data mais recente</span>
                  </div>
                </div>

                {/* Categorias + Origens */}
                <div className="grid cols-2" style={{marginBottom:16}}>
                  <div>
                    <div style={{fontSize:11.5, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em"}}>Por categoria</div>
                    {detailData.categorias.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados</div>}
                    {detailData.categorias.map(c => (
                      <MvRankBar key={c.categoria}
                                 label={c.label} value={c.valor}
                                 max={Math.max(1, ...detailData.categorias.map(x => mvNum(x.valor)))}
                                 color={mvCatColor(c.categoria)}
                                 meta={`${mvPct(c.percentual)} · ${c.lancamentos} lanç.`}/>
                    ))}
                  </div>
                  <div>
                    <div style={{fontSize:11.5, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em"}}>Origem dos lançamentos</div>
                    {detailData.origens.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados</div>}
                    {detailData.origens.map(o => (
                      <MvRankBar key={o.origem}
                                 label={mvOrigemLabel(o.origem)} value={o.valor}
                                 max={Math.max(1, ...detailData.origens.map(x => mvNum(x.valor)))}
                                 color="#64748b"
                                 meta={`${o.lancamentos} lanç.`}/>
                    ))}
                  </div>
                </div>

                {/* Principais produtos + fornecedores */}
                <div className="grid cols-2" style={{marginBottom:16}}>
                  <div>
                    <div style={{fontSize:11.5, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em"}}>Principais produtos/serviços</div>
                    {detailData.produtos.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados</div>}
                    {detailData.produtos.slice(0,6).map((p, i) => (
                      <MvRankBar key={`${p.nome}-${i}`}
                                 label={p.nome} value={p.valor}
                                 max={Math.max(1, ...detailData.produtos.map(x => mvNum(x.valor)))}
                                 color={mvLabelColor(p.categoriaLabel)}
                                 meta={`${p.categoriaLabel} · qtd ${mvNum(p.quantidade).toLocaleString("pt-BR",{maximumFractionDigits:2})}`}/>
                    ))}
                  </div>
                  <div>
                    <div style={{fontSize:11.5, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em"}}>Principais fornecedores</div>
                    {detailData.fornecedores.length===0 && <div className="muted" style={{fontSize:12.5}}>Sem dados</div>}
                    {detailData.fornecedores.slice(0,6).map((f, i) => (
                      <MvRankBar key={`${f.nome}-${i}`}
                                 label={f.nome} value={f.valor}
                                 max={Math.max(1, ...detailData.fornecedores.map(x => mvNum(x.valor)))}
                                 color="#22c55e"
                                 meta={`${f.lancamentos} lanç.`}/>
                    ))}
                  </div>
                </div>

                {/* Últimas manutenções */}
                <div>
                  <div style={{fontSize:11.5, fontWeight:600, color:"var(--text-3)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em"}}>Últimas manutenções</div>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Fornecedor</th>
                        <th>Produto/Serviço</th>
                        <th className="num">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.ultimasManutencoes.length===0 && (
                        <tr><td colSpan="5" className="muted" style={{textAlign:"center", padding:16, fontSize:12.5}}>Nenhum lançamento encontrado.</td></tr>
                      )}
                      {detailData.ultimasManutencoes.map((m, i) => (
                        <tr key={`${m.chaveOrigem}-${i}`}>
                          <td className="date">{mvDateFmt(m.data)}</td>
                          <td className="cell-badge">
                            <span className="badge" style={{color:mvCatColor(m.categoria), borderColor:mvCatColor(m.categoria), background:`${mvCatColor(m.categoria)}18`}}>
                              <span className="dot" style={{background:mvCatColor(m.categoria)}}/>
                              {m.categoriaLabel}
                            </span>
                          </td>
                          <td style={{maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={m.fornecedor}>{m.fornecedor}</td>
                          <td style={{maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={m.produto}>{m.produto}</td>
                          <td className="num">{mvBRL(m.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Seção E: Tabela detalhada de lançamentos ── */}
      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Lançamentos detalhados</h3>
          <div className="row" style={{gap:8}}>
            <div style={{position:"relative"}}>
              <Icon name="search" size={13} style={{position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"var(--text-4)", pointerEvents:"none"}}/>
              <input type="text" placeholder="Buscar em todos os campos…" value={tableSearch}
                     onChange={e => { setTableSearch(e.target.value); setTablePage(0); }}
                     style={{height:28, paddingLeft:27, paddingRight:8, border:"1px solid var(--border)", borderRadius:"var(--r)", background:"var(--surface-2)", fontSize:12.5, width:230, outline:"none"}}/>
            </div>
            <span className="muted" style={{fontSize:11.5}}>{sortedLancamentos.length} lançamento{sortedLancamentos.length!==1?"s":""}</span>
            <button className="btn sm" onClick={exportCsv}><Icon name="download" size={12}/> CSV</button>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{cursor:"pointer", whiteSpace:"nowrap"}} onClick={() => toggleSort("data")}>Data <SortArrow col="data"/></th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("placa")}>Placa <SortArrow col="placa"/></th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("categoria")}>Categoria <SortArrow col="categoria"/></th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("fornecedor")}>Fornecedor <SortArrow col="fornecedor"/></th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("produto")}>Produto/Serviço <SortArrow col="produto"/></th>
              <th className="num">Qtd.</th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("valorUnitario")}>Vl. unit. <SortArrow col="valorUnitario"/></th>
              <th className="num" style={{cursor:"pointer"}} onClick={() => toggleSort("valorTotal")}>Vl. total <SortArrow col="valorTotal"/></th>
              <th style={{cursor:"pointer"}} onClick={() => toggleSort("centroCusto")}>Centro de custo <SortArrow col="centroCusto"/></th>
              <th>Documento</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length===0 && (
              <tr>
                <td colSpan="11" className="muted" style={{padding:24, textAlign:"center", fontSize:12.5}}>
                  {loading ? "Carregando…" : tableSearch ? "Nenhum resultado para a busca." : "Nenhum lançamento encontrado com os filtros aplicados."}
                </td>
              </tr>
            )}
            {pageRows.map((l, i) => (
              <tr key={`${l.chaveOrigem}-${i}`} className="clickable" onClick={() => setSelectedPlaca(selectedPlaca===l.placa ? "" : l.placa)}>
                <td className="date">{mvDateFmt(l.data)}</td>
                <td style={{fontFamily:"var(--font-mono)", fontWeight:600}}>{l.placa}</td>
                <td className="cell-badge">
                  <span className="badge" style={{color:mvCatColor(l.categoria), borderColor:mvCatColor(l.categoria), background:`${mvCatColor(l.categoria)}18`}}>
                    <span className="dot" style={{background:mvCatColor(l.categoria)}}/>
                    {l.categoriaLabel}
                  </span>
                </td>
                <td style={{maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={l.fornecedor}>{l.fornecedor}</td>
                <td style={{maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={l.produto}>{l.produto}</td>
                <td className="num">{mvNum(l.quantidade).toLocaleString("pt-BR",{maximumFractionDigits:2})}</td>
                <td className="num">{mvBRL(l.valorUnitario)}</td>
                <td className="num" style={{fontWeight:500}}>{mvBRL(l.valorTotal)}</td>
                <td style={{maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={l.centroCusto}>{l.centroCusto}</td>
                <td style={{fontSize:12, whiteSpace:"nowrap"}}>{[l.numeroDocumento, l.serieDocumento].filter(Boolean).join("/") || "—"}</td>
                <td className="muted" style={{fontSize:11.5, whiteSpace:"nowrap"}}>{mvOrigemLabel(l.origem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && (
          <div className="tbl-footer">
            <span>Página {tablePage+1} de {totalPages} · {sortedLancamentos.length} registros</span>
            <div className="pager">
              <button onClick={() => setTablePage(0)} disabled={tablePage===0}>«</button>
              <button onClick={() => setTablePage(p => p-1)} disabled={tablePage===0}>‹</button>
              <button onClick={() => setTablePage(p => p+1)} disabled={tablePage>=totalPages-1}>›</button>
              <button onClick={() => setTablePage(totalPages-1)} disabled={tablePage>=totalPages-1}>»</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

window.ManutencoesVeiculos = ManutencoesVeiculos;

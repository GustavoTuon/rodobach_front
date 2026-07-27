// DRE Empresarial - receita por conhecimento/CT-e e custos pelo financeiro a pagar.

function dreEmpTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function dreEmpMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

function dreEmpDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

const DRE_EMP_PERIODS = [
  { key: "7d", label: "7 dias", range: () => ({ start: dreEmpDaysAgoISO(6), end: dreEmpTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: dreEmpDaysAgoISO(29), end: dreEmpTodayISO() }) },
  { key: "month", label: "Este mês", range: () => ({ start: dreEmpMonthStartISO(), end: dreEmpTodayISO() }) },
];

const DRE_EMP_EMPTY = {
  period: {},
  summary: {},
  structure: [],
  monthly: [],
  categories: [],
  accounts: [],
  centers: [],
  plates: [],
  management: { topDespesas: [], recorrentes: [], veiculosMaiorCusto: [], contasImpacto: [], alertas: [] },
  rows: [],
  cteAudit: { count: 0, value: 0, rows: [] },
  sources: [],
};

function dreEmpNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dreEmpBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dreEmpNum(value));
}

function dreEmpPct(value) {
  return `${dreEmpNum(value).toFixed(1)}%`;
}

function dreEmpDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function dreEmpSortByDate(a, b) {
  const dateCompare = String(b.data || "").localeCompare(String(a.data || ""));
  if (dateCompare) return dateCompare;
  return String(b.documento || "").localeCompare(String(a.documento || ""));
}

function dreEmpCostType(row) {
  const text = `${row.contaMascara || ""} ${row.contaFinanceira || ""} ${row.categoriaDre || ""} ${row.pessoaNome || ""} ${row.historico || ""}`.toLowerCase();
  if (text.includes("pedagio") || text.includes("pedágio")) return "Pedagio";
  if (text.includes("borracharia")) return "Borracharia";
  if (text.includes("combust") || text.includes("lubrificant") || text.includes("posto")) return "Combustivel";
  if (text.includes("manuten") || text.includes("oficina") || text.includes("pecas") || text.includes("peças")) return "Manutencao";
  if (text.includes("equipamento")) return "Equipamento";
  if (text.includes("pneu")) return "Pneus";
  if (text.includes("seguro") || text.includes("seguradora")) return "Seguro";
  if (text.includes("multa")) return "Multas";
  if (text.includes("rastreamento")) return "Rastreamento";
  if (text.includes("financiamento") || text.includes("consorcio") || text.includes("consórcio") || text.includes("emprestimo") || text.includes("empréstimo")) return "Financiamento";
  if (text.includes("salario") || text.includes("salário") || text.includes("salários") || text.includes("motorista")) return "Motorista / pessoal";
  if (text.includes("comissao") || text.includes("comissão")) return "Comissao";
  if (text.includes("frete") || text.includes("viagem")) return "Frete / viagem";
  return row.categoriaDre || "Outros";
}

function dreEmpShort(value) {
  const n = Math.abs(dreEmpNum(value));
  const sign = dreEmpNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function dreEmpNormalize(data) {
  const base = data && typeof data === "object" ? data : {};
  return {
    ...DRE_EMP_EMPTY,
    ...base,
    summary: { ...DRE_EMP_EMPTY.summary, ...(base.summary || {}) },
    management: { ...DRE_EMP_EMPTY.management, ...(base.management || {}) },
    structure: Array.isArray(base.structure) ? base.structure : [],
    monthly: Array.isArray(base.monthly) ? base.monthly : [],
    categories: Array.isArray(base.categories) ? base.categories : [],
    accounts: Array.isArray(base.accounts) ? base.accounts : [],
    centers: Array.isArray(base.centers) ? base.centers : [],
    plates: Array.isArray(base.plates) ? base.plates : [],
    rows: Array.isArray(base.rows) ? base.rows : [],
    cteAudit: {
      count: dreEmpNum(base.cteAudit?.count),
      value: dreEmpNum(base.cteAudit?.value),
      rows: Array.isArray(base.cteAudit?.rows) ? base.cteAudit.rows : [],
    },
    sources: Array.isArray(base.sources) ? base.sources : [],
  };
}

function dreEmpExport(data, label) {
  const header = ["Data","Centro","Conta financeira","Categoria DRE","Tipo","Placa","Cliente/Fornecedor","Documento","Historico","Valor","Status","Origem"];
  const lines = (data.rows || []).map((row) => [
    row.data || "", row.centroCusto || "", row.contaFinanceira || "", row.categoriaDre || "", row.tipo || "",
    row.placa || "", row.pessoaNome || "", row.documento || "", row.historico || "", dreEmpNum(row.valor), row.status || "", row.origem || "",
  ]);
  const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dre-empresarial-${label.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DreEmpKpi = ({ label, value, icon, tone, sub, percent, plain }) => (
  <div className="kpi" style={{borderLeft: `3px solid ${tone || "var(--border-strong)"}`}}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{plain ? (value || 0) : percent ? dreEmpPct(value) : dreEmpBRL(value)}</div>
    {sub && <span className={`kpi-delta ${dreEmpNum(value) >= 0 ? "up" : "down"}`}>{sub}</span>}
  </div>
);

const DreEmpBar = ({ label, value, total, tone, meta }) => {
  const pct = total > 0 ? Math.min(100, Math.abs(dreEmpNum(value)) / total * 100) : 0;
  return (
    <div style={{marginBottom: 12}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 5}}>
        <span style={{fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}} title={label}>{label}</span>
        <span style={{fontFamily: "var(--font-mono)", fontSize: 12}}>{dreEmpBRL(value)}</span>
      </div>
      <div style={{height: 5, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden"}}>
        <div style={{width: `${pct.toFixed(1)}%`, height: "100%", background: tone || "var(--brand-blue)", borderRadius: 4}}/>
      </div>
      {meta && <div className="muted" style={{fontSize: 11, marginTop: 3}}>{meta}</div>}
    </div>
  );
};

const DreEmpresarial = () => {
  const defaultRange = DRE_EMP_PERIODS[2].range();
  const [periodo, setPeriodo] = React.useState("month");
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim, setDataFim] = React.useState(defaultRange.end);
  const [mesAno, setMesAno] = React.useState("");
  const [centro, setCentro] = React.useState("");
  const [conta, setConta] = React.useState("");
  const [placa, setPlaca] = React.useState("");
  const [cliente, setCliente] = React.useState("");
  const [tipo, setTipo] = React.useState("todos");
  const [status, setStatus] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const [manualFilter, setManualFilter] = React.useState(null);
  const [data, setData] = React.useState(() => dreEmpNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("despesas");
  const [hoveredMonth, setHoveredMonth] = React.useState(null);
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const [selectedPlate, setSelectedPlate] = React.useState(null);
  const [expandedLaunch, setExpandedLaunch] = React.useState("");
  const [launchDetails, setLaunchDetails] = React.useState({});
  const [launchDetailError, setLaunchDetailError] = React.useState({});
  const [showAllFleetPlates, setShowAllFleetPlates] = React.useState(false);
  const [showAllThirdPartyPlates, setShowAllThirdPartyPlates] = React.useState(false);
  const [plateRanking, setPlateRanking] = React.useState("custo");
  const [showCteAudit, setShowCteAudit] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const filters = manualFilter || { period: periodo };
    window.RB_API.getDreEmpresarial(filters)
      .then((payload) => { if (active) setData(dreEmpNormalize(payload)); })
      .catch((err) => {
        if (!active) return;
        setData(dreEmpNormalize(null));
        setError(err?.message || "Nao foi possivel carregar a DRE empresarial.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, manualFilter]);

  const periodLabel = manualFilter
    ? (manualFilter.mesAno || `${dreEmpDate(manualFilter.dataInicio)} a ${dreEmpDate(manualFilter.dataFim)}`)
    : DRE_EMP_PERIODS.find((item) => item.key === periodo)?.label || "Este mês";
  const s = data.summary || {};
  const maxMonthly = Math.max(1, ...data.monthly.map((m) => Math.max(dreEmpNum(m.receita), dreEmpNum(m.custo))));
  const maxExpense = Math.max(1, ...data.accounts.map((a) => dreEmpNum(a.custo)));
  const plateMetric = (plate) => {
    if (plateRanking === "receita") return dreEmpNum(plate.receita);
    if (plateRanking === "lucro") return dreEmpNum(plate.receita) - dreEmpNum(plate.custo);
    return dreEmpNum(plate.custo);
  };
  const rankPlates = (operation) => data.plates
    .filter((plate) => plate.operacao === operation)
    .slice()
    .sort((a, b) => plateMetric(b) - plateMetric(a));
  const fleetPlates = rankPlates("frota");
  const thirdPartyPlates = rankPlates("terceiro");
  const maxFleetPlate = Math.max(1, ...fleetPlates.map((plate) => Math.abs(plateMetric(plate))));
  const maxThirdPartyPlate = Math.max(1, ...thirdPartyPlates.map((plate) => Math.abs(plateMetric(plate))));
  const plateRankingLabel = plateRanking === "receita" ? "Faturamento" : plateRanking === "lucro" ? "Lucro" : "Custo";
  const topCost = data.accounts.filter((a) => dreEmpNum(a.custo) > 0)[0];
  const cteAuditRows = data.cteAudit.rows
    .slice()
    .sort(dreEmpSortByDate);
  const cteAuditValue = dreEmpNum(data.cteAudit.value);
  const tableRows = data.rows.slice(0, 160);
  const isTerceiro = (manualFilter?.tipo || tipo) === "terceiro";
  const dreLabel = (label) => isTerceiro ? String(label).replace("CUSTOS COM FROTA", "CUSTOS") : label;
  const selectedPlateDetail = React.useMemo(() => {
    if (!selectedPlate) return null;
    const rows = data.rows.filter((row) => row.placa === selectedPlate);
    const receita = rows.filter((row) => dreEmpNum(row.valor) > 0).reduce((sum, row) => sum + dreEmpNum(row.valor), 0);
    const custo = rows.filter((row) => dreEmpNum(row.valor) < 0).reduce((sum, row) => sum + Math.abs(dreEmpNum(row.valor)), 0);
    const custos = rows.filter((row) => dreEmpNum(row.valor) < 0).map((row) => ({ ...row, tipoCusto: dreEmpCostType(row) }));
    const byType = new Map();
    custos.forEach((row) => {
      const key = row.tipoCusto || "Outros";
      const current = byType.get(key) || { tipo: key, valor: 0, lancamentos: 0 };
      current.valor += Math.abs(dreEmpNum(row.valor));
      current.lancamentos += dreEmpNum(row.lancamentos) || 1;
      byType.set(key, current);
    });
    return {
      placa: selectedPlate,
      receita,
      custo,
      lucro: receita - custo,
      margem: receita > 0 ? ((receita - custo) / receita) * 100 : 0,
      receitas: rows.filter((row) => dreEmpNum(row.valor) > 0).sort(dreEmpSortByDate),
      custos: custos.sort(dreEmpSortByDate),
      tiposCusto: [...byType.values()].sort((a, b) => b.valor - a.valor),
    };
  }, [selectedPlate, data.rows]);

  const toggleLaunchDetail = React.useCallback((row, index) => {
    const key = `${row.origem}-${row.detailKey?.empresa || ""}-${row.detailKey?.documento || row.documento || ""}-${index}`;
    if (expandedLaunch === key) {
      setExpandedLaunch("");
      return;
    }
    setExpandedLaunch(key);
    if (launchDetails[key]) return;
    setLaunchDetails((current) => ({ ...current, [key]: { loading: true, itens: [] } }));
    setLaunchDetailError((current) => ({ ...current, [key]: "" }));
    window.RB_API.getDreLancamentoDetalhe(row.detailKey || {})
      .then((payload) => setLaunchDetails((current) => ({ ...current, [key]: { ...payload, loading: false } })))
      .catch((err) => {
        setLaunchDetails((current) => ({ ...current, [key]: { loading: false, itens: [] } }));
        setLaunchDetailError((current) => ({ ...current, [key]: err?.message || "Não foi possível carregar os itens." }));
      });
  }, [expandedLaunch, launchDetails]);
  const pessoas = React.useMemo(() => {
    const map = new Map();
    data.rows.forEach((row) => {
      if (!row.pessoaNome && !row.clienteCodigo) return;
      const key = row.clienteCodigo || row.pessoaNome;
      if (!map.has(key)) map.set(key, { codigo: row.clienteCodigo, nome: row.pessoaNome || String(row.clienteCodigo) });
    });
    return [...map.values()].sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  }, [data.rows]);

  const selectShortcut = (key) => {
    const p = DRE_EMP_PERIODS.find((item) => item.key === key);
    if (p) {
      const r = p.range();
      setDataInicio(r.start);
      setDataFim(r.end);
    }
    setMesAno("");
    setManualFilter(null);
    setPeriodo(key);
  };

  const buildFilters = () => ({
    dataInicio,
    dataFim,
    mesAno,
    centro,
    conta,
    placa,
    cliente,
    tipo,
    status,
    search,
  });

  const applyFilter = () => {
    setPeriodo("custom");
    setManualFilter(buildFilters());
  };

  const clearFilter = () => {
    const r = DRE_EMP_PERIODS[2].range();
    setDataInicio(r.start);
    setDataFim(r.end);
    setMesAno("");
    setCentro("");
    setConta("");
    setPlaca("");
    setCliente("");
    setTipo("todos");
    setStatus("todos");
    setSearch("");
    setManualFilter(null);
    setPeriodo("month");
  };

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>DRE Empresarial</h1>
          <div className="sub">Receita CT-e, impostos e custos financeiros por data de lançamento - {periodLabel}</div>
        </div>
        <div className="actions">
          {DRE_EMP_PERIODS.map((p) => (
            <button key={p.key} className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`} onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
          <button className="btn" onClick={() => dreEmpExport(data, periodLabel)}><Icon name="download"/> Exportar</button>
        </div>
      </div>

      <style>{`
        .dre-filter.collapsed > label:nth-of-type(3),
        .dre-filter.collapsed > label:nth-of-type(4),
        .dre-filter.collapsed > label:nth-of-type(5),
        .dre-filter.collapsed > label:nth-of-type(6),
        .dre-filter.collapsed > label:nth-of-type(7),
        .dre-filter.collapsed > label:nth-of-type(9),
        .dre-filter.collapsed > label:nth-of-type(10) { display: none; }
      `}</style>
      <div className={`period-filter dre-filter ${showMoreFilters ? "expanded" : "collapsed"}`} style={{alignItems: "end", flexWrap: "wrap"}}>
        <label>Lançamento inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Lançamento final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></label>
        <label>Mês/Ano<input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)}/></label>
        <label>Centro<RBCombobox value={centro} onChange={setCentro} options={data.centers} placeholder="Código ou nome" getLabel={(c) => `${c.centroCodigo || ""} ${c.centroCusto || "Sem centro"}`.trim()} getValue={(c) => c.centroCodigo || c.centroCusto || ""} tag={() => "Centro"}/></label>
        <label>Conta<RBCombobox value={conta} onChange={setConta} options={data.accounts} placeholder="Código ou nome" getLabel={(c) => `${c.contaCodigo || ""} ${c.contaNome || "Sem conta"}`.trim()} getValue={(c) => c.contaCodigo || c.contaNome || ""} tag={() => "Conta"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.plates} placeholder="AAA0A00" getLabel={(p) => p.placa} getValue={(p) => p.placa} transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={pessoas} placeholder="Nome ou código" getLabel={(p) => `${p.codigo || ""} ${p.nome}`.trim()} getValue={(p) => p.codigo || p.nome || ""} tag={() => "Cliente"}/></label>
        <label>Operação<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="todos">Todos</option><option value="frota">Frota</option><option value="terceiro">Terceiro</option></select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="pago">Pago</option><option value="aberto">Aberto</option><option value="vencido">Vencido</option><option value="recebido">Recebido</option><option value="pendente">Pendente</option></select></label>
        <label style={{minWidth: 190}}>Busca<input type="text" value={search} placeholder="Conta, centro, placa..." onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyFilter(); }}/></label>
        <button className="btn primary" onClick={applyFilter}>Aplicar</button>
        <button className="btn" onClick={clearFilter}>Limpar</button>
        <button className="btn" type="button" onClick={() => setShowMoreFilters((v) => !v)}><Icon name="filter" size={12}/> {showMoreFilters ? "Ver menos" : "Ver mais"}</button>
        <span className="muted" style={{marginLeft: "auto", fontSize: 11.5}}>Base: data de lançamento</span>
      </div>

      {(loading || error) && (
        <div className="card" style={{marginBottom: 16, padding: "9px 14px", borderColor: error ? "var(--crit-border)" : "var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize: 12.5}}>{loading ? "Carregando DRE..." : error}</span>
        </div>
      )}

      <div className="grid cols-4" style={{marginBottom: 14}}>
        <DreEmpKpi label="Receita Bruta" value={s.receitaBruta} icon="trending-up" tone="#38bdf8" sub={`${dreEmpNum(s.lancamentos)} linhas`}/>
        <DreEmpKpi label="Impostos / Deducoes" value={s.impostos} icon="filter" tone="#f87171" sub="CT-e + financeiro"/>
        <DreEmpKpi label="Receita Liquida" value={s.receitaLiquida} icon="money" tone="#22c55e" sub="apos deducoes"/>
        <DreEmpKpi label="Resultado Final" value={s.resultadoFinal} icon="chart" tone={dreEmpNum(s.resultadoFinal) >= 0 ? "#22c55e" : "#f87171"} sub={dreEmpPct(s.margemLucro)}/>
      </div>

      <div className="grid cols-4" style={{marginBottom: 16}}>
        <DreEmpKpi label="Custos Transporte" value={s.custosTransporte} icon="route" tone="#f59e0b"/>
        <DreEmpKpi label={isTerceiro ? "Custos" : "Custos Frota"} value={s.custosFrota} icon="truck" tone="#f59e0b"/>
        <DreEmpKpi label="Desp. Administrativas" value={s.despesasAdministrativas} icon="file" tone="#a78bfa"/>
        <DreEmpKpi label="Margem de Lucro" value={s.margemLucro} icon="gauge" tone={dreEmpNum(s.margemLucro) >= 0 ? "#22c55e" : "#f87171"} percent/>
      </div>

      <div className="grid cols-4" style={{marginBottom: 16}}>
        <DreEmpKpi label="Desp. Pessoal" value={s.despesasPessoal} icon="user" tone="#60a5fa"/>
        <DreEmpKpi label="Desp. Financeiras" value={s.despesasFinanceiras} icon="money" tone="#fb7185"/>
        <DreEmpKpi label="Desp. Operacionais" value={s.despesasOperacionais} icon="wrench" tone="#fbbf24"/>
        <DreEmpKpi label="Maior peso" value={topCost?.custo || 0} icon="alert" tone="#f87171" sub={topCost?.contaNome || "Sem dados"}/>
      </div>

      {cteAuditRows.length > 0 && (
        <div className="card" style={{marginBottom:16,padding:"12px 14px",borderColor:"rgba(245,158,11,.45)",background:"rgba(245,158,11,.07)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <Icon name="alert" size={18}/>
            <div>
              <strong>{cteAuditRows.length} CT-e{cteAuditRows.length === 1 ? "" : "s"} para revisar</strong>
              <div className="muted" style={{fontSize:11.5,marginTop:2}}>
                {dreEmpBRL(cteAuditValue)} em documentos ativos ainda sem vínculo financeiro
              </div>
            </div>
          </div>
          <button className="btn primary" onClick={() => setShowCteAudit(true)}>
            Ver mais
          </button>
        </div>
      )}

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header"><h3>Estrutura da DRE</h3><span className="meta muted">gerencial</span></div>
          <div className="card-body">
            {data.structure.map((row) => (
              <div key={row.label} style={{display: "flex", justifyContent: "space-between", padding: row.kind === "result" || row.kind === "final" ? "10px 0" : "7px 0", borderTop: row.kind === "result" || row.kind === "final" ? "1px solid var(--divider)" : "0", fontSize: 13}}>
                <span style={{fontWeight: row.kind === "result" || row.kind === "final" ? 700 : 500, color: row.kind === "final" ? "var(--text)" : "var(--text-2)"}}>{dreLabel(row.label)}</span>
                <span style={{fontFamily: "var(--font-mono)", color: dreEmpNum(row.value) >= 0 ? "var(--ok)" : "var(--crit)"}}>{dreEmpBRL(row.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-flush chart-card">
          <div className="card-header">
            <h3>Evolucao mensal</h3>
            <div className="row" style={{gap: 12, fontSize: 11.5}}>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 2, background: "#38bdf8", display: "inline-block"}}/>Receita</span>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 2, background: "#f59e0b", display: "inline-block"}}/>Custo</span>
              <span className="row" style={{gap: 4}}><span style={{width: 8, height: 8, borderRadius: 2, background: "#22c55e", display: "inline-block"}}/>Lucro</span>
            </div>
          </div>
          <div className="card-body" style={{paddingTop: 18, paddingBottom: 14}}>
            {data.monthly.length === 0 && (
              <div className="muted" style={{textAlign: "center", padding: "60px 0", fontSize: 12.5}}>Sem dados no periodo.</div>
            )}
            {data.monthly.length > 0 && (
              <div className="chart-plot" style={{display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 18, height: 195}}>
                {data.monthly.map((m, index) => {
                  const receita = dreEmpNum(m.receita);
                  const custo = dreEmpNum(m.custo);
                  const lucro = dreEmpNum(m.lucro);
                  const lucroTone = lucro >= 0 ? "#22c55e" : "#f87171";
                  const isHov = hoveredMonth === index;
                  return (
                    <div key={m.mes || index}
                         style={{flex: "1 1 0", maxWidth: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", cursor: "default"}}
                         onMouseEnter={() => setHoveredMonth(index)}
                         onMouseLeave={() => setHoveredMonth(null)}>
                      {isHov && (
                        <div className="chart-tooltip" style={{
                          bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                          background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 8,
                          padding: "10px 13px", fontSize: 12, whiteSpace: "nowrap",
                          boxShadow: "var(--shadow-lg)", lineHeight: 1.8, minWidth: 175,
                        }}>
                          <div style={{fontWeight: 600, fontSize: 12.5, marginBottom: 6, color: "var(--text)"}}>{m.label}</div>
                          <div style={{display: "grid", gridTemplateColumns: "auto 1fr", gap: "1px 12px"}}>
                            <span style={{color: "#38bdf8"}}>● Receita</span>
                            <span style={{fontFamily: "var(--font-mono)", textAlign: "right"}}>{dreEmpBRL(receita)}</span>
                            <span style={{color: "#f59e0b"}}>● Custo</span>
                            <span style={{fontFamily: "var(--font-mono)", textAlign: "right"}}>{dreEmpBRL(custo)}</span>
                            <span style={{color: lucroTone}}>● Lucro</span>
                            <span style={{fontFamily: "var(--font-mono)", textAlign: "right", color: lucroTone}}>{dreEmpBRL(lucro)}</span>
                          </div>
                        </div>
                      )}
                      <span style={{fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, color: lucroTone, background: lucro >= 0 ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)", borderRadius: 6, padding: "2px 8px"}}>{dreEmpShort(lucro)}</span>
                      <div style={{display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, width: "100%", height: 130, borderBottom: "1px solid var(--divider)"}}>
                        <div title={`Receita ${dreEmpBRL(receita)}`} style={{width: 22, height: Math.max(4, receita / maxMonthly * 126), background: "#38bdf8", borderRadius: "4px 4px 0 0", opacity: isHov ? 1 : 0.85, transition: "opacity .15s, height .4s ease"}}/>
                        <div title={`Custo ${dreEmpBRL(custo)}`} style={{width: 22, height: Math.max(4, custo / maxMonthly * 126), background: "#f59e0b", borderRadius: "4px 4px 0 0", opacity: isHov ? 1 : 0.85, transition: "opacity .15s, height .4s ease"}}/>
                      </div>
                      <span style={{fontSize: 11.5, color: "var(--text-3)"}}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 10}}>
        <span className="meta muted" style={{marginRight: 4}}>Ordenar veículos por</span>
        {[
          { id: "receita", label: "Maior faturamento" },
          { id: "lucro", label: "Maior lucro" },
          { id: "custo", label: "Maior custo" },
        ].map((option) => (
          <button
            key={option.id}
            className={`btn sm${plateRanking === option.id ? " primary" : ""}`}
            onClick={() => setPlateRanking(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid cols-3" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header"><h3>Maiores despesas</h3><span className="meta muted">contas financeiras</span></div>
          <div className="card-body">
            {data.accounts.filter((a) => dreEmpNum(a.custo) > 0).slice(0, 10).map((a) => (
              <DreEmpBar key={`${a.contaCodigo}-${a.categoriaDre}`} label={`${a.contaMascara || ""} ${a.contaNome || "Sem conta"}`.trim()} value={a.custo} total={maxExpense} tone="#f59e0b" meta={a.categoriaDre}/>
            ))}
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Frota própria</h3>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="meta muted">{showAllFleetPlates ? fleetPlates.length : Math.min(10, fleetPlates.length)} de {fleetPlates.length} veículos</span>
              {fleetPlates.length > 10 && (
                <button className="btn sm" onClick={() => setShowAllFleetPlates((value) => !value)}>
                  {showAllFleetPlates ? "Mostrar 10" : "Ver todos"}
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {fleetPlates.slice(0, showAllFleetPlates ? fleetPlates.length : 10).map((p) => (
              <div key={p.placa} style={{display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start"}}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlate(p.placa)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPlate(p.placa); }}
                  style={{background: "transparent", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit"}}
                  title="Ver detalhamento da placa"
                >
                  <DreEmpBar label={p.placa || "Sem placa"} value={plateMetric(p)} total={maxFleetPlate} tone="#60a5fa" meta={`${plateRankingLabel} · Faturamento ${dreEmpBRL(p.receita)} · Custo ${dreEmpBRL(p.custo)} · Lucro ${dreEmpBRL(p.receita - p.custo)}`}/>
                </div>
                <button className="btn sm" onClick={() => setSelectedPlate(p.placa)} style={{marginTop: -1}}>Ver mais</button>
              </div>
            ))}
            {!fleetPlates.length && <div className="muted">Nenhum veículo próprio no período.</div>}
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Terceiros</h3>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="meta muted">{showAllThirdPartyPlates ? thirdPartyPlates.length : Math.min(10, thirdPartyPlates.length)} de {thirdPartyPlates.length} veículos</span>
              {thirdPartyPlates.length > 10 && (
                <button className="btn sm" onClick={() => setShowAllThirdPartyPlates((value) => !value)}>
                  {showAllThirdPartyPlates ? "Mostrar 10" : "Ver todos"}
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {thirdPartyPlates.slice(0, showAllThirdPartyPlates ? thirdPartyPlates.length : 10).map((p) => (
              <div key={p.placa} style={{display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start"}}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlate(p.placa)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPlate(p.placa); }}
                  style={{background: "transparent", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "inherit"}}
                  title="Ver detalhamento da placa"
                >
                  <DreEmpBar label={p.placa || "Sem placa"} value={plateMetric(p)} total={maxThirdPartyPlate} tone="#a78bfa" meta={`${plateRankingLabel} · Faturamento ${dreEmpBRL(p.receita)} · Custo ${dreEmpBRL(p.custo)} · Lucro ${dreEmpBRL(p.receita - p.custo)}`}/>
                </div>
                <button className="btn sm" onClick={() => setSelectedPlate(p.placa)} style={{marginTop: -1}}>Ver mais</button>
              </div>
            ))}
            {!thirdPartyPlates.length && <div className="muted">Nenhum veículo terceiro no período.</div>}
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header"><h3>Analise de Corte de Custos</h3><Tabs tabs={[{ id: "despesas", label: "Despesas" }, { id: "recorrentes", label: "Recorrentes" }, { id: "alertas", label: "Alertas" }]} active={tab} onChange={setTab}/></div>
          <div className="card-body">
            {tab === "despesas" && data.management.topDespesas.map((row) => (
              <DreEmpBar key={`${row.data}-${row.documento}-${row.valor}`} label={row.contaFinanceira || row.historico || row.documento || "Despesa"} value={row.valorAbs} total={Math.max(1, data.management.topDespesas[0]?.valorAbs || 1)} tone="#f87171" meta={`${row.data} - ${row.placa || row.centroCusto || row.origem}`}/>
            ))}
            {tab === "recorrentes" && data.management.recorrentes.map((row) => (
              <DreEmpBar key={`${row.contaCodigo}-${row.meses}`} label={row.contaNome || "Conta recorrente"} value={row.custo} total={maxExpense} tone="#fbbf24" meta={`${row.meses} meses no periodo`}/>
            ))}
            {tab === "alertas" && data.management.alertas.map((row, i) => (
              <div key={`${row.tipo}-${row.label}-${i}`} style={{padding: "10px 12px", border: "1px solid var(--crit-border)", background: "var(--crit-bg)", borderRadius: 8, marginBottom: 8}}>
                <div style={{display: "flex", justifyContent: "space-between", gap: 8}}>
                  <span style={{fontWeight: 600, color: "var(--crit)"}}>{row.label}</span>
                  <span style={{fontFamily: "var(--font-mono)", color: "var(--crit)"}}>{dreEmpBRL(row.valor)}</span>
                </div>
                <div className="muted" style={{fontSize: 11.5, marginTop: 3}}>{row.mensagem}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-header"><h3>Centros com pior resultado</h3><span className="meta muted">prejuízo</span></div>
          <div className="card-body">
            {data.centers.slice(0, 12).map((c) => (
              <DreEmpBar key={c.centroCodigo || c.centroCusto} label={`${c.centroMascara || ""} ${c.centroCusto || "Sem centro"}`.trim()} value={c.valor} total={Math.max(1, ...data.centers.map((x) => Math.abs(dreEmpNum(x.valor))))} tone={dreEmpNum(c.valor) >= 0 ? "#22c55e" : "#f87171"} meta={`Receita ${dreEmpBRL(c.receita)} - custo ${dreEmpBRL(c.custo)}`}/>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header"><h3>Lançamentos detalhados da DRE</h3><span className="meta muted">{tableRows.length} exibidos</span></div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Centro de custo</th>
              <th>Conta financeira</th>
              <th>Categoria DRE</th>
              <th>Tipo</th>
              <th>Placa</th>
              <th>Cliente/Fornecedor</th>
              <th>Documento</th>
              <th>Status</th>
              <th>Origem</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && <tr><td colSpan="11" className="muted" style={{padding: 20, textAlign: "center"}}>Sem lançamentos para os filtros.</td></tr>}
            {tableRows.map((row, index) => (
              <tr key={`${row.data}-${row.origem}-${row.documento}-${index}`}>
                <td>{dreEmpDate(row.data)}</td>
                <td style={{maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.centroCusto}</td>
                <td style={{maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.contaFinanceira}</td>
                <td><span className={`badge ${row.tipo === "Receita" ? "ok" : row.tipo === "Imposto" ? "crit" : "warn"}`}><span className="dot"/>{row.categoriaDre}</span></td>
                <td>{row.tipo}</td>
                <td>{row.placa || "-"}</td>
                <td style={{maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.pessoaNome || "-"}</td>
                <td>{row.documento || "-"}</td>
                <td>{row.status}</td>
                <td>{row.origem}</td>
                <td className="num" style={{color: dreEmpNum(row.valor) >= 0 ? "var(--ok)" : "var(--crit)"}}>{dreEmpBRL(row.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCteAudit && (
        <div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,.68)",display:"grid",placeItems:"center",padding:18}} onMouseDown={() => setShowCteAudit(false)}>
          <section className="card card-flush" style={{width:"min(1420px, calc(100vw - 36px))",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onMouseDown={(event) => event.stopPropagation()}>
            <div className="card-header" style={{borderBottom:"1px solid var(--divider)"}}>
              <div>
                <h3>CT-es para revisar</h3>
                <span className="meta muted">{cteAuditRows.length} documentos · {dreEmpBRL(cteAuditValue)} sem vínculo financeiro</span>
              </div>
              <button className="icon-btn" onClick={() => setShowCteAudit(false)} title="Fechar"><Icon name="x"/></button>
            </div>
            <div style={{overflow:"auto"}}>
              <table className="tbl">
                <thead>
                  <tr><th>Emissão</th><th>Emp./Série</th><th>CT-e</th><th>Tipo</th><th>Placa</th><th>Cliente</th><th>Rota</th><th>Motivo da revisão</th><th className="num">Valor</th></tr>
                </thead>
                <tbody>
                  {cteAuditRows.map((row, index) => {
                    const tipoCte = Number(row.tipoCte) === 1 ? "Complementar" : Number(row.tipoCte) === 3 ? "Substituição" : "Normal";
                    const motivo = Number(row.tipoCte) === 1
                      ? `Complementar sem título financeiro${row.detailKey?.documento ? "" : "."}`
                      : Math.abs(dreEmpNum(row.valor)) <= 0.01
                        ? "Valor simbólico de R$ 0,01 e sem título financeiro"
                        : "CT-e ativo sem título financeiro";
                    return (
                      <tr key={`${row.chaveCte || row.documento}-${index}`}>
                        <td>{dreEmpDate(row.data)}</td>
                        <td>{row.detailKey?.empresa || "-"} / {row.detailKey?.serie || "-"}</td>
                        <td>
                          <strong>{row.documento || row.ctes || "-"}</strong>
                          {row.chaveCte && <div className="muted" style={{fontSize:9.5,fontFamily:"var(--font-mono)",maxWidth:190,overflow:"hidden",textOverflow:"ellipsis"}} title={row.chaveCte}>{row.chaveCte}</div>}
                        </td>
                        <td><span className={`badge ${Number(row.tipoCte) === 1 ? "warn" : ""}`}>{tipoCte}</span></td>
                        <td><strong>{row.placa || "-"}</strong><div className="muted" style={{fontSize:10.5}}>{row.operacao === "frota" ? "Frota própria" : "Terceiro"}</div></td>
                        <td style={{maxWidth:210}}>{row.pessoaNome || "-"}</td>
                        <td style={{maxWidth:270}}>{row.rota || "-"}</td>
                        <td style={{maxWidth:220,color:"var(--warn)"}}>{motivo}</td>
                        <td className="num" style={{color:"var(--ok)"}}>{dreEmpBRL(row.valor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {selectedPlateDetail && (
        <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.62)",display:"grid",placeItems:"center",padding:18}} onMouseDown={() => setSelectedPlate(null)}>
          <section className="card card-flush" style={{width:"min(1180px, calc(100vw - 36px))",maxHeight:"86vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onMouseDown={(e) => e.stopPropagation()}>
            <div className="card-header" style={{borderBottom:"1px solid var(--divider)"}}>
              <div>
                <h3>Detalhamento da placa {selectedPlateDetail.placa}</h3>
                <span className="meta muted">Recebimentos, rotas e custos resumidos por tipo</span>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPlate(null)} title="Fechar"><Icon name="x"/></button>
            </div>
            <div style={{padding:16,overflow:"auto"}}>
              <div className="grid cols-4" style={{marginBottom:14}}>
                <DreEmpKpi label="Receita" value={selectedPlateDetail.receita} icon="trending-up" tone="#38bdf8" sub={`${selectedPlateDetail.receitas.length} recebimento(s)`}/>
                <DreEmpKpi label="Custo" value={selectedPlateDetail.custo} icon="money" tone="#f97316" sub={`${selectedPlateDetail.custos.length} custo(s)`}/>
                <DreEmpKpi label="Resultado" value={selectedPlateDetail.lucro} icon="chart" tone={selectedPlateDetail.lucro >= 0 ? "#22c55e" : "#f87171"} sub={dreEmpPct(selectedPlateDetail.margem)}/>
                <DreEmpKpi label="Lancamentos" value={selectedPlateDetail.receitas.length + selectedPlateDetail.custos.length} icon="file" tone="#a78bfa" plain/>
              </div>
              <div className="card card-flush" style={{marginBottom:14}}>
                <div className="card-header"><h3>Recebimentos</h3><span className="meta muted">por data - {dreEmpBRL(selectedPlateDetail.receita)}</span></div>
                <table className="tbl">
                  <thead><tr><th>Data</th><th>Cliente</th><th>Rota</th><th>CT-e</th><th>Documento</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {selectedPlateDetail.receitas.map((row, index) => (
                      <tr key={`rec-${row.documento}-${index}`}>
                        <td>{dreEmpDate(row.data)}</td>
                        <td>{row.pessoaNome || "-"}</td>
                        <td style={{maxWidth:360,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.rota || ""}>{row.rota || "-"}</td>
                        <td>{row.ctes || "-"}</td>
                        <td>{row.documento || "-"}</td>
                        <td className="num" style={{color:"var(--ok)"}}>{dreEmpBRL(row.valor)}</td>
                      </tr>
                    ))}
                    {!selectedPlateDetail.receitas.length && <tr><td colSpan="6" className="muted" style={{padding:14}}>Sem recebimentos para esta placa.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush" style={{marginBottom:14}}>
                <div className="card-header"><h3>Custos</h3><span className="meta muted">por data - {dreEmpBRL(selectedPlateDetail.custo)}</span></div>
                <table className="tbl">
                  <thead><tr><th>Data</th><th>Tipo</th><th>Fornecedor/Historico</th><th>Documento</th><th>Status</th><th className="num">Valor</th><th></th></tr></thead>
                  <tbody>
                    {selectedPlateDetail.custos.map((row, index) => {
                      const detailId = `${row.origem}-${row.detailKey?.empresa || ""}-${row.detailKey?.documento || row.documento || ""}-${index}`;
                      const detail = launchDetails[detailId];
                      const isOpen = expandedLaunch === detailId;
                      return (
                        <React.Fragment key={`custo-${row.documento}-${index}`}>
                          <tr>
                            <td>{dreEmpDate(row.data)}</td>
                            <td><strong>{row.tipoCusto}</strong><div className="muted" style={{fontSize:10.5}}>{row.contaFinanceira || row.categoriaDre || ""}</div></td>
                            <td style={{maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.pessoaNome || row.historico}>{row.pessoaNome || row.historico || "-"}</td>
                            <td>{row.documento || "-"}</td>
                            <td>{row.status}</td>
                            <td className="num" style={{color:"var(--crit)"}}>{dreEmpBRL(Math.abs(dreEmpNum(row.valor)))}</td>
                            <td style={{textAlign:"right"}}>
                              <button className="btn btn-ghost btn-sm" onClick={() => toggleLaunchDetail(row, index)}>
                                {isOpen ? "Ocultar" : "Ver mais"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan="7" style={{padding:"10px 18px",background:"rgba(255,255,255,.018)"}}>
                                {detail?.loading && <div className="muted">Carregando produtos e serviços...</div>}
                                {launchDetailError[detailId] && <div style={{color:"var(--crit)"}}>{launchDetailError[detailId]}</div>}
                                {!detail?.loading && !launchDetailError[detailId] && Boolean(detail?.itens?.length) && (
                                  <table className="tbl" style={{margin:0}}>
                                    <thead><tr><th>Item</th><th>Produto/Serviço</th><th>Unidade</th><th className="num">Quantidade</th><th className="num">Valor unitário</th><th className="num">Total</th></tr></thead>
                                    <tbody>
                                      {detail.itens.map((item, itemIndex) => (
                                        <tr key={`${item.origem}-${item.item}-${itemIndex}`}>
                                          <td>{item.item || itemIndex + 1}</td>
                                          <td><strong>{item.descricao}</strong>{item.codigo && <div className="muted" style={{fontSize:10.5}}>Código {item.codigo}</div>}</td>
                                          <td>{item.unidade || "-"}</td>
                                          <td className="num">{dreEmpNum(item.quantidade).toLocaleString("pt-BR")}</td>
                                          <td className="num">{dreEmpBRL(item.valorUnitario)}</td>
                                          <td className="num">{dreEmpBRL(item.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {!detail?.loading && !launchDetailError[detailId] && !detail?.itens?.length && (
                                  <div className="muted">{detail?.observacao || "Nenhum produto ou serviço vinculado a este lançamento."}</div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {!selectedPlateDetail.custos.length && <tr><td colSpan="7" className="muted" style={{padding:14}}>Sem custos para esta placa.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush">
                <div className="card-header"><h3>Resumo dos custos</h3><span className="meta muted">{selectedPlateDetail.tiposCusto.length} tipos</span></div>
                <div className="card-body" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"8px 18px"}}>
                  {selectedPlateDetail.tiposCusto.map((item) => (
                    <DreEmpBar key={item.tipo} label={item.tipo} value={item.valor} total={Math.max(selectedPlateDetail.custo, 1)} tone="#f97316" meta={`${item.lancamentos} lancamento(s)`}/>
                  ))}
                  {!selectedPlateDetail.tiposCusto.length && <div className="muted" style={{fontSize:12}}>Sem custos para resumir.</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

window.DreEmpresarial = DreEmpresarial;

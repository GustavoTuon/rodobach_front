function cvTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function cvDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function cvNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cvBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cvNum(value));
}

function cvOptionalBRL(value) {
  return value === null || value === undefined ? "—" : cvBRL(value);
}

function cvMargin(value) {
  return value === null || value === undefined ? "—" : `${cvNum(value).toFixed(1)}%`;
}

function cvVariation(item, positiveIsGood = true) {
  const value = item?.variacaoPercentual;
  if (value === null || value === undefined) return "Sem base anterior";
  const improved = positiveIsGood ? value >= 0 : value <= 0;
  return `${value > 0 ? "+" : ""}${cvNum(value).toFixed(1)}% vs. período anterior${improved ? "" : " • atenção"}`;
}

function cvDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function cvShortMoney(value) {
  const n = Math.abs(cvNum(value));
  const sign = cvNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function cvNormalize(data) {
  const base = data && typeof data === "object" ? data : {};
  return {
    period: base.period || {},
    summary: base.summary || {},
    monthly: Array.isArray(base.monthly) ? base.monthly : [],
    ranking: Array.isArray(base.ranking) ? base.ranking : [],
    types: Array.isArray(base.types) ? base.types : [],
    otherBreakdown: Array.isArray(base.otherBreakdown) ? base.otherBreakdown : [],
    suppliers: Array.isArray(base.suppliers) ? base.suppliers : [],
    status: Array.isArray(base.status) ? base.status : [],
    launches: Array.isArray(base.launches) ? base.launches : [],
    validation: base.validation || {},
    profit: base.profit || { summary: {}, vehicles: [], rankings: { lucro: [], prejuizo: [], custoKm: [] } },
    audit: base.audit || {},
    comparison: base.comparison || {},
  };
}

const CV_STATUS = {
  pago: { label: "Pago", cls: "ok" },
  aberto: { label: "Aberto", cls: "info" },
  vencido: { label: "Vencido", cls: "crit" },
  cancelado: { label: "Cancelado", cls: "warn" },
};

const CV_RESULT_STATUS = {
  lucro: { label: "Lucro", cls: "ok", color: "#22c55e" },
  empate: { label: "Empate", cls: "info", color: "#3b82f6" },
  prejuizo: { label: "Prejuízo", cls: "crit", color: "#ef4444" },
};

const CV_PERIODS = [
  { key: "today", label: "Hoje", range: () => ({ start: cvTodayISO(), end: cvTodayISO() }) },
  { key: "7d", label: "7 dias", range: () => ({ start: cvDaysAgoISO(6), end: cvTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: cvDaysAgoISO(29), end: cvTodayISO() }) },
  { key: "month", label: "Este mes", range: () => {
    const d = new Date();
    return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, end: cvTodayISO() };
  } },
  { key: "prev-month", label: "Mês anterior", range: () => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const last = new Date(d.getFullYear(), d.getMonth(), 0);
    const iso = (x) => [x.getFullYear(), String(x.getMonth() + 1).padStart(2, "0"), String(x.getDate()).padStart(2, "0")].join("-");
    return { start: iso(first), end: iso(last) };
  } },
  { key: "year", label: "Ano atual", range: () => ({ start: `${new Date().getFullYear()}-01-01`, end: cvTodayISO() }) },
];

const CvKpi = ({ label, value, sub, icon, tone }) => (
  <div className="cv-kpi" style={{ borderLeftColor: tone || "var(--border-strong)" }}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{sub}</div>}
  </div>
);

const CvBar = ({ label, value, max, meta, tone, onClick }) => {
  const pct = max > 0 ? Math.min(100, Math.abs(cvNum(value)) / max * 100) : 0;
  return (
    <button className={`cv-bar${onClick ? " clickable" : ""}`} onClick={onClick || undefined}>
      <div className="cv-bar-head">
        <span title={label}>{label}</span>
        <strong>{cvShortMoney(value)}</strong>
      </div>
      <div className="cv-bar-track"><div style={{ width: `${pct.toFixed(1)}%`, background: tone || "var(--brand-blue)" }}/></div>
      {meta && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{meta}</div>}
    </button>
  );
};

const CvTrendChart = ({ items }) => {
  const width = 760;
  const height = 190;
  const pad = { top: 14, right: 12, bottom: 32, left: 12 };
  const max = Math.max(1, ...items.map((item) => cvNum(item.custo)));
  const slot = (width - pad.left - pad.right) / Math.max(1, items.length);
  const barWidth = Math.max(10, Math.min(46, slot * 0.58));
  return <div className="cv-trend"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Evolução mensal dos custos">
    <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} className="cv-chart-axis"/>
    {items.map((item, index) => {
      const barHeight = Math.max(2, cvNum(item.custo) / max * (height - pad.top - pad.bottom));
      const x = pad.left + index * slot + (slot - barWidth) / 2;
      const y = height - pad.bottom - barHeight;
      return <g key={item.mes}><title>{`${item.label}: ${cvBRL(item.custo)} · Pago ${cvBRL(item.pago)} · Em aberto ${cvBRL(item.aberto)}`}</title><rect x={x} y={y} width={barWidth} height={barHeight} rx="3" className="cv-chart-bar"/><text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className="cv-chart-label">{item.label}</text></g>;
    })}
  </svg></div>;
};

const CvDetailModal = ({ placa, filters, onClose }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!placa) return;
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getCustosVeiculoDetalhe(placa, filters)
      .then((payload) => { if (active) setData(payload); })
      .catch((err) => { if (active) setError(err?.message || "Não foi possível carregar o veículo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [placa, JSON.stringify(filters)]);

  if (!placa) return null;
  const d = cvNormalize(data);
  const v = data?.vehicle || {};
  const maxType = Math.max(1, ...d.types.map((item) => cvNum(item.custo)));
  const maxMonth = Math.max(1, ...d.monthly.map((item) => cvNum(item.custo)));

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="cv-modal card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14, gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{placa}</h2>
            <div className="muted" style={{ fontSize: 12 }}>{v.nome || v.modelo || "Resumo individual do veículo"}</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x"/></button>
        </div>

        {loading && <div className="card">Carregando detalhe...</div>}
        {error && <div className="card" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="cv-detail-grid">
              <CvKpi label="Total gasto" value={cvBRL(d.summary.custoTotal)} sub={`${d.summary.quantidadeLancamentos || 0} lançamentos`} tone="#ef4444" icon="money"/>
              <CvKpi label="Custo por km" value={cvOptionalBRL(v.custoPorKm)} sub={v.coberturaTelemetria === "confirmada" ? `${Number(v.distanciaKm || 0).toLocaleString("pt-BR")} km no período` : "Telemetria sem cobertura completa"} tone="#3b82f6" icon="speedometer"/>
              <CvKpi label="Aberto" value={cvBRL(d.summary.custoAberto)} sub={`Vencido: ${cvBRL(d.summary.custoVencido)}`} tone="#f59e0b" icon="clock"/>
            </div>

            <div className="cv-vehicle-info">
              <span><b>Centro:</b> {v.centroCusto || "-"}</span>
              <span><b>Empresa:</b> {v.empresa || "-"}</span>
              <span><b>Proprietário:</b> {v.proprietario || "-"}</span>
              <span><b>Aquisicao:</b> {cvDate(v.dataAquisicao)}</span>
            </div>

            <div className="cv-panels">
              <div className="card">
                <div className="section-head"><h2>Gastos por categoria</h2></div>
                {d.types.length ? d.types.map((item) => <CvBar key={item.tipo} label={item.tipo} value={item.custo} max={maxType} meta={`${item.lancamentos} lanc.`}/>) : <div className="muted">Sem categorias no periodo.</div>}
              </div>
              <div className="card">
                <div className="section-head"><h2>Gastos por mes</h2></div>
                {d.monthly.length ? d.monthly.map((item) => <CvBar key={item.mes} label={item.label} value={item.custo} max={maxMonth}/>) : <div className="muted">Sem custos mensais.</div>}
              </div>
            </div>

            <div className="cv-panels">
              <div className="card">
                <div className="section-head"><h2>Manutencoes identificadas</h2></div>
                <div className="cv-mini-list">
                  {(data?.manutencoes || []).slice(0, 8).map((m, index) => (
                    <div key={`${m.data}-${index}`}><span>{cvDate(m.data)}</span><strong>{m.observacao || `Produto ${m.produto || "-"}`}</strong><em>{m.km ? `${Number(m.km).toLocaleString("pt-BR")} km` : ""}</em></div>
                  ))}
                  {!(data?.manutencoes || []).length && <div className="muted">Nenhuma manutencao operacional encontrada.</div>}
                </div>
              </div>
              <div className="card">
                <div className="section-head"><h2>Abastecimentos</h2></div>
                <div className="cv-mini-list">
                  {(data?.abastecimentos || []).slice(0, 8).map((a) => (
                    <div key={a.codigo}><span>{cvDate(a.data)}</span><strong>{cvBRL(a.total)}</strong><em>{a.litros ? `${Number(a.litros).toLocaleString("pt-BR")} L` : ""}</em></div>
                  ))}
                  {!(data?.abastecimentos || []).length && <div className="muted">Nenhum abastecimento operacional encontrado.</div>}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-head"><h2>Ultimos lancamentos</h2></div>
              <div className="table-wrap">
                <table className="data-table compact">
                  <thead><tr><th>Data</th><th>Tipo</th><th>Fornecedor</th><th>Descricao</th><th className="num">Valor</th><th>Status</th></tr></thead>
                  <tbody>
                    {d.launches.map((row) => (
                      <tr key={row.id}>
                        <td>{cvDate(row.data)}</td>
                        <td>{row.tipoCusto}</td>
                        <td>{row.fornecedor}</td>
                        <td>{row.descricao || row.historico || "-"}</td>
                        <td className="num">{cvBRL(row.valor)}</td>
                        <td><span className={`badge ${CV_STATUS[row.situacao]?.cls || ""}`}>{CV_STATUS[row.situacao]?.label || row.situacao}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CustosVeiculos = () => {
  const defaultRange = CV_PERIODS.find((item) => item.key === "month").range();
  const [modo, setModo] = React.useState("geral");
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim, setDataFim] = React.useState(defaultRange.end);
  const [periodKey, setPeriodKey] = React.useState("month");
  const [placa, setPlaca] = React.useState("");
  const [centro, setCentro] = React.useState("");
  const [tipoCusto, setTipoCusto] = React.useState("todos");
  const [situacao, setSituacao] = React.useState("todos");
  const [fornecedor, setFornecedor] = React.useState("");
  const [valorMin, setValorMin] = React.useState("");
  const [valorMax, setValorMax] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ dataInicio: defaultRange.start, dataFim: defaultRange.end, proprietario: "frota" });
  const [options, setOptions] = React.useState({ placas: [], centros: [], tipos: [], situacoes: [], fornecedores: [], empresas: [] });
  const [data, setData] = React.useState(() => cvNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [detailPlate, setDetailPlate] = React.useState("");
  const [moreFilters, setMoreFilters] = React.useState(false);
  const [showAllSuppliers, setShowAllSuppliers] = React.useState(false);
  const [showAllRanking, setShowAllRanking] = React.useState(false);
  const [launchPage, setLaunchPage] = React.useState(1);
  const [launchSort, setLaunchSort] = React.useState({ key: "data", direction: "desc" });
  const [expandedCosts, setExpandedCosts] = React.useState(() => new Set());
  const [costSearch, setCostSearch] = React.useState("");

  React.useEffect(() => {
    window.RB_API.getCustosVeiculosFiltros().then((payload) => setOptions(payload || {})).catch(() => {});
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getCustosVeiculos({ ...filters, limit: 5000 })
      .then((payload) => { if (active) setData(cvNormalize(payload)); })
      .catch((err) => {
        if (!active) return;
        setData(cvNormalize(null));
        setError(err?.message || "Nao foi possivel carregar os custos por veiculo.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  React.useEffect(() => setLaunchPage(1), [data.launches.length]);

  const applyShortcut = (key) => {
    const p = CV_PERIODS.find((item) => item.key === key);
    if (!p) return;
    const r = p.range();
    setPeriodKey(key);
    setDataInicio(r.start);
    setDataFim(r.end);
    setFilters({ dataInicio: r.start, dataFim: r.end, placa, centro, tipoCusto, situacao, fornecedor, proprietario:"frota", valorMin, valorMax, search });
  };

  const applyFilters = () => {
    if (!dataInicio || !dataFim || dataInicio > dataFim) {
      setError("Informe um período válido: a data inicial não pode ser posterior à data final.");
      return;
    }
    setError("");
    setFilters({ dataInicio, dataFim, placa, centro, tipoCusto, situacao, fornecedor, proprietario:"frota", valorMin, valorMax, search });
  };
  const clearFilters = () => {
    const r = CV_PERIODS.find((item) => item.key === "month").range();
    setPeriodKey("month");
    setDataInicio(r.start); setDataFim(r.end); setPlaca(""); setCentro(""); setTipoCusto("todos"); setSituacao("todos"); setFornecedor(""); setValorMin(""); setValorMax(""); setSearch("");
    setFilters({ dataInicio: r.start, dataFim: r.end, proprietario: "frota" });
  };

  const s = data.summary || {};
  const maxRank = Math.max(1, ...data.ranking.map((item) => cvNum(item.custo)));
  const maxType = Math.max(1, ...data.types.map((item) => cvNum(item.custo)));
  const maxSupplier = Math.max(1, ...data.suppliers.map((item) => cvNum(item.custo)));
  const maxStatus = Math.max(1, ...data.status.map((item) => cvNum(item.custo)));
  const profitSummary = data.profit?.summary || {};
  const profitVehicles = Array.isArray(data.profit?.vehicles) ? data.profit.vehicles : [];
  const profitRank = data.profit?.rankings || { lucro: [], prejuizo: [], custoKm: [] };
  const maxProfit = Math.max(1, ...profitRank.lucro.map((item) => Math.abs(cvNum(item.lucro))));
  const maxLoss = Math.max(1, ...profitRank.prejuizo.map((item) => Math.abs(cvNum(item.lucro))));
  const maxCostKm = Math.max(1, ...profitRank.custoKm.map((item) => Math.abs(cvNum(item.custoPorKm))));
  const overdue = data.status.find((item) => item.situacao === "vencido") || {};
  const averageVehicle = cvNum(s.totalVeiculos) ? cvNum(s.custoTotal) / cvNum(s.totalVeiculos) : 0;
  const sortedLaunches = [...data.launches].sort((a, b) => {
    const av = launchSort.key === "valor" ? cvNum(a.valor) : String(a[launchSort.key] || "");
    const bv = launchSort.key === "valor" ? cvNum(b.valor) : String(b[launchSort.key] || "");
    const result = typeof av === "number" ? av - bv : av.localeCompare(bv, "pt-BR");
    return launchSort.direction === "asc" ? result : -result;
  });
  const launchPageSize = 50;
  const launchPages = Math.max(1, Math.ceil(sortedLaunches.length / launchPageSize));
  const visibleLaunches = sortedLaunches.slice((launchPage - 1) * launchPageSize, launchPage * launchPageSize);
  const sortLaunches = (key) => {
    setLaunchSort((old) => ({ key, direction: old.key === key && old.direction === "desc" ? "asc" : "desc" }));
    setLaunchPage(1);
  };
  const applyCategory = (tipo) => {
    setTipoCusto(tipo);
    setFilters((old) => ({ ...old, tipoCusto: tipo }));
    setLaunchPage(1);
  };
  const attention = [
    cvNum(s.custoVencido) > 0 && { title: `${cvBRL(s.custoVencido)} em despesas vencidas`, sub: `${overdue.lancamentos || 0} lançamentos precisam de atenção`, link: "Ver lançamentos →", action: () => { setSituacao("vencido"); setFilters((old) => ({ ...old, situacao: "vencido" })); } },
    data.types[0] && { title: `${data.types[0].tipo} representa ${cvNum(s.custoTotal) ? (cvNum(data.types[0].custo) / cvNum(s.custoTotal) * 100).toFixed(1) : 0}% dos custos`, sub: `${cvBRL(data.types[0].custo)} em ${data.types[0].lancamentos} lançamentos`, link: "Ver despesas →", action: () => applyCategory(data.types[0].tipo) },
    data.ranking[0] && { title: `${data.ranking[0].placa} é o veículo com maior custo`, sub: `${cvBRL(data.ranking[0].custo)} no período`, link: "Analisar veículo →", action: () => setDetailPlate(data.ranking[0].placa) },
    data.suppliers[0] && { title: `${data.suppliers[0].fornecedor} concentra ${cvNum(s.custoTotal) ? (cvNum(data.suppliers[0].custo) / cvNum(s.custoTotal) * 100).toFixed(1) : 0}% dos gastos`, sub: `${cvBRL(data.suppliers[0].custo)} em ${data.suppliers[0].lancamentos} lançamentos`, link: "Ver fornecedor →", action: () => { setFornecedor(data.suppliers[0].fornecedor); setFilters((old) => ({ ...old, fornecedor: data.suppliers[0].fornecedor })); } },
  ].filter(Boolean).slice(0, 4);
  const executiveText = data.types[0] && data.ranking[0]
    ? `Neste período, a frota acumulou ${cvBRL(s.custoTotal)} em custos. ${data.types[0].tipo} respondeu por ${(cvNum(data.types[0].custo) / Math.max(1, cvNum(s.custoTotal)) * 100).toFixed(1)}%, existem ${cvBRL(s.custoVencido)} vencidos e ${data.ranking[0].placa} foi o veículo com maior despesa.`
    : "Os indicadores serão resumidos assim que houver movimentação no período selecionado.";
  const selectedProfit = profitVehicles.find((item) => item.placa === placa);
  const financial = modo === "veiculo" ? (selectedProfit || { receita: 0, custo: 0, lucro: 0, margem: null, distanciaKm: null, custoPorKm: null }) : {
    receita: profitSummary.receitaTotal,
    custo: profitSummary.custoTotal || s.custoTotal,
    lucro: profitSummary.lucroTotal,
    margem: profitSummary.margem,
    distanciaKm: profitSummary.distanciaKm,
    custoPorKm: profitSummary.custoPorKm,
  };
  const managementCosts = [
    { key: "operacional", label: "Operacionais", value: s.custoOperacional, note: "Operação direta da frota" },
    { key: "financeiro", label: "Financeiros", value: s.custoFinanceiro, note: "Empréstimos, juros e consórcios" },
    { key: "fixo", label: "Fixos", value: s.custoFixo, note: "Seguros, IPVA e licenciamento" },
    { key: "extraordinario", label: "Extraordinários", value: s.custoExtraordinario, note: "Multas, sinistros e indenizações" },
    { key: "nao_classificado", label: "Não classificados", value: s.custoNaoClassificado, note: "Requer revisão financeira" },
  ];
  const managementAlerts = [
    profitSummary.veiculosCustoSemReceita > 0 && { tone: "crit", title: `${profitSummary.veiculosCustoSemReceita} veículos com custo e sem receita`, note: "Verifique o período da receita ou veículos parados." },
    profitSummary.veiculosPrejuizo > 0 && { tone: "warn", title: `${profitSummary.veiculosPrejuizo} veículos no prejuízo`, note: "Ordene a tabela pelo resultado para investigar." },
    cvNum(s.custoNaoClassificado) > 0 && { tone: "warn", title: `${cvBRL(s.custoNaoClassificado)} sem classificação`, note: "Revise as contas exibidas dentro de Outros." },
    data.audit?.possiveisDivergenciasPlaca > 0 && { tone: "crit", title: `${data.audit.possiveisDivergenciasPlaca} divergências de placa`, note: "A associação entre lançamento e veículo requer conferência." },
    data.audit?.veiculosTelemetriaParcial > 0 && { tone: "info", title: `${data.audit.veiculosTelemetriaParcial} veículos com telemetria parcial`, note: "O custo/km fica indisponível para evitar números incorretos." },
  ].filter(Boolean).slice(0, 4);
  const compositionRows = data.launches.filter((row) => {
    const q = costSearch.trim().toLowerCase();
    return !q || `${row.tipoCusto} ${row.descricao} ${row.historico} ${row.fornecedor} ${row.documento}`.toLowerCase().includes(q);
  });
  const composition = Object.values(compositionRows.reduce((groups, row) => {
    const category = row.tipoCusto || "Sem categoria";
    groups[category] ||= { category, value: 0, count: 0, subcategories: {} };
    groups[category].value += cvNum(row.valor); groups[category].count += 1;
    const sub = row.descricao || row.historico || "Sem classificação detalhada";
    groups[category].subcategories[sub] ||= { name: sub, value: 0, rows: [] };
    groups[category].subcategories[sub].value += cvNum(row.valor); groups[category].subcategories[sub].rows.push(row);
    return groups;
  }, {})).sort((a, b) => b.value - a.value);
  const toggleCost = (category) => setExpandedCosts((old) => { const next = new Set(old); if (next.has(category)) next.delete(category); else next.add(category); return next; });
  const openVehicle = (vehiclePlate) => { setPlaca(vehiclePlate); setModo("veiculo"); setFilters((old) => ({ ...old, placa: vehiclePlate })); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="view cv-view">
      <div className="page-head">
        <div>
          <h1>Custos por Veículo</h1>
          <div className="sub">Entenda quanto a frota custa e de onde vem cada despesa.</div>
        </div>
        <div className="actions">
          <div className="cv-tabs">
            <button className={modo === "geral" ? "active" : ""} onClick={() => { setModo("geral"); setPlaca(""); setFilters((old) => ({ ...old, placa: "" })); }}>Visão geral</button>
            <button className={modo === "veiculo" ? "active" : ""} onClick={() => setModo("veiculo")}>Por veículo</button>
          </div>
          <select className="btn cv-period-select" value={periodKey} onChange={(e)=>applyShortcut(e.target.value)} aria-label="Período rápido">
            {periodKey === "custom" && <option value="custom" disabled>Personalizado</option>}
            {CV_PERIODS.map((p)=><option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button className="btn" onClick={() => window.RB_API.getCustosVeiculos({ ...filters, limit: 5000 }).then((payload) => setData(cvNormalize(payload)))}><Icon name="refresh"/> Atualizar</button>
        </div>
      </div>

      <div className="cv-filters-clean card">
        <div className="cv-filter-title"><div><strong>Filtrar custos</strong><span>Escolha uma placa ou pesquise uma despesa</span></div><span className="cv-fleet-badge"><Icon name="truck" size={12}/> Somente frota própria</span></div>
        <div className="cv-date-filter-row">
          <label>Data inicial<input type="date" value={dataInicio} max={dataFim || undefined} onChange={(e)=>{setDataInicio(e.target.value);setPeriodKey("custom");}}/></label>
          <label>Data final<input type="date" value={dataFim} min={dataInicio || undefined} onChange={(e)=>{setDataFim(e.target.value);setPeriodKey("custom");}}/></label>
          <span className="muted">Período usado em todos os indicadores, gráficos e lançamentos.</span>
        </div>
        <div className="cv-filter-main">
          <label>Placa<select value={placa} onChange={(e) => { const value=e.target.value; setPlaca(value); if(value)setModo("veiculo"); setFilters((old)=>({...old,placa:value,proprietario:"frota"})); setLaunchPage(1); }}><option value="">Toda a frota</option>{(options.placas||[]).map((item)=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="cv-search-field">Buscar despesa<input value={search} placeholder="Descrição, documento ou fornecedor" onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&applyFilters()}/></label>
          <button className="btn primary" onClick={applyFilters}><Icon name="search"/> Aplicar</button>
          <button className={`btn ${moreFilters?"active":""}`} onClick={()=>setMoreFilters((v)=>!v)}>Filtros avançados <span>{moreFilters?"−":"+"}</span></button>
          <button className="btn ghost" onClick={clearFilters} title="Limpar filtros"><Icon name="x"/> Limpar</button>
        </div>
        {moreFilters && <div className="cv-filter-advanced">
          <label>Centro de custo<RBCombobox value={centro} onChange={setCentro} options={options.centros||[]} placeholder="Todos" getLabel={(c)=>c.codigo?`${c.codigo} - ${c.nome}`:c.nome} getValue={(c)=>c.codigo?`${c.codigo} - ${c.nome}`:c.nome} tag={()=>"Centro"}/></label>
          <label>Tipo de custo<select value={tipoCusto} onChange={(e)=>setTipoCusto(e.target.value)}><option value="todos">Todos</option>{(options.tipos||[]).map((t)=><option key={t} value={t}>{t}</option>)}</select></label>
          <label>Situação<select value={situacao} onChange={(e)=>setSituacao(e.target.value)}><option value="todos">Todas</option>{(options.situacoes||[]).map((st)=><option key={st} value={st}>{CV_STATUS[st]?.label||st}</option>)}</select></label>
          <label>Fornecedor<RBCombobox value={fornecedor} onChange={setFornecedor} options={options.fornecedores||[]} placeholder="Todos" getLabel={(f)=>f.codigo?`${f.codigo} - ${f.nome}`:f.nome} getValue={(f)=>f.codigo?`${f.codigo} - ${f.nome}`:f.nome} tag={()=>"Fornecedor"}/></label>
          <label>Valor mínimo<input type="number" value={valorMin} placeholder="R$ 0,00" onChange={(e)=>setValorMin(e.target.value)}/></label>
          <label>Valor máximo<input type="number" value={valorMax} placeholder="Sem limite" onChange={(e)=>setValorMax(e.target.value)}/></label>
        </div>}
      </div>

      <div className="cv-filter-chips">
        <span>{cvDate(filters.dataInicio)} até {cvDate(filters.dataFim)}</span>
        {filters.placa && <span>Placa: {filters.placa}</span>}
        {filters.tipoCusto && filters.tipoCusto !== "todos" && <button onClick={() => applyCategory("todos")}>{filters.tipoCusto} ×</button>}
        {filters.fornecedor && <span>Fornecedor: {filters.fornecedor}</span>}
        {filters.situacao && filters.situacao !== "todos" && <span>Situação: {CV_STATUS[filters.situacao]?.label || filters.situacao}</span>}
      </div>

      {error && <div className="card" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>{error}</div>}
      {loading && <div className="card">Carregando custos...</div>}

      {(modo === "geral" || modo === "veiculo") && (
      <>
        {modo === "veiculo" && !placa && <div className="card cv-select-vehicle"><Icon name="truck"/><div><strong>Selecione uma placa</strong><span>Use o campo Placa acima para abrir o raio-X financeiro do veículo.</span></div></div>}
        <div className="cv-financial-summary">
          <CvKpi label="Receita" value={cvBRL(financial.receita)} sub={modo === "veiculo" ? placa || "Selecione uma placa" : cvVariation(data.comparison?.receita, true)} icon="trending-up" tone="#22c55e"/>
          <CvKpi label="Custos" value={cvBRL(financial.custo)} sub={modo === "veiculo" ? `${s.quantidadeLancamentos || 0} lançamentos rastreáveis` : cvVariation(data.comparison?.custo, false)} icon="money" tone="#f59e0b"/>
          <CvKpi label="Resultado total" value={cvBRL(financial.lucro)} sub={modo === "veiculo" ? "Receita menos todos os custos" : cvVariation(data.comparison?.resultado, true)} icon="chart" tone={cvNum(financial.lucro) >= 0 ? "#22c55e" : "#ef4444"}/>
          {modo === "geral" && <CvKpi label="Resultado operacional" value={cvBRL(profitSummary.resultadoOperacional)} sub={`Margem ${cvMargin(profitSummary.margemOperacional)}`} icon="chart" tone={cvNum(profitSummary.resultadoOperacional) >= 0 ? "#22c55e" : "#ef4444"}/>}
          <CvKpi label="Margem" value={cvMargin(financial.margem)} sub={financial.receita > 0 ? "Resultado sobre a receita" : "Sem receita no período"} icon="trending-up" tone={financial.margem === null || financial.margem === undefined ? "#64748b" : cvNum(financial.margem) >= 0 ? "#22c55e" : "#ef4444"}/>
          <CvKpi label="Distância" value={financial.distanciaKm > 0 ? `${Number(financial.distanciaKm).toLocaleString("pt-BR")} km` : "—"} sub="Telemetria com cobertura confirmada" icon="truck" tone="#3b82f6"/>
          <CvKpi label="Custo por km" value={cvOptionalBRL(financial.custoPorKm)} sub={financial.custoPorKm === null || financial.custoPorKm === undefined ? "Sem cobertura completa" : "Custos ÷ km do período"} icon="speedometer" tone="#8b5cf6"/>
        </div>

        {!!managementAlerts.length && <div className="card cv-attention"><div className="section-head"><div><h2>Pontos de atenção</h2><div className="muted">Leitura automática do período selecionado</div></div></div><div className="cv-attention-grid">{managementAlerts.map((item, index) => <div className={`cv-management-alert ${item.tone}`} key={index}><Icon name="alert"/><span><strong>{item.title}</strong><small>{item.note}</small></span></div>)}</div></div>}

        <details className="card cv-data-quality">
          <summary>Qualidade dos dados <span className="muted">Abrir auditoria técnica</span></summary>
          <div className="section-head"><div><h2>Qualidade dos dados</h2><div className="muted">Indicadores que afetam a confiança da análise</div></div><span className={`badge ${(data.audit?.possiveisDivergenciasPlaca || data.audit?.registrosSemPlaca) ? "warn" : "ok"}`}>{(data.audit?.possiveisDivergenciasPlaca || data.audit?.registrosSemPlaca) ? "Requer atenção" : "Sem divergências críticas"}</span></div>
          <div className="cv-mini-list">
            <div><span>Telemetria confirmada</span><strong>{data.audit?.veiculosTelemetriaConfirmada || 0}</strong><em>veículos</em></div>
            <div><span>Cobertura parcial</span><strong>{data.audit?.veiculosTelemetriaParcial || 0}</strong><em>custo/km indisponível</em></div>
            <div><span>Sem telemetria</span><strong>{data.audit?.veiculosSemTelemetria || 0}</strong><em>veículos</em></div>
            <div><span>Sem placa</span><strong>{data.audit?.registrosSemPlaca || 0}</strong><em>lançamentos</em></div>
            <div><span>Divergência placa/veículo</span><strong>{data.audit?.possiveisDivergenciasPlaca || 0}</strong><em>possíveis casos</em></div>
          </div>
        </details>

        <div className="card cv-management-costs">
          <div className="section-head"><div><h2>Natureza gerencial dos custos</h2><div className="muted">Separação para entender o que pertence à operação e o que pressiona o resultado total</div></div></div>
          <div className="cv-mini-list">
            {managementCosts.map((item) => <div key={item.key}><span>{item.label}</span><strong>{cvBRL(item.value)}</strong><em>{item.note}</em></div>)}
          </div>
          {cvNum(s.custoNaoClassificado) > 0 && <div className="cv-executive"><Icon name="alert"/><span><strong>{cvBRL(s.custoNaoClassificado)}</strong> ainda não possui classificação gerencial. Os lançamentos permanecem no resultado total e podem ser conferidos em “Outros”.</span></div>}
          {!!data.otherBreakdown.length && <div className="cv-other-breakdown"><div className="section-head"><div><h3>O que está dentro de “Outros”</h3><div className="muted">Contas financeiras com maior impacto no período</div></div></div><div className="cv-mini-list">{data.otherBreakdown.slice(0, 6).map((item) => <div key={item.classificacao}><span>{item.classificacao}</span><strong>{cvBRL(item.custo)}</strong><em>{item.lancamentos} lançamentos</em></div>)}</div></div>}
        </div>

        <div className="card cv-composition">
          <div className="section-head"><div><h2>Composição dos custos</h2><div className="muted">Categoria → classificação financeira → lançamento individual</div></div><div className="cv-composition-actions"><input value={costSearch} onChange={(e) => setCostSearch(e.target.value)} placeholder="Buscar custo, fornecedor ou descrição..."/><button className="btn" onClick={() => setExpandedCosts(new Set(composition.map((item) => item.category)))}>Expandir tudo</button><button className="btn" onClick={() => setExpandedCosts(new Set())}>Recolher tudo</button></div></div>
          <div className="cv-cost-tree">
            {composition.map((item) => {
              const open = expandedCosts.has(item.category);
              const pct = cvNum(s.custoTotal) ? item.value / cvNum(s.custoTotal) * 100 : 0;
              return <div className={`cv-cost-group${open ? " open" : ""}`} key={item.category}>
                <button className="cv-cost-group-head" onClick={() => toggleCost(item.category)}><Icon name={open ? "chevron-down" : "chevron-right"}/><span><strong>{item.category}</strong><small>{item.count} lançamentos · {pct.toFixed(1)}% do total</small></span><b>{cvBRL(item.value)}</b></button>
                <div className="cv-cost-share"><i style={{ width: `${Math.min(100, pct)}%` }}/></div>
                {open && <div className="cv-subcosts">{Object.values(item.subcategories).sort((a,b) => b.value - a.value).map((sub) => <details key={sub.name}><summary><span>{sub.name}</span><small>{sub.rows.length} lanç.</small><b>{cvBRL(sub.value)}</b></summary><div className="table-wrap"><table className="data-table compact"><thead><tr><th>Data</th><th>Placa</th><th>Fornecedor</th><th>Histórico</th><th>Documento</th><th>Situação</th><th>Origem</th><th className="num">Valor</th></tr></thead><tbody>{sub.rows.map((row, index) => <tr key={`${row.id}-${index}`}><td>{cvDate(row.data)}</td><td>{row.placa}</td><td>{row.fornecedor}</td><td title={row.historico}>{row.historico || row.descricao || "-"}</td><td>{row.documento || "-"}</td><td><span className={`badge ${CV_STATUS[row.situacao]?.cls || ""}`}>{CV_STATUS[row.situacao]?.label || row.situacao}</span></td><td>{row.origem}</td><td className="num">{cvBRL(row.valor)}</td></tr>)}</tbody></table></div></details>)}</div>}
              </div>;
            })}
            {!composition.length && <div className="cv-empty"><strong>Nenhuma despesa encontrada.</strong><span>Altere o período ou limpe os filtros para consultar outros lançamentos.</span><button className="btn" onClick={clearFilters}>Limpar filtros</button></div>}
          </div>
        </div>

        {modo === "geral" && <div className="card"><div className="section-head"><div><h2>Resultado por veículo</h2><div className="muted">Receita, custos e resultado da frota no período</div></div><span className="muted">{profitVehicles.length} veículos</span></div><div className="table-wrap"><table className="data-table compact"><thead><tr><th>Placa</th><th>Veículo</th><th className="num">Receita</th><th className="num">Custos</th><th className="num">Resultado</th><th>Margem</th><th className="num">Distância</th><th className="num">Custo/km</th><th>Ação</th></tr></thead><tbody>{profitVehicles.map((row) => <tr key={row.placa}><td><strong>{row.placa}</strong></td><td>{row.veiculoNome || "-"}</td><td className="num">{cvBRL(row.receita)}</td><td className="num">{cvBRL(row.custo)}</td><td className="num" style={{ color: cvNum(row.lucro) >= 0 ? "var(--ok)" : "var(--crit)" }}>{cvBRL(row.lucro)}</td><td>{cvMargin(row.margem)}</td><td className="num" title={`Cobertura: ${row.coberturaTelemetria || "indisponível"}`}>{row.distanciaKm > 0 ? `${Number(row.distanciaKm).toLocaleString("pt-BR")} km` : "—"}</td><td className="num">{cvOptionalBRL(row.custoPorKm)}</td><td><button className="btn" onClick={() => openVehicle(row.placa)}>Ver detalhes</button></td></tr>)}</tbody></table></div></div>}
      </>
      )}

      {modo === "despesas" && (
      <>
      <div className="cv-kpi-grid">
        <CvKpi label="Custo total" value={cvBRL(s.custoTotal)} sub={`${s.quantidadeLancamentos || 0} lancamentos`} icon="money" tone="#ef4444"/>
        <CvKpi label="Custo pago" value={cvBRL(s.custoPago)} sub="Baixado no financeiro" icon="check" tone="#22c55e"/>
        <CvKpi label="Em aberto" value={cvBRL(s.custoAberto)} sub={`Vencido: ${cvBRL(s.custoVencido)}`} icon="clock" tone="#f59e0b"/>
        <CvKpi label="Vencido" value={cvBRL(s.custoVencido)} sub={`${overdue.lancamentos || 0} lançamentos vencidos`} icon="alert" tone={cvNum(s.custoVencido) ? "#ef4444" : "#64748b"}/>
        <CvKpi label="Média por veículo" value={cvBRL(averageVehicle)} sub={`${s.totalVeiculos || 0} veículos com movimentação`} icon="truck" tone="#3b82f6"/>
      </div>

      <div className="cv-executive"><Icon name="chart"/><span>{executiveText}</span></div>
      {!!attention.length && <div className="card cv-attention"><div className="section-head"><h2>Pontos de atenção</h2></div><div className="cv-attention-grid">{attention.map((item, index) => <button key={index} onClick={item.action}><Icon name="alert"/><span><strong>{item.title}</strong><small>{item.sub}</small></span><b>{item.link}</b></button>)}</div></div>}

      <div className="cv-panels">
        <div className="card">
          <div className="section-head"><h2>Evolução dos custos</h2></div>
          {!!data.monthly.length && <CvTrendChart items={data.monthly}/>} 
          {!data.monthly.length && <div className="muted">Sem custos no periodo.</div>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Veículos com maior custo</h2></div>
          {data.ranking.slice(0, showAllRanking ? data.ranking.length : 5).map((item) => <CvBar key={item.placa} label={item.placa} value={item.custo} max={maxRank} meta={`${cvNum(s.custoTotal) ? (cvNum(item.custo) / cvNum(s.custoTotal) * 100).toFixed(1) : 0}% da frota · ${item.custoPorKm ? `${cvBRL(item.custoPorKm)}/km · ` : ""}${item.lancamentos} lanç.`} onClick={() => setDetailPlate(item.placa)}/>)}
          {data.ranking.length > 5 && <button className="btn" onClick={() => setShowAllRanking((v) => !v)}>{showAllRanking ? "Mostrar Top 5" : "Ver ranking completo"}</button>}
          {!data.ranking.length && <div className="muted">Nenhum veiculo encontrado.</div>}
        </div>
      </div>

      <div className="cv-cost-breakdown">
        <div className="card">
          <div className="section-head"><h2>Onde estamos gastando?</h2></div>
          {data.types.map((item) => <CvBar key={item.tipo} label={item.tipo} value={item.custo} max={maxType} meta={`${item.lancamentos} lanç. · ${cvNum(s.custoTotal) ? (cvNum(item.custo) / cvNum(s.custoTotal) * 100).toFixed(1) : 0}% do total`} onClick={() => applyCategory(item.tipo)}/>)}
        </div>
        <div className="card">
          <div className="section-head"><h2>Fornecedor</h2></div>
          {data.suppliers.slice(0, showAllSuppliers ? data.suppliers.length : 5).map((item) => <CvBar key={`${item.fornecedorCodigo}-${item.fornecedor}`} label={item.fornecedor} value={item.custo} max={maxSupplier} meta={`${item.lancamentos} lanç. · ${cvNum(s.custoTotal) ? (cvNum(item.custo) / cvNum(s.custoTotal) * 100).toFixed(1) : 0}%`} onClick={() => { setFornecedor(item.fornecedor); setFilters((old) => ({ ...old, fornecedor: item.fornecedor })); }}/>)}
          {data.suppliers.length > 5 && <button className="btn" onClick={() => setShowAllSuppliers((v) => !v)}>{showAllSuppliers ? "Mostrar principais" : "Ver todos os fornecedores"}</button>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Pago x aberto x vencido</h2></div>
          {data.status.map((item) => <CvBar key={item.situacao} label={CV_STATUS[item.situacao]?.label || item.situacao} value={item.custo} max={maxStatus} meta={`${item.lancamentos} lanc.`} tone={item.situacao === "pago" ? "#22c55e" : item.situacao === "vencido" ? "#ef4444" : "#f59e0b"}/>)}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div><h2>Lançamentos</h2><div className="muted" style={{ fontSize: 12 }}>Extrato completo de financeiro, rateios e abastecimentos sem duplicidade</div></div>
          <div className="muted" style={{ fontSize: 12 }}>{data.launches.length} registros · Página {launchPage} de {launchPages}</div>
        </div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead>
              <tr>
                <th><button className="cv-sort" onClick={() => sortLaunches("data")}>Data ↕</button></th><th><button className="cv-sort" onClick={() => sortLaunches("placa")}>Placa ↕</button></th><th>Centro de custo</th><th>Categoria</th><th>Fornecedor</th><th>Descrição</th><th>Documento</th><th className="num"><button className="cv-sort" onClick={() => sortLaunches("valor")}>Valor ↕</button></th><th><button className="cv-sort" onClick={() => sortLaunches("vencimento")}>Vencimento ↕</button></th><th>Status</th><th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {visibleLaunches.map((row) => (
                <tr key={row.id} className="clickable" onClick={() => row.placa && !row.placa.startsWith("CC ") && setDetailPlate(row.placa)}>
                  <td>{cvDate(row.data)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{row.placa || "Nao identificado"}</td>
                  <td>{row.centroCusto}</td>
                  <td>{row.tipoCusto}</td>
                  <td>{row.fornecedor}</td>
                  <td title={row.historico}>{row.descricao || row.historico || "-"}</td>
                  <td>{row.documento || "-"}</td>
                  <td className="num">{cvBRL(row.valor)}</td>
                  <td>{cvDate(row.vencimento)}</td>
                  <td><span className={`badge ${CV_STATUS[row.situacao]?.cls || ""}`}>{CV_STATUS[row.situacao]?.label || row.situacao}</span></td>
                  <td>{row.origem}</td>
                </tr>
              ))}
              {!data.launches.length && <tr><td colSpan="11" className="muted">Nenhum lançamento encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        {launchPages > 1 && <div className="cv-pagination"><button className="btn" disabled={launchPage === 1} onClick={() => setLaunchPage((p) => Math.max(1, p - 1))}>Anterior</button><span>Página {launchPage} de {launchPages}</span><button className="btn" disabled={launchPage === launchPages} onClick={() => setLaunchPage((p) => Math.min(launchPages, p + 1))}>Próxima</button></div>}
      </div>
      </>
      )}

      {modo === "lucro" && (
      <>
      <div className="cv-kpi-grid">
        <CvKpi label="Receita total" value={cvBRL(profitSummary.receitaTotal)} sub="Conhecimentos/CT-e emitidos" icon="trending-up" tone="#22c55e"/>
        <CvKpi label="Custo total" value={cvBRL(profitSummary.custoTotal)} sub="Despesas filtradas por placa" icon="money" tone="#ef4444"/>
        <CvKpi label="Lucro bruto" value={cvBRL(profitSummary.lucroTotal)} sub={`Margem ${Number(cvNum(profitSummary.margem)).toFixed(1)}%`} icon="chart" tone={cvNum(profitSummary.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"}/>
        <CvKpi label="Veiculos" value={String(profitSummary.veiculos || 0)} sub={`${profitSummary.veiculosLucro || 0} lucro | ${profitSummary.veiculosPrejuizo || 0} prejuizo`} icon="truck" tone="#3b82f6"/>
      </div>

      <div className="cv-panels three">
        <div className="card">
          <div className="section-head"><h2>Ranking de lucro</h2></div>
          {profitRank.lucro?.length ? profitRank.lucro.map((item) => (
            <CvBar key={item.placa} label={item.placa} value={item.lucro} max={maxProfit} meta={`Receita ${cvShortMoney(item.receita)} | custo ${cvShortMoney(item.custo)}`} tone={cvNum(item.lucro) >= 0 ? "#22c55e" : "#ef4444"} onClick={() => setDetailPlate(item.placa)}/>
          )) : <div className="muted">Sem lucro calculado no periodo.</div>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Ranking de prejuizo</h2></div>
          {profitRank.prejuizo?.length ? profitRank.prejuizo.map((item) => (
            <CvBar key={item.placa} label={item.placa} value={item.lucro} max={maxLoss} meta={`Margem ${Number(cvNum(item.margem)).toFixed(1)}%`} tone="#ef4444" onClick={() => setDetailPlate(item.placa)}/>
          )) : <div className="muted">Nenhum veiculo com prejuizo.</div>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Maior custo por km</h2></div>
          {profitRank.custoKm?.length ? profitRank.custoKm.map((item) => (
            <CvBar key={item.placa} label={item.placa} value={item.custoPorKm} max={maxCostKm} meta={`${Number(item.kmAtual || 0).toLocaleString("pt-BR")} km | custo ${cvShortMoney(item.custo)}`} tone="#f59e0b" onClick={() => setDetailPlate(item.placa)}/>
          )) : <div className="muted">Sem KM disponivel para comparar.</div>}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div><h2>Lucro por veiculo</h2><div className="muted" style={{ fontSize: 12 }}>Receita de logistica.conhecimentos; custos de financeiro.pagar/rateios e abastecimentos operacionais</div></div>
          <div className="muted" style={{ fontSize: 12 }}>{profitVehicles.length} veiculos</div>
        </div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Placa</th><th>Veiculo</th><th>Centro de custo</th><th className="num">Receita</th><th className="num">Custo</th><th className="num">Lucro</th><th>Margem</th><th className="num">Custo/km</th><th>Viagens</th><th>Conhec.</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {profitVehicles.map((row) => {
                const st = CV_RESULT_STATUS[row.statusResultado] || CV_RESULT_STATUS.empate;
                return (
                  <tr key={row.placa} className="clickable" onClick={() => row.placa && !row.placa.startsWith("CC ") && setDetailPlate(row.placa)}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.placa}</td>
                    <td>{row.veiculoNome || "-"}</td>
                    <td>{row.centroCusto || "-"}</td>
                    <td className="num">{cvBRL(row.receita)}</td>
                    <td className="num">{cvBRL(row.custo)}</td>
                    <td className="num" style={{ color: st.color }}>{cvBRL(row.lucro)}</td>
                    <td>{Number(cvNum(row.margem)).toFixed(1)}%</td>
                    <td className="num">{cvBRL(row.custoPorKm)}</td>
                    <td>{row.viagens || 0}</td>
                    <td>{row.conhecimentos || 0}</td>
                    <td><span className={`badge ${st.cls}`} style={{ color: st.color }}><span className="dot" style={{ background: st.color }}/>{st.label}</span></td>
                  </tr>
                );
              })}
              {!profitVehicles.length && <tr><td colSpan="11" className="muted">Nenhum veiculo encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      <details className="card cv-technical-audit" style={{ marginTop: 16 }}>
        <summary>Auditoria completa <span className="muted">Origens e conferência técnica dos registros</span></summary>
        <div className="section-head">
          <div><h2>Auditoria dos dados</h2><div className="muted" style={{ fontSize: 12 }}>Resumo tecnico para conferencia em desenvolvimento</div></div>
          <span className="badge info">{data.audit?.registrosFiltrados || 0} registros</span>
        </div>
        <div className="cv-mini-list">
          {(data.audit?.origins || []).map((row) => (
            <div key={row.origem}><span>{row.origem}</span><strong>{cvBRL(row.total)}</strong><em>{row.registros} registros</em></div>
          ))}
          <div><span>Sem placa</span><strong>{data.audit?.registrosSemPlaca || 0}</strong><em>apos filtros</em></div>
          <div><span>Sem centro</span><strong>{data.audit?.registrosSemCentro || 0}</strong><em>apos filtros</em></div>
          <div><span>Centro administrativo</span><strong>{data.audit?.registrosCentroAdministrativo || 0}</strong><em>na base filtrada</em></div>
          <div><span>Divergencias placa/veiculo</span><strong>{data.audit?.possiveisDivergenciasPlaca || 0}</strong><em>possiveis casos</em></div>
        </div>
      </details>

      <CvDetailModal placa={detailPlate} filters={filters} onClose={() => setDetailPlate("")}/>
    </div>
  );
};

window.CustosVeiculos = CustosVeiculos;

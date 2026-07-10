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
    suppliers: Array.isArray(base.suppliers) ? base.suppliers : [],
    status: Array.isArray(base.status) ? base.status : [],
    launches: Array.isArray(base.launches) ? base.launches : [],
    validation: base.validation || {},
    profit: base.profit || { summary: {}, vehicles: [], rankings: { lucro: [], prejuizo: [], custoKm: [] } },
    audit: base.audit || {},
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
  { key: "7d", label: "7 dias", range: () => ({ start: cvDaysAgoISO(6), end: cvTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: cvDaysAgoISO(29), end: cvTodayISO() }) },
  { key: "month", label: "Este mes", range: () => {
    const d = new Date();
    return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, end: cvTodayISO() };
  } },
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
              <CvKpi label="Custo por km" value={cvBRL(v.custoPorKm)} sub={v.kmAtual ? `${Number(v.kmAtual).toLocaleString("pt-BR")} km atual` : "Sem km informado"} tone="#3b82f6" icon="speedometer"/>
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
                    {d.launches.slice(0, 12).map((row) => (
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
  const defaultRange = CV_PERIODS[1].range();
  const [modo, setModo] = React.useState("despesas");
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim, setDataFim] = React.useState(defaultRange.end);
  const [placa, setPlaca] = React.useState("");
  const [centro, setCentro] = React.useState("");
  const [tipoCusto, setTipoCusto] = React.useState("todos");
  const [situacao, setSituacao] = React.useState("todos");
  const [fornecedor, setFornecedor] = React.useState("");
  const [empresa, setEmpresa] = React.useState("");
  const [valorMin, setValorMin] = React.useState("");
  const [valorMax, setValorMax] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ dataInicio: defaultRange.start, dataFim: defaultRange.end, proprietario: "frota" });
  const [options, setOptions] = React.useState({ placas: [], centros: [], tipos: [], situacoes: [], fornecedores: [], empresas: [] });
  const [data, setData] = React.useState(() => cvNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [detailPlate, setDetailPlate] = React.useState("");

  React.useEffect(() => {
    window.RB_API.getCustosVeiculosFiltros().then((payload) => setOptions(payload || {})).catch(() => {});
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getCustosVeiculos({ ...filters, limit: 300 })
      .then((payload) => { if (active) setData(cvNormalize(payload)); })
      .catch((err) => {
        if (!active) return;
        setData(cvNormalize(null));
        setError(err?.message || "Nao foi possivel carregar os custos por veiculo.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyShortcut = (key) => {
    const p = CV_PERIODS.find((item) => item.key === key);
    if (!p) return;
    const r = p.range();
    setDataInicio(r.start);
    setDataFim(r.end);
    setFilters({ dataInicio: r.start, dataFim: r.end, placa, centro, tipoCusto, situacao, fornecedor, empresa, proprietario:"frota", valorMin, valorMax, search });
  };

  const applyFilters = () => setFilters({ dataInicio, dataFim, placa, centro, tipoCusto, situacao, fornecedor, empresa, proprietario:"frota", valorMin, valorMax, search });
  const clearFilters = () => {
    const r = CV_PERIODS[1].range();
    setDataInicio(r.start); setDataFim(r.end); setPlaca(""); setCentro(""); setTipoCusto("todos"); setSituacao("todos"); setFornecedor(""); setEmpresa(""); setValorMin(""); setValorMax(""); setSearch("");
    setFilters({ dataInicio: r.start, dataFim: r.end, proprietario: "frota" });
  };

  const s = data.summary || {};
  const maxMonth = Math.max(1, ...data.monthly.map((item) => cvNum(item.custo)));
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

  return (
    <div className="view cv-view">
      <div className="page-head">
        <div>
          <h1>Custos por Veículo</h1>
          <div className="sub">Despesas da frota e lucro/prejuízo por placa com receita de conhecimentos/CT-e</div>
        </div>
        <div className="actions">
          <button className={`btn${modo === "despesas" ? " primary" : ""}`} onClick={() => setModo("despesas")}>Despesas da frota</button>
          <button className={`btn${modo === "lucro" ? " primary" : ""}`} onClick={() => setModo("lucro")}>Lucro por veículo</button>
          {CV_PERIODS.map((p) => <button key={p.key} className="btn" onClick={() => applyShortcut(p.key)}>{p.label}</button>)}
          <button className="btn" onClick={() => window.RB_API.getCustosVeiculos(filters).then((payload) => setData(cvNormalize(payload)))}><Icon name="refresh"/> Atualizar</button>
        </div>
      </div>

      <div className="cv-filters card">
        <label>Data inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={options.placas || []} placeholder="Todas" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Centro de custo<RBCombobox value={centro} onChange={setCentro} options={options.centros || []} placeholder="Todos" getLabel={(c) => c.codigo ? `${c.codigo} - ${c.nome}` : c.nome} getValue={(c) => c.codigo ? `${c.codigo} - ${c.nome}` : c.nome} tag={() => "Centro"}/></label>
        <label>Tipo de custo<select value={tipoCusto} onChange={(e) => setTipoCusto(e.target.value)}><option value="todos">Todos</option>{(options.tipos || []).map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label>Situação<select value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="todos">Todas</option>{(options.situacoes || []).map((st) => <option key={st} value={st}>{CV_STATUS[st]?.label || st}</option>)}</select></label>
        <label>Fornecedor<RBCombobox value={fornecedor} onChange={setFornecedor} options={options.fornecedores || []} placeholder="Todos" getLabel={(f) => f.codigo ? `${f.codigo} - ${f.nome}` : f.nome} getValue={(f) => f.codigo ? `${f.codigo} - ${f.nome}` : f.nome} tag={() => "Fornecedor"}/></label>
        <label>Empresa<select value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{(options.empresas || []).map((e) => <option key={e} value={e}>{e}</option>)}</select></label>
        <label>Valor mínimo<input type="number" value={valorMin} placeholder="0,00" onChange={(e) => setValorMin(e.target.value)}/></label>
        <label>Valor máximo<input type="number" value={valorMax} placeholder="Sem limite" onChange={(e) => setValorMax(e.target.value)}/></label>
        <label>Busca livre<input value={search} placeholder="Descrição, documento, origem..." onChange={(e) => setSearch(e.target.value)}/></label>
        <div className="cv-filter-actions"><button className="btn primary" onClick={applyFilters}><Icon name="search"/> Filtrar</button><button className="btn" onClick={clearFilters}><Icon name="x"/> Limpar</button></div>
      </div>

      {error && <div className="card" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>{error}</div>}
      {loading && <div className="card">Carregando custos...</div>}

      {modo === "despesas" && (
      <>
      <div className="cv-kpi-grid">
        <CvKpi label="Custo total" value={cvBRL(s.custoTotal)} sub={`${s.quantidadeLancamentos || 0} lancamentos`} icon="money" tone="#ef4444"/>
        <CvKpi label="Custo pago" value={cvBRL(s.custoPago)} sub="Baixado no financeiro" icon="check" tone="#22c55e"/>
        <CvKpi label="Em aberto" value={cvBRL(s.custoAberto)} sub={`Vencido: ${cvBRL(s.custoVencido)}`} icon="clock" tone="#f59e0b"/>
        <CvKpi label="Media por veiculo" value={cvBRL(s.custoMedioVeiculo)} sub={`${s.totalVeiculos || 0} veiculos/centros`} icon="truck" tone="#3b82f6"/>
        <CvKpi label="Maior custo" value={s.veiculoMaiorCusto || "-"} sub={cvBRL(s.maiorCustoValor)} icon="alert" tone="#a855f7"/>
        <CvKpi label="Maior categoria" value={s.maiorCategoria || "-"} sub={cvBRL(s.maiorCategoriaValor)} icon="chart" tone="#0ea5e9"/>
        <CvKpi label="Maior fornecedor" value={s.maiorFornecedor || "-"} sub={cvBRL(s.maiorFornecedorValor)} icon="user" tone="#64748b"/>
        <CvKpi label="Lancamentos" value={String(s.quantidadeLancamentos || 0)} sub="Detalhados abaixo" icon="file" tone="#64748b"/>
      </div>

      <div className="cv-panels">
        <div className="card">
          <div className="section-head"><h2>Custo por mes</h2></div>
          {data.monthly.map((item) => <CvBar key={item.mes} label={item.label} value={item.custo} max={maxMonth} meta={`Pago ${cvShortMoney(item.pago)} | aberto ${cvShortMoney(item.aberto)}`}/>)}
          {!data.monthly.length && <div className="muted">Sem custos no periodo.</div>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Ranking de veiculos</h2></div>
          {data.ranking.slice(0, 10).map((item) => <CvBar key={item.placa} label={item.placa} value={item.custo} max={maxRank} meta={`${item.lancamentos} lanc. - ${item.centroCusto || ""}`} onClick={() => setDetailPlate(item.placa)}/>)}
          {!data.ranking.length && <div className="muted">Nenhum veiculo encontrado.</div>}
        </div>
      </div>

      <div className="cv-panels three">
        <div className="card">
          <div className="section-head"><h2>Tipo/categoria</h2></div>
          {data.types.map((item) => <CvBar key={item.tipo} label={item.tipo} value={item.custo} max={maxType} meta={`${item.lancamentos} lanc.`}/>)}
        </div>
        <div className="card">
          <div className="section-head"><h2>Fornecedor</h2></div>
          {data.suppliers.slice(0, 8).map((item) => <CvBar key={`${item.fornecedorCodigo}-${item.fornecedor}`} label={item.fornecedor} value={item.custo} max={maxSupplier} meta={`${item.lancamentos} lanc.`}/>)}
        </div>
        <div className="card">
          <div className="section-head"><h2>Pago x aberto x vencido</h2></div>
          {data.status.map((item) => <CvBar key={item.situacao} label={CV_STATUS[item.situacao]?.label || item.situacao} value={item.custo} max={maxStatus} meta={`${item.lancamentos} lanc.`} tone={item.situacao === "pago" ? "#22c55e" : item.situacao === "vencido" ? "#ef4444" : "#f59e0b"}/>)}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div><h2>Detalhamento dos lançamentos</h2><div className="muted" style={{ fontSize: 12 }}>Origem: financeiro.pagar, rateios e abastecimentos operacionais não duplicados</div></div>
          <div className="muted" style={{ fontSize: 12 }}>Validacao: base filtrada {cvBRL(data.validation.baseFiltrada)}</div>
        </div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Data</th><th>Placa/Centro</th><th>Centro de custo</th><th>Tipo</th><th>Fornecedor</th><th>Descrição</th><th className="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {data.launches.map((row) => (
                <tr key={row.id} className="clickable" onClick={() => row.placa && !row.placa.startsWith("CC ") && setDetailPlate(row.placa)}>
                  <td>{cvDate(row.data)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{row.placa || "Nao identificado"}</td>
                  <td>{row.centroCusto}</td>
                  <td>{row.tipoCusto}</td>
                  <td>{row.fornecedor}</td>
                  <td title={row.historico}>{row.descricao || row.historico || "-"}</td>
                  <td className="num">{cvBRL(row.valor)}</td>
                  <td>{cvDate(row.vencimento)}</td>
                  <td>{cvDate(row.pagamento)}</td>
                  <td><span className={`badge ${CV_STATUS[row.situacao]?.cls || ""}`}>{CV_STATUS[row.situacao]?.label || row.situacao}</span></td>
                  <td>{row.origem}</td>
                </tr>
              ))}
              {!data.launches.length && <tr><td colSpan="11" className="muted">Nenhum lançamento encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </div>
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

      <div className="card" style={{ marginTop: 16 }}>
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
      </div>

      <CvDetailModal placa={detailPlate} filters={filters} onClose={() => setDetailPlate("")}/>
    </div>
  );
};

window.CustosVeiculos = CustosVeiculos;

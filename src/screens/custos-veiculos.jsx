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
  };
}

const CV_STATUS = {
  pago: { label: "Pago", cls: "ok" },
  aberto: { label: "Aberto", cls: "info" },
  vencido: { label: "Vencido", cls: "crit" },
  cancelado: { label: "Cancelado", cls: "warn" },
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
      .catch((err) => { if (active) setError(err?.message || "Nao foi possivel carregar o veiculo."); })
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
            <div className="muted" style={{ fontSize: 12 }}>{v.nome || v.modelo || "Resumo individual do veiculo"}</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x"/></button>
        </div>

        {loading && <div className="card">Carregando detalhe...</div>}
        {error && <div className="card" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>{error}</div>}
        {!loading && !error && (
          <>
            <div className="cv-detail-grid">
              <CvKpi label="Total gasto" value={cvBRL(d.summary.custoTotal)} sub={`${d.summary.quantidadeLancamentos || 0} lancamentos`} tone="#ef4444" icon="money"/>
              <CvKpi label="Custo por km" value={cvBRL(v.custoPorKm)} sub={v.kmAtual ? `${Number(v.kmAtual).toLocaleString("pt-BR")} km atual` : "Sem km informado"} tone="#3b82f6" icon="speedometer"/>
              <CvKpi label="Aberto" value={cvBRL(d.summary.custoAberto)} sub={`Vencido: ${cvBRL(d.summary.custoVencido)}`} tone="#f59e0b" icon="clock"/>
            </div>

            <div className="cv-vehicle-info">
              <span><b>Centro:</b> {v.centroCusto || "-"}</span>
              <span><b>Empresa:</b> {v.empresa || "-"}</span>
              <span><b>Proprietario:</b> {v.proprietario || "-"}</span>
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
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim, setDataFim] = React.useState(defaultRange.end);
  const [placa, setPlaca] = React.useState("");
  const [centro, setCentro] = React.useState("");
  const [tipoCusto, setTipoCusto] = React.useState("todos");
  const [situacao, setSituacao] = React.useState("todos");
  const [fornecedor, setFornecedor] = React.useState("");
  const [empresa, setEmpresa] = React.useState("");
  const [proprietario, setProprietario] = React.useState("todos");
  const [filters, setFilters] = React.useState({ dataInicio: defaultRange.start, dataFim: defaultRange.end, proprietario: "todos" });
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
    setFilters({ dataInicio: r.start, dataFim: r.end, placa, centro, tipoCusto, situacao, fornecedor, empresa, proprietario });
  };

  const applyFilters = () => setFilters({ dataInicio, dataFim, placa, centro, tipoCusto, situacao, fornecedor, empresa, proprietario });
  const clearFilters = () => {
    const r = CV_PERIODS[1].range();
    setDataInicio(r.start); setDataFim(r.end); setPlaca(""); setCentro(""); setTipoCusto("todos"); setSituacao("todos"); setFornecedor(""); setEmpresa(""); setProprietario("todos");
    setFilters({ dataInicio: r.start, dataFim: r.end, proprietario: "todos" });
  };

  const s = data.summary || {};
  const maxMonth = Math.max(1, ...data.monthly.map((item) => cvNum(item.custo)));
  const maxRank = Math.max(1, ...data.ranking.map((item) => cvNum(item.custo)));
  const maxType = Math.max(1, ...data.types.map((item) => cvNum(item.custo)));
  const maxSupplier = Math.max(1, ...data.suppliers.map((item) => cvNum(item.custo)));
  const maxStatus = Math.max(1, ...data.status.map((item) => cvNum(item.custo)));

  return (
    <div className="view cv-view">
      <div className="page-head">
        <div>
          <h1>Custos por Veiculo</h1>
          <div className="sub">Manutencoes, despesas, abastecimentos e outros custos por placa ou centro de custo</div>
        </div>
        <div className="actions">
          {CV_PERIODS.map((p) => <button key={p.key} className="btn" onClick={() => applyShortcut(p.key)}>{p.label}</button>)}
          <button className="btn" onClick={() => window.RB_API.getCustosVeiculos(filters).then((payload) => setData(cvNormalize(payload)))}><Icon name="refresh"/> Atualizar</button>
        </div>
      </div>

      <div className="cv-filters card">
        <label>Data inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></label>
        <label>Placa<input list="cv-placas" value={placa} placeholder="Todas" onChange={(e) => setPlaca(e.target.value.toUpperCase())}/><datalist id="cv-placas">{(options.placas || []).map((p) => <option key={p} value={p}/>)}</datalist></label>
        <label>Centro de custo<input list="cv-centros" value={centro} placeholder="Todos" onChange={(e) => setCentro(e.target.value)}/><datalist id="cv-centros">{(options.centros || []).map((c) => <option key={`${c.codigo}-${c.nome}`} value={c.codigo ? `${c.codigo} - ${c.nome}` : c.nome}/>)}</datalist></label>
        <label>Tipo de custo<select value={tipoCusto} onChange={(e) => setTipoCusto(e.target.value)}><option value="todos">Todos</option>{(options.tipos || []).map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label>Situacao<select value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="todos">Todas</option>{(options.situacoes || []).map((st) => <option key={st} value={st}>{CV_STATUS[st]?.label || st}</option>)}</select></label>
        <label>Fornecedor<input list="cv-fornecedores" value={fornecedor} placeholder="Todos" onChange={(e) => setFornecedor(e.target.value)}/><datalist id="cv-fornecedores">{(options.fornecedores || []).map((f) => <option key={`${f.codigo}-${f.nome}`} value={f.codigo ? `${f.codigo} - ${f.nome}` : f.nome}/>)}</datalist></label>
        <label>Empresa<select value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{(options.empresas || []).map((e) => <option key={e} value={e}>{e}</option>)}</select></label>
        <label>Proprietario<select value={proprietario} onChange={(e) => setProprietario(e.target.value)}><option value="todos">Todos</option><option value="frota">Frota</option><option value="terceiro">Terceiro</option></select></label>
        <div className="cv-filter-actions"><button className="btn primary" onClick={applyFilters}><Icon name="search"/> Filtrar</button><button className="btn" onClick={clearFilters}><Icon name="x"/> Limpar</button></div>
      </div>

      {error && <div className="card" style={{ borderColor: "var(--crit)", color: "var(--crit)" }}>{error}</div>}
      {loading && <div className="card">Carregando custos...</div>}

      <div className="cv-kpi-grid">
        <CvKpi label="Custo total" value={cvBRL(s.custoTotal)} sub={`${s.quantidadeLancamentos || 0} lancamentos`} icon="money" tone="#ef4444"/>
        <CvKpi label="Custo pago" value={cvBRL(s.custoPago)} sub="Baixado no financeiro" icon="check" tone="#22c55e"/>
        <CvKpi label="Em aberto" value={cvBRL(s.custoAberto)} sub={`Vencido: ${cvBRL(s.custoVencido)}`} icon="clock" tone="#f59e0b"/>
        <CvKpi label="Media por veiculo" value={cvBRL(s.custoMedioVeiculo)} sub={`${s.totalVeiculos || 0} veiculos/centros`} icon="truck" tone="#3b82f6"/>
        <CvKpi label="Maior custo" value={s.veiculoMaiorCusto || "-"} sub={cvBRL(s.maiorCustoValor)} icon="alert" tone="#a855f7"/>
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
          <div><h2>Detalhamento dos lancamentos</h2><div className="muted" style={{ fontSize: 12 }}>Origem: financeiro.pagar, rateios e abastecimentos operacionais nao duplicados</div></div>
          <div className="muted" style={{ fontSize: 12 }}>Validacao: base filtrada {cvBRL(data.validation.baseFiltrada)}</div>
        </div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Data</th><th>Placa/Centro</th><th>Centro de custo</th><th>Tipo</th><th>Fornecedor</th><th>Descricao</th><th className="num">Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Origem</th>
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
              {!data.launches.length && <tr><td colSpan="11" className="muted">Nenhum lancamento encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <CvDetailModal placa={detailPlate} filters={filters} onClose={() => setDetailPlate("")}/>
    </div>
  );
};

window.CustosVeiculos = CustosVeiculos;

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
  { key: "month", label: "Este mes", range: () => ({ start: dreEmpMonthStartISO(), end: dreEmpTodayISO() }) },
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

const DreEmpKpi = ({ label, value, icon, tone, sub, percent }) => (
  <div className="kpi" style={{borderLeft: `3px solid ${tone || "var(--border-strong)"}`}}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{percent ? dreEmpPct(value) : dreEmpBRL(value)}</div>
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
    : DRE_EMP_PERIODS.find((item) => item.key === periodo)?.label || "Este mes";
  const s = data.summary || {};
  const maxMonthly = Math.max(1, ...data.monthly.map((m) => Math.max(dreEmpNum(m.receita), dreEmpNum(m.custo))));
  const maxExpense = Math.max(1, ...data.accounts.map((a) => dreEmpNum(a.custo)));
  const maxPlate = Math.max(1, ...data.plates.map((p) => dreEmpNum(p.custo)));
  const maxCategory = Math.max(1, ...data.categories.map((c) => dreEmpNum(c.custo)));
  const topCost = data.accounts.filter((a) => dreEmpNum(a.custo) > 0)[0];
  const tableRows = data.rows.slice(0, 160);
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
          <div className="sub">Receita CT-e, impostos e custos financeiros por data de lan\u00e7amento - {periodLabel}</div>
        </div>
        <div className="actions">
          {DRE_EMP_PERIODS.map((p) => (
            <button key={p.key} className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`} onClick={() => selectShortcut(p.key)}>{p.label}</button>
          ))}
          <button className="btn" onClick={() => dreEmpExport(data, periodLabel)}><Icon name="download"/> Exportar</button>
        </div>
      </div>

      <div className="period-filter" style={{alignItems: "end", flexWrap: "wrap"}}>
        <label>Lançamento inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Lançamento final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></label>
        <label>Mês/Ano<input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)}/></label>
        <label>Centro<RBCombobox value={centro} onChange={setCentro} options={data.centers} placeholder="Código ou nome" getLabel={(c) => `${c.centroCodigo || ""} ${c.centroCusto || "Sem centro"}`.trim()} getValue={(c) => c.centroCodigo || c.centroCusto || ""} tag={() => "Centro"}/></label>
        <label>Conta<RBCombobox value={conta} onChange={setConta} options={data.accounts} placeholder="Código ou nome" getLabel={(c) => `${c.contaCodigo || ""} ${c.contaNome || "Sem conta"}`.trim()} getValue={(c) => c.contaCodigo || c.contaNome || ""} tag={() => "Conta"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.plates} placeholder="AAA0A00" getLabel={(p) => p.placa} getValue={(p) => p.placa} transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={pessoas} placeholder="Nome ou código" getLabel={(p) => `${p.codigo || ""} ${p.nome}`.trim()} getValue={(p) => p.codigo || p.nome || ""} tag={() => "Cliente"}/></label>
        <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="todos">Todos</option><option value="administrativo">Administrativo</option><option value="frota">Frota</option></select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="pago">Pago</option><option value="aberto">Aberto</option><option value="vencido">Vencido</option><option value="recebido">Recebido</option><option value="pendente">Pendente</option></select></label>
        <label style={{minWidth: 190}}>Busca<input type="text" value={search} placeholder="Conta, centro, placa..." onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyFilter(); }}/></label>
        <button className="btn primary" onClick={applyFilter}>Aplicar</button>
        <button className="btn" onClick={clearFilter}>Limpar</button>
        <span className="muted" style={{marginLeft: "auto", fontSize: 11.5}}>Base: data de lan\u00e7amento</span>
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
        <DreEmpKpi label="Custos Frota" value={s.custosFrota} icon="truck" tone="#f59e0b"/>
        <DreEmpKpi label="Desp. Administrativas" value={s.despesasAdministrativas} icon="file" tone="#a78bfa"/>
        <DreEmpKpi label="Margem de Lucro" value={s.margemLucro} icon="gauge" tone={dreEmpNum(s.margemLucro) >= 0 ? "#22c55e" : "#f87171"} percent/>
      </div>

      <div className="grid cols-4" style={{marginBottom: 16}}>
        <DreEmpKpi label="Desp. Pessoal" value={s.despesasPessoal} icon="user" tone="#60a5fa"/>
        <DreEmpKpi label="Desp. Financeiras" value={s.despesasFinanceiras} icon="money" tone="#fb7185"/>
        <DreEmpKpi label="Desp. Operacionais" value={s.despesasOperacionais} icon="wrench" tone="#fbbf24"/>
        <DreEmpKpi label="Maior peso" value={topCost?.custo || 0} icon="alert" tone="#f87171" sub={topCost?.contaNome || "Sem dados"}/>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header"><h3>Estrutura da DRE</h3><span className="meta muted">gerencial</span></div>
          <div className="card-body">
            {data.structure.map((row) => (
              <div key={row.label} style={{display: "flex", justifyContent: "space-between", padding: row.kind === "result" || row.kind === "final" ? "10px 0" : "7px 0", borderTop: row.kind === "result" || row.kind === "final" ? "1px solid var(--divider)" : "0", fontSize: 13}}>
                <span style={{fontWeight: row.kind === "result" || row.kind === "final" ? 700 : 500, color: row.kind === "final" ? "var(--text)" : "var(--text-2)"}}>{row.label}</span>
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
          <div className="card-header"><h3>Custos por placa</h3><span className="meta muted">frota</span></div>
          <div className="card-body">
            {data.plates.slice(0, 10).map((p) => (
              <DreEmpBar key={p.placa} label={p.placa || "Sem placa"} value={p.custo} total={maxPlate} tone="#60a5fa" meta={`Receita ${dreEmpBRL(p.receita)} - lucro ${dreEmpBRL(p.receita - p.custo)}`}/>
            ))}
          </div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Distribuicao por categoria</h3><span className="meta muted">{data.categories.length} grupos</span></div>
          <div className="card-body">
            {data.categories.filter((c) => c.custo > 0 || c.receita > 0).map((c) => (
              <DreEmpBar key={c.categoriaDre} label={c.categoriaDre} value={c.custo || c.receita} total={maxCategory} tone={c.receita > 0 ? "#38bdf8" : "#a78bfa"} meta={`${c.lancamentos} lançamentos`}/>
            ))}
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
    </div>
  );
};

window.DreEmpresarial = DreEmpresarial;

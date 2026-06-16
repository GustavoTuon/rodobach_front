// Demonstrativo financeiro por centro de custo e conta financeira.

function dreTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function dreMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

function dreDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

const DRE_PERIODS = [
  { key: "7d", label: "7 dias", range: () => ({ start: dreDaysAgoISO(6), end: dreTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: dreDaysAgoISO(29), end: dreTodayISO() }) },
  { key: "month", label: "Este mes", range: () => ({ start: dreMonthStartISO(), end: dreTodayISO() }) },
];

const DRE_EMPTY = {
  period: { key: "month", startDate: "", endDate: "" },
  summary: { receita: 0, custos: 0, lucro: 0, margem: 0, lancamentos: 0 },
  monthly: [],
  groups: [],
  centers: [],
  accounts: [],
  rows: [],
  sources: [],
};

function dreNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dreBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dreNum(value));
}

function drePct(value) {
  return `${dreNum(value).toFixed(1)}%`;
}

function dreDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function dreCompact(value) {
  const n = Math.abs(dreNum(value));
  const sign = dreNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function dreNormalize(data) {
  const base = data && typeof data === "object" ? data : {};
  return {
    ...DRE_EMPTY,
    ...base,
    period: { ...DRE_EMPTY.period, ...(base.period || {}) },
    summary: { ...DRE_EMPTY.summary, ...(base.summary || {}) },
    monthly: Array.isArray(base.monthly) ? base.monthly : [],
    groups: Array.isArray(base.groups) ? base.groups : [],
    centers: Array.isArray(base.centers) ? base.centers : [],
    accounts: Array.isArray(base.accounts) ? base.accounts : [],
    rows: Array.isArray(base.rows) ? base.rows : [],
    sources: Array.isArray(base.sources) ? base.sources : [],
  };
}

function dreExportCsv(data, periodLabel) {
  const header = ["Mes", "Grupo", "Centro", "Conta", "Receita", "Custo", "Valor", "Lancamentos"];
  const lines = (data.rows || []).map((row) => [
    row.mes || "",
    row.grupo || "",
    row.centroNome || "",
    row.contaNome || "",
    dreNum(row.receita),
    dreNum(row.custo),
    dreNum(row.valor),
    dreNum(row.lancamentos),
  ]);
  const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `demonstrativo-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DreProgressRow = ({ label, value, total, tone = "var(--brand-blue)", meta }) => {
  const pct = total > 0 ? Math.min(100, Math.abs(dreNum(value)) / total * 100) : 0;
  return (
    <div style={{marginBottom: 12}}>
      <div style={{display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", marginBottom: 5}}>
        <span style={{fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}} title={label}>{label}</span>
        <span style={{fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)"}}>{dreBRL(value)}</span>
      </div>
      <div style={{height: 5, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden"}}>
        <div style={{width: `${pct.toFixed(1)}%`, height: "100%", background: tone, borderRadius: 4}}/>
      </div>
      {meta && <div className="muted" style={{fontSize: 11, marginTop: 3}}>{meta}</div>}
    </div>
  );
};

const DemonstrativoFinanceiro = () => {
  const defaultRange = DRE_PERIODS[2].range();
  const [periodo, setPeriodo] = React.useState("month");
  const [dataInicio, setDataInicio] = React.useState(defaultRange.start);
  const [dataFim, setDataFim] = React.useState(defaultRange.end);
  const [manualFilter, setManualFilter] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [data, setData] = React.useState(() => dreNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("contas");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const filters = manualFilter
      ? { dataInicio: manualFilter.dataInicio, dataFim: manualFilter.dataFim, search: appliedSearch }
      : { period: periodo, search: appliedSearch };

    window.RB_API.getDemonstrativoFinanceiro(filters)
      .then((payload) => { if (active) setData(dreNormalize(payload)); })
      .catch((err) => {
        if (!active) return;
        setData(dreNormalize(null));
        setError(err?.message || "Nao foi possivel carregar o demonstrativo.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [periodo, manualFilter, appliedSearch]);

  const summary = data.summary;
  const periodLabel = manualFilter
    ? `${dreDate(manualFilter.dataInicio)} a ${dreDate(manualFilter.dataFim)}`
    : DRE_PERIODS.find((p) => p.key === periodo)?.label || "Este mes";
  const margemDir = dreNum(summary.margem) >= 0 ? "up" : "down";
  const maxMonthly = Math.max(1, ...data.monthly.map((m) => Math.max(dreNum(m.receita), dreNum(m.custo))));
  const groupTotal = Math.max(1, ...data.groups.map((g) => Math.abs(dreNum(g.valor))));
  const centerTotal = Math.max(1, ...data.centers.map((c) => Math.abs(dreNum(c.valor))));
  const accountTotal = Math.max(1, ...data.accounts.map((a) => Math.abs(dreNum(a.valor))));
  const tableRows = data.rows.slice().sort((a, b) => Math.abs(dreNum(b.valor)) - Math.abs(dreNum(a.valor))).slice(0, 80);

  const selectShortcut = (key) => {
    const period = DRE_PERIODS.find((item) => item.key === key);
    if (period) {
      const range = period.range();
      setDataInicio(range.start);
      setDataFim(range.end);
    }
    setManualFilter(null);
    setPeriodo(key);
  };

  const applyFilter = () => {
    setPeriodo("custom");
    setManualFilter({ dataInicio, dataFim });
    setAppliedSearch(search.trim());
  };

  const clearFilter = () => {
    const range = DRE_PERIODS[2].range();
    setDataInicio(range.start);
    setDataFim(range.end);
    setSearch("");
    setAppliedSearch("");
    setManualFilter(null);
    setPeriodo("month");
  };

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Demonstrativo financeiro</h1>
          <div className="sub">Centro de custo / Conta financeira por data de lan\u00e7amento - {periodLabel}</div>
        </div>
        <div className="actions">
          {DRE_PERIODS.map((p) => (
            <button key={p.key} className={`btn${!manualFilter && periodo === p.key ? " primary" : ""}`} onClick={() => selectShortcut(p.key)}>
              {p.label}
            </button>
          ))}
          <button className="btn" onClick={() => dreExportCsv(data, periodLabel)}><Icon name="download"/> Exportar</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Lan\u00e7amento inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Lan\u00e7amento final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></label>
        <label style={{minWidth: 220}}>Busca<input type="text" value={search} placeholder="Centro ou conta" onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyFilter(); }}/></label>
        <button className="btn primary" onClick={applyFilter}>Aplicar</button>
        <button className="btn" onClick={clearFilter}>Limpar</button>
        <span className="muted" style={{marginLeft: "auto", fontSize: 11.5}}>Base: data de lan\u00e7amento - rateios e movimentos financeiros</span>
      </div>

      {(loading || error) && (
        <div className="card" style={{marginBottom: 16, padding: "9px 14px", borderColor: error ? "var(--crit-border)" : "var(--border)"}}>
          <span className={error ? "kpi-delta down" : "muted"} style={{fontSize: 12.5}}>
            {loading ? "Carregando demonstrativo..." : error}
          </span>
        </div>
      )}

      <div className="grid cols-4" style={{marginBottom: 16}}>
        <div className="kpi" style={{borderLeft: "3px solid #38bdf8"}}>
          <div className="kpi-label"><Icon name="trending-up"/><span>Faturamento</span></div>
          <div className="kpi-value">{dreBRL(summary.receita)}</div>
          <span className="kpi-delta up">{dreNum(summary.lancamentos)} linhas rateadas</span>
        </div>
        <div className="kpi" style={{borderLeft: "3px solid #f59e0b"}}>
          <div className="kpi-label"><Icon name="money"/><span>Custos</span></div>
          <div className="kpi-value">{dreBRL(summary.custos)}</div>
          <span className="kpi-delta flat">{data.accounts.length} contas</span>
        </div>
        <div className="kpi" style={{borderLeft: `3px solid ${dreNum(summary.lucro) >= 0 ? "#22c55e" : "#f87171"}`}}>
          <div className="kpi-label"><Icon name="chart"/><span>Lucro</span></div>
          <div className="kpi-value">{dreBRL(summary.lucro)}</div>
          <span className={`kpi-delta ${margemDir}`}>{drePct(summary.margem)} de margem</span>
        </div>
        <div className="kpi" style={{borderLeft: "3px solid var(--border-strong)"}}>
          <div className="kpi-label"><Icon name="filter"/><span>Centros</span></div>
          <div className="kpi-value">{data.centers.length}</div>
          <span className="kpi-delta flat">Empresa {data.empresa || 2}</span>
        </div>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Evolucao mensal</h3>
            <span className="meta muted">receita x custos</span>
          </div>
          <div className="card-body">
            {data.monthly.length === 0 ? (
              <div className="muted" style={{fontSize: 12.5}}>Sem dados no periodo</div>
            ) : (
              <div style={{height: 230, display: "flex", alignItems: "flex-end", gap: 12, paddingTop: 10}}>
                {data.monthly.map((month) => {
                  const receitaH = Math.max(4, dreNum(month.receita) / maxMonthly * 170);
                  const custoH = Math.max(4, dreNum(month.custo) / maxMonthly * 170);
                  return (
                    <div key={month.mes} style={{flex: 1, minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6}}>
                      <div style={{fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--text-3)"}}>{dreCompact(month.valor)}</div>
                      <div style={{height: 178, display: "flex", alignItems: "flex-end", gap: 4}}>
                        <div title={`Receita ${dreBRL(month.receita)}`} style={{width: 13, height: receitaH, background: "#38bdf8", borderRadius: 4}}/>
                        <div title={`Custos ${dreBRL(month.custo)}`} style={{width: 13, height: custoH, background: "#f59e0b", borderRadius: 4}}/>
                      </div>
                      <span style={{fontSize: 11, color: "var(--text-3)"}}>{month.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-header">
            <h3>Grupos do demonstrativo</h3>
            <span className="meta muted">{data.groups.length} grupos</span>
          </div>
          <div className="card-body">
            {data.groups.slice(0, 10).map((group) => (
              <DreProgressRow
                key={group.grupo}
                label={group.grupo}
                value={group.valor}
                total={groupTotal}
                tone={dreNum(group.valor) >= 0 ? "#38bdf8" : "#f59e0b"}
                meta={`${group.lancamentos} lancamentos`}
              />
            ))}
            {data.groups.length === 0 && <div className="muted" style={{fontSize: 12.5}}>Sem grupos no periodo</div>}
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Centros de custo</h3>
            <span className="meta muted">maior resultado</span>
          </div>
          <div className="card-body">
            {data.centers.slice(0, 12).map((center) => (
              <DreProgressRow
                key={center.centroCodigo}
                label={`${center.centroMascara || ""} ${center.centroNome || "Sem centro"}`.trim()}
                value={center.valor}
                total={centerTotal}
                tone={dreNum(center.valor) >= 0 ? "#22c55e" : "#f87171"}
                meta={`Receita ${dreBRL(center.receita)} - custo ${dreBRL(center.custo)}`}
              />
            ))}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-header">
            <h3>Contas financeiras</h3>
            <Tabs tabs={[{ id: "contas", label: "Contas" }, { id: "fontes", label: "Fontes" }]} active={activeTab} onChange={setActiveTab}/>
          </div>
          <div className="card-body">
            {activeTab === "contas" ? (
              data.accounts.slice(0, 12).map((account) => (
                <DreProgressRow
                  key={`${account.contaCodigo}-${account.grupo}`}
                  label={`${account.contaMascara || ""} ${account.contaNome || "Sem conta"}`.trim()}
                  value={account.valor}
                  total={accountTotal}
                  tone={dreNum(account.valor) >= 0 ? "#38bdf8" : "#f59e0b"}
                  meta={account.grupo}
                />
              ))
            ) : (
              <div style={{display: "grid", gap: 8}}>
                {data.sources.map((source) => (
                  <div key={source} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 12.5}}>
                    <span className="dot info"/>
                    <span style={{fontFamily: "var(--font-mono)"}}>{source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Detalhamento por centro e conta</h3>
          <span className="meta muted">{tableRows.length} linhas exibidas</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Grupo</th>
              <th>Centro de custo</th>
              <th>Conta financeira</th>
              <th className="num">Receita</th>
              <th className="num">Custo</th>
              <th className="num">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && (
              <tr><td colSpan="7" className="muted" style={{padding: 20, textAlign: "center", fontSize: 12.5}}>Nenhum registro encontrado.</td></tr>
            )}
            {tableRows.map((row, index) => (
              <tr key={`${row.mes}-${row.centroCodigo}-${row.contaCodigo}-${index}`}>
                <td>{row.labelMes}</td>
                <td><span className={`badge ${row.receita > 0 ? "ok" : "warn"}`}><span className="dot"/>{row.grupo}</span></td>
                <td style={{maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.centroMascara ? `${row.centroMascara} - ` : ""}{row.centroNome}</td>
                <td style={{maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.contaMascara ? `${row.contaMascara} - ` : ""}{row.contaNome}</td>
                <td className="num">{row.receita ? dreBRL(row.receita) : "-"}</td>
                <td className="num">{row.custo ? dreBRL(row.custo) : "-"}</td>
                <td className="num" style={{color: dreNum(row.valor) >= 0 ? "var(--ok)" : "var(--crit)"}}>{dreBRL(row.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.DemonstrativoFinanceiro = DemonstrativoFinanceiro;

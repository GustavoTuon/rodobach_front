function fdTodayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fdDaysAgoISO(days) {
  return fdAddDaysISO(fdTodayISO(), -days);
}

function fdAddDaysISO(base, days) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fdMonthStartISO(base = fdTodayISO()) {
  return `${String(base).slice(0, 7)}-01`;
}

function fdPresetRange(key) {
  const today = fdTodayISO();
  if (key === "hoje") return { start: today, end: today };
  if (key === "ontem") {
    const y = fdAddDaysISO(today, -1);
    return { start: y, end: y };
  }
  if (key === "7d") return { start: fdAddDaysISO(today, -6), end: today };
  if (key === "mes-atual") return { start: fdMonthStartISO(today), end: today };
  if (key === "mes-anterior") {
    const firstCurrent = fdMonthStartISO(today);
    const end = fdAddDaysISO(firstCurrent, -1);
    return { start: fdMonthStartISO(end), end };
  }
  return { start: fdAddDaysISO(today, -29), end: today };
}

function fdNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fdBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fdNum(value));
}

function fdShortBRL(value) {
  const n = Math.abs(fdNum(value));
  const sign = fdNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function fdPct(value) {
  return value === null || value === undefined ? "-" : `${fdNum(value).toFixed(1)}%`;
}

function fdSignedPct(value) {
  if (value === null || value === undefined) return "-";
  const n = fdNum(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fdDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function fdDayMonth(value) {
  if (!value) return "-";
  const [, m, d] = String(value).slice(0, 10).split("-");
  return m && d ? `${d}/${m}` : "-";
}

function fdNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    resumo: base.resumo || {},
    dias: Array.isArray(base.dias) ? base.dias : [],
    comparativoAnoAnterior: base.comparativoAnoAnterior || { periodo: {}, resumo: {}, variacao: {}, dias: [] },
    filtros: base.filtros || { clientes: [], placas: [] },
  };
}

const FD_PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "mes-atual", label: "Mes atual" },
  { key: "mes-anterior", label: "Mes anterior" },
];

const FdKpi = ({ label, value, sub, icon, tone }) => (
  <div className="kpi" style={{ borderLeft: `3px solid ${tone || "var(--border-strong)"}` }}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <span className="kpi-delta flat">{sub}</span>}
  </div>
);

const FD_METRICS = {
  faturamento: { label: "Faturamento", field: "faturamento", tone: "#22c55e" },
  lucro: { label: "Lucro diario", field: "lucro", tone: "#38bdf8" },
};

const FdChart = ({ rows, metric = "faturamento" }) => {
  if (!rows.length) return <div className="muted">Sem dados diarios no periodo.</div>;
  const config = FD_METRICS[metric] || FD_METRICS.faturamento;
  const max = Math.max(1, ...rows.map((r) => Math.abs(fdNum(r[config.field]))));
  return (
    <div className="fd-chart">
      {rows.map((row) => {
        const value = fdNum(row[config.field]);
        const h = Math.max(4, Math.abs(value) / max * 100);
        const color = metric === "lucro"
          ? (value >= 0 ? "#22c55e" : "#ef4444")
          : config.tone;
        return (
          <div key={row.data} className="fd-day" title={`${fdDayMonth(row.data)} - ${config.label}: ${fdBRL(value)}`}>
            <strong className="fd-value" style={{ color }}>{fdShortBRL(value)}</strong>
            <div className="fd-col"><i style={{ height: `${h}%`, background: color }}/></div>
            <span>{fdDayMonth(row.data)}</span>
          </div>
        );
      })}
    </div>
  );
};

const FaturamentoDiario = () => {
  const [periodo, setPeriodo] = React.useState("30d");
  const [dataInicial, setDataInicial] = React.useState(fdDaysAgoISO(29));
  const [dataFinal, setDataFinal] = React.useState(fdTodayISO());
  const [cliente, setCliente] = React.useState("");
  const [placa, setPlaca] = React.useState("");
  const [tipoVeiculo, setTipoVeiculo] = React.useState("todos");
  const [filters, setFilters] = React.useState({ periodo: "30d", tipoVeiculo: "todos" });
  const [data, setData] = React.useState(() => fdNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [metric, setMetric] = React.useState("faturamento");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getFaturamentoDiario(filters)
      .then((payload) => { if (active) setData(fdNormalize(payload)); })
      .catch((err) => { if (active) { setData(fdNormalize(null)); setError(err?.message || "Nao foi possivel carregar faturamento diario."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyPreset = (key) => {
    const range = fdPresetRange(key);
    setPeriodo(key);
    setDataInicial(range.start);
    setDataFinal(range.end);
    setFilters({ periodo: key, cliente, placa, tipoVeiculo });
  };

  const applyCustom = () => {
    setPeriodo("custom");
    setFilters({ dataInicial, dataFinal, cliente, placa, tipoVeiculo });
  };

  const applyTipoVeiculo = (next) => {
    setTipoVeiculo(next);
    if (periodo === "custom") setFilters({ dataInicial, dataFinal, cliente, placa, tipoVeiculo: next });
    else setFilters({ periodo, cliente, placa, tipoVeiculo: next });
  };

  const rows = React.useMemo(() => {
    let list = data.dias;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row) => [row.data, row.faturamento, row.documentos, row.clientes].join(" ").toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
  }, [data.dias, search]);

  const exportCsv = () => {
    const compMap = new Map((data.comparativoAnoAnterior?.dias || []).map((row) => [row.data, row]));
    const header = ["Data","Faturamento","Faturamento Ano Anterior","Variacao Ano Anterior %","Custo","Lucro","Margem","Documentos","Documentos Ano Anterior","Viagens","Clientes","Ticket medio"];
    const body = rows.map((r) => {
      const comp = compMap.get(r.data) || {};
      return [r.data, r.faturamento, comp.faturamentoAnoAnterior, comp.variacaoFaturamento, r.custo, r.lucro, r.margem, r.documentos, comp.documentosAnoAnterior, r.viagens, r.clientes, r.ticketMedio]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";");
    });
    const blob = new Blob([[header.join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento-diario-${data.periodo?.startDate || dataInicial}-${data.periodo?.endDate || dataFinal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resumo = data.resumo || {};
  const comparativo = data.comparativoAnoAnterior || {};
  const compResumo = comparativo.resumo || {};
  const compVariacao = comparativo.variacao || {};
  const compDias = React.useMemo(() => new Map((comparativo.dias || []).map((row) => [row.data, row])), [comparativo.dias]);

  return (
    <div className="view">
      <style>{`
        .fd-chart{height:230px;display:grid;grid-template-columns:repeat(auto-fit,minmax(26px,1fr));gap:6px;align-items:end}
        .fd-day{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;min-width:0}
        .fd-value{font-family:var(--font-mono);font-size:10px;line-height:1;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
        .fd-col{height:174px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:var(--surface-2);border-radius:4px;overflow:hidden}
        .fd-col i{width:100%;min-height:4px;border-radius:4px 4px 0 0}
        .fd-day span{font-size:10px;color:var(--text-3);white-space:nowrap}
        .fd-segment{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        @media (max-width:760px){.fd-chart{grid-template-columns:repeat(14,minmax(24px,1fr));overflow-x:auto}}
      `}</style>

      <div className="page-head">
        <div>
          <h1>Faturamento Diario</h1>
          <div className="sub">Evolucao diaria da receita financeira e dos custos de viagens vinculadas</div>
        </div>
        <div className="actions">
          {FD_PERIODS.map((p) => <button key={p.key} className={`btn ${periodo === p.key ? "primary" : ""}`} onClick={() => applyPreset(p.key)}>{p.label}</button>)}
          <button className="btn" onClick={exportCsv}><Icon name="download"/> CSV</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Data inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={data.filtros?.clientes || []} placeholder="Cliente pagador" tag={() => "Cliente"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.filtros?.placas || []} placeholder="Placa" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Operacao
          <div className="fd-segment">
            <button type="button" className={`btn sm ${tipoVeiculo === "todos" ? "primary" : ""}`} onClick={() => applyTipoVeiculo("todos")}>Todos</button>
            <button type="button" className={`btn sm ${tipoVeiculo === "frota" ? "primary" : ""}`} onClick={() => applyTipoVeiculo("frota")}>Frota</button>
            <button type="button" className={`btn sm ${tipoVeiculo === "terceiro" ? "primary" : ""}`} onClick={() => applyTipoVeiculo("terceiro")}>Terceiro</button>
          </div>
        </label>
        <button className="btn primary" onClick={applyCustom}>Aplicar periodo</button>
      </div>

      {(loading || error) && <div className="card" style={{ marginBottom: 16, padding: "9px 14px" }}><span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando faturamento diario..." : error}</span></div>}

      {fdNum(resumo.receitaSemCustoApurado) > 0 && <div className="card" style={{ marginBottom: 16, padding: "9px 14px", borderColor: "#facc15" }}>
        <span className="muted"><strong style={{ color: "#facc15" }}>Custos pendentes:</strong> {fdBRL(resumo.receitaSemCustoApurado)} do faturamento ({resumo.documentosSemCustoApurado || 0} documentos) nao possui viagem vinculada. Essa receita entra no total, mas ainda nao tem custo operacional apurado.</span>
      </div>}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <FdKpi label="Hoje" value={fdBRL(resumo.faturamentoHoje)} sub={`Ontem: ${fdBRL(resumo.faturamentoOntem)} (${fdPct(resumo.variacaoOntem)})`} tone="#38bdf8" icon="money"/>
        <FdKpi label="Media 7 dias" value={fdBRL(resumo.media7)} sub={`Hoje x media: ${fdPct(resumo.variacaoMedia7)}`} tone="#a78bfa" icon="chart"/>
        <FdKpi label="Media 30 dias" value={fdBRL(resumo.media30)} sub={`Hoje x media: ${fdPct(resumo.variacaoMedia30)}`} tone="#facc15" icon="gauge"/>
        <FdKpi label="Total periodo" value={fdBRL(resumo.faturamentoTotal)} sub={`${resumo.documentos || 0} documentos`} tone="#22c55e" icon="trending-up"/>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <FdKpi label="Resultado parcial" value={fdBRL(resumo.lucroTotal)} sub={`Margem parcial ${fdPct(resumo.margem)}`} tone={fdNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <FdKpi label="Custo estimado" value={fdBRL(resumo.custoTotal)} sub="custos vinculados e rateados" tone="#f97316" icon="money"/>
        <FdKpi label="Ticket medio" value={fdBRL(resumo.ticketMedio)} sub="faturamento / documentos" tone="var(--border-strong)" icon="gauge"/>
        <FdKpi label="Viagens" value={resumo.viagens || 0} sub={`${resumo.clientesAtendidos || 0} clientes no maior dia`} tone="#38bdf8" icon="route"/>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <FdKpi label="Fat. ano anterior" value={fdBRL(compResumo.faturamentoTotal)} sub={`Atual x AA: ${fdSignedPct(compVariacao.faturamento)}`} tone={fdNum(compVariacao.faturamento) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <FdKpi label="Docs ano anterior" value={compResumo.documentos || 0} sub={`Atual x AA: ${fdSignedPct(compVariacao.documentos)}`} tone={fdNum(compVariacao.documentos) >= 0 ? "#38bdf8" : "#f97316"} icon="file"/>
        <FdKpi label="Lucro ano anterior" value={fdBRL(compResumo.lucroTotal)} sub={`Atual x AA: ${fdSignedPct(compVariacao.lucro)}`} tone={fdNum(compVariacao.lucro) >= 0 ? "#22c55e" : "#ef4444"} icon="trending-up"/>
        <FdKpi label="Ticket ano anterior" value={fdBRL(compResumo.ticketMedio)} sub={`Atual x AA: ${fdSignedPct(compVariacao.ticketMedio)}`} tone="#a78bfa" icon="gauge"/>
      </div>

      <div className="card card-flush" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>{metric === "lucro" ? "Lucro diario" : "Faturamento diario"}</h3>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn sm ${metric === "faturamento" ? "primary" : ""}`} onClick={() => setMetric("faturamento")}>Faturamento</button>
            <button className={`btn sm ${metric === "lucro" ? "primary" : ""}`} onClick={() => setMetric("lucro")}>Lucro diario</button>
            <span className="meta muted">{data.periodo?.startDate} a {data.periodo?.endDate}</span>
          </div>
        </div>
        <div className="card-body"><FdChart rows={[...data.dias].sort((a, b) => String(a.data).localeCompare(String(b.data)))} metric={metric}/></div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Dias</h3>
          <div className="row" style={{ gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ minWidth: 180 }}/>
            <span className="meta muted">{rows.length} dias</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead>
              <tr>
                <th>Data</th><th className="num">Faturamento</th><th className="num">Fat. AA</th><th className="num">Var. AA</th><th className="num">Custo</th><th className="num">Lucro</th><th className="num">Margem</th><th className="num">Docs</th><th className="num">Docs AA</th><th className="num">Viagens</th><th className="num">Clientes</th><th className="num">Ticket medio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const comp = compDias.get(row.data) || {};
                return (
                  <tr key={row.data}>
                    <td>{fdDate(row.data)}</td>
                    <td className="num">{fdBRL(row.faturamento)}</td>
                    <td className="num">{fdBRL(comp.faturamentoAnoAnterior)}</td>
                    <td className="num" style={{ color: fdNum(comp.variacaoFaturamento) >= 0 ? "#22c55e" : "#ef4444" }}>{fdSignedPct(comp.variacaoFaturamento)}</td>
                    <td className="num">{fdBRL(row.custo)}</td>
                    <td className="num" style={{ color: fdNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{fdBRL(row.lucro)}</td>
                    <td className="num">{fdPct(row.margem)}</td>
                    <td className="num">{row.documentos}</td>
                    <td className="num">{comp.documentosAnoAnterior || 0}</td>
                    <td className="num">{row.viagens}</td>
                    <td className="num">{row.clientes}</td>
                    <td className="num">{fdBRL(row.ticketMedio)}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan="12" className="muted">Nenhum faturamento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.FaturamentoDiario = FaturamentoDiario;

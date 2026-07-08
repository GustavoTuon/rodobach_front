function fdTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function fdDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function fdNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fdBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fdNum(value));
}

function fdPct(value) {
  return value === null || value === undefined ? "-" : `${fdNum(value).toFixed(1)}%`;
}

function fdDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function fdNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    resumo: base.resumo || {},
    dias: Array.isArray(base.dias) ? base.dias : [],
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

const FdChart = ({ rows }) => {
  if (!rows.length) return <div className="muted">Sem dados diarios no periodo.</div>;
  const max = Math.max(1, ...rows.map((r) => Math.max(fdNum(r.faturamento), fdNum(r.custo), Math.abs(fdNum(r.lucro)))));
  return (
    <div className="fd-chart">
      {rows.map((row) => {
        const h = Math.max(4, fdNum(row.faturamento) / max * 100);
        const lucroColor = fdNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444";
        return (
          <div key={row.data} className="fd-day" title={`${fdDate(row.data)} - ${fdBRL(row.faturamento)}`}>
            <div className="fd-col"><i style={{ height: `${h}%`, background: lucroColor }}/></div>
            <span>{String(row.data).slice(5)}</span>
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
    setPeriodo(key);
    setFilters({ periodo: key, cliente, placa, tipoVeiculo });
  };

  const applyCustom = () => {
    setPeriodo("custom");
    setFilters({ dataInicial, dataFinal, cliente, placa, tipoVeiculo });
  };

  const rows = React.useMemo(() => {
    let list = data.dias;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((row) => [row.data, row.faturamento, row.documentos, row.clientes].join(" ").toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
  }, [data.dias, search]);

  const exportCsv = () => {
    const header = ["Data","Faturamento","Custo","Lucro","Margem","Documentos","Viagens","Clientes","Ticket medio"];
    const body = rows.map((r) => [r.data, r.faturamento, r.custo, r.lucro, r.margem, r.documentos, r.viagens, r.clientes, r.ticketMedio]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob([[header.join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento-diario-${data.periodo?.startDate || dataInicial}-${data.periodo?.endDate || dataFinal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resumo = data.resumo || {};

  return (
    <div className="view">
      <style>{`
        .fd-chart{height:230px;display:grid;grid-template-columns:repeat(auto-fit,minmax(26px,1fr));gap:6px;align-items:end}
        .fd-day{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;min-width:0}
        .fd-col{height:190px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:var(--surface-2);border-radius:4px;overflow:hidden}
        .fd-col i{width:100%;min-height:4px;border-radius:4px 4px 0 0}
        .fd-day span{font-size:10px;color:var(--text-3);white-space:nowrap}
        @media (max-width:760px){.fd-chart{grid-template-columns:repeat(14,minmax(24px,1fr));overflow-x:auto}}
      `}</style>

      <div className="page-head">
        <div>
          <h1>Faturamento Diario</h1>
          <div className="sub">Evolucao diaria de faturamento, ticket medio, lucro estimado e margem</div>
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
        <label>Tipo de veiculo<select value={tipoVeiculo} onChange={(e) => setTipoVeiculo(e.target.value)}><option value="todos">Todos</option><option value="frota">Frota</option><option value="terceiro">Terceiro</option></select></label>
        <button className="btn primary" onClick={applyCustom}>Aplicar periodo</button>
      </div>

      {(loading || error) && <div className="card" style={{ marginBottom: 16, padding: "9px 14px" }}><span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando faturamento diario..." : error}</span></div>}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <FdKpi label="Hoje" value={fdBRL(resumo.faturamentoHoje)} sub={`Ontem: ${fdBRL(resumo.faturamentoOntem)} (${fdPct(resumo.variacaoOntem)})`} tone="#38bdf8" icon="money"/>
        <FdKpi label="Media 7 dias" value={fdBRL(resumo.media7)} sub={`Hoje x media: ${fdPct(resumo.variacaoMedia7)}`} tone="#a78bfa" icon="chart"/>
        <FdKpi label="Media 30 dias" value={fdBRL(resumo.media30)} sub={`Hoje x media: ${fdPct(resumo.variacaoMedia30)}`} tone="#facc15" icon="gauge"/>
        <FdKpi label="Total periodo" value={fdBRL(resumo.faturamentoTotal)} sub={`${resumo.documentos || 0} documentos`} tone="#22c55e" icon="trending-up"/>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <FdKpi label="Lucro estimado" value={fdBRL(resumo.lucroTotal)} sub={`Margem ${fdPct(resumo.margem)}`} tone={fdNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <FdKpi label="Custo estimado" value={fdBRL(resumo.custoTotal)} sub="custos vinculados e rateados" tone="#f97316" icon="money"/>
        <FdKpi label="Ticket medio" value={fdBRL(resumo.ticketMedio)} sub="faturamento / documentos" tone="var(--border-strong)" icon="gauge"/>
        <FdKpi label="Viagens" value={resumo.viagens || 0} sub={`${resumo.clientesAtendidos || 0} clientes no maior dia`} tone="#38bdf8" icon="route"/>
      </div>

      <div className="card card-flush" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Evolucao diaria</h3><span className="meta muted">{data.periodo?.startDate} a {data.periodo?.endDate}</span></div>
        <div className="card-body"><FdChart rows={[...data.dias].sort((a, b) => String(a.data).localeCompare(String(b.data)))}/></div>
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
                <th>Data</th><th className="num">Faturamento</th><th className="num">Custo</th><th className="num">Lucro</th><th className="num">Margem</th><th className="num">Docs</th><th className="num">Viagens</th><th className="num">Clientes</th><th className="num">Ticket medio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.data}>
                  <td>{fdDate(row.data)}</td>
                  <td className="num">{fdBRL(row.faturamento)}</td>
                  <td className="num">{fdBRL(row.custo)}</td>
                  <td className="num" style={{ color: fdNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{fdBRL(row.lucro)}</td>
                  <td className="num">{fdPct(row.margem)}</td>
                  <td className="num">{row.documentos}</td>
                  <td className="num">{row.viagens}</td>
                  <td className="num">{row.clientes}</td>
                  <td className="num">{fdBRL(row.ticketMedio)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="9" className="muted">Nenhum faturamento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.FaturamentoDiario = FaturamentoDiario;

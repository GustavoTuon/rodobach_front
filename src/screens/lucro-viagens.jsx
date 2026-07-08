function lvTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function lvDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function lvNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function lvBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lvNum(value));
}

function lvPct(value) {
  return `${lvNum(value).toFixed(1)}%`;
}

function lvDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function lvNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    resumo: base.resumo || {},
    viagens: Array.isArray(base.viagens) ? base.viagens : [],
    filtros: base.filtros || { clientes: [], placas: [] },
    audit: base.audit || {},
  };
}

const LV_PERIODS = [
  { key: "7d", label: "7 dias", range: () => ({ start: lvDaysAgoISO(6), end: lvTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: lvDaysAgoISO(29), end: lvTodayISO() }) },
  { key: "month", label: "Mes atual", range: () => {
    const d = new Date();
    return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, end: lvTodayISO() };
  } },
];

const LvKpi = ({ label, value, sub, icon, tone }) => (
  <div className="kpi" style={{ borderLeft: `3px solid ${tone || "var(--border-strong)"}` }}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <span className="kpi-delta flat">{sub}</span>}
  </div>
);

const LvStatus = ({ status }) => {
  const ok = status !== "prejuizo";
  return <span className={`badge ${ok ? "ok" : "crit"}`}><span className="dot"/>{ok ? "Lucro" : "Prejuizo"}</span>;
};

const LucroViagens = () => {
  const initial = LV_PERIODS[1].range();
  const [dataInicial, setDataInicial] = React.useState(initial.start);
  const [dataFinal, setDataFinal] = React.useState(initial.end);
  const [cliente, setCliente] = React.useState("");
  const [placa, setPlaca] = React.useState("");
  const [tipoVeiculo, setTipoVeiculo] = React.useState("todos");
  const [status, setStatus] = React.useState("todos");
  const [filters, setFilters] = React.useState({ dataInicial: initial.start, dataFinal: initial.end, tipoVeiculo: "todos", status: "todos" });
  const [data, setData] = React.useState(() => lvNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sortCol, setSortCol] = React.useState("lucro");
  const [sortDir, setSortDir] = React.useState("desc");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getLucroViagens(filters)
      .then((payload) => { if (active) setData(lvNormalize(payload)); })
      .catch((err) => { if (active) { setData(lvNormalize(null)); setError(err?.message || "Nao foi possivel carregar lucro por viagem."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyFilters = () => setFilters({ dataInicial, dataFinal, cliente, placa, tipoVeiculo, status });
  const clearFilters = () => {
    const r = LV_PERIODS[1].range();
    setDataInicial(r.start); setDataFinal(r.end); setCliente(""); setPlaca(""); setTipoVeiculo("todos"); setStatus("todos");
    setFilters({ dataInicial: r.start, dataFinal: r.end, tipoVeiculo: "todos", status: "todos" });
  };
  const applyShortcut = (key) => {
    const p = LV_PERIODS.find((item) => item.key === key);
    if (!p) return;
    const r = p.range();
    setDataInicial(r.start); setDataFinal(r.end);
    setFilters({ dataInicial: r.start, dataFinal: r.end, cliente, placa, tipoVeiculo, status });
  };

  const rows = React.useMemo(() => {
    let list = data.viagens;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v) => [v.viagem, v.cliente, v.placa, v.motorista, v.origem, v.destino, v.tipoVeiculo].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (["data", "cliente", "placa", "tipoVeiculo", "status"].includes(sortCol)) return dir * String(a[sortCol] || "").localeCompare(String(b[sortCol] || ""));
      return dir * (lvNum(a[sortCol]) - lvNum(b[sortCol]));
    });
  }, [data.viagens, search, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };
  const SortArrow = ({ col }) => <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.35 }}>{sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>;

  const exportCsv = () => {
    const header = ["Viagem","Data","Cliente","Placa","Motorista","Tipo","CT-e","MDF-e","Fretes","Origem","Destino","Receita","Custo","Lucro","Margem","Status"];
    const body = rows.map((r) => [r.viagem || r.id, r.data, r.cliente, r.placa, r.motorista, r.tipoVeiculo, r.documentos, r.manifestos, r.fretes, r.origem, r.destino, r.receita, r.custo, r.lucro, r.margem, r.status]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob([[header.join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucro-viagens-${dataInicial}-${dataFinal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resumo = data.resumo || {};

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Lucro por Viagem</h1>
          <div className="sub">Receita, custos e margem por viagem ou CT-e sem viagem vinculada</div>
        </div>
        <div className="actions">
          {LV_PERIODS.map((p) => <button key={p.key} className="btn" onClick={() => applyShortcut(p.key)}>{p.label}</button>)}
          <button className="btn" onClick={exportCsv}><Icon name="download"/> CSV</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Data inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={data.filtros?.clientes || []} placeholder="Cliente pagador" tag={() => "Cliente"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.filtros?.placas || []} placeholder="Placa" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Tipo de veiculo<select value={tipoVeiculo} onChange={(e) => setTipoVeiculo(e.target.value)}><option value="todos">Todos</option><option value="frota">Frota</option><option value="terceiro">Terceiro</option></select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="lucro">Lucro</option><option value="prejuizo">Prejuizo</option></select></label>
        <button className="btn primary" onClick={applyFilters}>Aplicar</button>
        <button className="btn" onClick={clearFilters}>Limpar</button>
      </div>

      {(loading || error) && <div className="card" style={{ marginBottom: 16, padding: "9px 14px" }}><span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando lucro por viagem..." : error}</span></div>}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <LvKpi label="Faturamento total" value={lvBRL(resumo.faturamentoTotal)} sub={`${resumo.quantidadeViagens || 0} viagens`} tone="#38bdf8" icon="trending-up"/>
        <LvKpi label="Custo total" value={lvBRL(resumo.custoTotal)} sub="custos vinculados e rateados" tone="#f97316" icon="money"/>
        <LvKpi label="Lucro total" value={lvBRL(resumo.lucroTotal)} sub={`Margem ${lvPct(resumo.margemMedia)}`} tone={lvNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <LvKpi label="Viagens com lucro" value={resumo.quantidadeLucro || 0} sub={`${resumo.quantidadePrejuizo || 0} com prejuizo`} tone="#22c55e" icon="route"/>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Viagens</h3>
          <div className="row" style={{ gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar viagem, cliente, placa ou rota..." style={{ minWidth: 260 }}/>
            <span className="meta muted">{rows.length} registros</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead>
              <tr>
                <th onClick={() => toggleSort("data")}>Data <SortArrow col="data"/></th>
                <th>Viagem</th>
                <th onClick={() => toggleSort("cliente")}>Cliente <SortArrow col="cliente"/></th>
                <th onClick={() => toggleSort("placa")}>Placa <SortArrow col="placa"/></th>
                <th>Motorista</th>
                <th>Tipo</th>
                <th className="num">CT-e</th>
                <th className="num">MDF-e</th>
                <th className="num">Fretes</th>
                <th>Origem/Destino</th>
                <th className="num" onClick={() => toggleSort("receita")}>Receita <SortArrow col="receita"/></th>
                <th className="num" onClick={() => toggleSort("custo")}>Custo <SortArrow col="custo"/></th>
                <th className="num" onClick={() => toggleSort("lucro")}>Lucro <SortArrow col="lucro"/></th>
                <th className="num" onClick={() => toggleSort("margem")}>Margem <SortArrow col="margem"/></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{lvDate(row.data)}</td>
                  <td>{row.viagem || row.id}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.cliente}>{row.cliente}</td>
                  <td>{row.placa || "-"}</td>
                  <td>{row.motorista || "-"}</td>
                  <td>{row.tipoVeiculo}</td>
                  <td className="num">{row.documentos || 0}</td>
                  <td className="num">{row.manifestos || 0}</td>
                  <td className="num">{row.fretes || 0}</td>
                  <td>{[row.origem, row.destino].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="num">{lvBRL(row.receita)}</td>
                  <td className="num">{lvBRL(row.custo)}</td>
                  <td className="num" style={{ color: lvNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{lvBRL(row.lucro)}</td>
                  <td className="num">{lvPct(row.margem)}</td>
                  <td><LvStatus status={row.status}/></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="15" className="muted">Nenhuma viagem encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.LucroViagens = LucroViagens;

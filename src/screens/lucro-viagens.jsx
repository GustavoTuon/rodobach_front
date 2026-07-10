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

function lvShortMoney(value) {
  const n = Math.abs(lvNum(value));
  const sign = lvNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function lvNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    resumo: base.resumo || {},
    viagens: Array.isArray(base.viagens) ? base.viagens : [],
    mensal: Array.isArray(base.mensal) ? base.mensal : [],
    rankings: base.rankings || { lucro: [], prejuizo: [] },
    distribuicao: Array.isArray(base.distribuicao) ? base.distribuicao : [],
    semViagemVinculada: base.semViagemVinculada || { quantidade: 0, receita: 0, registros: [] },
    filtros: base.filtros || { clientes: [], placas: [] },
    audit: base.audit || {},
  };
}

const LV_STATUS = {
  lucrativo: { label: "Lucrativo", cls: "ok", color: "#22c55e" },
  atencao: { label: "Atencao", cls: "warn", color: "#facc15" },
  "margem-baixa": { label: "Margem baixa", cls: "info", color: "#fb923c" },
  prejuizo: { label: "Prejuízo", cls: "crit", color: "#ef4444" },
};

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

const LvStatusBadge = ({ status }) => {
  const s = LV_STATUS[status] || { label: status || "-", cls: "" };
  return (
    <span
      className={`badge ${s.cls}`}
      style={{
        borderColor: s.color ? `color-mix(in oklab, ${s.color} 45%, transparent)` : undefined,
        color: s.color || undefined,
        background: s.color ? `color-mix(in oklab, ${s.color} 10%, transparent)` : undefined,
      }}
    >
      <span className="dot" style={{ background: s.color || undefined }}/>
      {s.label}
    </span>
  );
};

const LvBar = ({ label, value, max, tone, meta }) => {
  const pct = max > 0 ? Math.min(100, Math.max(3, Math.abs(lvNum(value)) / max * 100)) : 0;
  return (
    <div className="lv-bar" title={`${label}: ${lvBRL(value)}`}>
      <div className="lv-bar-head">
        <span>{label}</span>
        <strong style={{ color: tone || "var(--text)" }}>{lvShortMoney(value)}</strong>
      </div>
      <div className="lv-bar-track"><div style={{ width: `${pct.toFixed(1)}%`, background: tone || "var(--brand-blue)" }}/></div>
      {meta && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{meta}</div>}
    </div>
  );
};

const LvMonthlyChart = ({ rows }) => {
  if (!rows.length) return <div className="muted">Sem dados mensais no periodo.</div>;
  const max = Math.max(1, ...rows.map((r) => Math.max(lvNum(r.receita), lvNum(r.custo), Math.abs(lvNum(r.lucro)))));
  return (
    <div className="lv-monthly">
      {rows.map((row) => {
        const recH = Math.max(4, lvNum(row.receita) / max * 100);
        const cusH = Math.max(4, lvNum(row.custo) / max * 100);
        const lucH = Math.max(4, Math.abs(lvNum(row.lucro)) / max * 100);
        const lucroColor = lvNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444";
        return (
          <div key={row.mes} className="lv-month">
            <div className="lv-month-bars">
              <i style={{ height: `${recH}%`, background: "#38bdf8" }} title={`Receita ${lvBRL(row.receita)}`}/>
              <i style={{ height: `${cusH}%`, background: "#f97316" }} title={`Custo ${lvBRL(row.custo)}`}/>
              <i style={{ height: `${lucH}%`, background: lucroColor }} title={`Lucro ${lvBRL(row.lucro)}`}/>
            </div>
            <span>{row.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const LvDetailModal = ({ viagem, onClose }) => {
  if (!viagem) return null;
  const custos = viagem.custos || {};
  const rows = [
    ["Motorista", custos.motorista],
    ["Abastecimentos", custos.abastecimentos],
    ["Pedagio", custos.pedagio],
    ["Diarias", custos.diarias],
    ["Despesas", custos.despesas],
    ["Outros", custos.outros],
  ];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card lv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Viagem {viagem.viagem}</h2>
            <div className="muted" style={{ fontSize: 12 }}>{viagem.cliente} · {lvDate(viagem.data)} · {[viagem.origem, viagem.destino].filter(Boolean).join(" / ") || "Rota nao informada"}</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x"/></button>
        </div>

        <div className="grid cols-4" style={{ marginBottom: 14 }}>
          <LvKpi label="Receita" value={lvBRL(viagem.receita)} tone="#38bdf8" icon="trending-up"/>
          <LvKpi label="Custo" value={lvBRL(viagem.custo)} tone="#f97316" icon="money"/>
          <LvKpi label="Lucro" value={lvBRL(viagem.lucro)} tone={lvNum(viagem.lucro) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
          <LvKpi label="Margem" value={lvPct(viagem.margem)} tone={LV_STATUS[viagem.statusDetalhado]?.color} icon="gauge"/>
        </div>

        <div className="card-header" style={{ padding: "0 0 8px" }}><h3 style={{ fontSize: 13 }}>Composicao do custo</h3></div>
        <div className="card-body" style={{ marginBottom: 10 }}>
          {rows.map(([label, value]) => (
            <LvBar key={label} label={label} value={value} max={Math.max(1, lvNum(viagem.custo))} tone="#f97316"/>
          ))}
        </div>

        <div className="table-wrap">
          <table className="data-table compact">
            <tbody>
              <tr><td className="muted">Placa</td><td>{viagem.placa || "-"}</td><td className="muted">Tipo</td><td>{viagem.tipoVeiculo}</td></tr>
              <tr><td className="muted">Motorista</td><td>{viagem.motorista || "-"}</td><td className="muted">Status</td><td><LvStatusBadge status={viagem.statusDetalhado}/></td></tr>
              <tr><td className="muted">CT-e</td><td>{viagem.documentos || 0}</td><td className="muted">MDF-e</td><td>{viagem.manifestos || 0}</td></tr>
              <tr><td className="muted">Total acerto</td><td>{lvBRL(viagem.totalAcerto)}</td><td className="muted">Saldo motorista</td><td>{lvBRL(viagem.saldoMotorista)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
  const [selected, setSelected] = React.useState(null);
  const [showSemViagem, setShowSemViagem] = React.useState(false);

  React.useEffect(() => {
    const id = "rb-lucro-viagens-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        .lv-bar{display:block;margin-bottom:11px}
        .lv-bar-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;margin-bottom:4px}
        .lv-bar-head span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lv-bar-head strong{font-family:var(--font-mono);font-size:11.5px;flex-shrink:0}
        .lv-bar-track{height:5px;background:var(--surface-3);border-radius:3px;overflow:hidden}
        .lv-bar-track div{height:100%;border-radius:3px}
        .lv-monthly{height:210px;display:grid;grid-template-columns:repeat(auto-fit,minmax(42px,1fr));gap:8px;align-items:end}
        .lv-month{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}
        .lv-month-bars{height:165px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:3px}
        .lv-month-bars i{width:9px;border-radius:3px 3px 0 0;min-height:4px}
        .lv-month span{font-size:10.5px;color:var(--text-3);white-space:nowrap}
        .lv-modal{width:min(760px,96vw);max-height:88vh;overflow:auto}
        .tbl tbody tr.clickable:hover td{background:var(--hover);cursor:pointer}
        @media (max-width:760px){.lv-monthly{grid-template-columns:repeat(6,minmax(34px,1fr));overflow-x:auto}.lv-modal{padding:12px}.lv-modal .grid.cols-4{grid-template-columns:1fr 1fr}}
      `;
      document.head.appendChild(s);
    }
  }, []);

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
    const body = rows.map((r) => [r.viagem || r.id, r.data, r.cliente, r.placa, r.motorista, r.tipoVeiculo, r.documentos, r.manifestos, r.fretes, r.origem, r.destino, r.receita, r.custo, r.lucro, r.margem, r.statusDetalhadoLabel || r.status]
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
  const rankingLucro = data.rankings?.lucro || [];
  const rankingPrejuizo = data.rankings?.prejuizo || [];
  const maxLucro = Math.max(1, ...rankingLucro.map((item) => Math.abs(lvNum(item.lucro))));
  const maxPrejuizo = Math.max(1, ...rankingPrejuizo.map((item) => Math.abs(lvNum(item.lucro))));
  const semViagem = data.semViagemVinculada || { quantidade: 0, receita: 0, registros: [] };

  return (
    <div className="view">
      <LvDetailModal viagem={selected} onClose={() => setSelected(null)}/>

      <div className="page-head">
        <div>
          <h1>Resultado por Viagem</h1>
          <div className="sub">Lucro real por viagem: apenas registros com custo operacional vinculado (combustivel, pedagio, diarias, motorista, despesas) — financiamento, seguro e demais custos fixos ficam fora</div>
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

      {(loading || error) && (
        <div className="card" style={{ marginBottom: 16, padding: "9px 14px", borderColor: error ? "var(--crit-border)" : "var(--border)" }}>
          <span className={error ? "kpi-delta down" : "muted"} style={{ fontSize: 12.5 }}>
            {loading ? "Carregando resultado por viagem..." : error}
          </span>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>Nenhuma viagem com custo operacional identificado para os filtros selecionados.</div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <LvKpi label="Faturamento total" value={lvBRL(resumo.faturamentoTotal)} sub={`${resumo.quantidadeViagens || 0} viagens com custo identificado`} tone="#38bdf8" icon="trending-up"/>
        <LvKpi label="Custo total" value={lvBRL(resumo.custoTotal)} sub="combustivel, pedagio, diarias, motorista, despesas" tone="#f97316" icon="money"/>
        <LvKpi label="Lucro total" value={lvBRL(resumo.lucroTotal)} sub={`Margem ${lvPct(resumo.margemMedia)}`} tone={lvNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <LvKpi label="Viagens com lucro" value={resumo.quantidadeLucro || 0} sub={`${resumo.quantidadePrejuizo || 0} com prejuizo`} tone="#22c55e" icon="route"/>
      </div>

      {semViagem.quantidade > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--warn-border, #facc15)" }}>
          <div className="row between" style={{ cursor: "pointer", alignItems: "flex-start" }} onClick={() => setShowSemViagem((v) => !v)}>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Icon name="alert" size={16}/>
              <div>
                <strong style={{ fontSize: 13 }}>Faturamento sem viagem vinculada: {lvBRL(semViagem.receita)}</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {semViagem.quantidade} recebiveis/CT-e no periodo sem registro correspondente em logistica.controleviagens — sem base para calcular custo operacional real, por isso ficam fora do lucro por viagem acima.
                </div>
              </div>
            </div>
            <button className="btn" style={{ flexShrink: 0 }}>{showSemViagem ? "Ocultar" : "Ver registros"}</button>
          </div>
          {showSemViagem && (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="data-table compact">
                <thead><tr><th>Data</th><th>Referencia</th><th>Cliente</th><th className="num">Receita</th></tr></thead>
                <tbody>
                  {semViagem.registros.map((r) => (
                    <tr key={r.id}><td>{lvDate(r.data)}</td><td>{r.viagem}</td><td>{r.cliente}</td><td className="num">{lvBRL(r.receita)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card card-flush">
          <div className="card-header"><h3>Ranking por lucro</h3><span className="meta muted">top viagens</span></div>
          <div className="card-body">{rankingLucro.length ? rankingLucro.map((item) => <LvBar key={item.id} label={`${item.viagem} · ${item.cliente}`} value={item.lucro} max={maxLucro} tone="#22c55e" meta={`Margem ${lvPct(item.margem)}`}/>) : <div className="muted">Sem lucro no periodo.</div>}</div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Ranking por prejuízo</h3><span className="meta muted">maiores perdas</span></div>
          <div className="card-body">{rankingPrejuizo.length ? rankingPrejuizo.map((item) => <LvBar key={item.id} label={`${item.viagem} · ${item.cliente}`} value={item.lucro} max={maxPrejuizo} tone="#ef4444" meta={`Margem ${lvPct(item.margem)}`}/>) : <div className="muted">Nenhuma viagem com prejuízo.</div>}</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Receita x custo x lucro por mes</h3>
            <div className="row" style={{ gap: 10, fontSize: 11.5 }}>
              <span><span style={{ color: "#38bdf8" }}>■</span> Receita</span>
              <span><span style={{ color: "#f97316" }}>■</span> Custo</span>
              <span><span style={{ color: "#22c55e" }}>■</span> Lucro</span>
            </div>
          </div>
          <div className="card-body"><LvMonthlyChart rows={data.mensal}/></div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Distribuicao de lucro</h3><span className="meta muted">viagens por status</span></div>
          <div className="card-body">
            {(data.distribuicao || []).map((item) => (
              <LvBar key={item.id} label={LV_STATUS[item.id]?.label || item.label} value={item.quantidade} max={Math.max(1, rows.length)} tone={LV_STATUS[item.id]?.color} meta={`${item.quantidade} viagem${item.quantidade === 1 ? "" : "ns"} · ${lvBRL(item.receita)}`}/>
            ))}
          </div>
        </div>
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
                <tr key={row.id} className="clickable" onClick={() => setSelected(row)}>
                  <td>{lvDate(row.data)}</td>
                  <td>{row.viagem || row.id}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.cliente}>{row.cliente}</td>
                  <td>{row.placa || "-"}</td>
                  <td>{row.motorista || "-"}</td>
                  <td>{row.tipoVeiculo}</td>
                  <td>{[row.origem, row.destino].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="num">{lvBRL(row.receita)}</td>
                  <td className="num">{lvBRL(row.custo)}</td>
                  <td className="num" style={{ color: lvNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{lvBRL(row.lucro)}</td>
                  <td className="num">{lvPct(row.margem)}</td>
                  <td><LvStatusBadge status={row.statusDetalhado}/></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="12" className="muted">Nenhuma viagem encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
        Base: {data.audit?.campos?.receita || "financeiro.valorliquidorateiosreceber"}. {data.audit?.campos?.semViagemVinculada || ""}
      </div>
    </div>
  );
};

window.LucroViagens = LucroViagens;

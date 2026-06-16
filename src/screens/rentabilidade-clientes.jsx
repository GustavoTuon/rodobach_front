function rcTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function rcDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function rcNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rcBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(rcNum(value));
}

function rcPct(value) {
  return `${rcNum(value).toFixed(1)}%`;
}

function rcDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function rcShortMoney(value) {
  const n = Math.abs(rcNum(value));
  const sign = rcNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function rcNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    resumo: base.resumo || {},
    clientes: Array.isArray(base.clientes) ? base.clientes : [],
    mensal: Array.isArray(base.mensal) ? base.mensal : [],
    rankings: base.rankings || { lucro: [], prejuizo: [], margem: [] },
    filtros: base.filtros || { clientes: [], placas: [], origens: [], destinos: [], materiais: [] },
    fontes: base.fontes || {},
  };
}

const RC_STATUS = {
  lucrativo: { label: "Lucrativo", cls: "ok", color: "#22c55e" },
  atencao: { label: "Atencao", cls: "warn", color: "#facc15" },
  "margem-baixa": { label: "Margem baixa", cls: "info", color: "#fb923c" },
  prejuizo: { label: "Prejuízo", cls: "crit", color: "#ef4444" },
};

const RC_PERIODS = [
  { key: "7d", label: "7 dias", range: () => ({ start: rcDaysAgoISO(6), end: rcTodayISO() }) },
  { key: "30d", label: "30 dias", range: () => ({ start: rcDaysAgoISO(29), end: rcTodayISO() }) },
  { key: "month", label: "Este mes", range: () => {
    const d = new Date();
    return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, end: rcTodayISO() };
  } },
];

const RcStatusBadge = ({ status }) => {
  const s = RC_STATUS[status] || { label: status || "-", cls: "" };
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

const RcKpi = ({ label, value, sub, icon, tone }) => (
  <div className="kpi" style={{ borderLeft: `3px solid ${tone || "var(--border-strong)"}` }}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <span className="kpi-delta flat">{sub}</span>}
  </div>
);

const RcBar = ({ label, value, max, tone, meta }) => {
  const pct = max > 0 ? Math.min(100, Math.max(3, Math.abs(rcNum(value)) / max * 100)) : 0;
  return (
    <div className="rc-bar" title={`${label}: ${rcBRL(value)}`}>
      <div className="rc-bar-head">
        <span>{label}</span>
        <strong style={{ color: tone || "var(--text)" }}>{rcShortMoney(value)}</strong>
      </div>
      <div className="rc-bar-track"><div style={{ width: `${pct.toFixed(1)}%`, background: tone || "var(--brand-blue)" }}/></div>
      {meta && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{meta}</div>}
    </div>
  );
};

const RcMonthlyChart = ({ rows }) => {
  if (!rows.length) return <div className="muted">Sem dados mensais no periodo.</div>;
  const max = Math.max(1, ...rows.map((r) => Math.max(rcNum(r.receita), rcNum(r.custo), Math.abs(rcNum(r.lucro)))));
  return (
    <div className="rc-monthly">
      {rows.map((row) => {
        const recH = Math.max(4, rcNum(row.receita) / max * 100);
        const cusH = Math.max(4, rcNum(row.custo) / max * 100);
        const lucH = Math.max(4, Math.abs(rcNum(row.lucro)) / max * 100);
        const lucroColor = rcNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444";
        return (
          <div key={row.mes} className="rc-month">
            <div className="rc-month-bars">
              <i style={{ height: `${recH}%`, background: "#38bdf8" }} title={`Receita ${rcBRL(row.receita)}`}/>
              <i style={{ height: `${cusH}%`, background: "#f97316" }} title={`Custo ${rcBRL(row.custo)}`}/>
              <i style={{ height: `${lucH}%`, background: lucroColor }} title={`Lucro ${rcBRL(row.lucro)}`}/>
            </div>
            <span>{row.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const RcDetailModal = ({ cliente, onClose }) => {
  if (!cliente) return null;
  const viagens = Array.isArray(cliente.viagens) ? cliente.viagens : [];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card rc-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cliente.cliente}</h2>
            <div className="muted" style={{ fontSize: 12 }}>{viagens.length} viagens/conhecimentos no periodo</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x"/></button>
        </div>

        <div className="grid cols-4" style={{ marginBottom: 14 }}>
          <RcKpi label="Receita" value={rcBRL(cliente.receitaTotal)} tone="#38bdf8" icon="trending-up"/>
          <RcKpi label="Custo" value={rcBRL(cliente.custoTotal)} tone="#f97316" icon="money"/>
          <RcKpi label="Lucro" value={rcBRL(cliente.lucro)} tone={rcNum(cliente.lucro) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
          <RcKpi label="Margem" value={rcPct(cliente.margem)} tone={RC_STATUS[cliente.status]?.color} icon="gauge"/>
        </div>

        <div className="table-wrap">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Data</th><th>CT-e</th><th>Placa</th><th>Motorista</th><th>Origem/Destino</th>
                <th className="num">Receita</th><th className="num">Custo</th><th className="num">Lucro</th><th>Margem</th><th>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {viagens.map((v) => (
                <tr key={v.id}>
                  <td>{rcDate(v.data)}</td>
                  <td>{v.numero || v.codigo || "-"}</td>
                  <td>{v.placa || "-"}</td>
                  <td>{v.motorista || "-"}</td>
                  <td>{[v.origem, v.destino].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="num">{rcBRL(v.receita)}</td>
                  <td className="num">{rcBRL(v.custo)}</td>
                  <td className="num" style={{ color: rcNum(v.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rcBRL(v.lucro)}</td>
                  <td>{rcPct(v.margem)}</td>
                  <td title={v.observacao || ""}>{v.observacao ? <Icon name="info" size={14}/> : "-"}</td>
                </tr>
              ))}
              {!viagens.length && <tr><td colSpan="10" className="muted">Nenhum detalhe encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RentabilidadeClientes = () => {
  const initial = RC_PERIODS[1].range();
  const [dataInicial, setDataInicial] = React.useState(initial.start);
  const [dataFinal, setDataFinal] = React.useState(initial.end);
  const [cliente, setCliente] = React.useState("");
  const [placa, setPlaca] = React.useState("");
  const [origem, setOrigem] = React.useState("");
  const [destino, setDestino] = React.useState("");
  const [material, setMaterial] = React.useState("");
  const [statusMargem, setStatusMargem] = React.useState("todos");
  const [filters, setFilters] = React.useState({ dataInicial: initial.start, dataFinal: initial.end, statusMargem: "todos" });
  const [data, setData] = React.useState(() => rcNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sortCol, setSortCol] = React.useState("lucro");
  const [sortDir, setSortDir] = React.useState("desc");
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    const id = "rb-rentabilidade-clientes-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        .rc-bar{display:block;margin-bottom:11px}
        .rc-bar-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;margin-bottom:4px}
        .rc-bar-head span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .rc-bar-head strong{font-family:var(--font-mono);font-size:11.5px;flex-shrink:0}
        .rc-bar-track{height:5px;background:var(--surface-3);border-radius:3px;overflow:hidden}
        .rc-bar-track div{height:100%;border-radius:3px}
        .rc-monthly{height:210px;display:grid;grid-template-columns:repeat(auto-fit,minmax(42px,1fr));gap:8px;align-items:end}
        .rc-month{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}
        .rc-month-bars{height:165px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:3px}
        .rc-month-bars i{width:9px;border-radius:3px 3px 0 0;min-height:4px}
        .rc-month span{font-size:10.5px;color:var(--text-3);white-space:nowrap}
        .rc-modal{width:min(1180px,96vw);max-height:88vh;overflow:auto}
        .tbl tbody tr.clickable:hover td{background:var(--hover);cursor:pointer}
        @media (max-width:760px){.rc-monthly{grid-template-columns:repeat(6,minmax(34px,1fr));overflow-x:auto}.rc-modal{padding:12px}.rc-modal .grid.cols-4{grid-template-columns:1fr 1fr}}
      `;
      document.head.appendChild(s);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getRentabilidadeClientes(filters)
      .then((payload) => { if (active) setData(rcNormalize(payload)); })
      .catch((err) => { if (active) { setData(rcNormalize(null)); setError(err?.message || "Nao foi possivel carregar rentabilidade."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyFilters = () => setFilters({ dataInicial, dataFinal, cliente, placa, origem, destino, material, statusMargem });
  const clearFilters = () => {
    const r = RC_PERIODS[1].range();
    setDataInicial(r.start); setDataFinal(r.end); setCliente(""); setPlaca(""); setOrigem(""); setDestino(""); setMaterial(""); setStatusMargem("todos");
    setFilters({ dataInicial: r.start, dataFinal: r.end, statusMargem: "todos" });
  };
  const applyShortcut = (key) => {
    const p = RC_PERIODS.find((item) => item.key === key);
    if (!p) return;
    const r = p.range();
    setDataInicial(r.start); setDataFinal(r.end);
    setFilters({ dataInicial: r.start, dataFinal: r.end, cliente, placa, origem, destino, material, statusMargem });
  };

  const rows = React.useMemo(() => {
    let list = data.clientes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => [c.cliente, c.documento, c.statusLabel].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortCol === "cliente") return dir * String(a.cliente || "").localeCompare(String(b.cliente || ""));
      if (sortCol === "ultimaViagem") return dir * String(a.ultimaViagem || "").localeCompare(String(b.ultimaViagem || ""));
      return dir * (rcNum(a[sortCol]) - rcNum(b[sortCol]));
    });
  }, [data.clientes, search, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };
  const SortArrow = ({ col }) => <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.35 }}>{sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>;

  const exportRows = (excel = false) => {
    const sep = excel ? "\t" : ";";
    const header = ["Cliente","Quantidade viagens","Receita total","Custo total","Lucro","Margem %","Ticket medio","Ultima viagem","Status"];
    const body = rows.map((r) => [r.cliente, r.quantidadeViagens, r.receitaTotal, r.custoTotal, r.lucro, r.margem, r.ticketMedio, r.ultimaViagem, r.statusLabel]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(sep));
    const blob = new Blob([[header.join(sep), ...body].join("\n")], { type: excel ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentabilidade-clientes-${dataInicial}-${dataFinal}.${excel ? "xls" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resumo = data.resumo || {};
  const rankingLucro = data.rankings?.lucro || [];
  const rankingPrejuizo = data.rankings?.prejuizo || [];
  const rankingMargem = data.rankings?.margem || [];
  const maxLucro = Math.max(1, ...rankingLucro.map((item) => Math.abs(rcNum(item.lucro))));
  const maxPrejuizo = Math.max(1, ...rankingPrejuizo.map((item) => Math.abs(rcNum(item.lucro))));
  const maxMargem = Math.max(1, ...rankingMargem.map((item) => Math.abs(rcNum(item.margem))));

  return (
    <div className="view">
      <RcDetailModal cliente={selected} onClose={() => setSelected(null)}/>

      <div className="page-head">
        <div>
          <h1>Lucro por Cliente</h1>
          <div className="sub">Receita operacional por CT-e/conhecimento; custos por viagem, carta-frete, abastecimentos, despesas e manutencao</div>
        </div>
        <div className="actions">
          {RC_PERIODS.map((p) => <button key={p.key} className="btn" onClick={() => applyShortcut(p.key)}>{p.label}</button>)}
          <button className="btn" onClick={() => exportRows(false)}><Icon name="download"/> CSV</button>
          <button className="btn" onClick={() => exportRows(true)}><Icon name="download"/> Excel</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Data inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Data final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={data.filtros?.clientes || []} placeholder="Nome, codigo ou CNPJ" tag={() => "Cliente"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.filtros?.placas || []} placeholder="Placa" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Origem<RBCombobox value={origem} onChange={setOrigem} options={data.filtros?.origens || []} placeholder="Cidade" tag={() => "Origem"}/></label>
        <label>Destino<RBCombobox value={destino} onChange={setDestino} options={data.filtros?.destinos || []} placeholder="Cidade" tag={() => "Destino"}/></label>
        <label>Material<RBCombobox value={material} onChange={setMaterial} options={data.filtros?.materiais || []} placeholder="Codigo/material" tag={() => "Material"}/></label>
        <label>Tipo
          <select value={statusMargem} onChange={(e) => setStatusMargem(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="lucrativo">Lucrativo</option>
            <option value="atencao">Atencao</option>
            <option value="margem-baixa">Margem baixa</option>
            <option value="prejuizo">Prejuízo</option>
          </select>
        </label>
        <button className="btn primary" onClick={applyFilters}>Aplicar</button>
        <button className="btn" onClick={clearFilters}>Limpar</button>
      </div>

      {(loading || error) && (
        <div className="card" style={{ marginBottom: 16, padding: "9px 14px", borderColor: error ? "var(--crit-border)" : "var(--border)" }}>
          <span className={error ? "kpi-delta down" : "muted"} style={{ fontSize: 12.5 }}>
            {loading ? "Carregando rentabilidade por cliente..." : error}
          </span>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>Nenhum cliente encontrado para os filtros selecionados.</div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <RcKpi label="Receita total" value={rcBRL(resumo.receitaTotal)} sub={`${resumo.quantidadeConhecimentos || 0} conhecimentos`} tone="#38bdf8" icon="trending-up"/>
        <RcKpi label="Custo total" value={rcBRL(resumo.custoTotal)} sub="motorista, viagem e manutencao" tone="#f97316" icon="money"/>
        <RcKpi label="Lucro total" value={rcBRL(resumo.lucroTotal)} sub={`Margem media ${rcPct(resumo.margemMedia)}`} tone={rcNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <RcKpi label="Ticket medio/cliente" value={rcBRL(resumo.ticketMedioCliente)} sub={`${rows.length} clientes`} tone="var(--border-strong)" icon="gauge"/>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <RcKpi label="Viagens/CT-e" value={resumo.quantidadeViagens || 0} sub="linhas operacionais" tone="#a78bfa" icon="route"/>
        <RcKpi label="Cliente mais lucrativo" value={resumo.clienteMaisLucrativo?.cliente || "-"} sub={resumo.clienteMaisLucrativo ? rcBRL(resumo.clienteMaisLucrativo.valor) : ""} tone="#22c55e" icon="user"/>
        <RcKpi label="Maior prejuízo" value={resumo.clienteMaiorPrejuizo?.cliente || "-"} sub={resumo.clienteMaiorPrejuizo ? rcBRL(resumo.clienteMaiorPrejuizo.valor) : ""} tone="#ef4444" icon="alert"/>
        <RcKpi label="Margem media" value={rcPct(resumo.margemMedia)} sub="lucro / receita" tone="#facc15" icon="gauge"/>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card card-flush">
          <div className="card-header"><h3>Ranking por lucro</h3><span className="meta muted">top clientes</span></div>
          <div className="card-body">{rankingLucro.length ? rankingLucro.map((item) => <RcBar key={item.clienteCodigo || item.cliente} label={item.cliente} value={item.lucro} max={maxLucro} tone="#22c55e" meta={`Margem ${rcPct(item.margem)}`}/>) : <div className="muted">Sem lucro no periodo.</div>}</div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Ranking por prejuízo</h3><span className="meta muted">maiores perdas</span></div>
          <div className="card-body">{rankingPrejuizo.length ? rankingPrejuizo.map((item) => <RcBar key={item.clienteCodigo || item.cliente} label={item.cliente} value={item.lucro} max={maxPrejuizo} tone="#ef4444" meta={`Margem ${rcPct(item.margem)}`}/>) : <div className="muted">Nenhum cliente com prejuízo.</div>}</div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Margem por cliente</h3><span className="meta muted">maiores margens</span></div>
          <div className="card-body">{rankingMargem.length ? rankingMargem.map((item) => <RcBar key={item.clienteCodigo || item.cliente} label={item.cliente} value={item.margem} max={maxMargem} tone={RC_STATUS[item.status]?.color} meta={rcBRL(item.lucro)}/>) : <div className="muted">Sem margem calculada.</div>}</div>
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
          <div className="card-body"><RcMonthlyChart rows={data.mensal}/></div>
        </div>
        <div className="card card-flush">
          <div className="card-header"><h3>Distribuicao de lucro</h3><span className="meta muted">clientes por status</span></div>
          <div className="card-body">
            {Object.keys(RC_STATUS).map((key) => {
              const count = rows.filter((item) => item.status === key).length;
              const max = Math.max(1, rows.length);
              return <RcBar key={key} label={RC_STATUS[key].label} value={count} max={max} tone={RC_STATUS[key].color} meta={`${count} cliente${count === 1 ? "" : "s"}`}/>;
            })}
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Clientes</h3>
          <div className="row" style={{ gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." style={{ minWidth: 220 }}/>
            <span className="meta muted">{rows.length} clientes</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead>
              <tr>
                <th onClick={() => toggleSort("cliente")}>Cliente <SortArrow col="cliente"/></th>
                <th className="num" onClick={() => toggleSort("quantidadeViagens")}>Viagens <SortArrow col="quantidadeViagens"/></th>
                <th className="num" onClick={() => toggleSort("receitaTotal")}>Receita <SortArrow col="receitaTotal"/></th>
                <th className="num" onClick={() => toggleSort("custoTotal")}>Custo <SortArrow col="custoTotal"/></th>
                <th className="num" onClick={() => toggleSort("lucro")}>Lucro <SortArrow col="lucro"/></th>
                <th className="num" onClick={() => toggleSort("margem")}>Margem <SortArrow col="margem"/></th>
                <th className="num" onClick={() => toggleSort("ticketMedio")}>Ticket medio <SortArrow col="ticketMedio"/></th>
                <th onClick={() => toggleSort("ultimaViagem")}>Ultima viagem <SortArrow col="ultimaViagem"/></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clienteCodigo || row.cliente} className="clickable" onClick={() => setSelected(row)}>
                  <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.cliente}>{row.cliente}</td>
                  <td className="num">{row.quantidadeViagens}</td>
                  <td className="num">{rcBRL(row.receitaTotal)}</td>
                  <td className="num">{rcBRL(row.custoTotal)}</td>
                  <td className="num" style={{ color: rcNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rcBRL(row.lucro)}</td>
                  <td className="num">{rcPct(row.margem)}</td>
                  <td className="num">{rcBRL(row.ticketMedio)}</td>
                  <td>{rcDate(row.ultimaViagem)}</td>
                  <td><RcStatusBadge status={row.status}/></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="9" className="muted">Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
        Base: {data.fontes?.receita || "logistica.conhecimentos"}. Custos com fallback documentado no backend; financeiro.receber nao e somado para evitar duplicidade com CT-e.
      </div>
    </div>
  );
};

window.RentabilidadeClientes = RentabilidadeClientes;

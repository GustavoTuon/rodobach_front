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
    veiculos: Array.isArray(base.veiculos) ? base.veiculos : [],
    semViagemVinculada: base.semViagemVinculada || { quantidade: 0, receita: 0, registros: [] },
    filtros: base.filtros || { clientes: [], placas: [] },
    audit: base.audit || {},
  };
}

function lvShortText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
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

const LvStatus = ({ lucro, margem }) => {
  const loss = lvNum(lucro) < 0;
  const low = !loss && lvNum(margem) < 10;
  const cls = loss ? "crit" : low ? "warn" : "ok";
  const label = loss ? "Prejuizo" : low ? "Margem baixa" : "Lucro";
  return <span className={`badge ${cls}`}><span className="dot"/>{label}</span>;
};

const LvCostPill = ({ label, value, hint, tone }) => (
  <div className="lv-cost-pill" title={hint || label} style={tone ? { borderColor: tone } : null}>
    <span>{label}</span>
    <strong>{lvBRL(value)}</strong>
    {hint && <small>{hint}</small>}
  </div>
);

const LvTripDetail = ({ viagem, onClose }) => {
  if (!viagem) return null;
  const custos = viagem.custos || {};
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card lv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Viagem {viagem.viagem || viagem.id}</h2>
            <div className="muted" style={{ fontSize: 12 }}>
              {lvDate(viagem.data)} · {lvShortText(viagem.placa, "Sem placa")} · {lvShortText(viagem.motorista)}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x"/></button>
        </div>

        <div className="grid cols-4" style={{ marginBottom: 14 }}>
          <LvKpi label="Faturamento" value={lvBRL(viagem.receita)} tone="#38bdf8" icon="trending-up"/>
          <LvKpi label="Custo viagem" value={lvBRL(viagem.custo)} tone="#f97316" icon="money"/>
          <LvKpi label="Lucro" value={lvBRL(viagem.lucro)} tone={lvNum(viagem.lucro) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
          <LvKpi label="Margem" value={lvPct(viagem.margem)} tone="#8b5cf6" icon="gauge"/>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 12, background: "var(--surface-2)" }}>
          <strong style={{ fontSize: 12.5 }}>Composicao do custo da viagem</strong>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            O custo considera apenas lancamentos ligados diretamente ao acerto da viagem. O item motorista e a comissao/frete do motorista ou agregado, quando existir.
          </div>
        </div>

        <div className="lv-cost-grid">
          <LvCostPill label="Comissao/frete motorista" value={custos.motorista} hint="Comissao ou frete do motorista/agregado ligado ao CT-e ou acerto" tone="rgba(56,189,248,.55)"/>
          <LvCostPill label="Abastecimento" value={custos.abastecimentos} hint="Abastecimentos vinculados a viagem"/>
          <LvCostPill label="Pedagio" value={custos.pedagio} hint="Pedagios do acerto/carta-frete"/>
          <LvCostPill label="Diarias" value={custos.diarias} hint="Diarias lancadas na viagem"/>
          <LvCostPill label="Despesas avulsas" value={custos.despesas} hint="Despesas operacionais da viagem"/>
          <LvCostPill label="Outros" value={custos.outros} hint="Outros custos operacionais vinculados"/>
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="data-table compact">
            <tbody>
              <tr><td className="muted">Cliente</td><td colSpan="3">{lvShortText(viagem.cliente)}</td></tr>
              <tr><td className="muted">Rota</td><td colSpan="3">{[viagem.origem, viagem.destino].filter(Boolean).join(" / ") || "-"}</td></tr>
              <tr><td className="muted">CT-e</td><td>{viagem.documentos || 0}</td><td className="muted">Fretes</td><td>{viagem.fretes || 0}</td></tr>
              <tr><td className="muted">Total no acerto</td><td>{lvBRL(viagem.totalAcerto)}</td><td className="muted">Saldo do acerto</td><td>{lvBRL(viagem.saldoMotorista)}</td></tr>
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
  const [selectedVehicle, setSelectedVehicle] = React.useState("");
  const [selectedTrip, setSelectedTrip] = React.useState(null);
  const [showUnlinked, setShowUnlinked] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const id = "rb-lucro-viagens-v2-style";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      .lv-layout{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:14px;align-items:start}
      .lv-vehicle-list{display:grid;gap:8px;padding:10px;max-height:620px;overflow:auto}
      .lv-vehicle{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:7px;padding:10px;text-align:left;cursor:pointer}
      .lv-vehicle.active{border-color:var(--brand-blue);background:var(--accent-soft)}
      .lv-vehicle-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}
      .lv-vehicle-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;color:var(--text-3);font-size:11.5px}
      .lv-vehicle-grid strong{display:block;color:var(--text);font-size:12px;font-family:var(--font-mono)}
      .lv-cost-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}
      .lv-cost-pill{border:1px solid var(--border);border-radius:7px;padding:10px;background:var(--surface);min-height:76px}
      .lv-cost-pill span{display:block;color:var(--text-3);font-size:11px;margin-bottom:3px}
      .lv-cost-pill strong{font-family:var(--font-mono);font-size:13px}
      .lv-cost-pill small{display:block;color:var(--text-3);font-size:10.5px;line-height:1.35;margin-top:7px}
      .lv-modal{width:min(820px,96vw);max-height:88vh;overflow:auto}
      .tbl tbody tr.clickable:hover td{background:var(--hover);cursor:pointer}
      @media (max-width:960px){.lv-layout{grid-template-columns:1fr}.period-filter{grid-template-columns:1fr 1fr}.lv-vehicle-list{max-height:none}}
      @media (max-width:620px){.period-filter{grid-template-columns:1fr}.lv-modal .grid.cols-4{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getLucroViagens(filters)
      .then((payload) => {
        if (!active) return;
        const normalized = lvNormalize(payload);
        setData(normalized);
        setSelectedVehicle((current) => current && normalized.veiculos.some((v) => v.placa === current) ? current : normalized.veiculos[0]?.placa || "");
      })
      .catch((err) => {
        if (!active) return;
        setData(lvNormalize(null));
        setError(err?.message || "Nao foi possivel carregar resultado por viagem.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyFilters = () => setFilters({ dataInicial, dataFinal, cliente, placa, tipoVeiculo, status });
  const clearFilters = () => {
    const r = LV_PERIODS[1].range();
    setDataInicial(r.start);
    setDataFinal(r.end);
    setCliente("");
    setPlaca("");
    setTipoVeiculo("todos");
    setStatus("todos");
    setSearch("");
    setFilters({ dataInicial: r.start, dataFinal: r.end, tipoVeiculo: "todos", status: "todos" });
  };
  const applyShortcut = (key) => {
    const p = LV_PERIODS.find((item) => item.key === key);
    if (!p) return;
    const r = p.range();
    setDataInicial(r.start);
    setDataFinal(r.end);
    setFilters({ dataInicial: r.start, dataFinal: r.end, cliente, placa, tipoVeiculo, status });
  };

  const selectedVehicleData = data.veiculos.find((item) => item.placa === selectedVehicle) || data.veiculos[0] || null;
  const trips = React.useMemo(() => {
    let rows = data.viagens;
    if (selectedVehicleData) rows = rows.filter((item) => (item.placa || "Sem placa") === selectedVehicleData.placa);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((item) => [item.viagem, item.cliente, item.placa, item.motorista, item.origem, item.destino].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return rows.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || lvNum(b.lucro) - lvNum(a.lucro));
  }, [data.viagens, selectedVehicleData?.placa, search]);

  const viagensSemCusto = data.viagens.filter((item) => lvNum(item.custo) === 0);
  const resumo = data.resumo || {};
  const semViagem = data.semViagemVinculada || { quantidade: 0, receita: 0, registros: [] };

  const exportCsv = () => {
    const header = ["Viagem","Data","Cliente","Placa","Motorista","Origem","Destino","Receita","Custo","Lucro","Margem","Motorista","Abastecimento","Pedagio","Diarias","Despesas","Outros"];
    const body = data.viagens.map((r) => {
      const c = r.custos || {};
      return [r.viagem || r.id, r.data, r.cliente, r.placa, r.motorista, r.origem, r.destino, r.receita, r.custo, r.lucro, r.margem, c.motorista, c.abastecimentos, c.pedagio, c.diarias, c.despesas, c.outros]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";");
    });
    const blob = new Blob([[header.join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultado-viagens-${dataInicial}-${dataFinal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="view">
      <LvTripDetail viagem={selectedTrip} onClose={() => setSelectedTrip(null)}/>

      <div className="page-head">
        <div>
          <h1>Resultado por Viagem</h1>
          <div className="sub">Faturamento por veiculo e lucro por viagem usando os documentos do DRE. Custos fixos, financiamento e seguro ficam fora.</div>
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
        <label>Tipo<select value={tipoVeiculo} onChange={(e) => setTipoVeiculo(e.target.value)}><option value="todos">Todos</option><option value="frota">Frota</option><option value="terceiro">Terceiro</option></select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="lucro">Lucro</option><option value="prejuizo">Prejuizo</option></select></label>
        <button className="btn primary" onClick={applyFilters}>Aplicar</button>
        <button className="btn" onClick={clearFilters}>Limpar</button>
      </div>

      {(loading || error) && (
        <div className="card" style={{ marginBottom: 14, borderColor: error ? "var(--crit-border)" : "var(--border)" }}>
          <span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando resultado..." : error}</span>
        </div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <LvKpi label="Faturamento com viagem" value={lvBRL(resumo.faturamentoTotal)} sub={`${resumo.quantidadeViagens || 0} viagens vinculadas`} tone="#38bdf8" icon="trending-up"/>
        <LvKpi label="Custo de viagem" value={lvBRL(resumo.custoTotal)} sub="somente custos vinculados" tone="#f97316" icon="money"/>
        <LvKpi label="Lucro operacional" value={lvBRL(resumo.lucroTotal)} sub={`Margem ${lvPct(resumo.margemMedia)}`} tone={lvNum(resumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <LvKpi label="Veiculos" value={data.veiculos.length || 0} sub={`${resumo.quantidadePrejuizo || 0} viagens com prejuizo`} tone="#8b5cf6" icon="truck"/>
      </div>

      {(semViagem.quantidade > 0 || viagensSemCusto.length > 0) && (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--warn-border, #facc15)" }}>
          <div className="row between" style={{ gap: 12, alignItems: "flex-start" }}>
            <div>
              <strong>Conferencia necessaria</strong>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {semViagem.quantidade} documento(s) do DRE sem viagem vinculada somam {lvBRL(semViagem.receita)}. {viagensSemCusto.length} viagem(ns) vinculada(s) estao sem custo operacional lancado.
              </div>
            </div>
            <button className="btn" onClick={() => setShowUnlinked((v) => !v)}>{showUnlinked ? "Ocultar" : "Ver pendencias"}</button>
          </div>
          {showUnlinked && (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="data-table compact">
                <thead><tr><th>Tipo</th><th>Data</th><th>Referencia</th><th>Cliente</th><th className="num">Valor</th></tr></thead>
                <tbody>
                  {viagensSemCusto.slice(0, 80).map((r) => (
                    <tr key={`sem-custo-${r.id}`}><td>Sem custo</td><td>{lvDate(r.data)}</td><td>{r.viagem}</td><td>{r.cliente}</td><td className="num">{lvBRL(r.receita)}</td></tr>
                  ))}
                  {(semViagem.registros || []).slice(0, 80).map((r) => (
                    <tr key={`sem-viagem-${r.id}`}><td>Sem viagem</td><td>{lvDate(r.data)}</td><td>{r.viagem}</td><td>{r.cliente}</td><td className="num">{lvBRL(r.receita)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="lv-layout">
        <div className="card card-flush">
          <div className="card-header">
            <div>
              <h3>Faturamento por veiculo</h3>
              <div className="meta">Placa, custo operacional e lucro</div>
            </div>
          </div>
          <div className="lv-vehicle-list">
            {data.veiculos.map((item) => (
              <button key={item.placa} type="button" className={`lv-vehicle ${selectedVehicleData?.placa === item.placa ? "active" : ""}`} onClick={() => setSelectedVehicle(item.placa)}>
                <div className="lv-vehicle-top">
                  <strong>{item.placa}</strong>
                  <LvStatus lucro={item.lucro} margem={item.margem}/>
                </div>
                <div className="lv-vehicle-grid">
                  <span>Faturamento<strong>{lvBRL(item.faturamento)}</strong></span>
                  <span>Lucro<strong style={{ color: lvNum(item.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{lvBRL(item.lucro)}</strong></span>
                  <span>Custo<strong>{lvBRL(item.custo)}</strong></span>
                  <span>Margem<strong>{lvPct(item.margem)}</strong></span>
                  <span>Viagens<strong>{item.viagens}</strong></span>
                  <span>Ultima<strong>{lvDate(item.ultimaData)}</strong></span>
                </div>
              </button>
            ))}
            {!loading && !data.veiculos.length && <div className="muted" style={{ padding: 20, textAlign: "center" }}>Nenhum veiculo encontrado.</div>}
          </div>
        </div>

        <div className="card card-flush">
          <div className="card-header">
            <div>
              <h3>{selectedVehicleData ? `Viagens ${selectedVehicleData.placa}` : "Viagens"}</h3>
              <div className="meta">{trips.length} registro(s) com documentos do DRE vinculados a viagem</div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar viagem, cliente ou rota..." style={{ minWidth: 260 }}/>
          </div>
          <div className="table-wrap">
            <table className="data-table tbl">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Viagem</th>
                  <th>Cliente</th>
                  <th>Motorista</th>
                  <th>Rota</th>
                  <th className="num">Faturamento</th>
                  <th className="num">Custo</th>
                  <th className="num">Lucro</th>
                  <th className="num">Margem</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((row) => (
                  <tr key={row.id} className="clickable" onClick={() => setSelectedTrip(row)}>
                    <td>{lvDate(row.data)}</td>
                    <td>{row.viagem || row.id}</td>
                    <td style={{ maxWidth: 230, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.cliente}>{row.cliente}</td>
                    <td>{lvShortText(row.motorista)}</td>
                    <td style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[row.origem, row.destino].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="num">{lvBRL(row.receita)}</td>
                    <td className="num">{lvBRL(row.custo)}</td>
                    <td className="num" style={{ color: lvNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{lvBRL(row.lucro)}</td>
                    <td className="num">{lvPct(row.margem)}</td>
                    <td><LvStatus lucro={row.lucro} margem={row.margem}/></td>
                  </tr>
                ))}
                {!trips.length && <tr><td colSpan="10" className="muted">Nenhuma viagem para o veiculo selecionado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
        Receita: {data.audit?.campos?.receita || "mesma base de receita bruta do DRE"}. Custos: {data.audit?.campos?.custos || "somente custos operacionais vinculados a viagem"}.
      </div>
    </div>
  );
};

window.LucroViagens = LucroViagens;

function fmTodayYear() {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
}

function fmTodayMonth() {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", month: "numeric" }).format(new Date()));
}

function fmTodayMonthYear() {
  return `${fmTodayYear()}-${String(fmTodayMonth()).padStart(2, "0")}`;
}

const FM_MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Fev" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Set" },
  { value: 10, label: "Out" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dez" },
];

function fmNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fmNum(value));
}

function fmShortBRL(value) {
  const n = Math.abs(fmNum(value));
  const sign = fmNum(value) < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sign}R$ ${Math.round(n / 1000)}k`;
  return `${sign}R$ ${Math.round(n)}`;
}

function fmPct(value) {
  return value === null || value === undefined ? "-" : `${fmNum(value).toFixed(1)}%`;
}

function fmNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    ano: base.ano || fmTodayYear(),
    anoAnterior: base.anoAnterior || fmTodayYear() - 1,
    mesReferencia: base.mesReferencia || fmTodayMonth(),
    mesReferenciaLabel: base.mesReferenciaLabel || FM_MONTHS[fmTodayMonth() - 1]?.label || "",
    filtros: base.filtros || { clientes: [], placas: [] },
    resumo: base.resumo || { atual: {}, anterior: {}, diferenca: {} },
    meses: Array.isArray(base.meses) ? base.meses : [],
  };
}

const FmKpi = ({ label, value, sub, tone, icon }) => (
  <div className="kpi" style={{borderLeft: `3px solid ${tone || "var(--border-strong)"}`}}>
    <div className="kpi-label"><Icon name={icon || "chart"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <span className="kpi-delta flat">{sub}</span>}
  </div>
);

const FmChart = ({ meses }) => {
  const max = Math.max(1, ...meses.flatMap((m) => [fmNum(m.atual?.faturamento), fmNum(m.anterior?.faturamento)]));
  return (
    <div className="fm-chart">
      {meses.map((m) => {
        const atual = fmNum(m.atual?.faturamento);
        const anterior = fmNum(m.anterior?.faturamento);
        const pct = m.diferenca?.faturamentoPct;
        const isUp = pct === null || pct === undefined ? null : fmNum(pct) >= 0;
        return (
          <div className="fm-month" key={m.mes} title={`${m.label}: ${fmBRL(atual)} | ${fmBRL(anterior)}`}>
            <div className={`fm-delta ${isUp === null ? "flat" : isUp ? "up" : "down"}`}>{pct === null || pct === undefined ? "-" : `${isUp ? "+" : ""}${fmPct(pct)}`}</div>
            <div className="fm-bars">
              <div className="fm-value fm-current">{fmShortBRL(atual)}</div>
              <div className="fm-pair">
                <i style={{height: `${Math.max(4, (atual / max) * 100)}%`}}/>
                <b style={{height: `${Math.max(4, (anterior / max) * 100)}%`}}/>
              </div>
              <div className="fm-value fm-previous">{fmShortBRL(anterior)}</div>
            </div>
            <strong>{m.label}</strong>
          </div>
        );
      })}
    </div>
  );
};

const ComparativoFaturamento = () => {
  const [ano, setAno] = React.useState(fmTodayYear());
  const [mesReferencia, setMesReferencia] = React.useState(fmTodayMonth());
  const [mesAno, setMesAno] = React.useState(fmTodayMonthYear());
  const [tipoVeiculo, setTipoVeiculo] = React.useState("todos");
  const [cliente, setCliente] = React.useState("");
  const [placa, setPlaca] = React.useState("");
  const [filters, setFilters] = React.useState({ ano: fmTodayYear(), mesReferencia: fmTodayMonth(), mesAno: fmTodayMonthYear(), modoMes: true, tipoVeiculo: "todos" });
  const [data, setData] = React.useState(() => fmNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getFaturamentoMensalComparativo(filters)
      .then((payload) => { if (active) setData(fmNormalize(payload)); })
      .catch((err) => { if (active) { setData(fmNormalize(null)); setError(err?.message || "Nao foi possivel carregar comparativo mensal."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const syncMonthYear = (value) => {
    setMesAno(value);
    const [nextYear, nextMonth] = String(value || "").split("-").map(Number);
    if (nextYear) setAno(nextYear);
    if (nextMonth) setMesReferencia(nextMonth);
  };

  const applyFilters = () => setFilters({ ano, mesReferencia, mesAno, modoMes: true, tipoVeiculo, cliente, placa });
  const applyTipo = (next) => {
    setTipoVeiculo(next);
    setFilters({ ano, mesReferencia, mesAno, modoMes: true, tipoVeiculo: next, cliente, placa });
  };

  const resumo = data.resumo || {};
  const diff = resumo.diferenca || {};

  return (
    <div className="view">
      <style>{`
        .fm-chart{height:326px;display:grid;grid-template-columns:repeat(auto-fit,minmax(86px,1fr));gap:10px;align-items:end;overflow-x:auto;padding-bottom:4px}
        .fm-month{height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;min-width:86px}
        .fm-delta{align-self:center;border:1px solid var(--border);border-radius:999px;padding:3px 7px;font-family:var(--font-mono);font-size:10px;background:rgba(255,255,255,.03)}
        .fm-delta.up{color:#22c55e;border-color:rgba(34,197,94,.25);background:rgba(34,197,94,.08)}
        .fm-delta.down{color:#ef4444;border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.08)}
        .fm-delta.flat{color:var(--text-3)}
        .fm-bars{height:230px;display:grid;grid-template-rows:18px 1fr 18px;align-items:end;justify-items:center;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.04);border-radius:8px;padding:8px 8px 0;overflow:hidden}
        .fm-pair{height:170px;display:flex;align-items:flex-end;justify-content:center;gap:7px;width:100%;border-bottom:1px solid rgba(255,255,255,.07)}
        .fm-pair i,.fm-pair b{width:18px;min-height:4px;border-radius:5px 5px 0 0;display:block}
        .fm-pair i{background:linear-gradient(180deg,#2dd36f,#16a34a);box-shadow:0 -6px 18px rgba(34,197,94,.16)}
        .fm-pair b{background:linear-gradient(180deg,#7b8797,#475569)}
        .fm-value{font-family:var(--font-mono);font-size:10px;line-height:1;white-space:nowrap}
        .fm-current{color:#22c55e}.fm-previous{color:var(--text-3)}
        .fm-month strong{text-align:center;color:var(--text-3);font-size:11px}
        .fm-legend{display:flex;gap:14px;align-items:center;font-size:11.5px;color:var(--text-3)}
        .fm-legend span{display:inline-flex;gap:5px;align-items:center}.fm-legend i{width:9px;height:9px;border-radius:2px;display:inline-block}
      `}</style>

      <div className="page-head">
        <div>
          <h1>Comparativo Mensal</h1>
          <div className="sub">Faturamento do mes selecionado comparado com o mesmo mes do ano anterior</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => { const value = `${fmTodayYear() - 1}-12`; setAno(fmTodayYear() - 1); setMesReferencia(12); setMesAno(value); setFilters({ ano: fmTodayYear() - 1, mesReferencia: 12, mesAno: value, modoMes: true, tipoVeiculo, cliente, placa }); }}>Dez ano passado</button>
          <button className="btn primary" onClick={() => { const value = fmTodayMonthYear(); setAno(fmTodayYear()); setMesReferencia(fmTodayMonth()); setMesAno(value); setFilters({ ano: fmTodayYear(), mesReferencia: fmTodayMonth(), mesAno: value, modoMes: true, tipoVeiculo, cliente, placa }); }}>Mes atual</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Mes/Ano
          <input type="month" value={mesAno} onChange={(e) => syncMonthYear(e.target.value)}/>
        </label>
        <label>Cliente<RBCombobox value={cliente} onChange={setCliente} options={data.filtros?.clientes || []} placeholder="Cliente pagador" getLabel={(c) => `${c.codigo || ""} ${c.nome || ""}`.trim()} getValue={(c) => c.codigo || c.nome || ""} tag={() => "Cliente"}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.filtros?.placas || []} placeholder="Placa" getLabel={(p) => p.placa || p} getValue={(p) => p.placa || p} transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Operacao
          <div className="fd-segment">
            <button type="button" className={`btn sm ${tipoVeiculo === "todos" ? "primary" : ""}`} onClick={() => applyTipo("todos")}>Todos</button>
            <button type="button" className={`btn sm ${tipoVeiculo === "frota" ? "primary" : ""}`} onClick={() => applyTipo("frota")}>Frota</button>
            <button type="button" className={`btn sm ${tipoVeiculo === "terceiro" ? "primary" : ""}`} onClick={() => applyTipo("terceiro")}>Terceiro</button>
          </div>
        </label>
        <button className="btn primary" onClick={applyFilters}>Aplicar</button>
      </div>

      {(loading || error) && <div className="card" style={{ marginBottom: 16, padding: "9px 14px" }}><span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando comparativo..." : error}</span></div>}

      <div className="grid cols-4" style={{marginBottom:16}}>
        <FmKpi label={`Faturamento ${data.ano}`} value={fmBRL(resumo.atual?.faturamento)} sub={`${resumo.atual?.lancamentos || 0} lancamentos`} tone="#22c55e" icon="trending-up"/>
        <FmKpi label={`Faturamento ${data.anoAnterior}`} value={fmBRL(resumo.anterior?.faturamento)} sub={`${resumo.anterior?.lancamentos || 0} lancamentos`} tone="#94a3b8" icon="calendar"/>
        <FmKpi label="Diferenca" value={fmBRL(diff.faturamento)} sub={fmPct(diff.faturamentoPct)} tone={fmNum(diff.faturamento) >= 0 ? "#22c55e" : "#ef4444"} icon="chart"/>
        <FmKpi label="Ticket medio" value={fmBRL(resumo.atual?.ticketMedio)} sub={`ano anterior ${fmBRL(resumo.anterior?.ticketMedio)}`} tone="#38bdf8" icon="gauge"/>
      </div>

      <div className="card card-flush" style={{marginBottom:16}}>
        <div className="card-header">
          <h3>Faturamento mes a mes</h3>
          <div className="fm-legend">
            <span>{data.mesReferenciaLabel}/{data.ano}</span>
            <span><i style={{background:"#22c55e"}}/> {data.ano}</span>
            <span><i style={{background:"rgba(148,163,184,.55)"}}/> {data.anoAnterior}</span>
          </div>
        </div>
        <div className="card-body"><FmChart meses={data.meses}/></div>
      </div>

      <div className="card card-flush">
        <div className="card-header"><h3>Mes selecionado</h3><span className="meta muted">{data.mesReferenciaLabel} - {data.ano} x {data.anoAnterior}</span></div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead><tr><th>Mes</th><th className="num">{data.ano}</th><th className="num">{data.anoAnterior}</th><th className="num">Diferenca</th><th className="num">%</th><th className="num">Ticket {data.ano}</th><th className="num">Clientes</th><th className="num">Lancamentos</th></tr></thead>
            <tbody>
              {data.meses.map((m) => (
                <tr key={m.mes}>
                  <td>{m.label}</td>
                  <td className="num">{fmBRL(m.atual?.faturamento)}</td>
                  <td className="num">{fmBRL(m.anterior?.faturamento)}</td>
                  <td className="num" style={{color: fmNum(m.diferenca?.faturamento) >= 0 ? "#22c55e" : "#ef4444"}}>{fmBRL(m.diferenca?.faturamento)}</td>
                  <td className="num">{fmPct(m.diferenca?.faturamentoPct)}</td>
                  <td className="num">{fmBRL(m.atual?.ticketMedio)}</td>
                  <td className="num">{m.atual?.clientes || 0} / {m.anterior?.clientes || 0}</td>
                  <td className="num">{m.atual?.lancamentos || 0} / {m.anterior?.lancamentos || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.ComparativoFaturamento = ComparativoFaturamento;

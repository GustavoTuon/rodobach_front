function scTodayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function scAddDaysISO(base, days) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function scNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function scDateTime(value) {
  if (!value) return "-";
  const raw = String(value);
  const [date, time = ""] = raw.replace("Z", "").split("T");
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}${time ? ` ${time.slice(0, 5)}` : ""}`;
}

function scKg(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(scNum(value));
}

function scBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(scNum(value));
}

function scEntrega(row) {
  if (row?.statusFonte === "pef_terceiro") return row.pefFimAt || row.entregaAt || row.chegadaViagemAt;
  return row?.entregaAt || row?.chegadaViagemAt;
}

function scNormalize(payload) {
  const base = payload && typeof payload === "object" ? payload : {};
  return {
    periodo: base.periodo || {},
    regra: base.regra || {},
    summary: base.summary || {},
    rows: Array.isArray(base.rows) ? base.rows : [],
    filters: base.filters || { placas: [], estados: [] },
  };
}

const SC_STATE = {
  carregado_confirmado: { label: "Carregado", tone: "#2563eb", bg: "rgba(37, 99, 235, 0.10)" },
  vazio_confirmado: { label: "Vazio", tone: "#16a34a", bg: "rgba(22, 163, 74, 0.10)" },
  vazio_provavel: { label: "Vazio provavel", tone: "#d97706", bg: "rgba(217, 119, 6, 0.11)" },
  vazio_sem_operacao: { label: "Sem carga ativa", tone: "var(--text-3)", bg: "var(--surface-2)" },
  indefinido: { label: "Indefinido", tone: "#dc2626", bg: "rgba(220, 38, 38, 0.10)" },
};

const ScBadge = ({ state }) => {
  const cfg = SC_STATE[state] || SC_STATE.indefinido;
  return (
    <span className="sc-badge" style={{ color: cfg.tone, background: cfg.bg, borderColor: cfg.tone }}>
      <span style={{ background: cfg.tone }}/>
      {cfg.label}
    </span>
  );
};

const SC_SITUATION = {
  carregado: { label: "Carregado", tone: "#2563eb", bg: "rgba(37, 99, 235, 0.10)" },
  vazio: { label: "Vazio", tone: "#16a34a", bg: "rgba(22, 163, 74, 0.10)" },
  indicio_operacional: { label: "Indicio operacional", tone: "#d97706", bg: "rgba(217, 119, 6, 0.11)" },
  divergente: { label: "Divergente", tone: "#dc2626", bg: "rgba(220, 38, 38, 0.10)" },
};

const ScSituation = ({ situation }) => {
  const cfg = SC_SITUATION[situation?.tipo] || SC_SITUATION.divergente;
  return (
    <span className="sc-situation" style={{ color: cfg.tone, background: cfg.bg, borderColor: cfg.tone }}>
      <span style={{ background: cfg.tone }}/>
      {situation?.label || cfg.label}
    </span>
  );
};

function scMainSituation(row) {
  if (row?.situacaoOperacional?.tipo !== "divergente") return row?.situacaoOperacional;
  if (row?.statusFonte === "pef_terceiro") {
    return {
      tipo: "indicio_operacional",
      label: "Indicio operacional",
      descricao: "Ha sinal operacional, mas sem CT-e confiavel para confirmar.",
    };
  }
  if (row?.estado === "carregado_confirmado") {
    return {
      tipo: "carregado",
      label: "Carregado",
      descricao: "Documento aponta carga ativa, mas existe divergencia para conferir.",
    };
  }
  return {
    tipo: "vazio",
    label: "Vazio",
    descricao: "Regra principal aponta vazio, mas existe divergencia para conferir.",
  };
}

const ScKpi = ({ label, value, sub, icon, tone }) => (
  <div className="kpi" style={{ borderLeft: `3px solid ${tone || "var(--border-strong)"}` }}>
    <div className="kpi-label"><Icon name={icon || "truck"}/><span>{label}</span></div>
    <div className="kpi-value">{value}</div>
    {sub && <span className="kpi-delta flat">{sub}</span>}
  </div>
);

const ScDivergence = ({ alert }) => {
  if (!alert) return <span className="muted" style={{ fontSize: 11 }}>-</span>;
  const tone = alert.nivel === "alto" ? "#ef4444" : alert.nivel === "medio" ? "#f59e0b" : "#38bdf8";
  return (
    <div className="sc-alert" style={{ borderColor: tone }}>
      <strong style={{ color: tone }}>{alert.label}</strong>
      <span>{alert.descricao}</span>
    </div>
  );
};

const StatusCargaFrota = () => {
  const [dataInicio, setDataInicio] = React.useState(scAddDaysISO(scTodayISO(), -90));
  const [placa, setPlaca] = React.useState("");
  const [estado, setEstado] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ dataInicio: scAddDaysISO(scTodayISO(), -90), estado: "todos" });
  const [data, setData] = React.useState(() => scNormalize(null));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getStatusCargaFrota(filters)
      .then((payload) => { if (active) setData(scNormalize(payload)); })
      .catch((err) => { if (active) { setData(scNormalize(null)); setError(err?.message || "Nao foi possivel carregar status de carga."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const apply = () => {
    setFilters({
      dataInicio,
      placa,
      estado,
      search,
    });
  };

  const clear = () => {
    const start = scAddDaysISO(scTodayISO(), -90);
    setDataInicio(start);
    setPlaca("");
    setEstado("todos");
    setSearch("");
    setFilters({ dataInicio: start, estado: "todos" });
  };

  const exportCsv = () => {
    const header = ["Placa","Situacao","Descricao Situacao","Estado Tecnico","Confianca","Documento","Cliente","Origem","Destino","Peso kg","Saida","Entrega","Alerta","Descricao Alerta","CIOT","Valor Frete","Carta Frete","Status Carta","Motorista Frete","Fim PEF","Evidencia"];
    const body = data.rows.map((row) => [
      row.placa, row.situacaoOperacional?.label, row.situacaoOperacional?.descricao, row.estadoLabel, row.confianca,
      row.documento, row.cliente, row.origem, row.destino,
      row.pesoKg, row.saidaAt, scEntrega(row), row.alertaDivergencia?.label, row.alertaDivergencia?.descricao,
      row.ciot, row.valorFrete, row.cartaFrete, row.cartaFreteStatus, row.motoristaFrete, row.pefFimAt, row.evidencia,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob([[header.join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-carga-frota-${data.periodo?.startDate || dataInicio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data.summary || {};
  const situacoes = s.situacoes || {};
  const regraSituacoes = data.regra?.situacoes || {};

  return (
    <div className="view">
      <style>{`
        .sc-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid;border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:650;white-space:nowrap}
        .sc-badge span{width:7px;height:7px;border-radius:50%;display:inline-block;flex:0 0 auto}
        .sc-situation{display:inline-flex;align-items:center;gap:6px;border:1px solid;border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:700;white-space:nowrap}
        .sc-situation span{width:7px;height:7px;border-radius:50%;display:inline-block;flex:0 0 auto}
        .sc-situation-stack{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .sc-divergent-chip{display:inline-flex;align-items:center;border:1px solid #dc2626;color:#dc2626;background:rgba(220,38,38,.08);border-radius:999px;padding:3px 7px;font-size:10.5px;font-weight:750;white-space:nowrap}
        .sc-situation-desc{font-size:11px;color:var(--text-3);line-height:1.3;margin-top:5px;width:170px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .sc-technical{font-size:10.5px;color:var(--text-3);margin-top:5px;white-space:nowrap}
        .sc-rule{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .sc-rule-item{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:10px 12px;min-height:74px}
        .sc-rule-item strong{display:block;font-size:12px;margin-bottom:5px;color:var(--text)}
        .sc-rule-item span{display:block;font-size:11.5px;color:var(--text-3);line-height:1.35}
        .sc-evidence{font-size:11.5px;color:var(--text-3);line-height:1.35;width:245px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .sc-doc{font-family:var(--font-mono);font-size:12px;white-space:nowrap}
        .sc-pef{margin-top:5px;font-size:11px;color:var(--text-3);line-height:1.35;width:220px}
        .sc-pef div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sc-pef b{color:var(--text-2);font-weight:650}
        .sc-alert{border-left:3px solid;padding-left:8px;font-size:11px;line-height:1.35;width:195px}
        .sc-alert strong{display:block;font-size:11.5px;margin-bottom:2px}
        .sc-alert span{display:-webkit-box;color:var(--text-3);-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .sc-location{font-size:11.5px;line-height:1.35;min-width:180px;max-width:230px}
        .sc-location strong{display:block;color:var(--text);font-size:12px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sc-location span{display:block;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sc-location a{color:var(--brand-blue);text-decoration:none;font-weight:650}
        .sc-route{display:flex;align-items:center;gap:6px;min-width:190px;max-width:220px}
        .sc-route b{font-weight:600;color:var(--text);white-space:normal;line-height:1.25}
        .sc-route span{color:var(--text-3)}
        .sc-status-table{min-width:1540px;table-layout:fixed}
        .sc-status-table th:nth-child(1),.sc-status-table td:nth-child(1){width:96px}
        .sc-status-table th:nth-child(2),.sc-status-table td:nth-child(2){width:190px}
        .sc-status-table th:nth-child(3),.sc-status-table td:nth-child(3){width:250px}
        .sc-status-table th:nth-child(4),.sc-status-table td:nth-child(4){width:220px}
        .sc-status-table th:nth-child(5),.sc-status-table td:nth-child(5){width:230px}
        .sc-status-table th:nth-child(6),.sc-status-table td:nth-child(6){width:80px}
        .sc-status-table th:nth-child(7),.sc-status-table td:nth-child(7){width:120px}
        .sc-status-table th:nth-child(8),.sc-status-table td:nth-child(8){width:120px}
        .sc-status-table th:nth-child(9),.sc-status-table td:nth-child(9){width:210px}
        .sc-status-table th:nth-child(10),.sc-status-table td:nth-child(10){width:260px}
        @media (max-width:980px){.sc-rule{grid-template-columns:1fr 1fr}.sc-route{min-width:0;display:block}}
        @media (max-width:640px){.sc-rule{grid-template-columns:1fr}}
      `}</style>

      <div className="page-head">
        <div>
          <h1>Status de Carga</h1>
          <div className="sub">Frota própria classificada por CT-e, saída da coleta/viagem e entrega registrada</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setFilters({ ...filters })}><Icon name="refresh"/> Atualizar</button>
          <button className="btn" onClick={exportCsv}><Icon name="download"/> CSV</button>
        </div>
      </div>

      <div className="period-filter">
        <label>Desde<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></label>
        <label>Placa<RBCombobox value={placa} onChange={setPlaca} options={data.filters?.placas || []} placeholder="Todas" transform={(v) => v.toUpperCase()} tag={() => "Placa"}/></label>
        <label>Situacao
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {(data.filters?.estados || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>Busca<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente, destino, documento..."/></label>
        <button className="btn primary" onClick={apply}>Aplicar filtros</button>
        <button className="btn" onClick={clear}>Limpar</button>
      </div>

      {(loading || error) && (
        <div className="card" style={{ marginBottom: 16, padding: "9px 14px" }}>
          <span className={error ? "kpi-delta down" : "muted"}>{loading ? "Carregando status da frota..." : error}</span>
        </div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <ScKpi label="Frota analisada" value={s.total || 0} sub={`${data.periodo?.startDate || dataInicio} ate hoje`} tone="var(--border-strong)" icon="truck"/>
        <ScKpi label="Carregados" value={situacoes.carregado || 0} sub={`${scKg(s.pesoEmAbertoKg)} kg em aberto`} tone="#2563eb" icon="package"/>
        <ScKpi label="Vazios" value={situacoes.vazio || 0} sub="CT-e entregue/base/sem operacao" tone="#16a34a" icon="check"/>
        <ScKpi label="Indicios / divergencias" value={(situacoes.indicioOperacional || 0) + (situacoes.divergente || 0)} sub={`${situacoes.indicioOperacional || 0} indicios | ${situacoes.divergente || 0} divergentes`} tone="#d97706" icon="alert"/>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ color: "var(--text)", fontSize: 14 }}>Situacoes operacionais</h2>
            <div className="muted" style={{ fontSize: 12 }}>A placa mostra primeiro se esta carregada ou vazia; divergencia aparece como alerta de conferencia.</div>
          </div>
        </div>
        <div className="sc-rule">
          <div className="sc-rule-item"><strong>Carregado</strong><span>{regraSituacoes.carregado || "Documento confiavel ativo."}</span></div>
          <div className="sc-rule-item"><strong>Vazio</strong><span>{regraSituacoes.vazio || "CT-e entregue, base/patio ou sem operacao ativa."}</span></div>
          <div className="sc-rule-item"><strong>Indicio operacional</strong><span>{regraSituacoes.indicioOperacional || "Localizacao ou informacao operacional sugere viagem, mas sem documento confiavel."}</span></div>
          <div className="sc-rule-item"><strong>Divergente</strong><span>{regraSituacoes.divergente || "Alerta quando documento, telemetria ou ERP sugerem uma conferencia sobre o status principal."}</span></div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Veiculos da frota</h3>
          <span className="meta muted">{data.rows.length} placas</span>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl sc-status-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Situacao</th>
                <th>CT-e / Cliente</th>
                <th>Rota</th>
                <th>Localizacao</th>
                <th className="num">Peso</th>
                <th>Saida</th>
                <th>Entrega / PEF</th>
                <th>Alerta</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const mainSituation = scMainSituation(row);
                const isDivergent = row.situacaoOperacional?.tipo === "divergente";
                return (
                <tr key={`${row.placa}-${row.documento || "sem-doc"}`}>
                  <td>
                    <Plate value={row.placa}/>
                    <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{row.modelo || row.veiculo || "-"}</div>
                  </td>
                  <td>
                    <div className="sc-situation-stack">
                      <ScSituation situation={mainSituation}/>
                      {isDivergent && <span className="sc-divergent-chip">Divergente</span>}
                    </div>
                    <div className="sc-situation-desc" title={mainSituation?.descricao || ""}>{mainSituation?.descricao || "-"}</div>
                    <div className="sc-technical">Tec.: {row.estadoLabel || "-"} | Conf. {row.confianca || "-"}</div>
                  </td>
                  <td>
                    <div className="sc-doc">{row.documento || "-"}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 3, maxWidth: 210, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.cliente || "-"}</div>
                    {row.statusFonte === "pef_terceiro" && (
                      <div className="sc-pef">
                        <div><b>CIOT:</b> {row.ciot || "-"}</div>
                        <div><b>Frete:</b> {scBRL(row.valorFrete)} · <b>Carta:</b> {row.cartaFrete || "-"}</div>
                        <div><b>Carta:</b> {row.cartaFreteStatus || "-"}{row.cartaFreteMotivo ? ` · ${row.cartaFreteMotivo}` : ""}</div>
                        <div><b>Motorista:</b> {row.motoristaFrete || "-"}</div>
                        {row.pefDocumentos ? <div><b>Docs:</b> {row.pefDocumentos}</div> : null}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="sc-route">
                      <b>{row.origem || "-"}</b>
                      <Icon name="arrow-right" size={13}/>
                      <b>{row.destino || "-"}</b>
                    </div>
                  </td>
                  <td>
                    <div className="sc-location">
                      <strong>{row.localizacao?.cidadeUf || "-"}</strong>
                      <span>{row.localizacao?.endereco || "Sem endereco na telemetria"}</span>
                      <span>
                        {row.localizacao?.dataHora ? scDateTime(row.localizacao.dataHora) : "-"}
                        {row.localizacao?.velocidade !== null && row.localizacao?.velocidade !== undefined ? ` · ${row.localizacao.velocidade} km/h` : ""}
                      </span>
                      {row.localizacao?.mapsUrl && <a href={row.localizacao.mapsUrl} target="_blank" rel="noreferrer">Abrir mapa</a>}
                    </div>
                  </td>
                  <td className="num">{row.pesoKg ? `${scKg(row.pesoKg)} kg` : "-"}</td>
                  <td>{scDateTime(row.saidaAt || row.emissaoAt)}</td>
                  <td>{scDateTime(scEntrega(row))}</td>
                  <td><ScDivergence alert={row.alertaDivergencia}/></td>
                  <td><div className="sc-evidence">{row.evidencia || "-"}</div></td>
                </tr>
              );})}
              {!data.rows.length && <tr><td colSpan="10" className="muted">Nenhum veiculo encontrado para os filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

window.StatusCargaFrota = StatusCargaFrota;

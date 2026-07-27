const rfNum = (value) => Number(value) || 0;
const rfMoney = (value) => rfNum(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rfPct = (value) => `${rfNum(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const rfDate = (value) => value ? String(value).slice(0, 10).split("-").reverse().join("/") : "-";
const rfToday = () => new Date().toISOString().slice(0, 10);
const rfDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

function RfKpi({ label, data, tone }) {
  return (
    <div className="kpi" style={{ borderLeftColor: tone }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{rfMoney(data?.lucro)}</div>
      <div className={`kpi-delta ${rfNum(data?.lucro) >= 0 ? "up" : "down"}`}>
        Receita {rfMoney(data?.receita)} · Custo {rfMoney(data?.custo)} · {data?.documentos || 0} CT-e(s)
      </div>
    </div>
  );
}

function RfRanking({ title, rows }) {
  return (
    <div className="card card-flush">
      <div className="card-header"><h3>{title}</h3><span className="meta">por receita</span></div>
      <div className="table-wrap">
        <table className="data-table compact">
          <thead><tr><th>Nome</th><th className="num">Receita</th><th className="num">Custo</th><th className="num">Lucro</th></tr></thead>
          <tbody>
            {(rows || []).slice(0, 10).map((row) => (
              <tr key={row.nome}>
                <td>{row.nome}</td>
                <td className="num">{rfMoney(row.receita)}</td>
                <td className="num">{rfMoney(row.custo)}</td>
                <td className="num" style={{ color: rfNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rfMoney(row.lucro)}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan="4" className="muted">Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ResultadoFretes = () => {
  const [dataInicial, setDataInicial] = React.useState(rfDaysAgo(29));
  const [dataFinal, setDataFinal] = React.useState(rfToday());
  const [ufBase, setUfBase] = React.useState("SC");
  const [direcao, setDirecao] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ dataInicial: rfDaysAgo(29), dataFinal: rfToday(), ufBase: "SC", direcao: "todos" });
  const [data, setData] = React.useState({ resumo: {}, comparativo: {}, documentos: [], rankings: {} });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const id = "rb-resultado-fretes-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .rf-filter{display:grid;grid-template-columns:160px 160px 100px 150px auto;gap:10px;align-items:end;margin-bottom:14px}
      .rf-filter label{font-size:11px;color:var(--text-3);display:grid;gap:5px}
      .rf-filter input,.rf-filter select,.rf-search{
        width:100%;
        color:var(--text);
        background:var(--surface-2, #111318);
        border:1px solid var(--border);
        color-scheme:dark;
      }
      .rf-filter input:focus,.rf-filter select:focus,.rf-search:focus{
        outline:none;
        border-color:var(--brand-blue, #4f7cff);
        box-shadow:0 0 0 2px rgba(79,124,255,.14);
      }
      .rf-filter select option{color:#e5e7eb;background:#111318}
      .rf-filter input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.85);opacity:.8}
      .rf-search::placeholder{color:var(--text-3)}
      .rf-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
      .rf-rankings{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
      .rf-badge{display:inline-flex;padding:3px 8px;border-radius:999px;font-size:10.5px;border:1px solid}
      .rf-badge.ida{color:#38bdf8;border-color:#075985;background:#082f49}
      .rf-badge.retorno{color:#c4b5fd;border-color:#6d28d9;background:#2e1065}
      @media(max-width:1000px){.rf-filter,.rf-summary,.rf-rankings{grid-template-columns:1fr 1fr}}
      @media(max-width:650px){.rf-filter,.rf-summary,.rf-rankings{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getResultadoFretes(filters)
      .then((payload) => { if (active) setData(payload || {}); })
      .catch((err) => { if (active) setError(err?.message || "Nao foi possivel carregar a analise."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const documentos = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.documentos || [];
    return (data.documentos || []).filter((row) =>
      [row.numero, row.cliente, row.placa, row.motorista, row.origem, row.destino]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [data.documentos, search]);

  const apply = () => setFilters({ dataInicial, dataFinal, ufBase: ufBase.toUpperCase(), direcao });
  const total = data.resumo || {};
  const ida = data.comparativo?.ida || {};
  const retorno = data.comparativo?.retorno || {};

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Resultado por frete documental</h1>
          <div className="sub">CT-es da frota propria separados entre ida e retorno, com apenas custos ligados a operacao.</div>
        </div>
      </div>

      <div className="card rf-filter">
        <label>Emissao inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Emissao final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>UF base<input maxLength="2" value={ufBase} onChange={(e) => setUfBase(e.target.value.toUpperCase())}/></label>
        <label>Direcao<select value={direcao} onChange={(e) => setDirecao(e.target.value)}><option value="todos">Ida e retorno</option><option value="ida">Somente ida</option><option value="retorno">Somente retorno</option></select></label>
        <button className="btn primary" onClick={apply}>Analisar documentos</button>
      </div>

      {error && <div className="card" style={{ marginBottom: 14, borderColor: "var(--crit-border)" }}><span className="kpi-delta down">{error}</span></div>}
      {loading && <div className="card muted" style={{ marginBottom: 14 }}>Analisando CT-es e custos operacionais...</div>}

      <div className="rf-summary">
        <RfKpi label="Resultado total" data={total} tone="#22c55e"/>
        <RfKpi label={`Fretes de ida — origem ${data.ufBase || ufBase}`} data={ida} tone="#38bdf8"/>
        <RfKpi label={`Fretes de retorno — origem fora de ${data.ufBase || ufBase}`} data={retorno} tone="#8b5cf6"/>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <div><h3>CT-es da frota propria</h3><div className="meta">{documentos.length} documento(s) · margem {rfPct(total.margem)} · {data.pendencias || 0} pendencia(s) de custo</div></div>
          <input className="rf-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar CT-e, cliente, placa ou rota..." style={{ minWidth: 300 }}/>
        </div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead><tr><th>Emissao</th><th>CT-e</th><th>Direcao</th><th>Cliente</th><th>Placa / motorista</th><th>Rota</th><th className="num">Receita</th><th className="num">Veiculo</th><th className="num">Motorista</th><th className="num">Carga</th><th className="num">Custo</th><th className="num">Lucro</th></tr></thead>
            <tbody>
              {documentos.map((row) => (
                <tr key={row.id}>
                  <td>{rfDate(row.data)}</td>
                  <td><strong>{row.numero || row.codigo}</strong>{row.serie ? <div className="muted">Serie {row.serie}</div> : null}</td>
                  <td><span className={`rf-badge ${row.direcao}`}>{row.direcaoLabel}</span></td>
                  <td>{row.cliente}</td>
                  <td><strong>{row.placa || "-"}</strong><div className="muted">{row.motorista || "Motorista nao informado"}</div></td>
                  <td>{row.origem || "-"} → {row.destino || "-"}</td>
                  <td className="num">{rfMoney(row.receita)}</td>
                  <td className="num">{rfMoney(row.custoVeiculo)}</td>
                  <td className="num">{rfMoney(row.custoMotorista)}</td>
                  <td className="num">{rfMoney(row.custoCarga)}</td>
                  <td className="num">{rfMoney(row.custo)}</td>
                  <td className="num" style={{ color: rfNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rfMoney(row.lucro)}</td>
                </tr>
              ))}
              {!loading && !documentos.length && <tr><td colSpan="12" className="muted">Nenhum CT-e de frota propria encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rf-rankings">
        <RfRanking title="Resultado por cliente" rows={data.rankings?.clientes}/>
        <RfRanking title="Resultado por placa" rows={data.rankings?.placas}/>
        <RfRanking title="Resultado por motorista" rows={data.rankings?.motoristas}/>
      </div>

      <div className="muted" style={{ marginTop: 12, fontSize: 11.5 }}>
        Fonte: {data.fonte}. Excluidos: {data.custosConsiderados?.excluidos}
      </div>
    </div>
  );
};

window.ResultadoFretes = ResultadoFretes;

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

function RfKpi({ label, data, tone, hint }) {
  const lucro = rfNum(data?.lucro);
  return (
    <div className="kpi rf-kpi" style={{ "--rf-tone": tone }}>
      <div className="rf-kpi-top"><div className="kpi-label">{label}</div><span>{data?.documentos || 0} CT-es</span></div>
      {hint && <div className="rf-kpi-hint">{hint}</div>}
      <div className="kpi-value">{rfMoney(lucro)}</div>
      <div className={`kpi-delta ${lucro >= 0 ? "up" : "down"}`}>
        <span>Receita {rfMoney(data?.receita)}</span><span>Custo {rfMoney(data?.custo)}</span>
      </div>
      <div className="rf-kpi-bar"><i style={{ width: `${Math.max(0, Math.min(100, rfNum(data?.margem)))}%` }}/></div>
      <div className="rf-kpi-margin">Margem {rfPct(data?.margem)}</div>
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

function RfAudit({ audit }) {
  const items = [
    ["Prejuízo", audit?.documentosPrejuizo, "danger"],
    ["Sem custo", audit?.documentosSemCusto, "warn"],
    ["Sem viagem", audit?.documentosSemViagem, "warn"],
    ["UF pendente", audit?.documentosUfPendente, "warn"],
    ["Receita até R$ 100", audit?.documentosReceitaAte100, "warn"],
    ["Fora da base", audit?.trechosForaBase, "info"],
  ];
  return (
    <div className="card rf-audit">
      <div className="rf-audit-head">
        <div><h3>Auditoria operacional</h3><div className="meta">Pontos que merecem conferência no período</div></div>
        <span className={`rf-audit-status ${audit?.totaisConferem ? "ok" : "danger"}`}>{audit?.totaisConferem ? "Totais conciliados" : "Revisar totais"}</span>
      </div>
      <div className="rf-audit-grid">
        {items.map(([label, value, tone]) => <div key={label} className={`rf-audit-item ${tone}`}><strong>{value || 0}</strong><span>{label}</span></div>)}
      </div>
      <div className="rf-audit-note">{audit?.ressalva}</div>
    </div>
  );
}

function RfDecision({ title, question, data, tone, detail, active, onClick }) {
  const lucro = rfNum(data?.lucro);
  const positive = lucro >= 0;
  return (
    <button type="button" className={`rf-decision ${positive ? "positive" : "negative"} ${active ? "active" : ""}`} style={{ "--rf-tone": tone }} onClick={onClick}>
      <div className="rf-decision-head"><span>{title}</span><strong>{positive ? "Positivo" : "Prejuízo"}</strong></div>
      <div className="rf-decision-question">{question}</div>
      <div className="rf-decision-value">{rfMoney(lucro)}</div>
      <div className="rf-decision-meta"><span>{data?.documentos || 0} CT-es</span><span>Receita {rfMoney(data?.receita)}</span><span>Margem {rfPct(data?.margem)}</span></div>
      {detail && <div className="rf-decision-detail">{detail}</div>}
    </button>
  );
}

function RfDocumentRows({ rows }) {
  return (rows || []).map((row) => (
    <tr key={row.id} className={rfNum(row.lucro) < 0 ? "rf-row-loss" : ""}>
      <td>{rfDate(row.data)}</td>
      <td><strong>{row.numero || row.codigo}</strong>{row.serie ? <div className="muted">Série {row.serie}</div> : null}</td>
      <td><span className={`rf-badge ${row.movimento || row.direcao}`}>{row.movimentoLabel || row.direcaoLabel}</span></td>
      <td>{row.comercial || "Não informado"}{row.retornoComercial ? <div className="muted">Retorno comercial</div> : null}</td>
      <td>{row.cliente}</td>
      <td><strong>{row.placa || "-"}</strong><div className="muted">{row.motorista || "Motorista não informado"}</div></td>
      <td>{row.origem || "-"} → {row.destino || "-"}</td>
      <td className="num">{rfMoney(row.receita)}</td>
      <td className="num">{rfMoney(row.custoVeiculo)}</td>
      <td className="num">{rfMoney(row.custoMotorista)}</td>
      <td className="num">{rfMoney(row.custoCarga)}</td>
      <td className="num">{rfMoney(row.custo)}</td>
      <td className="num" style={{ color: rfNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rfMoney(row.lucro)}</td>
    </tr>
  ));
}

const ResultadoFretes = () => {
  const [dataInicial, setDataInicial] = React.useState(rfDaysAgo(29));
  const [dataFinal, setDataFinal] = React.useState(rfToday());
  const [ufBase, setUfBase] = React.useState("SC");
  const [movimento, setMovimento] = React.useState("todos");
  const [valorMaximoPequeno, setValorMaximoPequeno] = React.useState(1500);
  const [search, setSearch] = React.useState("");
  const [placa, setPlaca] = React.useState("todas");
  const [origemUf, setOrigemUf] = React.useState("todas");
  const [destinoUf, setDestinoUf] = React.useState("todas");
  const [faixaResultado, setFaixaResultado] = React.useState("todos");
  const [comercial, setComercial] = React.useState("todos");
  const [somenteExcecoes, setSomenteExcecoes] = React.useState(false);
  const [visao, setVisao] = React.useState("veiculos");
  const [filters, setFilters] = React.useState({ dataInicial: rfDaysAgo(29), dataFinal: rfToday(), ufBase: "SC", direcao: "todos", valorMaximoPequeno: 1500 });
  const [data, setData] = React.useState({ resumo: {}, movimentos: {}, documentos: [], rankings: {} });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const id = "rb-resultado-fretes-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .rf-page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}
      .rf-page-head h1{font-size:24px;letter-spacing:-.02em;margin-bottom:5px}.rf-page-head .sub{max-width:720px}
      .rf-head-tag{display:flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(167,139,250,.3);border-radius:999px;background:rgba(139,92,246,.08);color:#c4b5fd;font-size:11px;white-space:nowrap}
      .rf-head-tag:before{content:"";width:7px;height:7px;border-radius:50%;background:#a78bfa;box-shadow:0 0 12px #a78bfa}
      .rf-filter{display:grid;grid-template-columns:145px 145px 70px minmax(240px,1fr) 145px auto;gap:10px;align-items:end;margin-bottom:16px;padding:16px;background:linear-gradient(135deg,rgba(56,189,248,.035),transparent 45%),var(--surface-1)}
      .rf-filter label{font-size:11px;color:var(--text-3);display:grid;gap:5px}
      .rf-filter input,.rf-filter select,.rf-search,.rf-toolbar select{width:100%;color:var(--text);background:var(--surface-2,#111318);border:1px solid var(--border);border-radius:7px;color-scheme:dark;min-height:36px;padding-inline:10px}
      .rf-filter input:focus,.rf-filter select:focus,.rf-search:focus,.rf-toolbar select:focus{outline:none;border-color:var(--brand-blue,#4f7cff);box-shadow:0 0 0 2px rgba(79,124,255,.14)}
      .rf-filter select option,.rf-toolbar option{color:#e5e7eb;background:#111318}
      .rf-filter input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.85);opacity:.8}
      .rf-search::placeholder{color:var(--text-3)}
      .rf-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px}
      .rf-kpi{position:relative;overflow:hidden;border:1px solid var(--border);border-left:0!important;padding:16px 17px;background:linear-gradient(145deg,color-mix(in srgb,var(--rf-tone) 8%,transparent),transparent 55%),var(--surface-1)}
      .rf-kpi:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--rf-tone)}
      .rf-kpi-top{display:flex;justify-content:space-between;align-items:center}.rf-kpi-top>span{font-size:9.5px;padding:3px 7px;border-radius:999px;color:var(--text-2);background:rgba(255,255,255,.045)}
      .rf-kpi-hint{font-size:9.5px;color:var(--text-3);margin-top:5px;min-height:14px}.rf-kpi .kpi-value{font-size:23px;margin:9px 0 8px;letter-spacing:-.02em}.rf-kpi .kpi-delta{display:flex;justify-content:space-between;gap:8px;font-size:9.5px;color:var(--text-3)}
      .rf-kpi-bar{height:3px;background:rgba(255,255,255,.06);border-radius:4px;margin-top:12px;overflow:hidden}.rf-kpi-bar i{display:block;height:100%;background:var(--rf-tone);border-radius:4px}
      .rf-kpi-margin{text-align:right;color:var(--text-3);font-size:9px;margin-top:4px}
      .rf-guide{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:11px 14px;margin:-4px 0 16px;border:1px solid rgba(167,139,250,.2);border-radius:9px;background:linear-gradient(90deg,rgba(139,92,246,.07),rgba(56,189,248,.025))}
      .rf-guide strong{font-size:11px;color:#c4b5fd;white-space:nowrap}.rf-guide span{font-size:10.5px;color:var(--text-2);line-height:1.45}.rf-guide b{color:var(--text);font-weight:600}
      .rf-rankings{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
      .rf-badge{display:inline-flex;padding:3px 8px;border-radius:999px;font-size:10.5px;border:1px solid;white-space:nowrap}
      .rf-badge.saida,.rf-badge.ida{color:#38bdf8;border-color:#075985;background:#082f49}
      .rf-badge.chegada{color:#86efac;border-color:#166534;background:#052e16}
      .rf-badge.fora{color:#fbbf24;border-color:#92400e;background:#451a03}
      .rf-badge.interno,.rf-badge.retorno{color:#c4b5fd;border-color:#6d28d9;background:#2e1065}
      .rf-badge.indefinido{color:#fca5a5;border-color:#991b1b;background:#450a0a}
      .rf-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.012);position:sticky;top:0;z-index:3;backdrop-filter:blur(10px)}
      .rf-toolbar select{width:auto;min-width:130px;height:34px}
      .rf-toggle{display:flex;margin-left:auto;border:1px solid var(--border);border-radius:7px;overflow:hidden}
      .rf-toggle button{border:0;border-radius:0;background:transparent;color:var(--text-3);padding:8px 12px;cursor:pointer}
      .rf-toggle button.active{background:var(--brand-blue,#3346a8);color:white}
      .rf-check{display:flex;align-items:center;gap:7px;color:var(--text-2);font-size:12px}.rf-check input{width:auto}
      .rf-audit{margin-bottom:16px;background:linear-gradient(110deg,rgba(245,158,11,.025),transparent 40%),var(--surface-1)}.rf-audit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
      .rf-audit-status{font-size:11px;border-radius:999px;padding:5px 9px;border:1px solid}.rf-audit-status.ok{color:#86efac;border-color:#166534;background:#052e16}.rf-audit-status.danger{color:#fca5a5;border-color:#991b1b;background:#450a0a}
      .rf-audit-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.rf-audit-item{display:grid;gap:2px;padding:9px;border:1px solid var(--border);border-radius:7px}.rf-audit-item strong{font-size:18px}.rf-audit-item span{font-size:10.5px;color:var(--text-3)}
      .rf-audit-item.danger strong{color:#f87171}.rf-audit-item.warn strong{color:#fbbf24}.rf-audit-item.info strong{color:#60a5fa}.rf-audit-note{font-size:11px;color:var(--text-3);margin-top:10px}
      .rf-decisions{display:grid;grid-template-columns:repeat(10,1fr);gap:12px;margin-bottom:16px}.rf-decision{grid-column:span 2}
      .rf-decision{position:relative;overflow:hidden;border:1px solid var(--border);border-top:0;border-radius:10px;padding:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--rf-tone) 6%,transparent),transparent 55%),var(--surface-1,#101114);color:var(--text);text-align:left;cursor:pointer;font:inherit;width:100%;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .rf-decision:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:var(--rf-tone)}
      .rf-decision:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--rf-tone) 55%,var(--border));box-shadow:0 10px 30px rgba(0,0,0,.14)}.rf-decision.active{box-shadow:0 0 0 2px color-mix(in srgb,var(--rf-tone) 24%,transparent);border-color:var(--rf-tone)}
      .rf-decision-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.rf-decision-head span{font-size:12px;font-weight:700}.rf-decision-head strong{font-size:9.5px;text-transform:uppercase;border-radius:999px;padding:4px 7px}
      .rf-decision.positive .rf-decision-head strong{color:#86efac;background:#052e16}.rf-decision.negative .rf-decision-head strong{color:#fca5a5;background:#450a0a}
      .rf-decision-question{font-size:10.5px;color:var(--text-3);margin-top:8px;min-height:30px;line-height:1.45}.rf-decision-value{font-size:22px;font-weight:700;margin-top:9px;letter-spacing:-.02em}.rf-decision-meta,.rf-decision-detail{font-size:9.5px;color:var(--text-3);margin-top:7px}.rf-decision-meta{display:flex;gap:8px;flex-wrap:wrap}.rf-decision-meta span{padding-right:8px;border-right:1px solid var(--divider)}.rf-decision-meta span:last-child{border:0}.rf-decision-detail{padding-top:8px;border-top:1px solid var(--divider)}
      .rf-operation{overflow:visible}.rf-operation .card-header{padding:16px 18px;background:linear-gradient(90deg,rgba(56,189,248,.035),transparent 35%)}
      .rf-vehicles{display:grid;gap:9px;padding:12px}.rf-vehicle{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface-1,#101114);transition:border-color .18s ease,background .18s ease}
      .rf-vehicle:hover{border-color:rgba(148,163,184,.32);background:rgba(255,255,255,.018)}.rf-vehicle[open]{border-color:rgba(96,165,250,.38)}
      .rf-vehicle summary{list-style:none;display:grid;grid-template-columns:minmax(150px,1fr) 90px 120px 120px 120px 26px;gap:12px;align-items:center;padding:13px 15px;cursor:pointer}.rf-vehicle summary::-webkit-details-marker{display:none}.rf-vehicle summary:hover{background:rgba(255,255,255,.025)}
      .rf-vehicle-route{font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rf-vehicle-value{text-align:right}.rf-vehicle-value span{display:block;color:var(--text-3);font-size:9.5px;margin-bottom:3px}.rf-vehicle-value strong{font-size:12px}
      .rf-counts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.rf-counts span{font-size:9px;color:var(--text-2);padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.04)}.rf-row-loss{background:rgba(239,68,68,.055)}
      @media(max-width:1400px){.rf-decisions{grid-template-columns:repeat(6,1fr)}.rf-decision{grid-column:span 2}.rf-decision:nth-child(4),.rf-decision:nth-child(5){grid-column:span 3}}
      @media(max-width:1350px){.rf-summary{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:1200px){.rf-summary{grid-template-columns:1fr 1fr}.rf-rankings{grid-template-columns:1fr 1fr}.rf-filter{grid-template-columns:1fr 1fr 80px 1fr}.rf-filter label:nth-child(4){grid-column:span 2}}
      @media(max-width:1000px){.rf-filter,.rf-summary,.rf-rankings{grid-template-columns:1fr 1fr}.rf-audit-grid{grid-template-columns:repeat(3,1fr)}.rf-vehicle summary{grid-template-columns:1fr 80px 100px 26px}.rf-vehicle-value.cost,.rf-vehicle-value.revenue{display:none}}
      @media(max-width:760px){.rf-page-head{align-items:flex-start;flex-direction:column}.rf-filter,.rf-summary,.rf-rankings,.rf-decisions{grid-template-columns:1fr}.rf-filter label:nth-child(4),.rf-decision,.rf-decision:nth-child(4),.rf-decision:nth-child(5){grid-column:span 1}.rf-audit-grid{grid-template-columns:1fr 1fr}.rf-toggle{margin-left:0}.rf-head-tag{display:none}}
    `;
    document.head.appendChild(style);
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getResultadoFretes(filters)
      .then((payload) => { if (active) setData(payload || {}); })
      .catch((err) => { if (active) setError(err?.message || "Não foi possível carregar a análise."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const documentos = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.documentos || []).filter((row) => {
      const matchesSearch = !q || [row.numero, row.cliente, row.placa, row.motorista, row.comercial, row.origem, row.destino].filter(Boolean).join(" ").toLowerCase().includes(q);
      const exception = rfNum(row.lucro) < 0 || row.pendenciaCusto || (rfNum(row.receita) > 0 && rfNum(row.receita) <= 100);
      const matchesFaixa = faixaResultado === "todos"
        || (faixaResultado === "pequenos" && rfNum(row.receita) > 0 && rfNum(row.receita) <= valorMaximoPequeno)
        || (faixaResultado === "prejuizo" && rfNum(row.lucro) < 0)
        || (faixaResultado === "rentaveis" && rfNum(row.lucro) >= 0);
      return matchesSearch && matchesFaixa && (placa === "todas" || row.placa === placa) && (origemUf === "todas" || row.origemUf === origemUf) && (destinoUf === "todas" || row.destinoUf === destinoUf) && (comercial === "todos" || row.comercial === comercial) && (!somenteExcecoes || exception);
    });
  }, [data.documentos, search, placa, origemUf, destinoUf, comercial, faixaResultado, valorMaximoPequeno, somenteExcecoes]);

  const opcoes = React.useMemo(() => ({
    placas: [...new Set((data.documentos || []).map((row) => row.placa).filter(Boolean))].sort(),
    origens: [...new Set((data.documentos || []).map((row) => row.origemUf).filter(Boolean))].sort(),
    destinos: [...new Set((data.documentos || []).map((row) => row.destinoUf).filter(Boolean))].sort(),
    comerciais: [...new Set((data.documentos || []).map((row) => row.comercial).filter(Boolean))].sort(),
  }), [data.documentos]);

  const veiculos = React.useMemo(() => {
    const groups = new Map();
    documentos.forEach((row) => {
      const key = row.placa || "Placa não informada";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return Array.from(groups, ([nome, docs]) => {
      const receita = docs.reduce((sum, row) => sum + rfNum(row.receita), 0);
      const custo = docs.reduce((sum, row) => sum + rfNum(row.custo), 0);
      const counts = docs.reduce((acc, row) => { acc[row.movimento] = (acc[row.movimento] || 0) + 1; return acc; }, {});
      return { placa: nome, motorista: docs[0]?.motorista, documentos: docs, receita, custo, lucro: receita - custo, counts };
    }).sort((a, b) => b.receita - a.receita);
  }, [documentos]);

  const apply = () => {
    setPlaca("todas"); setOrigemUf("todas"); setDestinoUf("todas"); setComercial("todos"); setFaixaResultado("todos");
    setFilters({ dataInicial, dataFinal, ufBase: ufBase.toUpperCase(), direcao: movimento, valorMaximoPequeno });
  };
  const total = data.resumo || {};

  return (
    <div className="view">
      <div className="page-head rf-page-head">
        <div><h1>Resultado operacional dos fretes</h1><div className="sub">Descubra onde a operação ganha ou perde dinheiro — da saída ao retorno comercial.</div></div>
        <div className="rf-head-tag">Análise gerencial por CT-e</div>
      </div>

      <div className="card rf-filter">
        <label>Emissão inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Emissão final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>UF base<input maxLength="2" value={ufBase} onChange={(e) => setUfBase(e.target.value.toUpperCase())}/></label>
        <label>Análise operacional<select value={movimento} onChange={(e) => setMovimento(e.target.value)}><option value="todos">Visão completa</option><option value="saida">1. Subida carregada</option><option value="fora">2. Giro fora da base</option><option value="chegada">3. Volta para casa</option><option value="retorno_comercial">4. Retorno comercial</option><option value="pequenos_fora">5. Fretes pequenos fora</option><option value="interno">Movimentos dentro da base</option></select></label>
        <label>Frete pequeno até<input type="number" min="0" step="100" value={valorMaximoPequeno} onChange={(e) => setValorMaximoPequeno(Number(e.target.value) || 0)}/></label>
        <button className="btn primary" onClick={apply}>Analisar documentos</button>
      </div>

      {error && <div className="card" style={{ marginBottom: 14, borderColor: "var(--crit-border)" }}><span className="kpi-delta down">{error}</span></div>}
      {loading && <div className="card muted" style={{ marginBottom: 14 }}>Analisando CT-es e custos operacionais...</div>}

      <div className="rf-summary">
        <RfKpi label="Resultado total" hint="Todos os CT-es da frota no período" data={total} tone="#22c55e"/>
        <RfKpi label={`Saídas de ${data.ufBase || ufBase}`} hint={`Origem em ${data.ufBase || ufBase} e destino em outra UF`} data={data.movimentos?.saida} tone="#38bdf8"/>
        <RfKpi label={`Chegadas a ${data.ufBase || ufBase}`} hint={`Origem em outra UF e destino em ${data.ufBase || ufBase}`} data={data.movimentos?.chegada} tone="#22c55e"/>
        <RfKpi label="Giros fora da base" hint={`Origem e destino fora de ${data.ufBase || ufBase}`} data={data.movimentos?.fora} tone="#f59e0b"/>
        <RfKpi label={`Movimentos dentro de ${data.ufBase || ufBase}`} hint={`Origem e destino em ${data.ufBase || ufBase}`} data={data.movimentos?.interno} tone="#a78bfa"/>
      </div>
      <div className="rf-guide">
        <strong>A soma fecha</strong>
        <span><b>{rfMoney(data.movimentos?.saida?.receita)}</b> em saídas + <b>{rfMoney(data.movimentos?.chegada?.receita)}</b> em chegadas + <b>{rfMoney(data.movimentos?.fora?.receita)}</b> em giros fora + <b>{rfMoney(data.movimentos?.interno?.receita)}</b> dentro de SC = <b>{rfMoney(total.receita)}</b> de receita total. Retorno comercial é um recorte desses movimentos e não entra novamente nessa soma.</span>
      </div>

      <div className="rf-decisions">
        <RfDecision title="1. Subida carregada" question={`Saindo de ${data.ufBase || ufBase}, a operação gerou resultado?`} data={data.indicadoresOperacionais?.saidaBase} tone="#38bdf8" active={filters.direcao === "saida"} onClick={() => { setMovimento("saida"); setFilters({ ...filters, direcao: "saida" }); }}/>
        <RfDecision title="2. Giro fora da base" question="Os fretes feitos entre outros estados estão contribuindo?" data={data.indicadoresOperacionais?.giroForaBase} tone="#f59e0b" active={filters.direcao === "fora"} onClick={() => { setMovimento("fora"); setFilters({ ...filters, direcao: "fora" }); }}/>
        <RfDecision title="3. Volta para casa" question={`Os fretes com destino a ${data.ufBase || ufBase} pagaram o retorno?`} data={data.indicadoresOperacionais?.retornoBase} tone="#22c55e" active={filters.direcao === "chegada"} onClick={() => { setMovimento("chegada"); setFilters({ ...filters, direcao: "chegada" }); }}/>
        <RfDecision title="4. Retorno comercial · recorte" question="Cargas com origem fora de SC captadas por Maicon ou Maurício deram resultado?" data={data.indicadoresOperacionais?.retornoComercial} tone="#a78bfa" detail={`Não somar ao total · Maicon ${rfMoney(data.indicadoresOperacionais?.retornoComercialMaicon?.lucro)} · Maurício ${rfMoney(data.indicadoresOperacionais?.retornoComercialMauricio?.lucro)}`} active={filters.direcao === "retorno_comercial"} onClick={() => { setMovimento("retorno_comercial"); setFilters({ ...filters, direcao: "retorno_comercial" }); }}/>
        <RfDecision title="5. Fretes pequenos fora" question={`CT-es de até ${rfMoney(data.indicadoresOperacionais?.pequenosForaBase?.limite || valorMaximoPequeno)} feitos fora da base`} data={data.indicadoresOperacionais?.pequenosForaBase} tone="#8b5cf6" detail="Resultado gerencial com custos rateados; use junto da ocupação e dos quilômetros adicionais." active={filters.direcao === "pequenos_fora"} onClick={() => { setMovimento("pequenos_fora"); setFilters({ ...filters, direcao: "pequenos_fora", valorMaximoPequeno }); }}/>
      </div>

      <RfAudit audit={data.auditoria}/>

      <div className="card card-flush rf-operation">
        <div className="card-header">
          <div><h3>Desempenho por veículo</h3><div className="meta">{documentos.length} CT-es · {veiculos.length} veículos · margem geral {rfPct(total.margem)}</div></div>
          <input className="rf-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar CT-e, cliente, comercial, placa ou rota..." style={{ minWidth: 340 }}/>
        </div>
        <div className="rf-toolbar">
          <select value={placa} onChange={(e) => setPlaca(e.target.value)}><option value="todas">Todas as placas</option>{opcoes.placas.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={origemUf} onChange={(e) => setOrigemUf(e.target.value)}><option value="todas">Toda origem</option>{opcoes.origens.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={destinoUf} onChange={(e) => setDestinoUf(e.target.value)}><option value="todas">Todo destino</option>{opcoes.destinos.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={comercial} onChange={(e) => setComercial(e.target.value)}><option value="todos">Todos os comerciais</option>{opcoes.comerciais.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={faixaResultado} onChange={(e) => setFaixaResultado(e.target.value)}><option value="todos">Todos os valores</option><option value="pequenos">Fretes pequenos</option><option value="prejuizo">Com prejuízo</option><option value="rentaveis">Com lucro</option></select>
          <label className="rf-check"><input type="checkbox" checked={somenteExcecoes} onChange={(e) => setSomenteExcecoes(e.target.checked)}/> Somente exceções</label>
          <div className="rf-toggle"><button className={visao === "veiculos" ? "active" : ""} onClick={() => setVisao("veiculos")}>Por veículo</button><button className={visao === "documentos" ? "active" : ""} onClick={() => setVisao("documentos")}>Documentos</button></div>
        </div>

        {visao === "veiculos" ? <div className="rf-vehicles">
          {veiculos.map((veiculo) => (
            <details className="rf-vehicle" key={veiculo.placa}>
              <summary>
                <div><strong>{veiculo.placa}</strong><div className="rf-vehicle-route">{veiculo.motorista || "Motorista não informado"}</div><div className="rf-counts"><span>{veiculo.counts.saida || 0} saídas</span><span>{veiculo.counts.chegada || 0} chegadas</span><span>{veiculo.counts.fora || 0} giros externos</span></div></div>
                <div className="rf-vehicle-value"><span>CT-es</span><strong>{veiculo.documentos.length}</strong></div>
                <div className="rf-vehicle-value revenue"><span>Receita</span><strong>{rfMoney(veiculo.receita)}</strong></div>
                <div className="rf-vehicle-value cost"><span>Custo</span><strong>{rfMoney(veiculo.custo)}</strong></div>
                <div className="rf-vehicle-value"><span>Resultado</span><strong style={{ color: veiculo.lucro >= 0 ? "#22c55e" : "#ef4444" }}>{rfMoney(veiculo.lucro)}</strong></div>
                <span>⌄</span>
              </summary>
              <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Emissão</th><th>CT-e</th><th>Movimento</th><th>Comercial</th><th>Cliente</th><th>Placa / motorista</th><th>Rota</th><th className="num">Receita</th><th className="num">Veículo</th><th className="num">Motorista</th><th className="num">Carga</th><th className="num">Custo</th><th className="num">Lucro</th></tr></thead><tbody><RfDocumentRows rows={veiculo.documentos}/></tbody></table></div>
            </details>
          ))}
          {!loading && !veiculos.length && <div className="muted">Nenhum CT-e encontrado com os filtros aplicados.</div>}
        </div> : <div className="table-wrap">
          <table className="data-table compact">
            <thead><tr><th>Emissão</th><th>CT-e</th><th>Movimento</th><th>Comercial</th><th>Cliente</th><th>Placa / motorista</th><th>Rota</th><th className="num">Receita</th><th className="num">Veículo</th><th className="num">Motorista</th><th className="num">Carga</th><th className="num">Custo</th><th className="num">Lucro</th></tr></thead>
            <tbody><RfDocumentRows rows={documentos}/>{!loading && !documentos.length && <tr><td colSpan="13" className="muted">Nenhum CT-e encontrado.</td></tr>}</tbody>
          </table>
        </div>}
      </div>

      <div className="rf-rankings">
        <RfRanking title="Resultado por cliente" rows={data.rankings?.clientes}/>
        <RfRanking title="Resultado por placa" rows={data.rankings?.placas}/>
        <RfRanking title="Resultado por motorista" rows={data.rankings?.motoristas}/>
        <RfRanking title="Resultado por comercial" rows={data.rankings?.comerciais}/>
      </div>

      <div className="muted" style={{ marginTop: 12, fontSize: 11.5 }}>Fonte: {data.fonte}. {data.auditoria?.criterio}</div>
    </div>
  );
};

window.ResultadoFretes = ResultadoFretes;

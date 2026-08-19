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

function RfKpi({ label, data, tone, hint, onClick, active = false }) {
  const lucro = rfNum(data?.lucro);
  const interactiveProps = onClick ? {
    role: "button",
    tabIndex: 0,
    "aria-pressed": active,
    onClick,
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    },
  } : {};
  return (
    <div className={`kpi rf-kpi ${onClick ? "clickable" : ""} ${active ? "active" : ""}`} style={{ "--rf-tone": tone }} {...interactiveProps}>
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

function RfClientOperationTable({ rows }) {
  const [onlyMixed, setOnlyMixed] = React.useState(true);
  const visible = (rows || []).filter(row => !onlyMixed || row.usaAmbos).slice(0, 30);
  return <div className="card card-flush rf-client-compare rf-client-profit">
    <div className="card-header"><div><h3>Rentabilidade do cliente: frota × terceiro</h3><div className="meta">Comparação consolidada pelo CNPJ raiz</div></div><label className="rf-check"><input type="checkbox" checked={onlyMixed} onChange={e=>setOnlyMixed(e.target.checked)}/> Somente clientes que usam os dois</label></div>
    <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Cliente</th><th className="num">Lucro frota</th><th className="num">Margem frota</th><th className="num">Lucro terceiro</th><th className="num">Margem terceiro</th><th>Melhor resultado</th><th className="num">Diferença</th></tr></thead><tbody>
      {visible.map(row=><tr key={row.documento || row.cliente}><td><strong>{row.cliente}</strong><div className="muted">{row.frota.documentos} CT-es frota · {row.terceiro.documentos} terceiros</div></td><td className="num" style={{color:rfNum(row.frota.lucro)>=0?"#22c55e":"#ef4444"}}>{rfMoney(row.frota.lucro)}</td><td className="num">{rfPct(row.frota.margem)}</td><td className="num" style={{color:rfNum(row.terceiro.lucro)>=0?"#22c55e":"#ef4444"}}>{rfMoney(row.terceiro.lucro)}</td><td className="num">{rfPct(row.terceiro.margem)}</td><td><span className={`rf-owner ${row.operacaoMaisLucrativa}`}>{row.operacaoMaisLucrativa === "frota" ? "Frota" : "Terceiro"}</span></td><td className="num">{rfMoney(row.diferencaLucro)}</td></tr>)}
      {!visible.length&&<tr><td colSpan="7" className="muted">Nenhum cliente encontrado nesta condição.</td></tr>}
    </tbody></table></div>
  </div>;
}

function RfCommercialMovementTable({ rows }) {
  const labels = { saida:"Subida", chegada:"Volta à base", fora:"Giro fora", interno:"Dentro da base" };
  return <div className="card card-flush rf-client-compare rf-commercial-movement">
    <div className="card-header"><div><h3>Resultado por comercial e sentido</h3><div className="meta">Identifica onde cada carteira ganha ou perde dinheiro</div></div></div>
    <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Comercial</th><th>Movimento</th><th className="num">CT-es</th><th className="num">Receita</th><th className="num">Lucro</th><th className="num">Margem</th></tr></thead><tbody>
      {[...(rows||[])].sort((a,b)=>rfNum(b.receita)-rfNum(a.receita)).map(row=><tr key={`${row.nome}-${row.movimento}`}><td><strong>{row.nome}</strong></td><td>{labels[row.movimento]||row.movimento}</td><td className="num">{row.documentos}</td><td className="num">{rfMoney(row.receita)}</td><td className="num" style={{color:rfNum(row.lucro)>=0?"#22c55e":"#ef4444"}}>{rfMoney(row.lucro)}</td><td className="num">{rfPct(row.margem)}</td></tr>)}
    </tbody></table></div>
  </div>;
}

function RfDreReconciliation({ data }) {
  if (!data) return null;
  const bridge = data.ponte || {};
  const audit = data.auditoria || {};
  const composition = data.composicaoDre || {};
  return <div className="card rf-reconciliation">
    <div className="rf-recon-head"><div><h3>Conciliação com o DRE</h3><div className="meta">Da margem operacional dos CT-es ao resultado completo da empresa</div></div><span className="rf-audit-status ok">Mesma competência</span></div>
    <div className="rf-bridge">
      <div><span>Margem operacional dos CT-es</span><strong>{rfMoney(bridge.resultadoOperacional)}</strong></div>
      <i>+</i><div><span>Receita sem CT-e vinculado</span><strong style={{color:rfNum(bridge.diferencaReceita)>=0?"#22c55e":"#ef4444"}}>{rfMoney(bridge.diferencaReceita)}</strong></div>
      <i>−</i><div><span>Custos não atribuídos aos CT-es</span><strong className="down">{rfMoney(bridge.custosNaoAtribuidos)}</strong></div>
      <i>=</i><div className="final"><span>Resultado completo do DRE</span><strong style={{color:rfNum(bridge.resultadoDre)>=0?"#22c55e":"#ef4444"}}>{rfMoney(bridge.resultadoDre)}</strong></div>
    </div>
    <details className="rf-recon-details"><summary>Ver composição dos custos e filas de auditoria</summary>
      <div className="rf-cost-composition">{Object.entries({"Impostos":composition.impostos,"Custos de transporte":composition.custosTransporte,"Custos de frota":composition.custosFrota,"Pessoal":composition.despesasPessoal,"Administrativo":composition.despesasAdministrativas,"Financeiro":composition.despesasFinanceiras}).map(([label,value])=><div key={label}><span>{label}</span><strong>{rfMoney(value)}</strong></div>)}</div>
      <div className="rf-audit-queues">
        <div><h4>Receitas sem CT-e vinculado</h4><p>{audit.receitasSemCte?.quantidade||0} lançamentos · {rfMoney(audit.receitasSemCte?.valor)}</p><div className="table-wrap"><table className="data-table compact"><thead><tr><th>Data</th><th>Documento</th><th>Cliente</th><th>Placa</th><th className="num">Valor</th></tr></thead><tbody>{(audit.receitasSemCte?.documentos||[]).slice(0,15).map((row,index)=><tr key={`${row.documento}-${index}`}><td>{rfDate(row.data)}</td><td>{row.documento||"-"}</td><td>{row.cliente||"-"}</td><td>{row.placa||"-"}</td><td className="num">{rfMoney(row.valor)}</td></tr>)}</tbody></table></div></div>
        <div><h4>CT-es sem título financeiro</h4><p>{audit.ctesSemTitulo?.quantidade||0} documentos · {rfMoney(audit.ctesSemTitulo?.valor)}</p><div className="table-wrap"><table className="data-table compact"><thead><tr><th>Data</th><th>CT-e</th><th>Cliente</th><th>Placa</th><th className="num">Valor</th></tr></thead><tbody>{(audit.ctesSemTitulo?.documentos||[]).slice(0,15).map((row,index)=><tr key={`${row.cte}-${index}`}><td>{rfDate(row.data)}</td><td>{row.cte||"-"}</td><td>{row.cliente||"-"}</td><td>{row.placa||"-"}</td><td className="num">{rfMoney(row.valor)}</td></tr>)}</tbody></table></div></div>
      </div>
    </details>
    <div className="rf-audit-note">{data.escopo}</div>
  </div>;
}

function RfFinancialRevenue({ data }) {
  if (!data) return null;
  const coverage = rfNum(data.officialFinancialValue) > 0 ? rfNum(data.linkedFinancialValue) / rfNum(data.officialFinancialValue) * 100 : 0;
  return <div className="rf-financial-source">
    <div><span>Receita oficial · {data.escopo || "Frota e terceiros"}</span><strong>{rfMoney(data.officialFinancialValue)}</strong><small>{data.linkedEntries + data.unclassifiedEntries} lançamentos/documentos · imposto {rfMoney(data.impostoTotal)}</small></div>
    <div><span>Receita classificada por CT-e</span><strong>{rfMoney(data.linkedFinancialValue)}</strong><small>{data.linkedDocuments} CT-es · {rfPct(coverage)} da receita</small></div>
    <div className={rfNum(data.unclassifiedFinancialValue)>0?"attention":""}><span>Receita sem CT-e vinculado</span><strong>{rfMoney(data.unclassifiedFinancialValue)}</strong><small>{data.unclassifiedEntries} lançamentos do financeiro sem rota identificada</small></div>
    <div><span>CT-es fora da receita</span><strong>{data.logisticsDocumentsExcluded}</strong><small>Sem financeiro nesta competência</small></div>
  </div>;
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
      <td><strong>{row.placa || "-"}</strong><div className="muted">{row.tipoOperacao === "frota" ? "Frota própria" : "Terceiro"} · {row.motorista || "Motorista não informado"}</div></td>
      <td>{row.origem || "-"} → {row.destino || "-"}</td>
      <td className="num">{rfMoney(row.receita)}</td>
      <td className="num">{rfMoney(row.custoVeiculo)}</td>
      <td className="num">{rfMoney(row.custoMotorista)}</td>
      <td className="num">{rfMoney(row.custoCarga)}</td>
      <td className="num">{rfMoney(row.imposto)}</td>
      <td className="num">{rfMoney(row.custo)}</td>
      <td className="num" style={{ color: rfNum(row.lucro) >= 0 ? "#22c55e" : "#ef4444" }}>{rfMoney(row.lucro)}</td>
    </tr>
  ));
}

const ResultadoFretes = () => {
  const [dataInicial, setDataInicial] = React.useState(rfDaysAgo(29));
  const [dataFinal, setDataFinal] = React.useState(rfToday());
  const [movimento, setMovimento] = React.useState("todos");
  const [valorMaximoPequeno, setValorMaximoPequeno] = React.useState(1500);
  const [tipoOperacao, setTipoOperacao] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const [placa, setPlaca] = React.useState("todas");
  const [origemUf, setOrigemUf] = React.useState("todas");
  const [destinoUf, setDestinoUf] = React.useState("todas");
  const [faixaResultado, setFaixaResultado] = React.useState("todos");
  const [comercial, setComercial] = React.useState("todos");
  const [somenteExcecoes, setSomenteExcecoes] = React.useState(false);
  const [visao, setVisao] = React.useState("veiculos");
  const [filters, setFilters] = React.useState({ dataInicial: rfDaysAgo(29), dataFinal: rfToday(), regiaoBase: "sul", direcao: "todos", tipoOperacao: "todos", valorMaximoPequeno: 1500 });
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
      .rf-filter{display:grid;grid-template-columns:145px 145px minmax(220px,1fr) 130px 145px auto;gap:10px;align-items:end;margin-bottom:16px;padding:16px;background:linear-gradient(135deg,rgba(56,189,248,.035),transparent 45%),var(--surface-1)}
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
      .rf-kpi.clickable{cursor:pointer;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}.rf-kpi.clickable:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--rf-tone) 55%,var(--border));box-shadow:0 8px 24px rgba(0,0,0,.16)}.rf-kpi.clickable:focus-visible{outline:2px solid var(--rf-tone);outline-offset:2px}.rf-kpi.clickable.active{border-color:var(--rf-tone);box-shadow:0 0 0 1px color-mix(in srgb,var(--rf-tone) 45%,transparent),0 8px 26px rgba(0,0,0,.2)}
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
      .rf-complementary-head{display:flex;align-items:flex-end;justify-content:space-between;margin:4px 0 10px}.rf-complementary-head h3{font-size:14px;margin:0 0 3px}.rf-complementary-head .meta{font-size:10.5px}.rf-decisions.complementary{grid-template-columns:repeat(2,minmax(0,1fr))}.rf-decisions.complementary .rf-decision{grid-column:span 1}
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
      .rf-operation-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.rf-client-compare{margin-top:14px}.rf-owner{display:inline-flex;padding:3px 8px;border-radius:999px;font-size:10px}.rf-owner.frota{color:#7dd3fc;background:#082f49}.rf-owner.terceiro{color:#fbbf24;background:#451a03}
      .rf-page{display:flex;flex-direction:column}.rf-page .rf-client-profit{order:10;margin-top:0;margin-bottom:16px}.rf-page .rf-rankings{order:20}.rf-page .rf-commercial-movement{order:30}.rf-page .rf-operation{order:90;margin-top:14px}.rf-page .rf-source-note{order:100}
      .rf-financial-source{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.rf-financial-source>div{padding:14px 16px;border:1px solid var(--border);border-radius:9px;background:var(--surface-1)}.rf-financial-source span,.rf-financial-source small{display:block}.rf-financial-source span{font-size:10.5px;color:var(--text-3)}.rf-financial-source strong{display:block;font-size:19px;margin:7px 0 4px}.rf-financial-source small{font-size:9.5px;color:var(--text-3)}.rf-financial-source .attention{border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.035)}.rf-financial-source .attention strong{color:#fbbf24}
      .rf-reconciliation{margin-bottom:16px;background:linear-gradient(110deg,rgba(167,139,250,.05),transparent 48%),var(--surface-1)}.rf-recon-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.rf-bridge{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:10px;align-items:center}.rf-bridge>div{padding:12px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,.018)}.rf-bridge span{display:block;font-size:10px;color:var(--text-3);margin-bottom:6px}.rf-bridge strong{font-size:16px}.rf-bridge>i{font-style:normal;color:var(--text-3);font-size:18px}.rf-bridge .final{border-color:rgba(167,139,250,.35)}.rf-recon-details{margin-top:13px;border-top:1px solid var(--divider);padding-top:11px}.rf-recon-details>summary{cursor:pointer;color:var(--text-2);font-size:11.5px}.rf-cost-composition{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:12px 0}.rf-cost-composition>div{padding:9px;border:1px solid var(--border);border-radius:7px}.rf-cost-composition span{display:block;color:var(--text-3);font-size:9.5px;margin-bottom:4px}.rf-cost-composition strong{font-size:11px}.rf-audit-queues{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rf-audit-queues>div{min-width:0;border:1px solid var(--border);border-radius:8px;overflow:hidden}.rf-audit-queues h4,.rf-audit-queues p{padding:0 12px}.rf-audit-queues h4{margin:12px 0 2px}.rf-audit-queues p{margin:0 0 10px;color:var(--text-3);font-size:10.5px}
      @media(max-width:1400px){.rf-decisions{grid-template-columns:repeat(6,1fr)}.rf-decision{grid-column:span 2}.rf-decision:nth-child(4),.rf-decision:nth-child(5){grid-column:span 3}}
      @media(max-width:1350px){.rf-summary{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:1200px){.rf-summary{grid-template-columns:1fr 1fr}.rf-rankings{grid-template-columns:1fr 1fr}.rf-filter{grid-template-columns:1fr 1fr 80px 1fr}.rf-filter label:nth-child(4){grid-column:span 2}}
      @media(max-width:1000px){.rf-filter,.rf-summary,.rf-rankings,.rf-financial-source{grid-template-columns:1fr 1fr}.rf-audit-grid{grid-template-columns:repeat(3,1fr)}.rf-bridge{grid-template-columns:1fr}.rf-bridge>i{display:none}.rf-cost-composition{grid-template-columns:repeat(3,1fr)}.rf-audit-queues{grid-template-columns:1fr}.rf-vehicle summary{grid-template-columns:1fr 80px 100px 26px}.rf-vehicle-value.cost,.rf-vehicle-value.revenue{display:none}}
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
    setFilters({ dataInicial, dataFinal, regiaoBase: "sul", direcao: movimento, tipoOperacao, valorMaximoPequeno });
  };
  const selectDirection = (direction) => {
    const next = filters.direcao === direction ? "todos" : direction;
    setMovimento(next);
    setFilters((current) => ({ ...current, direcao: next }));
  };
  const total = data.resumo || {};
  const movimentosResumo = ["saida", "chegada", "fora", "interno", "indefinido"].map((id) => data.movimentos?.[id] || {});
  const receitaClassificada = movimentosResumo.reduce((sum, item) => sum + rfNum(item.receita), 0);
  const documentosUfPendente = rfNum(data.movimentos?.indefinido?.documentos);

  return (
    <div className="view rf-page">
      <div className="page-head rf-page-head">
        <div><h1>Resultado operacional dos fretes</h1><div className="sub">Descubra onde a operação ganha ou perde dinheiro — da saída ao retorno comercial.</div></div>
        <div className="rf-head-tag">Análise gerencial por CT-e</div>
      </div>

      <div className="card rf-filter">
        <label>Emissão inicial<input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)}/></label>
        <label>Emissão final<input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)}/></label>
        <label>Análise operacional<select value={movimento} onChange={(e) => setMovimento(e.target.value)}><option value="todos">Visão completa</option><option value="saida">1. Subida carregada</option><option value="fora">2. Giro fora da base</option><option value="chegada">3. Volta para casa</option><option value="retorno_comercial">4. Retorno comercial</option><option value="pequenos_fora">5. Fretes pequenos fora</option><option value="interno">Movimentos dentro da base</option></select></label>
        <label>Operação<select value={tipoOperacao} onChange={(e)=>setTipoOperacao(e.target.value)}><option value="todos">Frota e terceiro</option><option value="frota">Somente frota</option><option value="terceiro">Somente terceiro</option></select></label>
        <label>Frete pequeno até<input type="number" min="0" step="100" value={valorMaximoPequeno} onChange={(e) => setValorMaximoPequeno(Number(e.target.value) || 0)}/></label>
        <button className="btn primary" onClick={apply}>Analisar documentos</button>
      </div>

      {error && <div className="card" style={{ marginBottom: 14, borderColor: "var(--crit-border)" }}><span className="kpi-delta down">{error}</span></div>}
      {loading && <div className="card muted" style={{ marginBottom: 14 }}>Analisando CT-es e custos operacionais...</div>}

      <RfFinancialRevenue data={data.receitaFinanceira}/>

      <div className="rf-summary">
        <RfKpi label="Resultado após imposto" hint={filters.direcao === "todos" ? "Receita menos custos atribuídos e impostos do DRE" : "Clique para limpar o filtro de direção"} data={total} tone="#22c55e" active={filters.direcao === "todos"} onClick={() => selectDirection("todos")}/>
        <RfKpi label="Saídas da Região Sul" hint="Clique para filtrar · origem no Sul e destino fora" data={data.movimentos?.saida} tone="#38bdf8" active={filters.direcao === "saida"} onClick={() => selectDirection("saida")}/>
        <RfKpi label="Chegadas à Região Sul" hint="Clique para filtrar · origem fora e destino no Sul" data={data.movimentos?.chegada} tone="#22c55e" active={filters.direcao === "chegada"} onClick={() => selectDirection("chegada")}/>
        <RfKpi label="Giros fora da Região Sul" hint="Clique para filtrar · origem e destino fora do Sul" data={data.movimentos?.fora} tone="#f59e0b" active={filters.direcao === "fora"} onClick={() => selectDirection("fora")}/>
        <RfKpi label="Movimentos dentro do Sul" hint="Clique para filtrar · origem e destino no Sul" data={data.movimentos?.interno} tone="#a78bfa" active={filters.direcao === "interno"} onClick={() => selectDirection("interno")}/>
      </div>
      <div className="rf-guide">
        <strong>A soma fecha</strong>
        <span><b>{rfMoney(data.movimentos?.saida?.receita)}</b> em saídas + <b>{rfMoney(data.movimentos?.chegada?.receita)}</b> em chegadas + <b>{rfMoney(data.movimentos?.fora?.receita)}</b> em giros fora + <b>{rfMoney(data.movimentos?.interno?.receita)}</b> dentro do Sul{documentosUfPendente > 0 ? <> + <b>{rfMoney(data.movimentos?.indefinido?.receita)}</b> com UF pendente</> : null} = <b>{rfMoney(receitaClassificada)}</b> no escopo de operação selecionado. O primeiro cartão mostra o recorte adicional de sentido.</span>
      </div>

      <div className="rf-operation-compare">
        <RfKpi label="Frota própria" hint="Resultado após custos atribuídos e imposto" data={data.comparativoOperacao?.frota} tone="#38bdf8"/>
        <RfKpi label="Terceiros" hint="Resultado após custo do terceiro, despesas e imposto" data={data.comparativoOperacao?.terceiro} tone="#f59e0b"/>
      </div>
      <RfClientOperationTable rows={data.clientesPorOperacao}/>
      <RfCommercialMovementTable rows={data.comerciaisPorMovimento}/>
      <RfDreReconciliation data={data.conciliacaoDre}/>

      <div className="rf-complementary-head"><div><h3>Recortes complementares</h3><div className="meta">Análises que não se repetem nos cartões de direção</div></div></div>
      <div className="rf-decisions complementary">
        <RfDecision title="Retorno comercial" question="Cargas com origem fora da Região Sul captadas por Maicon ou Maurício deram resultado?" data={data.indicadoresOperacionais?.retornoComercial} tone="#a78bfa" detail={`Não somar ao total · Maicon ${rfMoney(data.indicadoresOperacionais?.retornoComercialMaicon?.lucro)} · Maurício ${rfMoney(data.indicadoresOperacionais?.retornoComercialMauricio?.lucro)}`} active={filters.direcao === "retorno_comercial"} onClick={() => selectDirection("retorno_comercial")}/>
        <RfDecision title="Fretes pequenos fora" question={`CT-es de até ${rfMoney(data.indicadoresOperacionais?.pequenosForaBase?.limite || valorMaximoPequeno)} feitos fora da base`} data={data.indicadoresOperacionais?.pequenosForaBase} tone="#8b5cf6" detail="Resultado gerencial com custos rateados; use junto da ocupação e dos quilômetros adicionais." active={filters.direcao === "pequenos_fora"} onClick={() => selectDirection("pequenos_fora")}/>
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
              <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Emissão</th><th>Documento</th><th>Movimento</th><th>Comercial</th><th>Cliente</th><th>Placa / motorista</th><th>Rota</th><th className="num">Receita</th><th className="num">Veículo</th><th className="num">Motorista</th><th className="num">Carga</th><th className="num">Imposto</th><th className="num">Custo total</th><th className="num">Lucro após imposto</th></tr></thead><tbody><RfDocumentRows rows={veiculo.documentos}/></tbody></table></div>
            </details>
          ))}
          {!loading && !veiculos.length && <div className="muted">Nenhum CT-e encontrado com os filtros aplicados.</div>}
        </div> : <div className="table-wrap">
          <table className="data-table compact">
            <thead><tr><th>Emissão</th><th>Documento</th><th>Movimento</th><th>Comercial</th><th>Cliente</th><th>Placa / motorista</th><th>Rota</th><th className="num">Receita</th><th className="num">Veículo</th><th className="num">Motorista</th><th className="num">Carga</th><th className="num">Imposto</th><th className="num">Custo total</th><th className="num">Lucro após imposto</th></tr></thead>
            <tbody><RfDocumentRows rows={documentos}/>{!loading && !documentos.length && <tr><td colSpan="14" className="muted">Nenhum documento encontrado.</td></tr>}</tbody>
          </table>
        </div>}
      </div>

      <div className="rf-rankings">
        <RfRanking title="Resultado por cliente" rows={data.rankings?.clientes}/>
        <RfRanking title="Resultado por placa" rows={data.rankings?.placas}/>
        <RfRanking title="Resultado por motorista" rows={data.rankings?.motoristas}/>
        <RfRanking title="Resultado por comercial" rows={data.rankings?.comerciais}/>
      </div>
      <div className="muted rf-source-note" style={{ marginTop: 12, fontSize: 11.5 }}>Fonte: {data.fonte}. {data.auditoria?.criterio}</div>
    </div>
  );
};

window.ResultadoFretes = ResultadoFretes;

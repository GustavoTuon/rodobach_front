function dirTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function dirDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function dirMonthStartISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

function dirYearStartISO() {
  const d = new Date();
  return [d.getFullYear(), "01", "01"].join("-");
}

function dirFormatDateBR(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function dirNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dirRows(value) {
  return Array.isArray(value) ? value : [];
}

function dirBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dirNum(value));
}

function dirPct(value) {
  return `${dirNum(value).toFixed(1).replace(".", ",")}%`;
}

function dirShort(value) {
  const raw = dirNum(value);
  const n = Math.abs(raw);
  const sign = raw < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}R$ ${(n / 1000000).toFixed(1).replace(".", ",")} Mi`;
  if (n >= 1000) return `${sign}R$ ${(n / 1000).toFixed(0)} mil`;
  return `${sign}R$ ${Math.round(n).toLocaleString("pt-BR")}`;
}

function dirRange(period, customRange = {}) {
  if (period === "custom") {
    const start = customRange.start || dirYearStartISO();
    const end = customRange.end || dirTodayISO();
    return { start, end, label: `${dirFormatDateBR(start)} ate ${dirFormatDateBR(end)}` };
  }
  if (period === "year") return { start: dirYearStartISO(), end: dirTodayISO(), label: "Este ano" };
  if (period === "7d") return { start: dirDaysAgoISO(6), end: dirTodayISO(), label: "7 dias" };
  if (period === "30d") return { start: dirDaysAgoISO(29), end: dirTodayISO(), label: "30 dias" };
  return { start: dirMonthStartISO(), end: dirTodayISO(), label: "Este mes" };
}

function dirInjectStyles() {
  const id = "rb-diretoria-style";
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .dir-view { display:flex; flex-direction:column; gap:14px; }
    .dir-toolbar { display:flex; align-items:end; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .dir-periods { display:flex; gap:8px; flex-wrap:wrap; }
    .dir-custom-range { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .dir-date { min-height:34px; max-width:142px; border:1px solid var(--border); border-radius:7px; background:var(--surface); color:var(--text); padding:0 9px; font-size:12px; }
    .dir-kpis { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:10px; }
    .dir-kpi { min-width:0; border:1px solid var(--border); border-left:4px solid var(--tone, var(--brand-blue)); border-radius:8px; background:var(--surface); padding:13px 14px; box-shadow:var(--shadow-sm); }
    .dir-kpi .label { display:flex; align-items:center; gap:6px; color:var(--text-3); font-size:11.5px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; }
    .dir-kpi .value { margin-top:8px; color:var(--text); font-size:22px; line-height:1.05; font-weight:760; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dir-kpi .sub { margin-top:5px; color:var(--text-3); font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dir-grid { display:grid; grid-template-columns:1.25fr .9fr; gap:14px; align-items:start; }
    .dir-card { border:1px solid var(--border); border-radius:8px; background:var(--surface); padding:15px; box-shadow:var(--shadow-sm); min-width:0; }
    .dir-card-head { display:flex; align-items:start; justify-content:space-between; gap:10px; margin-bottom:12px; }
    .dir-card h2 { margin:0; font-size:15px; line-height:1.2; }
    .dir-card .meta { color:var(--text-3); font-size:11.5px; margin-top:3px; }
    .dir-actions-list, .dir-rank-list, .dir-links { display:grid; gap:9px; }
    .dir-action { display:grid; grid-template-columns:auto minmax(0, 1fr) auto; gap:10px; align-items:center; padding:10px 11px; border:1px solid var(--border); border-left:4px solid var(--tone, var(--brand-blue)); border-radius:7px; background:var(--surface-2); }
    .dir-action strong, .dir-rank strong { display:block; color:var(--text); font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dir-action span, .dir-rank span { display:block; color:var(--text-3); font-size:11.5px; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dir-rank { display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:10px; align-items:center; padding:9px 0; border-bottom:1px solid var(--divider); }
    .dir-rank:last-child { border-bottom:0; }
    .dir-link { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; border:1px solid var(--border); border-radius:7px; background:var(--surface-2); color:var(--text); padding:11px 12px; cursor:pointer; text-align:left; }
    .dir-link:hover { background:var(--hover); }
    .dir-link span { display:flex; align-items:center; gap:8px; min-width:0; font-size:12.5px; font-weight:600; }
    .dir-link em { color:var(--text-3); font-style:normal; font-size:11.5px; }
    .dir-two { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .dir-empty { min-height:72px; display:grid; place-items:center; color:var(--text-3); font-size:12.5px; text-align:center; }
    @media (max-width: 1280px) { .dir-kpis { grid-template-columns:repeat(3, minmax(0, 1fr)); } .dir-grid, .dir-two { grid-template-columns:1fr; } }
    @media (max-width: 720px) { .dir-kpis { grid-template-columns:1fr; } .dir-toolbar { align-items:flex-start; } }
  `;
  document.head.appendChild(s);
}

const DirKpi = ({ label, value, sub, icon, tone }) => (
  <div className="dir-kpi" style={{ "--tone": tone || "var(--brand-blue)" }}>
    <div className="label">{icon && <Icon name={icon} size={13}/>}<span>{label}</span></div>
    <div className="value" title={String(value)}>{value}</div>
    <div className="sub">{sub || "\u00a0"}</div>
  </div>
);

const DirCard = ({ title, meta, action, children }) => (
  <section className="dir-card">
    <div className="dir-card-head">
      <div><h2>{title}</h2>{meta && <div className="meta">{meta}</div>}</div>
      {action}
    </div>
    {children}
  </section>
);

const DirAction = ({ icon, tone, title, text, value }) => (
  <div className="dir-action" style={{ "--tone": tone || "var(--brand-blue)" }}>
    <Icon name={icon || "info"} size={15}/>
    <div><strong>{title}</strong><span>{text}</span></div>
    {value && <b className="num" style={{ fontSize: 12 }}>{value}</b>}
  </div>
);

const DirRank = ({ label, sub, value, tone }) => (
  <div className="dir-rank">
    <div><strong>{label || "-"}</strong>{sub && <span>{sub}</span>}</div>
    <b className="num" style={{ color: tone || "var(--text)", fontSize: 12 }}>{value}</b>
  </div>
);

function buildDiretoriaActions({ dre, frota, clientes, rentabilidade }) {
  const actions = [];
  const dreSummary = dre?.summary || {};
  const geral = frota?.visaoGeral || {};
  const lucroFrota = frota?.lucro?.summary || {};
  const clientesSummary = clientes?.summary || {};
  const rentResumo = rentabilidade?.resumo || {};
  const prejuizos = dirRows(rentabilidade?.rankings?.prejuizo);

  if (dirNum(dreSummary.resultadoFinal) < 0) {
    actions.push({ icon: "alert", tone: "#ef4444", title: "Resultado da empresa negativo", text: "Abrir a DRE e revisar contas com maior peso.", value: dirBRL(dreSummary.resultadoFinal) });
  }
  if (dirNum(dreSummary.margemLucro) < 12) {
    actions.push({ icon: "gauge", tone: "#f59e0b", title: "Margem abaixo do alvo", text: "Validar preço, frete mínimo e custos diretos por rota.", value: dirPct(dreSummary.margemLucro) });
  }
  if (dirNum(geral.custoPorKm) > 0) {
    actions.push({ icon: "speedometer", tone: "#8b5cf6", title: "Acompanhar custo por km", text: "Comparar frota, combustível e manutenção antes de novas viagens.", value: dirBRL(geral.custoPorKm) });
  }
  if (dirNum(lucroFrota.veiculosPrejuizo) > 0) {
    actions.push({ icon: "truck", tone: "#ef4444", title: "Veículos com prejuízo", text: "Priorizar análise por placa no Frota BI.", value: String(lucroFrota.veiculosPrejuizo) });
  }
  if (dirNum(clientesSummary.totalVencido) > 0) {
    actions.push({ icon: "clock", tone: "#ef4444", title: "Recebíveis vencidos", text: "Direcionar cobrança e bloquear novos fretes de maior risco.", value: dirBRL(clientesSummary.totalVencido) });
  }
  if (prejuizos.length > 0 || dirNum(rentResumo.lucroTotal) < 0) {
    actions.push({ icon: "user", tone: "#f97316", title: "Clientes com prejuízo", text: "Rever tabela e condições dos clientes deficitários.", value: prejuizos.length ? String(prejuizos.length) : dirBRL(rentResumo.lucroTotal) });
  }

  if (!actions.length) {
    actions.push({ icon: "check", tone: "#22c55e", title: "Sem alerta crítico no período", text: "Use os rankings para buscar oportunidades de melhoria.", value: "OK" });
  }
  return actions.slice(0, 6);
}

function buildAuditoriaActions(auditoria) {
  const r = auditoria?.resumo || {};
  const items = [];
  if (dirNum(r.nfPlacaDiferente?.itens) > 0) {
    items.push({ icon: "alert", tone: "#ef4444", title: "NF com placa diferente do rateio", text: "Compra aponta uma placa, mas o financeiro leva o custo para outra.", value: dirBRL(r.nfPlacaDiferente.valorRateio) });
  }
  if (dirNum(r.nfSemPlacaResolvida?.itens) > 0) {
    items.push({ icon: "filter", tone: "#f59e0b", title: "NF sem placa resolvida no financeiro", text: "Itens de compras com veiculo, mas pagar/rateio sem placa confiavel.", value: String(r.nfSemPlacaResolvida.itens) });
  }
  if (dirNum(r.cteSemPlaca?.ctes) > 0 || dirNum(r.cteMultiplasPlacas?.ctes) > 0) {
    items.push({ icon: "route", tone: "#ef4444", title: "CT-e com vinculo de placa a revisar", text: "Receita pode ficar fora ou dividida de forma incompleta.", value: String(dirNum(r.cteSemPlaca?.ctes) + dirNum(r.cteMultiplasPlacas?.ctes)) });
  }
  if (dirNum(r.financeiroCentroAmbiguo?.lancamentos) > 0) {
    items.push({ icon: "money", tone: "#f97316", title: "Rateio financeiro com centro ambiguo", text: "Centro de custo aponta para mais de um veiculo proprio.", value: dirBRL(r.financeiroCentroAmbiguo.valor) });
  }
  if (!items.length) {
    items.push({ icon: "check", tone: "#22c55e", title: "Vinculos auditados sem alerta critico", text: "NF, CT-e e rateios principais nao indicam divergencia relevante.", value: "OK" });
  }
  return items;
}

const Diretoria = ({ onNavigate }) => {
  const requestSeq = React.useRef(0);
  const [period, setPeriod] = React.useState("month");
  const [customRange, setCustomRange] = React.useState({ start: dirMonthStartISO(), end: dirTodayISO() });
  const [appliedCustomRange, setAppliedCustomRange] = React.useState({ start: dirMonthStartISO(), end: dirTodayISO() });
  const [includeOldOverdue, setIncludeOldOverdue] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [state, setState] = React.useState({ loading: true, loadingFrota: false, error: "", dre: null, frota: null, clientes: null, rentabilidade: null, auditoria: null });

  React.useEffect(() => { dirInjectStyles(); }, []);

  React.useEffect(() => {
    let active = true;
    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;
    const range = dirRange(period, period === "custom" ? appliedCustomRange : customRange);
    const filters = {
      period: period === "custom" ? "custom" : period,
      startDate: range.start,
      endDate: range.end,
      dataInicio: range.start,
      dataFim: range.end,
    };
    setState({ loading: true, loadingFrota: true, error: "", dre: null, frota: null, clientes: null, rentabilidade: null, auditoria: null });

    Promise.allSettled([
      window.RB_API.getDreEmpresarial(filters),
      window.RB_API.getAnaliseClientes({ ...filters, incluirVencidosAntigos: includeOldOverdue ? "1" : "" }),
      window.RB_API.getRentabilidadeClientes({ dataInicial: range.start, dataFinal: range.end }),
      window.RB_API.getAuditoriaCustosVeiculos({ dataInicio: range.start, dataFim: range.end }),
    ]).then((results) => {
      if (!active || requestSeq.current !== requestId) return;
      const [dre, clientes, rentabilidade, auditoria] = results;
      const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason?.message).filter(Boolean);
      setState((current) => ({
        ...current,
        loading: false,
        error: errors.length ? `Alguns dados nao carregaram: ${errors.slice(0, 2).join(" | ")}` : "",
        dre: dre.status === "fulfilled" ? dre.value : null,
        clientes: clientes.status === "fulfilled" ? clientes.value : null,
        rentabilidade: rentabilidade.status === "fulfilled" ? rentabilidade.value : null,
        auditoria: auditoria.status === "fulfilled" ? auditoria.value : null,
      }));
    });

    window.RB_API.getAnaliseFrota({ ...filters, proprietario: "todos", limit: 60 }).then((frota) => {
      if (!active || requestSeq.current !== requestId) return;
      setState((current) => ({ ...current, loadingFrota: false, frota }));
    }).catch((error) => {
      if (!active || requestSeq.current !== requestId) return;
      setState((current) => ({
        ...current,
        loadingFrota: false,
        error: current.error || `Frota BI nao carregou: ${error.message || "erro desconhecido"}`,
      }));
    });

    return () => { active = false; };
  }, [period, appliedCustomRange.start, appliedCustomRange.end, includeOldOverdue, refreshKey]);

  const range = dirRange(period, period === "custom" ? appliedCustomRange : customRange);
  const dreSummary = state.dre?.summary || {};
  const geral = state.frota?.visaoGeral || {};
  const lucroFrota = state.frota?.lucro?.summary || {};
  const clientesSummary = state.clientes?.summary || {};
  const rentResumo = state.rentabilidade?.resumo || {};
  const saidasDre = dirNum(dreSummary.totalCustos) + dirNum(dreSummary.impostos);
  const actions = buildDiretoriaActions(state);
  const auditoriaActions = buildAuditoriaActions(state.auditoria);
  const topClientesLucro = dirRows(state.rentabilidade?.rankings?.lucro).slice(0, 5);
  const topClientesPrejuizo = dirRows(state.rentabilidade?.rankings?.prejuizo).slice(0, 5);
  const topVeiculosCusto = dirRows(state.frota?.custos?.ranking).slice(0, 5);

  return (
    <div className="view dir-view">
      <div className="dir-toolbar">
        <div className="page-head" style={{ margin: 0, padding: 0 }}>
          <div>
            <h1>Diretoria</h1>
            <div className="sub">Resumo executivo consolidado - frota propria e terceiros - {range.label}</div>
          </div>
        </div>
        <div className="dir-periods">
          {[
            { id: "7d", label: "7 dias" },
            { id: "30d", label: "30 dias" },
            { id: "month", label: "Este mes" },
            { id: "year", label: "Este ano" },
            { id: "custom", label: "Personalizado" },
          ].map((p) => (
            <button key={p.id} className={`btn${period === p.id ? " primary" : ""}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
          {period === "custom" && (
            <div className="dir-custom-range">
              <input
                className="dir-date"
                type="date"
                value={customRange.start}
                max={customRange.end || undefined}
                onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
              />
              <input
                className="dir-date"
                type="date"
                value={customRange.end}
                min={customRange.start || undefined}
                onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
              />
              <button className="btn primary" onClick={() => setAppliedCustomRange(customRange)}>Aplicar</button>
            </div>
          )}
          <button
            className={`btn${includeOldOverdue ? " primary" : ""}`}
            onClick={() => setIncludeOldOverdue((value) => !value)}
            title="Por padrao, vencidos anteriores a 2025 ficam fora da visao executiva"
          >
            {includeOldOverdue ? "Incluindo protestos antigos" : "Habilitar protestos antigos"}
          </button>
          <button className="btn" onClick={() => setRefreshKey((n) => n + 1)}><Icon name="refresh"/> Atualizar</button>
        </div>
      </div>

      {state.error && (
        <div className="card" style={{ color: "var(--warn)", fontSize: 12.5, padding: "10px 14px" }}>{state.error}</div>
      )}

      <div className="dir-kpis">
        <DirKpi label="Resultado DRE" value={dirBRL(dreSummary.resultadoFinal)} sub={`Receita - saidas | Margem ${dirPct(dreSummary.margemLucro)}`} icon="chart" tone={dirNum(dreSummary.resultadoFinal) >= 0 ? "#22c55e" : "#ef4444"}/>
        <DirKpi label="Receita DRE" value={dirBRL(dreSummary.receitaBruta)} sub="Financeiro receber classificado" icon="trending-up" tone="#38bdf8"/>
        <DirKpi label="Saidas DRE" value={dirBRL(saidasDre)} sub={`Custos/despesas ${dirBRL(dreSummary.totalCustos)} + impostos ${dirBRL(dreSummary.impostos)}`} icon="money" tone="#f97316"/>
        <DirKpi label="Frota por placa" value={state.loadingFrota ? "Carregando..." : dirBRL(geral.lucroTotal || lucroFrota.lucroTotal)} sub={state.loadingFrota ? "Consulta pesada carregando em segundo plano" : `Nao e DRE: CT-e por placa ${dirBRL(geral.receitaTotal)} - custos vinculados ${dirBRL(geral.custoTotal)}`} icon="truck" tone={dirNum(geral.lucroTotal || lucroFrota.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"}/>
        <DirKpi label="Recebiveis vencidos" value={dirBRL(clientesSummary.totalVencido)} sub={`${dirNum(clientesSummary.clientesAtivos)} clientes ativos`} icon="clock" tone={dirNum(clientesSummary.totalVencido) > 0 ? "#ef4444" : "#22c55e"}/>
        <DirKpi label="Lucro viagens" value={dirBRL(rentResumo.lucroTotal)} sub={`Por cliente/CT-e | Margem ${dirPct(rentResumo.margemMedia)}`} icon="user" tone={dirNum(rentResumo.lucroTotal) >= 0 ? "#22c55e" : "#ef4444"}/>
      </div>

      <div className="dir-grid">
        <DirCard title="Acoes recomendadas" meta="Prioridades para a diretoria">
          {state.loading ? <div className="dir-empty">Carregando indicadores...</div> : (
            <div className="dir-actions-list">
              {actions.map((item, index) => <DirAction key={`${item.title}-${index}`} {...item}/>)}
            </div>
          )}
        </DirCard>

        <DirCard title="Acesso rapido" meta="Aprofundar analise">
          <div className="dir-links">
            <button className="dir-link" onClick={() => onNavigate("dre-empresarial")}><span><Icon name="chart"/>DRE Empresarial</span><em>resultado e contas</em></button>
            <button className="dir-link" onClick={() => onNavigate("analise-frota")}><span><Icon name="truck"/>Frota BI</span><em>margem, custo/km e placas</em></button>
            <button className="dir-link" onClick={() => onNavigate("clientes")}><span><Icon name="user"/>Clientes</span><em>faturamento e lucro</em></button>
            <button className="dir-link" onClick={() => onNavigate("custos-veiculos")}><span><Icon name="wrench"/>Manutencoes</span><em>custos e lancamentos</em></button>
          </div>
        </DirCard>
      </div>

      <div className="dir-two">
        <DirCard title="Auditoria de vínculos" meta="NF, CT-e e rateios por placa">
          <div className="dir-actions-list">
            {auditoriaActions.map((item, index) => <DirAction key={`${item.title}-${index}`} {...item}/>)}
          </div>
        </DirCard>

        <DirCard title="Clientes para observar" meta="Lucro e prejuizo por cliente">
          <div className="dir-rank-list">
            {topClientesPrejuizo.length > 0
              ? topClientesPrejuizo.map((item) => <DirRank key={item.clienteCodigo || item.cliente} label={item.cliente} sub={`Margem ${dirPct(item.margem)}`} value={dirShort(item.lucro)} tone="#ef4444"/>)
              : topClientesLucro.map((item) => <DirRank key={item.clienteCodigo || item.cliente} label={item.cliente} sub={`Margem ${dirPct(item.margem)}`} value={dirShort(item.lucro)} tone="#22c55e"/>)}
            {!topClientesPrejuizo.length && !topClientesLucro.length && <div className="dir-empty">Sem ranking de clientes no periodo.</div>}
          </div>
        </DirCard>

        <DirCard title="Veiculos com maior custo" meta="Proprios e terceiros - prioridade de investigacao">
          <div className="dir-rank-list">
            {state.loadingFrota && <div className="dir-empty">Carregando Frota BI...</div>}
            {topVeiculosCusto.map((item) => <DirRank key={item.placa || item.label} label={item.placa || item.label} sub={item.tipo || item.centroCusto || "Custo acumulado"} value={dirShort(item.custo || item.value)} tone="#f97316"/>)}
            {!state.loadingFrota && !topVeiculosCusto.length && <div className="dir-empty">Sem ranking de veiculos no periodo.</div>}
          </div>
        </DirCard>
      </div>
    </div>
  );
};

window.Diretoria = Diretoria;

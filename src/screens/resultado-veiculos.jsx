const rvNum = (value) => Number(value) || 0;
const rvMoney = (value) => rvNum(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rvPct = (value) => value === null || value === undefined ? "—" : `${rvNum(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const rvDate = (value) => value ? String(value).slice(0, 10).split("-").reverse().join("/") : "—";
const rvIso = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const rvRange = (key) => {
  const now = new Date();
  if (key === "7d" || key === "30d" || key === "90d") {
    const start = new Date(now); start.setDate(start.getDate() - (Number(key.replace("d", "")) - 1));
    return { startDate: rvIso(start), endDate: rvIso(now) };
  }
  if (key === "previous") {
    return { startDate: rvIso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), endDate: rvIso(new Date(now.getFullYear(), now.getMonth(), 0)) };
  }
  return { startDate: rvIso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: rvIso(now) };
};

function RvKpi({ label, value, note, tone, variation }) {
  return <div className="rv-kpi" style={{ "--rv-tone": tone }}><span>{label}</span><strong>{value}</strong><small>{note}</small>{variation !== null && variation !== undefined && <em className={variation > 0 ? "up" : variation < 0 ? "down" : ""}>{variation > 0 ? "↑" : variation < 0 ? "↓" : "→"} {Math.abs(rvNum(variation)).toFixed(1)}% vs. período anterior</em>}</div>;
}

function RvBars({ title, subtitle, rows, total, valueField, labelField, onSelect, empty }) {
  const visible = (rows || []).slice(0, 7);
  return <section className="card rv-section"><div className="rv-section-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    {!visible.length && <div className="rv-empty">{empty}</div>}
    <div className="rv-bars">{visible.map((row, index) => {
      const value = rvNum(row[valueField]);
      const percent = total > 0 ? value / total * 100 : 0;
      return <button key={`${row[labelField]}-${index}`} onClick={() => onSelect(row)}><span><b>{row[labelField] || "Não informado"}</b><em>{rvMoney(value)} · {rvPct(percent)}</em></span><i><u style={{ width: `${Math.max(1.5, percent)}%` }}/></i><small>Ver detalhes</small></button>;
    })}</div>
  </section>;
}

const ResultadoVeiculos = () => {
  const initialRange = rvRange("month");
  const [period, setPeriod] = React.useState("custom");
  const [startDate, setStartDate] = React.useState(initialRange.startDate);
  const [endDate, setEndDate] = React.useState(initialRange.endDate);
  const [plate, setPlate] = React.useState("all");
  const [applied, setApplied] = React.useState({ ...initialRange, placa: "all" });
  const [options, setOptions] = React.useState({ placas: [], veiculos: [] });
  const [costs, setCosts] = React.useState(null);
  const [revenue, setRevenue] = React.useState(null);
  const [linkedSet, setLinkedSet] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [fleetStatus, setFleetStatus] = React.useState("all");
  const [fleetSort, setFleetSort] = React.useState("profit");
  const [detailTab, setDetailTab] = React.useState("expenses");
  const [detailFilter, setDetailFilter] = React.useState(null);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [tableSort, setTableSort] = React.useState({ key: "data", direction: "desc" });

  React.useEffect(() => {
    window.RB_API.getCustosVeiculosFiltros().then((data) => setOptions(data || { placas: [] })).catch(() => {});
  }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setDetailFilter(null); setSelectedItem(null);
    const filters = { startDate: applied.startDate, endDate: applied.endDate, proprietario: "frota", limit: 5000 };
    if (applied.placa !== "all") filters.placa = applied.placa;
    window.RB_API.getResultadoVeiculos(filters).then((payload = {}) => {
      if (!active) return;
      if (!payload.custos) throw new Error("A API local ainda não foi atualizada. Reinicie o backend e tente novamente.");
      setCosts(payload.custos); setRevenue(payload.receitas || null); setLinkedSet(payload.conjunto || null);
    }).catch((err) => { if (active) setError(err?.message || "Não foi possível carregar o resultado dos veículos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(applied)]);

  React.useEffect(() => {
    const id = "rv-screen-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style"); style.id = id; style.textContent = `
      .rv-page{max-width:1600px;margin:0 auto}.rv-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:16px}.rv-head h1{font-size:25px;margin:0 0 5px}.rv-head p,.rv-section p{margin:0;color:var(--text-3);font-size:12px}.rv-filter{display:grid;grid-template-columns:150px minmax(260px,1fr) 140px 140px auto;gap:10px;align-items:end;padding:16px;margin-bottom:16px}.rv-filter label{display:grid;gap:6px;color:var(--text-3);font-size:11px}.rv-filter select,.rv-filter input{height:38px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text);padding:0 10px;color-scheme:dark}.rv-filter .custom-hidden{visibility:hidden}.rv-title{margin:4px 0 14px}.rv-title h2{font-size:19px;margin:0 0 4px}.rv-title span{color:var(--text-3);font-size:12px}.rv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.rv-kpi{position:relative;padding:18px;border:1px solid var(--border);border-left:3px solid var(--rv-tone);border-radius:10px;background:var(--surface-1);display:grid;gap:7px}.rv-kpi>span{font-size:11px;color:var(--text-3)}.rv-kpi>strong{font-size:27px;line-height:1.15}.rv-kpi>small{font-size:11px;color:var(--text-2)}.rv-kpi>em{font-size:10px;color:var(--text-3);font-style:normal}.rv-kpi>em.up{color:#22c55e}.rv-kpi>em.down{color:#ef4444}.rv-sentence{margin:14px 0;padding:14px 17px;border-radius:9px;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);font-size:14px;line-height:1.55}.rv-sentence strong.positive{color:#22c55e}.rv-sentence strong.negative{color:#ef4444}.rv-metrics{display:flex;gap:0;margin-bottom:16px;border:1px solid var(--border);border-radius:9px;overflow:hidden}.rv-metrics div{flex:1;padding:12px 16px;border-right:1px solid var(--border);display:grid;gap:3px}.rv-metrics div:last-child{border:0}.rv-metrics strong{font-size:15px}.rv-metrics span{font-size:10px;color:var(--text-3)}.rv-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rv-section{padding:18px}.rv-section-head h2{font-size:16px;margin:0 0 5px}.rv-highlight{margin:14px 0;padding:12px;border-radius:8px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);font-size:12px}.rv-bars{display:grid;gap:13px;margin-top:16px}.rv-bars button{border:0;background:transparent;color:var(--text);padding:0;text-align:left;cursor:pointer;display:grid;gap:6px}.rv-bars button>span{display:flex;justify-content:space-between;gap:15px}.rv-bars b{font-size:12.5px}.rv-bars em{font-size:11px;color:var(--text-2);font-style:normal}.rv-bars i{height:7px;background:rgba(255,255,255,.055);border-radius:9px;overflow:hidden}.rv-bars u{display:block;height:100%;background:#60a5fa;border-radius:9px;text-decoration:none}.rv-bars small{font-size:9px;color:#60a5fa;opacity:0}.rv-bars button:hover small{opacity:1}.rv-alerts{margin:14px 0;padding:16px}.rv-alerts h2{font-size:15px;margin:0 0 10px}.rv-alerts div{display:grid;gap:7px}.rv-alerts p{margin:0;padding:9px 11px;border-left:2px solid #f59e0b;background:rgba(245,158,11,.05);font-size:11.5px}.rv-detail{margin-top:14px;padding:0;overflow:hidden}.rv-detail-head{display:flex;align-items:center;justify-content:space-between;padding:15px 17px;border-bottom:1px solid var(--border)}.rv-detail-head h2{font-size:16px;margin:0}.rv-tabs{display:flex;gap:5px}.rv-tabs button,.rv-pills button{border:1px solid var(--border);background:transparent;color:var(--text-3);border-radius:7px;padding:7px 11px;cursor:pointer}.rv-tabs button.active,.rv-pills button.active{background:var(--brand-blue);color:white}.rv-pills{display:flex;gap:6px;padding:11px 17px;flex-wrap:wrap}.rv-table{width:100%;border-collapse:collapse}.rv-table th,.rv-table td{padding:11px 15px;border-top:1px solid var(--border);font-size:11.5px;text-align:left}.rv-table th{color:var(--text-3);font-weight:500}.rv-table tr.clickable{cursor:pointer}.rv-table tr.clickable:hover{background:rgba(255,255,255,.025)}.rv-table .num{text-align:right}.rv-empty{padding:26px;text-align:center;color:var(--text-3)}.rv-fleet-tools{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:15px 0}.rv-pills{padding:0}.rv-fleet-tools select{height:34px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text);padding:0 9px}.rv-fleet{display:grid;gap:9px}.rv-fleet-row{display:grid;grid-template-columns:minmax(180px,1.4fr) repeat(4,1fr) auto;gap:18px;align-items:center;padding:14px 16px;border:1px solid var(--border);border-radius:9px;background:var(--surface-1);color:var(--text);text-align:left;cursor:pointer}.rv-fleet-row:hover{border-color:#3b82f6}.rv-fleet-row span{display:grid;gap:3px;font-size:10px;color:var(--text-3)}.rv-fleet-row strong{font-size:13px;color:var(--text)}.rv-badge{padding:5px 8px;border-radius:999px;font-size:10px}.rv-badge.profit{color:#22c55e;background:rgba(34,197,94,.1)}.rv-badge.loss{color:#ef4444;background:rgba(239,68,68,.1)}.rv-badge.no-revenue{color:#f59e0b;background:rgba(245,158,11,.1)}.rv-drawer-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(3px);z-index:1000;display:grid;place-items:center;padding:24px}.rv-drawer{width:min(760px,96vw);max-height:min(760px,92vh);background:var(--surface-1);border:1px solid var(--border);border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.55);overflow:auto}.rv-drawer header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:15px;padding:20px 22px;background:var(--surface-1);border-bottom:1px solid var(--border)}.rv-drawer h2{font-size:18px;margin:0 0 4px}.rv-modal-body{padding:22px}.rv-service{padding:17px;border-radius:10px;background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);margin-bottom:16px}.rv-service span,.rv-detail-card span{display:block;color:var(--text-3);font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}.rv-service strong{font-size:16px}.rv-service p{margin:8px 0 0;color:var(--text-2);font-size:12px;line-height:1.55;white-space:pre-wrap}.rv-detail-value{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}.rv-detail-card{padding:13px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.rv-detail-card strong{font-size:13px}.rv-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;border-top:1px solid var(--border)}.rv-detail-grid div{padding:12px 0;border-bottom:1px solid var(--border);min-width:0}.rv-detail-grid dt{color:var(--text-3);font-size:10px;margin-bottom:5px}.rv-detail-grid dd{margin:0;font-size:12px;overflow-wrap:anywhere}.rv-source-note{margin:16px 0 0;color:var(--text-3);font-size:10px}.rv-error{border-color:#ef4444;color:#fca5a5;margin-bottom:14px}.rv-loading{margin-bottom:14px}.rv-update-note{font-size:10px;color:var(--text-3);margin-top:8px}
      .rv-sort{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:inherit;padding:0;cursor:pointer;font:inherit}.rv-sort:hover,.rv-sort.active{color:#93c5fd}.rv-sort i{font-style:normal;font-size:9px;min-width:8px}.rv-table th.num .rv-sort{justify-content:flex-end;width:100%}.rv-impact{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;font-size:9.5px;white-space:nowrap}.rv-impact.normal{color:#93c5fd;background:rgba(59,130,246,.1)}.rv-impact.attention{color:#fbbf24;background:rgba(245,158,11,.11)}.rv-impact.high{color:#f87171;background:rgba(239,68,68,.11)}
      @media(max-width:1100px){.rv-kpis{grid-template-columns:1fr 1fr}.rv-columns{grid-template-columns:1fr}.rv-fleet-row{grid-template-columns:1.4fr 1fr 1fr auto}.rv-fleet-row .optional{display:none}.rv-filter{grid-template-columns:1fr 1fr auto}.rv-filter label:nth-child(3),.rv-filter label:nth-child(4){display:none}}
      @media(max-width:700px){.rv-head{align-items:flex-start;flex-direction:column}.rv-filter,.rv-kpis{grid-template-columns:1fr}.rv-metrics{display:grid;grid-template-columns:1fr 1fr}.rv-metrics div{border-bottom:1px solid var(--border)}.rv-fleet-row{grid-template-columns:1fr auto}.rv-fleet-row>span:not(:first-child){display:none}.rv-table th:nth-child(3),.rv-table td:nth-child(3){display:none}.rv-drawer-bg{padding:10px}.rv-detail-value,.rv-detail-grid{grid-template-columns:1fr}.rv-drawer{max-height:95vh}}
    `; document.head.appendChild(style);
  }, []);

  const vehicles = costs?.profit?.vehicles || [];
  const vehicleOptions = options.veiculos || [];
  const optionGroups = {
    caminhao: vehicleOptions.filter((item) => item.categoria === "caminhao"),
    carro: vehicleOptions.filter((item) => item.categoria === "carro"),
    carreta: vehicleOptions.filter((item) => item.categoria === "carreta"),
  };
  const vehicleOptionLabel = (item) => {
    if (item.categoria === "carreta" && item.placaPrincipal) return `${item.placa} — carreta do ${item.placaPrincipal}`;
    if (item.implementos?.length) return `${item.placa} — ${item.modelo} + ${item.implementos.join(" / ")}`;
    return `${item.placa} — ${item.modelo}`;
  };
  const selectedVehicle = applied.placa === "all" ? null : vehicles.find((item) => item.placa === linkedSet?.placaPrincipal) || vehicles.find((item) => item.placa === applied.placa) || vehicles[0];
  const summary = costs?.profit?.summary || {};
  const noRevenue = rvNum(summary.receitaTotal) === 0 && rvNum(summary.custoTotal) > 0;
  const positive = rvNum(summary.lucroTotal) >= 0;
  const model = selectedVehicle?.veiculoNome || "";
  const variation = costs?.comparison || {};
  const categories = [...(costs?.types || [])].sort((a, b) => rvNum(b.custo) - rvNum(a.custo));
  const customers = [...(revenue?.clientes || [])].sort((a, b) => rvNum(b.receitaTotal) - rvNum(a.receitaTotal));
  const revenues = customers.flatMap((client) => (client.viagens || []).map((item) => ({ ...item, cliente: client.cliente })));
  const expenses = costs?.launches || [];
  const activeExpenses = detailFilter?.kind === "expense" ? expenses.filter((item) => item.tipoCusto === detailFilter.value) : expenses;
  const activeRevenues = detailFilter?.kind === "revenue" ? revenues.filter((item) => item.cliente === detailFilter.value) : revenues;
  const sortRows = (rows, type) => [...rows].sort((a, b) => {
    const direction = tableSort.direction === "asc" ? 1 : -1;
    const fields = type === "expenses"
      ? { data: "data", description: "descricao", party: "fornecedor", category: "tipoCusto", impact: "valor", value: "valor" }
      : { data: "data", description: "cliente", party: "numero", category: "origem", value: "receita" };
    const field = fields[tableSort.key] || fields.data;
    if (tableSort.key === "value" || tableSort.key === "impact") return direction * (rvNum(a[field]) - rvNum(b[field]));
    return direction * String(a[field] || "").localeCompare(String(b[field] || ""), "pt-BR", { numeric: true, sensitivity: "base" });
  });
  const sortedExpenses = sortRows(activeExpenses, "expenses");
  const sortedRevenues = sortRows(activeRevenues, "revenues");
  const topCategory = categories[0];
  const alerts = [];
  if (topCategory && rvNum(summary.custoTotal) > 0) alerts.push(`${topCategory.tipo} representa ${rvPct(rvNum(topCategory.custo) / rvNum(summary.custoTotal) * 100)} dos custos.`);
  if (noRevenue) alerts.push(`Este veículo teve ${rvMoney(summary.custoTotal)} em custos, mas não teve receita registrada no período.`);

  let fleetRows = [...vehicles].filter((item) => fleetStatus === "all" || (fleetStatus === "profit" && item.lucro > 0) || (fleetStatus === "loss" && item.lucro < 0 && item.receita > 0) || (fleetStatus === "no-revenue" && item.receita === 0 && item.custo > 0));
  fleetRows.sort((a, b) => fleetSort === "loss" ? a.lucro - b.lucro : fleetSort === "cost" ? b.custo - a.custo : fleetSort === "revenue" ? b.receita - a.receita : fleetSort === "plate" ? a.placa.localeCompare(b.placa) : b.lucro - a.lucro);

  const setPeriodValue = (key) => { setPeriod(key); if (key !== "custom") { const range = rvRange(key); setStartDate(range.startDate); setEndDate(range.endDate); } };
  const apply = () => setApplied({ startDate, endDate, placa: plate });
  const selectVehicle = (value) => { setPlate(value); setApplied({ startDate, endDate, placa: value }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectExpense = (row) => { setDetailTab("expenses"); setDetailFilter({ kind: "expense", value: row.tipo }); setTimeout(() => document.querySelector(".rv-detail")?.scrollIntoView({ behavior: "smooth" }), 0); };
  const selectCustomer = (row) => { setDetailTab("revenues"); setDetailFilter({ kind: "revenue", value: row.cliente }); setTimeout(() => document.querySelector(".rv-detail")?.scrollIntoView({ behavior: "smooth" }), 0); };
  const toggleTableSort = (key) => setTableSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: key === "value" || key === "data" ? "desc" : "asc" });
  const SortHeader = ({ sortKey, children, numeric = false }) => <th className={numeric ? "num" : ""}><button type="button" className={`rv-sort ${tableSort.key === sortKey ? "active" : ""}`} onClick={() => toggleTableSort(sortKey)}>{children}<i>{tableSort.key === sortKey ? tableSort.direction === "asc" ? "▲" : "▼" : "↕"}</i></button></th>;
  const ExpenseImpact = ({ value }) => {
    const percent = rvNum(summary.custoTotal) > 0 ? rvNum(value) / rvNum(summary.custoTotal) * 100 : 0;
    const level = percent >= 10 ? "high" : percent >= 5 ? "attention" : "normal";
    return <span className={`rv-impact ${level}`}>{level === "high" ? "Alto" : level === "attention" ? "Atenção" : "Normal"} · {rvPct(percent)}</span>;
  };
  const selectedAmount = rvNum(selectedItem?.valor ?? selectedItem?.receita);
  const selectedImpact = selectedItem?.detailType === "Despesa" && rvNum(summary.custoTotal) > 0 ? selectedAmount / rvNum(summary.custoTotal) * 100 : null;
  const selectedService = selectedItem?.descricao || selectedItem?.historico || selectedItem?.tipoCusto || (selectedItem?.detailType === "Receita" ? "Receita de frete" : "Serviço não detalhado no ERP");
  const selectedObservation = selectedItem?.historico && selectedItem.historico !== selectedService ? selectedItem.historico : "";

  return <div className="view rv-page">
    <div className="rv-head"><div><h1>Resultado por Veículo</h1><p>Entenda quanto cada veículo faturou, gastou e onde está o dinheiro.</p></div><button className="btn" onClick={apply}><Icon name="refresh"/> Atualizar</button></div>
    <div className="card rv-filter"><label>Período<select value={period} onChange={(e) => setPeriodValue(e.target.value)}><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="month">Este mês</option><option value="previous">Mês anterior</option><option value="90d">90 dias</option><option value="custom">Personalizado</option></select></label><label>Veículo<select value={plate} onChange={(e) => setPlate(e.target.value)}><option value="all">Todos os veículos</option>{optionGroups.caminhao.length > 0 && <optgroup label="CAMINHÕES">{optionGroups.caminhao.map((item) => <option key={item.placa} value={item.placa}>{vehicleOptionLabel(item)}</option>)}</optgroup>}{optionGroups.carro.length > 0 && <optgroup label="CARROS">{optionGroups.carro.map((item) => <option key={item.placa} value={item.placa}>{vehicleOptionLabel(item)}</option>)}</optgroup>}{optionGroups.carreta.length > 0 && <optgroup label="CARRETAS">{optionGroups.carreta.map((item) => <option key={item.placa} value={item.placa}>{vehicleOptionLabel(item)}</option>)}</optgroup>}</select></label><label>Data inicial<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPeriod("custom"); }}/></label><label>Data final<input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPeriod("custom"); }}/></label><button className="btn primary" onClick={apply}>Ver resultado</button></div>
    {error && <div className="card rv-error">{error}</div>}{loading && <div className="card rv-loading">Calculando receita, custos e resultado...</div>}
    {!loading && !error && <>
      <div className="rv-title"><h2>{selectedVehicle ? `Resultado — ${linkedSet?.placaPrincipal || selectedVehicle.placa}` : "Resultado da frota"}</h2><span>{model || `${vehicles.length} veículos com movimentação no período`} · {rvDate(applied.startDate)} a {rvDate(applied.endDate)}{linkedSet?.implementos?.length ? ` · inclui ${linkedSet.implementos.length} carreta(s): ${linkedSet.implementos.join(", ")}` : ""}</span></div>
      <div className="rv-kpis"><RvKpi label="Receita" value={rvMoney(summary.receitaTotal)} note="Quanto faturou" tone="#22c55e" variation={variation.receita?.variacaoPercentual}/><RvKpi label="Custos" value={rvMoney(summary.custoTotal)} note="Quanto foi gasto" tone="#f59e0b" variation={variation.custo?.variacaoPercentual}/><RvKpi label={noRevenue ? "Sem receita" : positive ? "Lucro" : "Prejuízo"} value={noRevenue ? rvMoney(summary.custoTotal) : rvMoney(summary.lucroTotal)} note={noRevenue ? "Custos sem receita registrada" : positive ? "Sobrou depois dos custos" : "Os custos passaram da receita"} tone={noRevenue ? "#f59e0b" : positive ? "#22c55e" : "#ef4444"} variation={variation.resultado?.variacaoPercentual}/><RvKpi label="Margem" value={noRevenue ? "—" : rvPct(summary.margem)} note={noRevenue ? "Não calculada sem receita" : positive ? "Lucro sobre a receita" : "Prejuízo sobre a receita"} tone={positive ? "#3b82f6" : "#ef4444"}/></div>
      <div className="rv-sentence">{noRevenue ? <>Este veículo teve <b>{rvMoney(summary.custoTotal)}</b> em custos, mas não teve receita registrada no período.</> : <>Este {selectedVehicle ? "veículo" : "grupo"} faturou <b>{rvMoney(summary.receitaTotal)}</b> e teve <b>{rvMoney(summary.custoTotal)}</b> em custos. Resultado: <strong className={positive ? "positive" : "negative"}>{positive ? "lucro" : "prejuízo"} de {rvMoney(Math.abs(rvNum(summary.lucroTotal)))}</strong>.</>}</div>
      {selectedVehicle && <div className="rv-metrics"><div><strong>{selectedVehicle.viagens || selectedVehicle.conhecimentos || 0}</strong><span>{selectedVehicle.viagens ? "viagens identificadas" : "CT-es"}</span></div><div><strong>{summary.distanciaKm ? `${rvNum(summary.distanciaKm).toLocaleString("pt-BR")} km` : "KM não disponível"}</strong><span>distância confiável no período</span></div><div><strong>{summary.custoPorKm !== null ? `${rvMoney(summary.custoPorKm)}/km` : "—"}</strong><span>custo do conjunto por km</span></div><div><strong>{summary.distanciaKm ? `${rvMoney(summary.receitaTotal / summary.distanciaKm)}/km` : "—"}</strong><span>receita por km</span></div></div>}
      {selectedVehicle ? <>
        <div className="rv-columns"><div><RvBars title="Onde estou gastando?" subtitle="Clique em uma categoria para ver os lançamentos." rows={categories} total={rvNum(summary.custoTotal)} valueField="custo" labelField="tipo" onSelect={selectExpense} empty="Nenhuma despesa encontrada."/>{topCategory && <div className="rv-highlight">Maior gasto: <b>{topCategory.tipo}</b> — {rvMoney(topCategory.custo)} — {rvPct(rvNum(topCategory.custo) / Math.max(1, rvNum(summary.custoTotal)) * 100)} dos custos</div>}</div><RvBars title="De onde veio a receita?" subtitle={`${revenues.length} CT-es no período · clique no cliente para detalhar.`} rows={customers} total={rvNum(summary.receitaTotal)} valueField="receitaTotal" labelField="cliente" onSelect={selectCustomer} empty="Nenhuma receita encontrada para este veículo."/></div>
        {!!alerts.length && <section className="card rv-alerts"><h2>Pontos de atenção</h2><div>{alerts.slice(0, 3).map((item) => <p key={item}>⚠ {item}</p>)}</div></section>}
        <section className="card rv-detail"><div className="rv-detail-head"><h2>Receitas e despesas</h2><div className="rv-tabs"><button className={detailTab === "expenses" ? "active" : ""} onClick={() => { setDetailTab("expenses"); setDetailFilter(null); }}>Despesas</button><button className={detailTab === "revenues" ? "active" : ""} onClick={() => { setDetailTab("revenues"); setDetailFilter(null); }}>Receitas</button></div></div>{detailFilter && <div className="rv-pills"><button className="active" onClick={() => setDetailFilter(null)}>{detailFilter.value} ×</button></div>}
          <div className="table-wrap"><table className="rv-table"><thead>{detailTab === "expenses" ? <tr><SortHeader sortKey="data">Data</SortHeader><SortHeader sortKey="description">O que foi</SortHeader><SortHeader sortKey="party">Fornecedor</SortHeader><SortHeader sortKey="category">Categoria</SortHeader><SortHeader sortKey="impact">Impacto no custo</SortHeader><SortHeader sortKey="value" numeric>Valor</SortHeader></tr> : <tr><SortHeader sortKey="data">Data</SortHeader><SortHeader sortKey="description">Cliente</SortHeader><SortHeader sortKey="party">Documento</SortHeader><SortHeader sortKey="category">Descrição/rota</SortHeader><SortHeader sortKey="value" numeric>Valor</SortHeader></tr>}</thead><tbody>{detailTab === "expenses" ? sortedExpenses.slice(0, 100).map((item) => <tr className="clickable" key={item.id} onClick={() => setSelectedItem({ ...item, detailType: "Despesa" })}><td>{rvDate(item.data)}</td><td>{item.descricao || item.historico || "Despesa"}</td><td>{item.fornecedor}</td><td>{item.tipoCusto}</td><td><ExpenseImpact value={item.valor}/></td><td className="num">{rvMoney(item.valor)}</td></tr>) : sortedRevenues.slice(0, 100).map((item) => <tr className="clickable" key={item.id} onClick={() => setSelectedItem({ ...item, detailType: "Receita" })}><td>{rvDate(item.data)}</td><td>{item.cliente}</td><td>{item.numero || item.codigo}</td><td>{[item.origem, item.destino].filter(Boolean).join(" → ") || "—"}</td><td className="num">{rvMoney(item.receita)}</td></tr>)}</tbody></table></div>
          {((detailTab === "expenses" && !activeExpenses.length) || (detailTab === "revenues" && !activeRevenues.length)) && <div className="rv-empty">Nenhum lançamento encontrado.</div>}
        </section>
      </> : <><div className="rv-fleet-tools"><div className="rv-pills"><button className={fleetStatus === "all" ? "active" : ""} onClick={() => setFleetStatus("all")}>Todos</button><button className={fleetStatus === "profit" ? "active" : ""} onClick={() => setFleetStatus("profit")}>Com lucro</button><button className={fleetStatus === "loss" ? "active" : ""} onClick={() => setFleetStatus("loss")}>Com prejuízo</button><button className={fleetStatus === "no-revenue" ? "active" : ""} onClick={() => setFleetStatus("no-revenue")}>Sem receita</button></div><select value={fleetSort} onChange={(e) => setFleetSort(e.target.value)}><option value="profit">Maior lucro</option><option value="loss">Maior prejuízo</option><option value="cost">Maior custo</option><option value="revenue">Maior receita</option><option value="plate">Placa</option></select></div><div className="rv-fleet">{fleetRows.map((item) => { const status = item.receita === 0 && item.custo > 0 ? "no-revenue" : item.lucro >= 0 ? "profit" : "loss"; return <button className="rv-fleet-row" key={item.placa} onClick={() => selectVehicle(item.placa)}><span><strong>{item.placa}</strong><small>{item.veiculoNome || "Modelo não informado"}</small></span><span><small>Receita</small><strong>{rvMoney(item.receita)}</strong></span><span><small>Custos</small><strong>{rvMoney(item.custo)}</strong></span><span className="optional"><small>{item.lucro >= 0 ? "Lucro" : "Prejuízo"}</small><strong>{rvMoney(item.lucro)}</strong></span><span className="optional"><small>Margem</small><strong>{item.receita > 0 ? rvPct(item.margem) : "—"}</strong></span><em className={`rv-badge ${status}`}>{status === "profit" ? "Lucro" : status === "loss" ? "Prejuízo" : "Sem receita"}</em></button>; })}</div></>}
    </>}
    {selectedItem && <div className="rv-drawer-bg" role="presentation" onMouseDown={() => setSelectedItem(null)}><section className="rv-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes da ${selectedItem.detailType.toLowerCase()}`} onMouseDown={(e) => e.stopPropagation()}><header><div><h2>Detalhes da {selectedItem.detailType.toLowerCase()}</h2><span className="muted">Confira o serviço e a origem deste lançamento</span></div><button className="icon-btn" aria-label="Fechar detalhes" onClick={() => setSelectedItem(null)}><Icon name="x"/></button></header><div className="rv-modal-body">
      <div className="rv-service"><span>O que foi</span><strong>{selectedService}</strong>{selectedObservation && <p>{selectedObservation}</p>}</div>
      <div className="rv-detail-value"><div className="rv-detail-card"><span>Valor</span><strong>{rvMoney(selectedAmount)}</strong></div><div className="rv-detail-card"><span>Categoria</span><strong>{selectedItem.tipoCusto || "Receita"}</strong></div><div className="rv-detail-card"><span>{selectedImpact === null ? "Situação" : "Impacto no custo"}</span><strong>{selectedImpact === null ? selectedItem.situacao || "Não informada" : rvPct(selectedImpact)}</strong></div></div>
      <dl className="rv-detail-grid"><div><dt>Data do lançamento</dt><dd>{rvDate(selectedItem.data)}</dd></div><div><dt>Veículo / placa</dt><dd>{selectedItem.placa || applied.placa}</dd></div><div><dt>Fornecedor / cliente</dt><dd>{selectedItem.fornecedor || selectedItem.cliente || "Não informado"}</dd></div><div><dt>Documento</dt><dd>{selectedItem.documento || selectedItem.numero || selectedItem.codigo || "Não informado"}</dd></div><div><dt>Centro de custo</dt><dd>{selectedItem.centroCusto || "Não informado"}</dd></div><div><dt>Fonte do lançamento</dt><dd>{selectedItem.origem || "Não informada"}</dd></div>{selectedItem.destino && <div><dt>Destino</dt><dd>{selectedItem.destino}</dd></div>}<div><dt>Situação financeira</dt><dd>{selectedItem.situacao || "Não informada"}</dd></div></dl>
      {!selectedObservation && <p className="rv-source-note">O ERP não possui uma observação adicional para este lançamento. A descrição acima corresponde à conta ou ao histórico disponível no financeiro.</p>}
    </div></section></div>}
  </div>;
};

window.ResultadoVeiculos = ResultadoVeiculos;

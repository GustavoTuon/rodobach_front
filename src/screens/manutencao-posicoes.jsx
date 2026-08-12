const COMPONENTS = ["Lona de freio", "Graxa", "Tambor", "Rolamento", "Cubo", "Amortecedor", "Mola", "Suspensão", "Outro"];
const SERVICES = ["Troca", "Inspeção", "Regulagem", "Reparo"];
const INSPECTION_CONDITIONS = [{ id: "BOM", label: "Bom", color: "#16a34a" }, { id: "ATENCAO", label: "Atenção", color: "#d97706" }, { id: "CRITICO", label: "Crítico", color: "#dc2626" }];
const INSPECTION_REASONS = ["Desgaste", "Folga", "Ruído", "Vazamento", "Trinca", "Aquecimento", "Outro"];
const STATUS = {
  none: { color: "#94a3b8", label: "Sem histórico", icon: "○", rank: 0 },
  ok: { color: "#16a34a", label: "Em dia", icon: "✓", rank: 1 },
  near: { color: "#d97706", label: "Próximo", icon: "!", rank: 2 },
  overdue: { color: "#dc2626", label: "Vencido", icon: "×", rank: 3 },
};

function inferMaintenanceLayout(vehicle) {
  const text = `${vehicle?.modelo || ""} ${vehicle?.marca || ""}`.toUpperCase();
  const axles = Number(vehicle?.eixos) || 3;
  if (axles >= 4 || /BITRUCK|BI.?TRUCK|8X2|8X4/.test(text)) return "BITRUCK";
  if ((vehicle?.implementos || []).length) return "CAVALO";
  return "TRUCK";
}

function axleConfig(type, count) {
  if (type === "BITRUCK") return [{ id: "DIR-1", label: "Direcional 1", dual: false }, { id: "DIR-2", label: "Direcional 2", dual: false }, { id: "TRAS-1", label: "Traseiro 1", dual: true }, { id: "TRAS-2", label: "Traseiro 2", dual: true }];
  if (type === "IMPLEMENTO") return Array.from({ length: Math.max(2, count || 3) }, (_, i) => ({ id: `IMP-${i + 1}`, label: `Eixo ${i + 1}`, dual: true }));
  return [{ id: "DIR-1", label: "Direcional", dual: false }, { id: "TRAS-1", label: "Traseiro 1", dual: true }, { id: "TRAS-2", label: "Traseiro 2", dual: true }];
}

function recordStatus(record, currentKm) {
  if (!record) return STATUS.none;
  if (record.condicao === "CRITICO") return STATUS.overdue;
  if (record.condicao === "ATENCAO") return STATUS.near;
  const remainingKm = record.proximo_km ? Number(record.proximo_km) - currentKm : null;
  const plannedInterval = record.proximo_km && record.km_servico ? Number(record.proximo_km) - Number(record.km_servico) : 0;
  const due = record.proxima_data ? new Date(`${String(record.proxima_data).slice(0, 10)}T23:59:59`) : null;
  const days = due ? Math.ceil((due - new Date()) / 86400000) : null;
  if ((remainingKm != null && remainingKm <= 0) || (days != null && days <= 0)) return { ...STATUS.overdue, remainingKm, days };
  if ((remainingKm != null && remainingKm <= Math.max(1000, plannedInterval * .1)) || (days != null && days <= 30)) return { ...STATUS.near, remainingKm, days };
  return { ...STATUS.ok, remainingKm, days };
}

function positionState(records, plate, axle, side, currentKm) {
  const history = records.filter(r => r.placa === plate && r.eixo_codigo === axle && r.lado === side);
  const latest = new Map();
  history.forEach(record => { if (!latest.has(record.componente)) latest.set(record.componente, record); });
  const components = COMPONENTS.filter(component => component !== "Outro").map(component => ({ component, record: latest.get(component), status: recordStatus(latest.get(component), currentKm) }));
  const worst = components.reduce((result, item) => item.status.rank > result.rank ? item.status : result, STATUS.none);
  const counts = components.reduce((acc, item) => { acc[item.status.label] = (acc[item.status.label] || 0) + 1; return acc; }, {});
  return { ...worst, history, components, counts };
}

function allPositions(vehicle) {
  if (!vehicle) return [];
  const layout = inferMaintenanceLayout(vehicle);
  const units = [{ plate: vehicle.placa, type: layout, count: vehicle.eixos }, ...(vehicle.implementos || []).map(item => ({ plate: item.placa, type: "IMPLEMENTO", count: item.eixos }))];
  return units.flatMap(unit => axleConfig(unit.type, unit.count).flatMap(axle => ["E", "D"].map(side => ({ ...unit, axle, side }))));
}

const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const formatKm = value => Number(value || 0).toLocaleString("pt-BR");
const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Wheel({ dual, side, state, onClick }) {
  return <button className={`mp-wheel ${dual ? "is-dual" : ""}`} type="button" onClick={onClick} title={`${side === "E" ? "Esquerdo" : "Direito"} · ${state.label}`} style={{ "--position-color": state.color }}>
    <span className="mp-wheel-icon">{dual ? "▮▮" : "▮"}</span><span>{side}</span><small>{state.icon}</small>
  </button>;
}

function AxleDiagram({ plate, title, type, count, records, currentKm, selected, onSelect }) {
  return <div className="card mp-vehicle-card">
    <div className="mp-unit-head"><div><strong>{title}</strong><div className="muted">{plate} · {type === "IMPLEMENTO" ? "Implemento" : type === "BITRUCK" ? "Bi-truck" : type === "CAVALO" ? "Cavalo mecânico" : "Truck"}</div></div><Icon name={type === "IMPLEMENTO" ? "package" : "truck"}/></div>
    <div className="mp-front">FRENTE <span>↑</span></div><div className={`mp-body-shape ${type === "IMPLEMENTO" ? "trailer" : "truck"}`}/>
    {axleConfig(type, count).map(axle => {
      const left = positionState(records, plate, axle.id, "E", currentKm);
      const right = positionState(records, plate, axle.id, "D", currentKm);
      return <div key={axle.id} className="mp-axle-row">
        <Wheel dual={axle.dual} side="E" state={left} onClick={() => onSelect({ plate, axle, side: "E", type, state: left })}/>
        <div className="mp-axle"><span>{axle.label}</span></div>
        <Wheel dual={axle.dual} side="D" state={right} onClick={() => onSelect({ plate, axle, side: "D", type, state: right })}/>
        {selected?.plate === plate && selected?.axle.id === axle.id && <i className={`mp-selected-marker side-${selected.side}`}/>} 
      </div>;
    })}
  </div>;
}

function SummaryCards({ positions, records, currentKm }) {
  const totals = { "Vencido": 0, "Próximo": 0, "Em dia": 0, "Sem histórico": 0 };
  positions.forEach(pos => positionState(records, pos.plate, pos.axle.id, pos.side, currentKm).components.forEach(item => totals[item.status.label]++));
  return <div className="mp-summary">{[["Vencido", STATUS.overdue], ["Próximo", STATUS.near], ["Em dia", STATUS.ok], ["Sem histórico", STATUS.none]].map(([label, state]) => <div className="card mp-summary-card" key={label} style={{ "--status-color": state.color }}><span>{state.icon}</span><strong>{totals[label]}</strong><small>{label}</small></div>)}</div>;
}

function ComponentList({ selected, onRegister }) {
  return <div className="mp-component-list">{selected.state.components.map(item => <div className="mp-component" key={item.component}>
    <div className="mp-component-main"><i style={{ background: item.status.color }}/><div><strong>{item.component}</strong><small>{item.status.icon} {item.status.label}{item.status.remainingKm != null ? ` · ${Math.abs(item.status.remainingKm).toLocaleString("pt-BR")} km ${item.status.remainingKm < 0 ? "acima do limite" : "restantes"}` : ""}</small></div></div>
    <button type="button" className="btn btn-sm" onClick={() => onRegister(item.component)}>{item.record ? "Registrar" : "Primeiro registro"}</button>
  </div>)}</div>;
}

function History({ selected }) {
  if (!selected.state.history.length) return <div className="mp-empty"><strong>Nenhuma manutenção registrada nesta posição</strong><span>Registre o primeiro serviço para iniciar o histórico.</span></div>;
  return <div className="mp-timeline">{selected.state.history.map((record, index) => {
    const nextExchange = selected.state.history.slice(index + 1).find(item => item.componente === record.componente && item.tipo_servico === "Troca" && item.km_servico);
    const lifetime = record.tipo_servico === "Troca" && record.km_servico && nextExchange ? Number(record.km_servico) - Number(nextExchange.km_servico) : null;
    return <div className="mp-history-item" key={record.id}><i/><div><strong>{formatDate(record.data_servico)} · {record.km_servico ? `${formatKm(record.km_servico)} km` : "KM não informado"}</strong><span>{record.tipo_servico} de {record.componente}{record.condicao ? ` · ${record.condicao === "ATENCAO" ? "Atenção" : record.condicao === "CRITICO" ? "Crítico" : "Bom"}` : ""}</span><small>{[record.grupo_id && `Grupo ${record.grupo_id}`, record.motivo && `Motivo: ${record.motivo}`, record.marca && `Marca: ${record.marca}`, record.fornecedor && `Fornecedor: ${record.fornecedor}`, record.valor && money(record.valor), lifetime > 0 && `Vida útil: ${formatKm(lifetime)} km`].filter(Boolean).join(" · ")}</small></div></div>;
  })}</div>;
}

function ServiceForm({ selected, vehicle, initialComponent, options, saving, onCancel, onSave }) {
  const empty = { componentes: [initialComponent || "Lona de freio"], tipo_servico: "Troca", condicao: "", motivo: "", data_servico: new Date().toISOString().slice(0, 10), km_servico: vehicle?.km_atual || "", proximo_km: "", proxima_data: "", marca: "", fornecedor: "", valor: "", observacao: "" };
  const [form, setForm] = React.useState(empty);
  const [more, setMore] = React.useState(false);
  const intervals = Object.fromEntries((options.intervalos || []).map(item => [item.componente, Number(item.km)]));
  const suggested = form.componentes.map(component => ({ component, interval: intervals[component], next: intervals[component] && Number(form.km_servico) ? Number(form.km_servico) + intervals[component] : null })).filter(item => item.next);
  const toggleComponent = component => setForm(current => ({ ...current, componentes: current.componentes.includes(component) ? (current.componentes.length === 1 ? current.componentes : current.componentes.filter(item => item !== component)) : [...current.componentes, component] }));
  return <form className="mp-service-form" onSubmit={event => { event.preventDefault(); onSave(form); }}>
    <div className="mp-step"><strong>O que foi realizado?</strong><div className="mp-choice-row">{SERVICES.map(service => <button type="button" className={form.tipo_servico === service ? "active" : ""} onClick={() => setForm({ ...form, tipo_servico: service })} key={service}>{service}</button>)}</div></div>
    <div className="mp-step"><strong>Componentes <small className="muted">· selecione um ou mais para registrar agrupado</small></strong><div className="mp-choice-row mp-components-choice">{COMPONENTS.map(component => <button type="button" className={form.componentes.includes(component) ? "active" : ""} onClick={() => toggleComponent(component)} key={component}><span className="mp-check">{form.componentes.includes(component) ? "✓" : "+"}</span>{component}</button>)}</div></div>
    {form.tipo_servico === "Inspeção" && <div className="mp-inspection"><strong>Condição encontrada</strong><div className="mp-condition-row">{INSPECTION_CONDITIONS.map(item => <button type="button" key={item.id} className={form.condicao === item.id ? "active" : ""} style={{ "--condition-color": item.color }} onClick={() => setForm({ ...form, condicao: item.id })}>{item.label}</button>)}</div>{form.condicao && form.condicao !== "BOM" && <label>Motivo<select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })}><option value="">Selecione...</option>{INSPECTION_REASONS.map(reason => <option key={reason}>{reason}</option>)}</select></label>}</div>}
    <div className="mp-known-data"><span><small>Posição</small>{selected.axle.label} · {selected.side}</span><span><small>Data</small><input type="date" required value={form.data_servico} onChange={e => setForm({ ...form, data_servico: e.target.value })}/></span><span><small>KM do serviço</small><input type="number" value={form.km_servico} onChange={e => setForm({ ...form, km_servico: e.target.value })}/></span></div>
    {form.tipo_servico === "Troca" && suggested.length > 0 && <div className="mp-km-suggestions"><strong>Próximos vencimentos calculados</strong>{suggested.map(item => <span key={item.component}>{item.component}: <b>{formatKm(item.next)} km</b> <small>(intervalo planejado de {formatKm(item.interval)} km)</small></span>)}</div>}
    <button type="button" className="mp-more-toggle" onClick={() => setMore(!more)}>{more ? "− Ocultar informações adicionais" : "+ Mais informações (opcional)"}</button>
    {more && <div className="mp-form-grid"><label>Próximo KM <small>(sobrescrever cálculo)</small><input type="number" placeholder={suggested.length === 1 ? suggested[0].next : "Automático por componente"} value={form.proximo_km} onChange={e => setForm({ ...form, proximo_km: e.target.value })}/></label><label>Próxima data<input type="date" value={form.proxima_data} onChange={e => setForm({ ...form, proxima_data: e.target.value })}/></label><label>Marca<input list="mp-marcas" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })}/><datalist id="mp-marcas">{options.marcas.map(item => <option key={item} value={item}/>)}</datalist></label><label>Fornecedor<input list="mp-fornecedores" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })}/><datalist id="mp-fornecedores">{options.fornecedores.map(item => <option key={item} value={item}/>)}</datalist></label><label>Valor<input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })}/></label><label className="mp-observation">Observação<textarea rows="3" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })}/></label></div>}
    <div className="mp-actions"><button type="button" className="btn" onClick={onCancel}>Cancelar</button><button className="btn btn-primary" disabled={saving || (form.tipo_servico === "Inspeção" && !form.condicao)}>{saving ? "Salvando..." : form.componentes.length > 1 ? `Salvar ${form.componentes.length} serviços agrupados` : "Salvar serviço"}</button></div>
  </form>;
}

function MaintenanceCheckup({ positions, currentKm, vehicle, saving, onSave, onClose }) {
  const items = positions.flatMap(position => COMPONENTS.filter(component => component !== "Outro").map(component => ({ ...position, component })));
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const item = items[index];
  const key = item ? `${item.plate}|${item.axle.id}|${item.side}|${item.component}` : "";
  const answer = answers[key];
  const inspected = Object.keys(answers).length;
  const choose = condition => { setAnswers(current => ({ ...current, [key]: condition })); if (index < items.length - 1) setTimeout(() => setIndex(value => value + 1), 120); };
  const finish = async () => {
    const selectedItems = items.filter(entry => answers[`${entry.plate}|${entry.axle.id}|${entry.side}|${entry.component}`]).map(entry => ({ placa: entry.plate, conjunto_placa: vehicle.placa, layout_tipo: entry.type, eixo_codigo: entry.axle.id, lado: entry.side, componente: entry.component, tipo_servico: "Inspeção", condicao: answers[`${entry.plate}|${entry.axle.id}|${entry.side}|${entry.component}`], data_servico: new Date().toISOString().slice(0, 10), km_servico: currentKm }));
    if (selectedItems.length) await onSave(selectedItems, `Check-up com ${selectedItems.length} itens`);
  };
  const totals = Object.values(answers).reduce((acc, condition) => { acc[condition] = (acc[condition] || 0) + 1; return acc; }, {});
  return <div className="mp-checkup"><div className="mp-checkup-head"><div><small>CHECK-UP · {vehicle.placa}</small><h3>{inspected} de {items.length} verificados</h3></div><button className="icon-btn" onClick={onClose}><Icon name="x"/></button></div><div className="mp-progress"><i style={{ width: `${items.length ? inspected / items.length * 100 : 0}%` }}/></div>
    <div className="mp-checkup-item"><span>{index + 1} / {items.length}</span><h2>{item.component}</h2><p>{item.plate} · {item.axle.label} · lado {item.side === "E" ? "esquerdo" : "direito"}</p><div className="mp-checkup-actions">{INSPECTION_CONDITIONS.map(condition => <button type="button" className={answer === condition.id ? "active" : ""} style={{ "--condition-color": condition.color }} onClick={() => choose(condition.id)} key={condition.id}>{condition.label}</button>)}</div></div>
    <div className="mp-checkup-nav"><button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</button><div><span className="ok">{totals.BOM || 0} bons</span><span className="near">{totals.ATENCAO || 0} atenção</span><span className="bad">{totals.CRITICO || 0} críticos</span></div><button className="btn" disabled={index === items.length - 1} onClick={() => setIndex(index + 1)}>Próximo</button></div><div className="mp-actions"><button className="btn" onClick={onClose}>Sair sem salvar</button><button className="btn btn-primary" disabled={!inspected || saving} onClick={finish}>{saving ? "Salvando..." : `Concluir e salvar (${inspected})`}</button></div>
  </div>;
}

export function ManutencaoPosicoes({ vehicles, onClose, embedded = false }) {
  const [vehicle, setVehicle] = React.useState(vehicles[0] || null);
  const [records, setRecords] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [tab, setTab] = React.useState("current");
  const [formComponent, setFormComponent] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingRecords, setLoadingRecords] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [checkup, setCheckup] = React.useState(false);
  const [options, setOptions] = React.useState({ marcas: [], fornecedores: [], intervalos: [] });
  const layout = inferMaintenanceLayout(vehicle);
  const currentKm = Number(vehicle?.km_atual) || 0;
  const positions = allPositions(vehicle);
  const load = React.useCallback(async plate => { if (!plate) return; setLoadingRecords(true); try { const data = await RB_API.listComponentesPosicao(plate); setRecords(data.registros || []); } finally { setLoadingRecords(false); } }, []);
  React.useEffect(() => { setSelected(null); setFormComponent(null); setSuccess(""); load(vehicle?.placa).catch(e => setError(e.message)); }, [vehicle]);
  React.useEffect(() => { RB_API.getOpcoesComponentesPosicao().then(setOptions).catch(e => setError(e.message)); }, []);

  function selectPosition(pos) { setSelected(pos); setTab("current"); setFormComponent(null); setSuccess(""); }
  async function saveBatch(items, successMessage) {
    setSaving(true); setError("");
    try {
      await RB_API.createComponentesPosicaoLote({ itens: items });
      await load(vehicle.placa);
      setSuccess(successMessage);
      setFormComponent(null);
      setCheckup(false);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function save(form) {
    const { componentes, ...shared } = form;
    const intervalMap = Object.fromEntries(options.intervalos.map(item => [item.componente, Number(item.km)]));
    const items = componentes.map(componente => ({ ...shared, componente, proximo_km: shared.proximo_km || (shared.tipo_servico === "Troca" && intervalMap[componente] && Number(shared.km_servico) ? Number(shared.km_servico) + intervalMap[componente] : ""), placa: selected.plate, conjunto_placa: vehicle.placa, layout_tipo: selected.type, eixo_codigo: selected.axle.id, lado: selected.side }));
    await saveBatch(items, `${form.tipo_servico} de ${componentes.join(" + ")} registrada em ${selected.axle.label} · ${selected.side}.`);
  }

  // Keeps the selected panel synchronized after records are refreshed.
  const selectedLive = selected ? { ...selected, state: positionState(records, selected.plate, selected.axle.id, selected.side, currentKm) } : null;
  return <div className={embedded ? "mp-embedded" : "mp-overlay"}><section className="card mp-shell">
    <div className="card-header"><div><h2>Mapa de componentes</h2><span className="muted">Estado mecânico por eixo e posição</span></div>{!embedded && <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>}</div>
    <div className="mp-content">
      <div className="mp-toolbar"><label>Veículo</label><select value={vehicle?.placa || ""} onChange={e => setVehicle(vehicles.find(v => v.placa === e.target.value))}>{vehicles.map(v => <option key={v.placa} value={v.placa}>{v.placa} · {v.modelo || "Sem modelo"}</option>)}</select><span className="badge">{layout === "BITRUCK" ? "Bi-truck" : vehicle?.implementos?.length ? `Cavalo + ${vehicle.implementos.length} implemento(s)` : "Truck"}</span><button type="button" className="btn" onClick={() => setCheckup(true)}>Iniciar check-up</button><span className="mp-km"><small>KM atual</small><strong>{formatKm(currentKm)} km</strong></span></div>
      {loadingRecords ? <div className="mp-loading">Atualizando situação do veículo...</div> : <SummaryCards positions={positions} records={records} currentKm={currentKm}/>} 
      <div className="mp-vehicles"><AxleDiagram plate={vehicle?.placa} title={vehicle?.modelo || `Veículo ${vehicle?.placa}`} type={layout} count={vehicle?.eixos} records={records} currentKm={currentKm} selected={selectedLive} onSelect={selectPosition}/>{(vehicle?.implementos || []).map(imp => <AxleDiagram key={imp.placa} plate={imp.placa} title={imp.modelo || "Implemento engatado"} type="IMPLEMENTO" count={imp.eixos} records={records} currentKm={currentKm} selected={selectedLive} onSelect={selectPosition}/>)}</div>
      <div className="mp-legend">{Object.values(STATUS).map(state => <span key={state.label}><i style={{ background: state.color }}/>{state.icon} {state.label}</span>)}</div>
      {error && <div className="mp-alert error">{error}</div>}{success && <div className="mp-alert success"><strong>Serviço registrado com sucesso.</strong> {success}</div>}
      {checkup && <MaintenanceCheckup positions={positions} currentKm={currentKm} vehicle={vehicle} saving={saving} onSave={saveBatch} onClose={() => setCheckup(false)}/>} 
      {selectedLive && <section className="card mp-position-panel"><div className="mp-position-head"><div><small>{selectedLive.plate}</small><h3>{selectedLive.axle.label} · lado {selectedLive.side === "E" ? "esquerdo" : "direito"}</h3></div><div className="mp-position-actions"><button className="btn btn-primary" type="button" onClick={() => setFormComponent("Lona de freio")}>+ Registrar serviço</button><button className="icon-btn" type="button" onClick={() => setSelected(null)}><Icon name="x"/></button></div></div>
        {!formComponent && <><div className="mp-tabs"><button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")}>Visão atual</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Histórico <span>{selectedLive.state.history.length}</span></button></div>{tab === "current" ? <ComponentList selected={selectedLive} onRegister={setFormComponent}/> : <History selected={selectedLive}/>}</>}
        {formComponent && <ServiceForm key={`${selectedLive.plate}-${selectedLive.axle.id}-${selectedLive.side}-${formComponent}`} selected={selectedLive} vehicle={vehicle} initialComponent={formComponent} options={options} saving={saving} onCancel={() => setFormComponent(null)} onSave={save}/>} 
      </section>}
    </div>
  </section></div>;
}

function ManutencaoPosicoesScreen() {
  const [vehicles, setVehicles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => { let active = true; RB_API.listVeiculosManutencao().then(data => { if (active) setVehicles(data.veiculos || []); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <div className="view mp-view"><div className="page-head"><div><h1>Manutenção por posição</h1><div className="sub">Check-up visual de freios, cubos, rolamentos e suspensão por eixo.</div></div></div>{loading && <div className="card mp-page-state">Carregando veículos e implementos...</div>}{error && <div className="card mp-page-state error">{error}</div>}{!loading && !error && !vehicles.length && <div className="card mp-page-state">Nenhum veículo encontrado.</div>}{!loading && !error && vehicles.length > 0 && <ManutencaoPosicoes vehicles={vehicles} embedded/>}</div>;
}

window.ManutencaoPosicoesScreen = ManutencaoPosicoesScreen;

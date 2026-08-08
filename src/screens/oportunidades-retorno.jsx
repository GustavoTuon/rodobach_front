const OR_PAGE_SIZE = 5;

const orMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const orDate = (value) => value ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-";
const orDaysAgo = (value) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)) : null;
const orNormalizePlate = (value) => String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

function opportunityScore(client, radiusKm, currentPlate) {
  const distance = Math.max(0, 40 * (1 - Number(client.distanciaKm || radiusKm) / Math.max(radiusKm, 1)));
  const freights = Math.min(20, Math.log2(Number(client.quantidadeFretes || 0) + 1) * 5);
  const revenue = Math.min(15, Number(client.faturamento || 0) / 15000);
  const days = orDaysAgo(client.ultimoFrete);
  const recency = days === null ? 0 : days <= 90 ? 15 : days <= 180 ? 12 : days <= 365 ? 8 : days <= 730 ? 4 : 1;
  const samePlate = (client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(currentPlate)) ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(distance + freights + revenue + recency + samePlate)));
}

function scoreLabel(score) {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Boa";
  if (score >= 50) return "Média";
  return "Baixa";
}

const ReturnSummaryCards = ({ vehicles, opportunities, priority, best }) => (
  <div className="or-kpis">
    <div className="kpi"><div className="kpi-label"><Icon name="truck"/> Veículos disponíveis</div><div className="kpi-value">{vehicles}</div><span className="kpi-delta flat">SMs e posições da telemetria</span></div>
    <div className="kpi"><div className="kpi-label"><Icon name="route"/> Oportunidades encontradas</div><div className="kpi-value">{opportunities}</div><span className="kpi-delta flat">dentro do raio analisado</span></div>
    <div className="kpi"><div className="kpi-label"><Icon name="trending-up"/> Clientes prioritários</div><div className="kpi-value">{priority}</div><span className="kpi-delta up">score bom ou excelente</span></div>
    <div className="kpi"><div className="kpi-label"><Icon name="map"/> Melhor oportunidade</div><div className="kpi-value">{best === null ? "–" : `${best.toFixed(0)} km`}</div><span className="kpi-delta flat">cliente mais próximo</span></div>
  </div>
);

const VehicleSearchSelect = ({ data, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef(null);
  const vehicles = React.useMemo(() => [
    ...(data.sms || []).map((sm) => ({
      id: `sm:${sm.id}`, plate: sm.placa, title: sm.placa, location: sm.destino || sm.origem || "Local não informado",
      detail: `SM ${sm.id}`, source: "SM", status: sm.status || "Em viagem", search: `${sm.placa} ${sm.id} ${sm.destino} ${sm.origem} ${sm.cliente || ""}`,
    })),
    ...(data.veiculosTelemetria || []).map((vehicle) => ({
      id: `tel:${vehicle.placa}`, plate: vehicle.placa, title: vehicle.placa,
      location: vehicle.localizacao?.cidadeUf || vehicle.localizacao?.endereco || "Local não informado",
      detail: "Posição atual", source: "Telemetria", status: vehicle.situacao || "Telemetria",
      search: `${vehicle.placa} ${vehicle.localizacao?.cidadeUf || ""} ${vehicle.situacao || ""}`,
    })),
  ], [data]);
  const selected = vehicles.find((item) => item.id === value);
  const filtered = vehicles.filter((item) => item.search.toLowerCase().includes(query.trim().toLowerCase()));

  React.useEffect(() => {
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div className="or-vehicle" ref={rootRef}>
    <label>Veículo disponível</label>
    <button type="button" className={`or-combobox ${open ? "active" : ""}`} onClick={() => setOpen(!open)}>
      <span>{selected ? <><strong>{selected.plate}</strong><small>{selected.location}</small></> : <span className="muted">Selecione um veículo</span>}</span>
      <Icon name="chevron-down"/>
    </button>
    {open && <div className="or-combobox-menu">
      <div className="or-combobox-search"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar placa, cidade, cliente ou SM"/></div>
      <div className="or-combobox-options">
        {["SM", "Telemetria"].map((source) => {
          const group = filtered.filter((item) => item.source === source);
          if (!group.length) return null;
          return <React.Fragment key={source}><div className="or-option-group">{source === "SM" ? "VEÍCULOS COM SM" : "VEÍCULOS SEM SM / POSIÇÃO ATUAL"}</div>{group.map((item) => <button type="button" className="or-option" key={item.id} onClick={() => { onChange(item.id); setOpen(false); setQuery(""); }}>
            <span><strong>{item.title}</strong><small>{item.location}</small></span><span className="or-option-badges"><b>{item.source}</b><b>{item.status}</b></span><small>{item.detail}</small>
          </button>)}</React.Fragment>;
        })}
        {!filtered.length && <div className="or-no-option">Nenhum veículo encontrado.</div>}
      </div>
    </div>}
    {selected && <div className="or-vehicle-summary"><span><b>Placa</b>{selected.plate}</span><span><b>Disponível em</b>{selected.location}</span><span><b>Origem da localização</b>{selected.source}</span><span><b>Situação</b>{selected.status}</span></div>}
  </div>;
};

const RadiusSelector = ({ value, onChange, onAnalyze, disabled }) => {
  const presets = [50, 100, 200, 300];
  const custom = !presets.includes(Number(value));
  return <div className="or-radius">
    <label>Raio de busca</label>
    <div className="or-radius-buttons">{presets.map((radius) => <button type="button" key={radius} className={Number(value) === radius ? "active" : ""} onClick={() => onChange(radius)}>{radius} km</button>)}<button type="button" className={custom ? "active" : ""}>Personalizado</button></div>
    <div className="or-radius-action"><input aria-label="Raio personalizado" type="number" min="1" max="1000" value={value} onChange={(event) => onChange(Math.min(1000, Math.max(1, Number(event.target.value) || 1)))}/><button className="btn primary" onClick={onAnalyze} disabled={disabled}><Icon name="search"/> Analisar oportunidades</button></div>
  </div>;
};

const OpportunityFilters = ({ filters, onChange, onClear, currentPlate }) => (
  <div className="or-filters">
    <div className="or-filter-order"><Icon name="filter"/><select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value })}>
      <option value="score">Melhor oportunidade</option><option value="distance">Mais próximo</option><option value="revenue">Maior faturamento</option><option value="freights">Mais fretes</option><option value="recent">Frete mais recente</option>
    </select></div>
    <button className={filters.samePlate ? "active" : ""} onClick={() => onChange({ ...filters, samePlate: !filters.samePlate })}>Esta placa já carregou</button>
    {[3, 6, 12].map((months) => <button key={months} className={filters.months === months ? "active" : ""} onClick={() => onChange({ ...filters, months: filters.months === months ? 0 : months })}>Últimos {months} meses</button>)}
    <button className={filters.hasPhone ? "active" : ""} onClick={() => onChange({ ...filters, hasPhone: !filters.hasPhone })}>Possui telefone</button>
    <button className={filters.notContacted ? "active" : ""} onClick={() => onChange({ ...filters, notContacted: !filters.notContacted })}>Não contatados</button>
    <button className="or-clear" onClick={onClear}>Limpar filtros</button>
    <span className="or-filter-context">Placa atual: {currentPlate || "–"}</span>
  </div>
);

const OpportunityScore = ({ score }) => <div className={`or-score s${Math.floor(score / 10)}`} title="Pontuação indicativa baseada em distância, histórico de fretes, faturamento, recência e relacionamento com a placa."><strong>{score}</strong><span>{scoreLabel(score)}</span></div>;

const OpportunityCard = ({ client, rank, currentPlate, selected, contactStatus, onToggle, onHistory, onContact, onWhy }) => {
  const samePlate = (client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(currentPlate));
  const days = orDaysAgo(client.ultimoFrete);
  return <article className={`or-card ${selected ? "selected" : ""}`}>
    <input className="or-check" type="checkbox" checked={selected} onChange={() => onToggle(client.id)} aria-label={`Selecionar ${client.nome}`}/>
    <OpportunityScore score={client.score}/>
    <div className="or-card-main">
      <div className="or-card-title"><span className="or-rank">#{rank}</span><div><h3>{client.nome}</h3><p>{client.cidade}/{client.uf}</p></div><strong className={`or-distance ${client.distanciaKm <= 50 ? "near" : ""}`}>{client.distanciaKm.toFixed(0)} km</strong></div>
      <div className="or-badges"><span>Cliente {client.quantidadeFretes >= 5 ? "recorrente" : "do histórico"}</span>{samePlate && <span className="good">Esta placa já carregou aqui</span>}{days !== null && days <= 180 && <span className="recent">Frete recente</span>}<span className="status">{contactStatus || "Não contatado"}</span></div>
      <div className="or-metrics"><span><b>{client.quantidadeFretes || 0}</b> frete{client.quantidadeFretes === 1 ? "" : "s"}</span><span><b>{orMoney(client.faturamento)}</b> faturados</span><span><b>{orDate(client.ultimoFrete)}</b> último frete</span>{days !== null && <span>há {days} dias</span>}</div>
      <div className="or-contact-line"><Icon name="whatsapp"/><span>{client.telefone || "Telefone não informado"}</span>{client.contato && <span>· {client.contato}</span>}</div>
      <div className="or-card-actions"><a className="btn" href={client.mapsUrl} target="_blank" rel="noreferrer"><Icon name="map"/> Localização</a><button className="btn" onClick={() => onHistory(client)}><Icon name="truck"/> {client.placas?.length || 0} placa{client.placas?.length === 1 ? " anterior" : "s anteriores"}</button><button className="btn" onClick={() => onWhy(client)}><Icon name="info"/> Por que?</button><button className="btn primary" onClick={() => onContact(client)}><Icon name="whatsapp"/> Contatar</button></div>
    </div>
  </article>;
};

const ContactDrawer = ({ client, recipient, message, config, working, onRecipient, onMessage, onClose, onCopy, onSend }) => {
  if (!client) return null;
  return <div className="or-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="or-drawer">
    <div className="or-drawer-head"><div><span>Contato comercial</span><h2>{client.nome}</h2><p>{client.cidade}/{client.uf} · {client.distanciaKm.toFixed(0)} km</p></div><button className="btn" onClick={onClose} aria-label="Fechar"><Icon name="x"/></button></div>
    <label>Telefone / WhatsApp<input value={recipient} onChange={(event) => onRecipient(event.target.value)} placeholder="Ex.: 5519999999999"/></label>
    <label>Mensagem<textarea value={message} onChange={(event) => onMessage(event.target.value)}/></label>
    {!config?.envioHabilitado && <div className="or-validation"><Icon name="lock"/><div><strong>Envio bloqueado — modo de validação</strong><span>A mensagem pode ser revisada e copiada, mas não será enviada enquanto a validação estiver ativa.</span></div></div>}
    <div className="or-drawer-actions"><button className="btn" disabled={!message} onClick={onCopy}><Icon name="copy"/> Copiar</button><button className="btn primary" disabled={!config?.envioHabilitado || !config?.n8nConfigurado || !recipient || working} onClick={onSend}><Icon name="whatsapp"/> Enviar WhatsApp</button></div>
  </aside></div>;
};

const HistoryModal = ({ client, currentPlate, onClose }) => {
  if (!client) return null;
  return <div className="or-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="or-modal"><div className="or-modal-head"><div><span>Histórico de relacionamento</span><h3>{client.nome}</h3></div><button className="btn" onClick={onClose}><Icon name="x"/></button></div><p className="muted">Placas identificadas nos CT-es desde 2023.</p><div className="or-plate-list">{(client.placas || []).map((plate) => <span className={orNormalizePlate(plate) === orNormalizePlate(currentPlate) ? "current" : ""} key={plate}>{plate}{orNormalizePlate(plate) === orNormalizePlate(currentPlate) && <small>placa atual</small>}</span>)}{!client.placas?.length && <div className="muted">Nenhuma placa identificada.</div>}</div></div></div>;
};

const WhyModal = ({ client, currentPlate, onClose }) => {
  if (!client) return null;
  const days = orDaysAgo(client.ultimoFrete);
  const samePlate = (client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(currentPlate));
  return <div className="or-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="or-modal"><div className="or-modal-head"><div><span>Por que esta oportunidade?</span><h3>{client.nome}</h3></div><button className="btn" onClick={onClose}><Icon name="x"/></button></div><div className="or-why"><span><Icon name="map"/><b>{client.distanciaKm.toFixed(0)} km</b> do veículo</span><span><Icon name="route"/><b>{client.quantidadeFretes || 0} fretes</b> anteriores</span><span><Icon name="money"/><b>{orMoney(client.faturamento)}</b> faturados</span><span><Icon name="clock"/>Último frete <b>{days === null ? "não informado" : `há ${days} dias`}</b></span>{samePlate && <span><Icon name="check"/><b>Esta placa já carregou aqui</b></span>}</div></div></div>;
};

const BulkActionBar = ({ count, onMessage, onCopy, onClear }) => count ? <div className="or-bulk"><strong>{count} cliente{count > 1 ? "s" : ""} selecionado{count > 1 ? "s" : ""}</strong><button className="btn" onClick={onMessage}><Icon name="copy"/> Preparar mensagem consolidada</button><button className="btn" onClick={onCopy}><Icon name="whatsapp"/> Copiar contatos</button><button className="btn" onClick={onClear}><Icon name="x"/> Limpar seleção</button></div> : null;

const OportunidadesRetorno = () => {
  const [data, setData] = React.useState({ clientes: [], sms: [], veiculosTelemetria: [], configuracao: {} });
  const [smId, setSmId] = React.useState("");
  const [raioKm, setRaioKm] = React.useState(200);
  const [analysis, setAnalysis] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState({ sort: "score", samePlate: false, months: 0, hasPhone: false, notContacted: false });
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [drawerClient, setDrawerClient] = React.useState(null);
  const [historyClient, setHistoryClient] = React.useState(null);
  const [whyClient, setWhyClient] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [contactStatuses, setContactStatuses] = React.useState({});

  const selectedVehicle = React.useMemo(() => {
    if (smId.startsWith("sm:")) {
      const sm = data.sms?.find((item) => String(item.id) === smId.slice(3));
      return sm ? { plate: sm.placa, location: sm.destino, source: "SM" } : null;
    }
    const vehicle = data.veiculosTelemetria?.find((item) => `tel:${item.placa}` === smId);
    return vehicle ? { plate: vehicle.placa, location: vehicle.localizacao?.cidadeUf, source: "Telemetria" } : null;
  }, [data, smId]);

  const scoredClients = React.useMemo(() => (analysis?.potenciais || analysis?.clientes || []).map((client) => ({ ...client, score: opportunityScore(client, analysis?.raioKm || raioKm, analysis?.sm?.placa) })), [analysis, raioKm]);
  const filteredClients = React.useMemo(() => {
    const cutoff = filters.months ? new Date(new Date().setMonth(new Date().getMonth() - filters.months)) : null;
    const result = scoredClients.filter((client) => {
      if (filters.samePlate && !(client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(analysis?.sm?.placa))) return false;
      if (cutoff && (!client.ultimoFrete || new Date(client.ultimoFrete) < cutoff)) return false;
      if (filters.hasPhone && !String(client.telefone || "").replace(/\D/g, "")) return false;
      if (filters.notContacted && contactStatuses[client.id] && contactStatuses[client.id] !== "Não contatado") return false;
      return true;
    });
    return result.sort((a, b) => filters.sort === "distance" ? a.distanciaKm - b.distanciaKm
      : filters.sort === "revenue" ? b.faturamento - a.faturamento
        : filters.sort === "freights" ? b.quantidadeFretes - a.quantidadeFretes
          : filters.sort === "recent" ? String(b.ultimoFrete || "").localeCompare(String(a.ultimoFrete || ""))
            : b.score - a.score || a.distanciaKm - b.distanciaKm);
  }, [scoredClients, filters, analysis, contactStatuses]);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / OR_PAGE_SIZE));
  const pagedClients = filteredClients.slice((page - 1) * OR_PAGE_SIZE, page * OR_PAGE_SIZE);
  const selectedClients = scoredClients.filter((client) => selectedIds.includes(client.id));

  React.useEffect(() => { setPage(1); }, [filters, analysis]);

  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await window.RB_API.getOportunidadesRetorno();
      setData(result || { clientes: [], sms: [], veiculosTelemetria: [], configuracao: {} });
    } catch (err) { setError(err?.message || "Não foi possível carregar as oportunidades."); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, []);

  const downloadTemplate = async () => {
    try { const blob = await window.RB_API.downloadOportunidadesModelo(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "modelo-clientes-retorno.xlsx"; anchor.click(); URL.revokeObjectURL(url); }
    catch (err) { setError(err?.message || "Falha ao baixar o modelo."); }
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setWorking(true); setError(""); setNotice("");
    try { const arquivoBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",").pop()); reader.onerror = () => reject(new Error("Não foi possível ler a planilha.")); reader.readAsDataURL(file); }); const result = await window.RB_API.importOportunidadesClientes({ arquivoBase64, substituir: true }); setNotice(`${result.importados} clientes importados. ${result.semCoordenadas} sem coordenadas.`); await load(); }
    catch (err) { setError(err?.message || "Falha ao importar a planilha."); } finally { setWorking(false); }
  };
  const analyze = async () => {
    if (!smId) return setError("Selecione um veículo.");
    setWorking(true); setError(""); setNotice(""); setAnalysis(null); setSelectedIds([]);
    try { const result = await window.RB_API.analyzeOportunidadesRetorno({ smId, raioKm }); setAnalysis(result); setPage(1); }
    catch (err) { setError(err?.message || "Falha ao analisar clientes próximos."); } finally { setWorking(false); }
  };
  const prepareClient = (client) => { setDrawerClient(client); setRecipient(client.telefone || ""); setMessage(client.mensagemContato || ""); setContactStatuses((current) => ({ ...current, [client.id]: "Mensagem preparada" })); };
  const sendClient = async () => {
    if (!drawerClient) return; setWorking(true); setError(""); setNotice("");
    try { const result = await window.RB_API.sendOportunidadeCliente({ smId, raioKm, clienteId: drawerClient.id, destinatario: recipient, mensagem: message }); setNotice(`Mensagem enviada para ${result.cliente}.`); setContactStatuses((current) => ({ ...current, [drawerClient.id]: "Enviado" })); }
    catch (err) { setError(err?.message || "Falha ao enviar mensagem para o cliente."); } finally { setWorking(false); }
  };
  const buildBulkMessage = () => { const text = [`Oportunidades de retorno - ${analysis?.sm?.placa}`, `Disponível em ${analysis?.destino?.descricao}`, "", ...selectedClients.map((client, index) => `${index + 1}. ${client.nome} - ${client.cidade}/${client.uf} (${client.distanciaKm.toFixed(0)} km)\n   ${client.telefone || "Sem telefone"}`)].join("\n"); navigator.clipboard.writeText(text); setNotice("Mensagem consolidada copiada."); };
  const copyContacts = () => { navigator.clipboard.writeText(selectedClients.map((client) => `${client.nome}: ${client.telefone || "Sem telefone"}`).join("\n")); setNotice("Contatos copiados."); };

  const priority = scoredClients.filter((client) => client.score >= 70).length;
  const best = scoredClients.length ? Math.min(...scoredClients.map((client) => client.distanciaKm)) : null;
  const firstItem = (page - 1) * OR_PAGE_SIZE + 1;
  const lastItem = Math.min(page * OR_PAGE_SIZE, filteredClients.length);

  return <div className="view or-page"><style>{`
    .or-page{--or-blue:#4f7fab}.or-head .sub{max-width:650px}.or-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
    .or-search-card{padding:16px;margin-bottom:16px;display:grid;grid-template-columns:minmax(380px,1.3fr) minmax(340px,.9fr);gap:20px}.or-vehicle,.or-radius{position:relative}.or-vehicle>label,.or-radius>label,.or-drawer label{display:block;font-size:11px;color:var(--text-2);margin-bottom:7px}
    .or-combobox{width:100%;min-height:48px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);display:flex;align-items:center;justify-content:space-between;text-align:left}.or-combobox.active{border-color:var(--brand-blue);box-shadow:0 0 0 2px var(--accent-soft)}.or-combobox span span,.or-combobox strong,.or-combobox small{display:block}.or-combobox small{color:var(--muted);margin-top:2px}
    .or-combobox-menu{position:absolute;z-index:30;top:77px;left:0;right:0;border:1px solid var(--border);border-radius:9px;background:var(--surface);box-shadow:0 18px 50px #0009;overflow:hidden}.or-combobox-search{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid var(--divider)}.or-combobox-search input{width:100%;height:36px;border:0;background:transparent;color:var(--text);outline:0}.or-combobox-options{max-height:350px;overflow:auto}.or-option-group{padding:9px 12px 5px;color:var(--text-3);font-size:9px;letter-spacing:.08em}.or-option{width:100%;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:10px 12px;border:0;border-top:1px solid var(--divider);background:transparent;color:var(--text);text-align:left}.or-option:hover{background:var(--surface-2)}.or-option span strong,.or-option span small{display:block}.or-option small{color:var(--muted)}.or-option-badges{display:flex!important;gap:4px}.or-option-badges b{padding:3px 5px;border:1px solid var(--border);border-radius:4px;font-size:9px;font-weight:500}.or-no-option{padding:20px;text-align:center;color:var(--muted)}
    .or-vehicle-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px}.or-vehicle-summary span{padding:7px 9px;border-radius:6px;background:var(--surface-2);font-size:10.5px}.or-vehicle-summary b{display:block;color:var(--muted);font-weight:400;margin-bottom:3px}.or-radius-buttons{display:flex;gap:6px;flex-wrap:wrap}.or-radius-buttons button,.or-filters>button{height:30px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2);color:var(--text-2);font-size:10.5px}.or-radius-buttons button.active,.or-filters>button.active{color:#dbeafe;border-color:var(--brand-blue);background:var(--accent-soft)}.or-radius-action{display:grid;grid-template-columns:90px 1fr;gap:8px;margin-top:10px}.or-radius-action input,.or-drawer input,.or-drawer textarea{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text);outline:0}.or-radius-action input{height:38px;padding:0 10px}
    .or-filters{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:11px 13px;margin-bottom:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}.or-filter-order{height:30px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid var(--border);border-radius:6px}.or-filter-order select{border:0;background:transparent;color:var(--text);outline:0;font-size:10.5px}.or-filter-order option{background:var(--surface)}.or-filters .or-clear{border:0;background:transparent;color:var(--brand-blue)}.or-filter-context{margin-left:auto;font-size:10px;color:var(--muted)}
    .or-list-head{display:flex;align-items:end;justify-content:space-between;margin:14px 0 9px}.or-list-head h2{font-size:15px;margin:0 0 3px}.or-list-head p{margin:0;font-size:10.5px;color:var(--muted)}.or-card{position:relative;display:grid;grid-template-columns:auto auto 1fr;gap:12px;padding:14px;margin-bottom:9px;border:1px solid var(--border);border-radius:10px;background:var(--surface);transition:.15s}.or-card:hover{border-color:#3a4355;transform:translateY(-1px)}.or-card.selected{border-color:var(--brand-blue);background:linear-gradient(90deg,var(--accent-soft),var(--surface) 35%)}.or-check{margin-top:7px;accent-color:var(--brand-blue)}.or-score{width:52px;height:52px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#172033;border:1px solid #334155}.or-score strong{font:700 19px var(--font-mono)}.or-score span{font-size:8.5px;color:var(--muted)}.or-score.s8,.or-score.s9,.or-score.s10{background:#0d2b23;border-color:#166534;color:#86efac}.or-score.s7{background:#14283c;border-color:#1d4ed8;color:#93c5fd}.or-score.s5,.or-score.s6{background:#2d2815;border-color:#854d0e;color:#fde68a}
    .or-card-main{min-width:0}.or-card-title{display:flex;align-items:flex-start;gap:8px}.or-card-title h3{font-size:13px;margin:0 0 3px;font-weight:700}.or-card-title p{font-size:10.5px;color:var(--muted);margin:0}.or-rank{color:var(--text-3);font:500 10px var(--font-mono);padding-top:2px}.or-distance{margin-left:auto;font:700 15px var(--font-mono);white-space:nowrap}.or-distance.near{color:#4ade80}.or-badges{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.or-badges span{padding:3px 6px;border-radius:5px;background:var(--surface-2);border:1px solid var(--border);font-size:9px;color:var(--text-2)}.or-badges .good{color:#86efac;border-color:#166534;background:#0d2b23}.or-badges .recent{color:#93c5fd;border-color:#1d4ed8;background:#14283c}.or-badges .status{color:#cbd5e1}.or-metrics{display:flex;gap:16px;flex-wrap:wrap;font-size:10.5px;color:var(--muted)}.or-metrics b{color:var(--text);font-weight:600}.or-contact-line{display:flex;align-items:center;gap:5px;margin-top:9px;color:var(--text-2);font-size:10.5px}.or-card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.or-card-actions .btn{height:30px;padding:0 9px;font-size:10px}
    .or-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 0 80px}.or-pagination-actions{display:flex;align-items:center;gap:8px}.or-pagination span{font-size:10.5px;color:var(--muted)}.or-empty{padding:40px;text-align:center;border:1px dashed var(--border);border-radius:10px}.or-empty h3{margin:8px 0}.or-empty-actions{display:flex;justify-content:center;gap:8px;margin-top:14px}.or-skeleton{height:150px;border-radius:10px;margin-bottom:9px;background:linear-gradient(90deg,var(--surface) 25%,var(--surface-2) 45%,var(--surface) 65%);background-size:300% 100%;animation:orShimmer 1.4s infinite}@keyframes orShimmer{to{background-position:-300% 0}}
    .or-bulk{position:fixed;z-index:25;left:50%;bottom:22px;transform:translateX(-40%);display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #475569;border-radius:10px;background:#111827eF;box-shadow:0 16px 50px #000a}.or-bulk strong{margin-right:8px;font-size:11px}
    .or-drawer-layer,.or-modal-layer{position:fixed;z-index:80;inset:0;background:#0008;display:flex;justify-content:flex-end}.or-drawer{width:min(480px,94vw);height:100%;box-sizing:border-box;padding:20px;background:var(--surface);border-left:1px solid var(--border);box-shadow:-20px 0 60px #0008;overflow:auto}.or-drawer-head,.or-modal-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:20px}.or-drawer-head span,.or-modal-head span{font-size:9px;color:var(--brand-blue);text-transform:uppercase;letter-spacing:.08em}.or-drawer-head h2,.or-modal-head h3{margin:4px 0;font-size:18px}.or-drawer-head p{margin:0;color:var(--muted);font-size:11px}.or-drawer label{margin:0 0 14px}.or-drawer input{height:40px;padding:0 10px;margin-top:6px}.or-drawer textarea{min-height:300px;padding:11px;resize:vertical;margin-top:6px;font:11px/1.5 var(--font-mono)}.or-validation{display:flex;gap:9px;padding:11px;border:1px solid #854d0e;border-radius:8px;background:#2d2815;color:#fde68a}.or-validation strong,.or-validation span{display:block}.or-validation span{font-size:10px;margin-top:3px;color:#d6c78f}.or-drawer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.or-modal-layer{justify-content:center;align-items:center}.or-modal{width:min(520px,92vw);max-height:80vh;overflow:auto;padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:0 20px 70px #000b}.or-plate-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:15px}.or-plate-list>span{display:flex;flex-direction:column;padding:8px 11px;border:1px solid var(--border);border-radius:7px;font:600 11px var(--font-mono)}.or-plate-list .current{border-color:#166534;background:#0d2b23;color:#86efac}.or-plate-list small{font:8px var(--font-sans);margin-top:3px}.or-why{display:grid;gap:8px}.or-why span{display:flex;align-items:center;gap:8px;padding:10px;border-radius:7px;background:var(--surface-2);font-size:11px}.or-why b{font-weight:600}
    @media(max-width:1100px){.or-kpis{grid-template-columns:repeat(2,1fr)}.or-search-card{grid-template-columns:1fr}.or-vehicle-summary{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.or-kpis{grid-template-columns:1fr 1fr}.or-card{grid-template-columns:auto 1fr}.or-score{grid-column:2}.or-card-main{grid-column:1/-1}.or-search-card{padding:12px}.or-radius-action{grid-template-columns:80px 1fr}.or-filter-context{width:100%;margin:4px 0 0}.or-bulk{left:10px;right:10px;bottom:10px;transform:none;flex-wrap:wrap}.or-pagination{padding-bottom:120px}}@media(max-width:480px){.or-kpis{grid-template-columns:1fr}.or-vehicle-summary{grid-template-columns:1fr}.or-card-title{flex-wrap:wrap}.or-distance{margin-left:0}.or-radius-action{grid-template-columns:1fr}.or-pagination{align-items:flex-start;gap:8px;flex-direction:column}}
  `}</style>
    <div className="page-head or-head"><div><h1>Oportunidades de retorno</h1><div className="sub">Encontre clientes próximos ao local onde o veículo ficará disponível.</div></div><div className="actions"><button className="btn" onClick={downloadTemplate}><Icon name="download"/> Baixar modelo</button><label className="btn" style={{ cursor: "pointer" }}><Icon name="file"/> Importar planilha<input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} style={{ display: "none" }}/></label></div></div>
    {(error || notice) && <div className="card" style={{ padding: "10px 14px", marginBottom: 14 }}><span className={error ? "kpi-delta down" : "kpi-delta up"}>{error || notice}</span></div>}
    <ReturnSummaryCards vehicles={(data.sms?.length || 0) + (data.veiculosTelemetria?.length || 0)} opportunities={scoredClients.length} priority={priority} best={best}/>
    <div className="card or-search-card"><VehicleSearchSelect data={data} value={smId} onChange={(id) => { setSmId(id); setAnalysis(null); setSelectedIds([]); }}/><RadiusSelector value={raioKm} onChange={setRaioKm} onAnalyze={analyze} disabled={working || !smId}/></div>
    {analysis && <OpportunityFilters filters={filters} onChange={setFilters} onClear={() => setFilters({ sort: "score", samePlate: false, months: 0, hasPhone: false, notContacted: false })} currentPlate={analysis.sm?.placa}/>}
    <div className="or-list-head"><div><h2>Oportunidades comerciais</h2><p>{analysis ? `Veículo ${analysis.sm?.placa} disponível em ${analysis.destino?.descricao} · raio de ${analysis.raioKm} km` : "Selecione um veículo e analise a região."}</p></div>{analysis && <span className="meta muted">Histórico desde 2023</span>}</div>
    {(loading || working) && !analysis && <div><div className="or-skeleton"/><div className="or-skeleton"/><div className="or-skeleton"/></div>}
    {!loading && !working && !analysis && <div className="or-empty"><Icon name="route" size={28}/><h3>Escolha onde o veículo ficará disponível</h3><p className="muted">Selecione uma SM ou uma posição atual da telemetria para encontrar clientes próximos.</p></div>}
    {analysis && pagedClients.map((client, index) => <OpportunityCard key={client.id} client={client} rank={(page - 1) * OR_PAGE_SIZE + index + 1} currentPlate={analysis.sm?.placa} selected={selectedIds.includes(client.id)} contactStatus={contactStatuses[client.id]} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onHistory={setHistoryClient} onContact={prepareClient} onWhy={setWhyClient}/>)}
    {analysis && !working && !filteredClients.length && <div className="or-empty"><Icon name="search" size={28}/><h3>Nenhum cliente encontrado em um raio de {analysis.raioKm} km.</h3><p className="muted">Tente aumentar o raio, alterar os filtros ou importar novos clientes.</p><div className="or-empty-actions"><button className="btn primary" onClick={() => { setRaioKm(Math.min(1000, Math.max(300, analysis.raioKm + 100))); }}>Aumentar raio</button><button className="btn" onClick={() => setFilters({ sort: "score", samePlate: false, months: 0, hasPhone: false, notContacted: false })}>Limpar filtros</button></div></div>}
    {analysis && filteredClients.length > 0 && <div className="or-pagination"><span>{firstItem}-{lastItem} de {filteredClients.length} oportunidades</span><div className="or-pagination-actions"><button className="btn" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {page} de {totalPages}</span><button className="btn" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></div>}
    <BulkActionBar count={selectedIds.length} onMessage={buildBulkMessage} onCopy={copyContacts} onClear={() => setSelectedIds([])}/>
    <ContactDrawer client={drawerClient} recipient={recipient} message={message} config={data.configuracao} working={working} onRecipient={setRecipient} onMessage={setMessage} onClose={() => setDrawerClient(null)} onCopy={() => { navigator.clipboard.writeText(message); setNotice("Mensagem copiada."); }} onSend={sendClient}/>
    <HistoryModal client={historyClient} currentPlate={analysis?.sm?.placa} onClose={() => setHistoryClient(null)}/><WhyModal client={whyClient} currentPlate={analysis?.sm?.placa} onClose={() => setWhyClient(null)}/>
  </div>;
};

window.OportunidadesRetorno = OportunidadesRetorno;

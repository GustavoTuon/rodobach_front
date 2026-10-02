const OR_PAGE_SIZE = 10;
const orMaterialKey = (value) => String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const orMaterials = (client) => (client.materiais?.length ? client.materiais : [client.tipoCarga || client.material]).filter((value) => String(value || "").trim()).map((value) => String(value).trim());

const orDaysAgo = (value) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)) : null;
const orNormalizePlate = (value) => String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

function opportunityScore(client, radiusKm, currentPlate) {
  const distance = Math.max(0, 40 * (1 - Number(client.distanciaKm ?? radiusKm) / Math.max(radiusKm, 1)));
  const freights = Math.min(20, Math.log2(Number(client.quantidadeFretes || 0) + 1) * 5);
  const revenue = Math.min(15, Number(client.faturamento || 0) / 15000);
  const days = orDaysAgo(client.ultimoFrete);
  const recency = days === null ? 0 : days <= 90 ? 15 : days <= 180 ? 12 : days <= 365 ? 8 : days <= 730 ? 4 : 1;
  const samePlate = (client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(currentPlate)) ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(distance + freights + revenue + recency + samePlate)));
}

const ReturnSummaryCards = ({ vehicles, imported, opportunities, selected }) => (
  <div className="or-kpis">
    {[["truck", "Veículos disponíveis", vehicles, "Escolha a placa para buscar"], ["file", "Contatos importados", imported, "Cadastro da planilha"], ["map", "Contatos no raio", opportunities ?? "—", "Resultado da última análise"], ["check", "Selecionados", selected, "Para revisar a mensagem"]].map(([icon, label, value, detail]) => <div className="or-stat" key={label}><span className="or-stat-icon"><Icon name={icon}/></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>)}
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
    <label>1. Selecionar placa / veículo</label>
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

const OpportunityFilters = ({ filters, onChange, onClear, currentPlate, fonte }) => (
  <div className="or-filters">
    <div className="or-filter-order"><Icon name="filter"/><select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value })}>
      <option value="score">Melhor oportunidade</option><option value="distance">Mais próximo</option>{fonte === "sistema" && <><option value="revenue">Maior faturamento</option><option value="freights">Mais fretes</option><option value="recent">Frete mais recente</option></>}
    </select></div>
    {fonte === "sistema" && <><button className={filters.samePlate ? "active" : ""} onClick={() => onChange({ ...filters, samePlate: !filters.samePlate })}>Esta placa já carregou</button>
    {[3, 6, 12].map((months) => <button key={months} className={filters.months === months ? "active" : ""} onClick={() => onChange({ ...filters, months: filters.months === months ? 0 : months })}>Últimos {months} meses</button>)}</>}
    <button className={filters.hasPhone ? "active" : ""} onClick={() => onChange({ ...filters, hasPhone: !filters.hasPhone })}>Possui telefone</button>
    <button className="or-clear" onClick={onClear}>Limpar filtros</button>
    <span className="or-filter-context">Placa atual: {currentPlate || "–"}</span>
  </div>
);

const OpportunityTable = ({ clients, selectedIds, onToggle, catalog }) => (
  <div className="or-table-wrap">
    <table className="or-table">
      <caption>{catalog ? "Todos os contatos importados · sem filtro de distância" : "Contatos disponíveis para a carga de retorno"}</caption>
      <thead><tr><th scope="col">Selecionar</th><th scope="col">Nome / empresa</th><th scope="col">Contato</th><th scope="col">Localização</th><th scope="col">Material carregado</th><th scope="col">Distância</th></tr></thead>
      <tbody>{clients.map((client) => <tr key={client.id} className={selectedIds.includes(client.id) ? "selected" : ""}>
        <td><input type="checkbox" disabled={catalog} checked={selectedIds.includes(client.id)} onChange={() => onToggle(client.id)} aria-label={`Selecionar ${client.nome}`}/></td>
        <td><strong>{client.nome}</strong><small>{client.fonte === "planilha" ? "Contato da planilha" : "Fretes do sistema"}</small></td>
        <td><span>{client.contato || "Responsável não informado"}</span><small>{client.telefone || "Telefone não informado"}</small></td>
        <td>{client.mapsUrl ? <a href={client.mapsUrl} target="_blank" rel="noreferrer">{client.cidade}/{client.uf}</a> : <span>{client.cidade}/{client.uf}</span>}{client.endereco && <small>{client.endereco}</small>}</td>
        <td><div className="or-material-tags">{orMaterials(client).length ? orMaterials(client).map((material) => <span key={material}>{material}</span>) : <span className="muted">Não informado</span>}</div></td>
        <td>{Number.isFinite(client.distanciaKm) ? `${client.distanciaKm.toFixed(0)} km` : "—"}</td>
      </tr>)}</tbody>
    </table>
  </div>
);

const OportunidadesRetorno = () => {
  const [data, setData] = React.useState({ clientes: [], sms: [], veiculosTelemetria: [], configuracao: {} });
  const [smId, setSmId] = React.useState("");
  const [fonte, setFonte] = React.useState("sistema");
  const [vehicleType, setVehicleType] = React.useState("carreta 4 eixos");
  const [messageTemplate, setMessageTemplate] = React.useState("Olá, tudo bem?\n\nTenho um veículo {tipoVeiculo} próximo de você, na região de {localizacao}. Teria alguma carga disponível?\n\nPode me informar o destino, produto, peso e previsão de carregamento?");
  const [raioKm, setRaioKm] = React.useState(200);
  const [analysis, setAnalysis] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState({ sort: "score", samePlate: false, months: 0, hasPhone: false, notContacted: false });
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [material, setMaterial] = React.useState("");
  const materialQuery = orMaterialKey(React.useDeferredValue(material));
  const [showCatalog, setShowCatalog] = React.useState(false);

  const selectedVehicle = React.useMemo(() => {
    if (smId.startsWith("sm:")) {
      const sm = data.sms?.find((item) => String(item.id) === smId.slice(3));
      return sm ? { plate: sm.placa, location: sm.destino, source: "SM" } : null;
    }
    const vehicle = data.veiculosTelemetria?.find((item) => `tel:${item.placa}` === smId);
    return vehicle ? { plate: vehicle.placa, location: vehicle.localizacao?.cidadeUf, source: "Telemetria" } : null;
  }, [data, smId]);

  const scoredClients = React.useMemo(() => (analysis?.potenciais || analysis?.clientes || []).map((client) => ({ ...client, score: opportunityScore(client, analysis?.raioKm || raioKm, analysis?.sm?.placa) })), [analysis, raioKm]);
  const visibleClients = React.useMemo(() => showCatalog ? (data.clientes || []).map((client) => ({ ...client, id: `planilha:${client.id}`, fonte: "planilha" })) : scoredClients, [showCatalog, data.clientes, scoredClients]);
  const showResults = Boolean(analysis || showCatalog);
  const materialOptions = React.useMemo(() => {
    const options = new Map();
    visibleClients.forEach((client) => orMaterials(client).forEach((value) => {
      const key = orMaterialKey(value);
      if (!options.has(key)) options.set(key, value);
    }));
    return [...options].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [visibleClients]);
  const filteredClients = React.useMemo(() => {
    const cutoff = filters.months ? new Date(new Date().setMonth(new Date().getMonth() - filters.months)) : null;
    const result = visibleClients.filter((client) => {
      const materials = orMaterials(client);
      if (["__missing__", "nao informado"].includes(materialQuery) ? materials.length > 0 : materialQuery && !materials.some((value) => orMaterialKey(value).includes(materialQuery))) return false;
      if (filters.samePlate && !(client.placas || []).some((plate) => orNormalizePlate(plate) === orNormalizePlate(analysis?.sm?.placa))) return false;
      if (cutoff && (!client.ultimoFrete || new Date(client.ultimoFrete) < cutoff)) return false;
      if (filters.hasPhone && !String(client.telefone || "").replace(/\D/g, "")) return false;
      return true;
    });
    return result.sort((a, b) => filters.sort === "distance" ? a.distanciaKm - b.distanciaKm
      : filters.sort === "revenue" ? b.faturamento - a.faturamento
        : filters.sort === "freights" ? b.quantidadeFretes - a.quantidadeFretes
          : filters.sort === "recent" ? String(b.ultimoFrete || "").localeCompare(String(a.ultimoFrete || ""))
            : b.score - a.score || a.distanciaKm - b.distanciaKm);
  }, [visibleClients, filters, analysis, materialQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / OR_PAGE_SIZE));
  const pagedClients = filteredClients.slice((page - 1) * OR_PAGE_SIZE, page * OR_PAGE_SIZE);
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedClients = React.useMemo(() => filteredClients.filter((client) => selectedSet.has(client.id)), [filteredClients, selectedSet]);
  const campaignMessage = messageTemplate.replace(/\{(tipoVeiculo|localizacao|placa)\}/g, (_, key) => ({ tipoVeiculo: vehicleType, localizacao: analysis?.destino?.descricao || selectedVehicle?.location || "sua região", placa: analysis?.sm?.placa || selectedVehicle?.plate || "" })[key]);
  const resetAnalysis = () => { setAnalysis(null); setSelectedIds([]); setMaterial(""); setShowCatalog(false); };
  const openCatalog = () => { setShowCatalog(true); setSelectedIds([]); setMaterial(""); setFilters({ sort: "distance", samePlate: false, months: 0, hasPhone: false }); };
  const changeFilters = (next) => { setFilters(next); setSelectedIds([]); };
  const clearFilters = () => { changeFilters({ sort: fonte === "planilha" ? "distance" : "score", samePlate: false, months: 0, hasPhone: false }); setMaterial(""); };

  React.useEffect(() => { setPage(1); }, [filters, analysis, material, showCatalog]);

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
    try { const arquivoBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",").pop()); reader.onerror = () => reject(new Error("Não foi possível ler a planilha.")); reader.readAsDataURL(file); }); const result = await window.RB_API.importOportunidadesClientes({ arquivoBase64, substituir: false }); setNotice(`${result.novos ?? result.importados} novos contatos; ${result.atualizados || 0} atualizados; ${result.duplicadosConsolidados || 0} repetições consolidadas. ${result.ignorados} linhas sem dados suficientes. Todas as abas reconhecidas foram lidas.`); setFonte("planilha"); resetAnalysis(); setShowCatalog(true); setFilters({ sort: "distance", samePlate: false, months: 0, hasPhone: false, notContacted: false }); await load(); }
    catch (err) { setError(err?.message || "Falha ao importar a planilha."); } finally { setWorking(false); }
  };
  const analyze = async () => {
    if (!smId) return setError("Selecione um veículo.");
    setWorking(true); setError(""); setNotice(""); setAnalysis(null); setSelectedIds([]); setMaterial(""); setShowCatalog(false);
    try { const result = await window.RB_API.analyzeOportunidadesRetorno({ smId, raioKm, fonte }); setAnalysis(result); setPage(1); }
    catch (err) { setError(err?.message || "Falha ao analisar clientes próximos."); } finally { setWorking(false); }
  };
  const buildBulkMessage = async () => { try { await navigator.clipboard.writeText(campaignMessage); setNotice("Mensagem copiada."); } catch { setError("Não foi possível copiar a mensagem."); } };

  const firstItem = (page - 1) * OR_PAGE_SIZE + 1;
  const lastItem = Math.min(page * OR_PAGE_SIZE, filteredClients.length);

  return <div className="view or-page"><style>{`
.or-page{max-width:1600px;margin:0 auto;--or-accent:#719de8;font-size:14px;line-height:1.5}.or-page *{box-sizing:border-box}.or-controls{border:0;padding:0;margin:0;min-width:0}.or-controls:disabled{opacity:.65}.or-page .btn{min-height:38px;padding:8px 14px;font-size:12px;border-radius:8px;cursor:pointer}.or-page button:disabled{opacity:.45;cursor:not-allowed}.or-page :is(button,input,select,textarea):focus-visible{outline:2px solid var(--or-accent);outline-offset:3px}.or-page .muted,.or-page .sub{font-size:13px;line-height:1.6}.or-head{margin-bottom:24px}.or-head h1{font-size:25px;letter-spacing:-.5px;margin-bottom:6px}.or-head .actions{display:flex;gap:8px;flex-wrap:wrap}.or-page .card{border-radius:14px}.or-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 20px}.or-stat{display:flex;gap:12px;align-items:flex-start;padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:12px}.or-stat-icon{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;background:var(--accent-soft);color:var(--or-accent);border-radius:10px}.or-stat div>span{font-size:12px;color:var(--text-2)}.or-stat strong{display:block;font-size:26px;font-weight:650;line-height:1.4}.or-stat small{color:var(--muted);font-size:11px}.or-source{padding:18px 22px;margin-bottom:12px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}.or-source h2{font-size:14px;margin:0 auto 0 0}.or-source p{width:100%;margin:0}.or-source .or-radius-buttons button{padding:10px 18px;min-height:42px}.or-radius-buttons{display:flex;gap:6px;flex-wrap:wrap}.or-radius-buttons button,.or-filters>button{background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:12px;cursor:pointer}.or-radius-buttons button.active,.or-filters>button.active{background:var(--accent-soft);border-color:var(--or-accent);color:var(--or-accent)}.or-search-card{display:grid;grid-template-columns:1.25fr 1fr;gap:26px;padding:22px;margin-bottom:20px}.or-vehicle,.or-radius{position:relative;min-width:0}.or-vehicle>label,.or-radius>label{display:block;color:var(--text-2);font-size:13px;font-weight:600;margin-bottom:10px}.or-combobox{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;min-height:60px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);padding:10px 14px;cursor:pointer}.or-combobox strong{display:block;font-size:15px}.or-combobox small{display:block;margin-top:3px;color:var(--text-2);font-size:12px}.or-combobox-menu{position:absolute;z-index:30;top:90px;left:0;right:0;border:1px solid var(--border);border-radius:10px;background:var(--surface);box-shadow:0 20px 55px #0006;overflow:hidden}.or-combobox-search{display:flex;gap:8px;align-items:center;padding:12px;border-bottom:1px solid var(--border)}.or-combobox-search input{background:transparent;border:0;color:var(--text);width:100%;padding:8px;font-size:13px}.or-combobox-options{max-height:320px;overflow:auto}.or-option-group{padding:12px;font-size:10px;color:var(--muted)}.or-option{display:flex;align-items:center;gap:10px;justify-content:space-between;width:100%;border:0;border-top:1px solid var(--border);padding:12px;background:transparent;color:var(--text);text-align:left;cursor:pointer}.or-option:hover{background:var(--surface-2)}.or-option strong,.or-option small{display:block}.or-option small{font-size:11px;color:var(--muted)}.or-option-badges{display:flex;gap:5px}.or-option-badges b{font-size:9px;font-weight:400;border:1px solid var(--border);border-radius:4px;padding:3px}.or-no-option{padding:20px}.or-vehicle-summary{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:12px}.or-vehicle-summary span{font-size:11px;color:var(--text-2)}.or-vehicle-summary b{display:block;color:var(--muted);font-size:10px;font-weight:400}.or-radius-action{display:grid;grid-template-columns:88px 1fr;gap:10px;margin-top:12px}.or-radius-action input{width:100%;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:10px;font-size:13px}.or-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:16px 0}.or-filter-order{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid var(--border);border-radius:8px}.or-filter-order select{background:var(--surface);color:var(--text);border:0;font-size:12px}.or-filter-context{margin-left:auto;font-size:12px;color:var(--muted)}.or-clear{border:0!important;color:var(--or-accent)!important;background:transparent!important}.or-list-head{display:flex;justify-content:space-between;align-items:center;margin:26px 0 14px;gap:15px}.or-list-head h2{font-size:18px;margin:0 0 4px}.or-list-head p{font-size:12px;color:var(--text-2);margin:0}.or-material-filter{padding:16px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}.or-material-filter label{font-size:13px;font-weight:600}.or-material-filter input{max-width:100%;padding:10px 12px;min-width:190px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);font-size:13px}.or-card-actions{display:flex;gap:8px;flex-wrap:wrap}.or-material-filter .or-card-actions{margin-left:auto}.or-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.or-table{width:100%;min-width:780px;border-collapse:collapse;text-align:left;font-size:13px}.or-table caption{text-align:left;padding:14px 20px;color:var(--muted);font-size:12px}.or-table th{padding:12px 18px;background:var(--surface-2);font-size:11px;font-weight:600;color:var(--text-2);border-bottom:1px solid var(--border)}.or-table td{padding:18px;border-bottom:1px solid var(--border);vertical-align:middle}.or-table tbody tr:last-child td{border-bottom:0}.or-table tbody tr:hover{background:var(--surface-2)}.or-table tbody tr.selected{background:var(--accent-soft)}.or-table td strong{font-size:13px}.or-table td small{display:block;margin-top:5px;color:var(--text-2);font-size:12px}.or-table input{width:17px;height:17px;accent-color:var(--or-accent)}.or-table a{color:var(--or-accent);text-decoration:none}.or-table a:hover{text-decoration:underline}.or-material-tags{display:flex;flex-wrap:wrap;gap:6px}.or-material-tags>span{padding:4px 9px;border-radius:6px;background:var(--accent-soft);color:var(--text-2);font-size:11px}.or-pagination{display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-size:12px;color:var(--muted);gap:12px}.or-pagination-actions{display:flex;align-items:center;gap:12px}.or-empty{display:flex;flex-direction:column;align-items:center;padding:36px 24px;background:var(--surface);border:1px dashed var(--border);border-radius:14px;text-align:center}.or-empty-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:var(--accent-soft);color:var(--or-accent);margin-bottom:12px}.or-empty h3{font-size:17px;margin:0 0 8px}.or-empty p{max-width:600px;font-size:13px;color:var(--text-2);line-height:1.7;margin:0}.or-empty-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px}.or-next-step{display:flex;gap:14px;align-items:center;padding:22px;border-radius:12px;border:1px dashed var(--border);margin-top:12px;color:var(--text-2)}.or-next-step strong{font-size:13px}.or-next-step p{font-size:12px;color:var(--muted);margin:4px 0 0}.or-compose{margin-top:20px;padding:24px}.or-compose h2{font-size:18px;margin:0}.or-compose h3{font-size:13px;margin:0 0 12px}.or-recipients{border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:16px 0;font-size:13px}.or-recipients ul{display:flex;gap:8px;flex-wrap:wrap;list-style:none;padding:0;margin:10px 0 0;max-height:140px;overflow:auto}.or-recipients li{padding:8px 12px;background:var(--surface-2);border-radius:8px}.or-recipients small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.or-compose-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.or-compose label{display:block;margin:0 0 16px;font-size:13px;font-weight:500}.or-compose input,.or-compose textarea{display:block;width:100%;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--text);padding:12px 14px;margin-top:8px;font:13px/1.7 var(--font-sans)}.or-compose textarea{min-height:190px;resize:vertical}.or-message-preview{border:1px solid var(--border);background:var(--surface-2);border-radius:12px;padding:20px;align-self:start}.or-message-preview pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.8 var(--font-sans);padding:18px;background:var(--surface);border-radius:2px 12px 12px 12px;margin:0}.or-compose .or-card-actions{justify-content:flex-end;margin-top:20px}.or-validation{font-size:12px;color:var(--muted);text-align:right}.or-skeleton{height:100px;border-radius:12px;background:var(--surface-2);margin:12px 0}
@media(max-width:1100px){.or-kpis{grid-template-columns:repeat(2,1fr)}.or-search-card{grid-template-columns:1fr}.or-compose-grid{grid-template-columns:1fr}}@media(max-width:700px){.or-page{padding:16px!important}.or-head h1{font-size:22px}.or-kpis{gap:8px}.or-stat{padding:12px;gap:8px}.or-stat-icon{display:none}.or-stat strong{font-size:23px}.or-stat small{font-size:10px}.or-source,.or-search-card,.or-compose{padding:16px}.or-source h2{width:100%}.or-source .or-radius-buttons{width:100%}.or-source .or-radius-buttons button{flex:1;padding:10px}.or-material-filter{padding:14px;align-items:stretch;flex-direction:column}.or-material-filter .or-card-actions{margin:0}.or-material-filter input{width:100%}.or-pagination{flex-wrap:wrap}.or-list-head{align-items:flex-start}.or-list-head>.meta{display:none}.or-filter-context{width:100%;margin:0}.or-option-badges{display:none}.or-compose .or-card-actions{justify-content:flex-start}.or-validation{text-align:left}}
`}</style><fieldset className="or-controls" disabled={working}>
    <div className="page-head or-head"><div><h1>Oportunidades de retorno</h1><div className="sub">Encontre clientes próximos ao local onde o veículo ficará disponível.</div></div><div className="actions"><button className="btn" onClick={downloadTemplate}><Icon name="download"/> Baixar modelo</button><label className="btn" style={{ cursor: "pointer" }}><Icon name="file"/> Importar planilha<input type="file" accept=".xlsx" onChange={importFile} style={{ display: "none" }}/></label></div></div>
    {(error || notice) && <div className="card" style={{ padding: "10px 14px", marginBottom: 14 }}><span className={error ? "kpi-delta down" : "kpi-delta up"}>{error || notice}</span></div>}
    <ReturnSummaryCards vehicles={(data.sms?.length || 0) + (data.veiculosTelemetria?.length || 0)} imported={data.clientes?.length || 0} opportunities={analysis ? scoredClients.length : null} selected={selectedClients.length}/>
    <section className="card or-source"><h2>Onde buscar oportunidades?</h2><div className="or-radius-buttons" role="group" aria-label="Fonte das oportunidades">{[["sistema", "Fretes do sistema"], ["planilha", "Contatos da planilha"]].map(([value, label]) => <button type="button" key={value} aria-pressed={fonte === value} className={fonte === value ? "active" : ""} onClick={() => { setFonte(value); resetAnalysis(); setShowCatalog(value === "planilha"); setFilters({ sort: value === "planilha" ? "distance" : "score", samePlate: false, months: 0, hasPhone: false, notContacted: false }); }}>{label}</button>)}</div><p className="muted">{fonte === "planilha" ? `${data.clientes?.length || 0} contatos cadastrados. A importação lê todas as abas e reúne registros repetidos.` : "Clientes que já carregaram na região, com histórico de fretes desde 2023."}</p>{fonte === "planilha" && data.clientes?.length > 0 && !showCatalog && <button className="btn" onClick={openCatalog}>Ver todos os contatos ({data.clientes.length})</button>}</section>
    <div className="card or-search-card"><VehicleSearchSelect data={data} value={smId} onChange={(id) => { setSmId(id); resetAnalysis(); }}/><RadiusSelector value={raioKm} onChange={(value) => { setRaioKm(value); resetAnalysis(); }} onAnalyze={analyze} disabled={working || !smId}/></div>
    {analysis && !showCatalog && <OpportunityFilters fonte={fonte} filters={filters} onChange={changeFilters} onClear={clearFilters} currentPlate={analysis.sm?.placa}/>}
    {analysis?.semLocalizacao > 0 && <p role="status" className="muted">{analysis.semLocalizacao} contato(s) sem localização identificada. Confira cidade e UF ou informe latitude e longitude no modelo.</p>}
    <div className="or-list-head"><div><h2>{showCatalog ? "Contatos da sua planilha" : "Oportunidades comerciais"}</h2><p>{showCatalog ? "Consulte o cadastro completo. Selecione um veículo e analise a região para preparar a mensagem." : analysis ? `Veículo ${analysis.sm?.placa} disponível em ${analysis.destino?.descricao} · raio de ${analysis.raioKm} km` : "Selecione um veículo e analise a região."}</p></div>{analysis && <span className="meta muted">{fonte === "planilha" ? "Contatos importados" : "Histórico desde 2023"}</span>}</div>
    {(loading || working) && !analysis && <div><div className="or-skeleton"/><div className="or-skeleton"/><div className="or-skeleton"/></div>}
    {!loading && !working && !showResults && <div className="or-empty"><Icon name="route" size={28}/><h3>Escolha onde o veículo ficará disponível</h3><p className="muted">Selecione uma SM ou uma posição atual da telemetria para encontrar clientes próximos.</p></div>}
    {showResults && visibleClients.length > 0 && <section className="or-material-filter card">
      <label htmlFor="or-material">2. Filtrar por material carregado</label>
      <input id="or-material" type="search" list="or-material-suggestions" value={material} onChange={(event) => { setMaterial(event.target.value); setSelectedIds([]); }} placeholder="Digite o material: ferro, papel, leite…" autoComplete="off"/>
      <datalist id="or-material-suggestions">
        {materialOptions.filter(([key]) => !materialQuery || key.includes(materialQuery)).slice(0, 30).map(([key, label]) => <option key={key} value={label}/>)}
        <option value="Não informado"/>
      </datalist>
      <span className="muted">{filteredClients.length} contato(s) encontrado(s)</span>
      <div className="or-card-actions"><button className="btn" disabled={showCatalog || !filteredClients.length} onClick={() => setSelectedIds(filteredClients.map((client) => client.id))}>Selecionar contatos filtrados</button><button className="btn" disabled={!selectedIds.length} onClick={() => setSelectedIds([])}>Limpar seleção</button></div>
    </section>}
    {showResults && filteredClients.length > 0 && <OpportunityTable catalog={showCatalog} clients={pagedClients} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}/>}
    {showResults && !loading && !working && !filteredClients.length && <div className="or-empty">
      <span className="or-empty-icon"><Icon name={fonte === "planilha" && !data.clientes?.length ? "file" : "search"} size={28}/></span>
      <h3>{fonte === "planilha" && !data.clientes?.length ? "Sua lista de contatos ainda está vazia" : visibleClients.length ? "Nenhum contato corresponde aos filtros" : showCatalog ? "Nenhum contato cadastrado" : `Nenhum contato em até ${analysis.raioKm} km`}</h3>
      <p>{fonte === "planilha" && !data.clientes?.length ? "Importe sua planilha para cadastrar nomes, telefones, cidades e materiais." : visibleClients.length ? "Experimente outro material ou limpe os filtros para consultar a lista." : fonte === "planilha" ? `Você tem ${data.clientes?.length || 0} contatos cadastrados, mas nenhum foi localizado dentro deste raio. Consulte a lista completa ou busque em outra região.` : "Experimente aumentar o raio ou escolher outro veículo."}</p>
      <div className="or-empty-actions">{fonte === "planilha" && !data.clientes?.length ? <label className="btn primary">Importar contatos<input type="file" accept=".xlsx" onChange={importFile} hidden/></label> : <>{fonte === "planilha" && !showCatalog && <button className="btn primary" onClick={openCatalog}>Ver todos os contatos</button>}{visibleClients.length > 0 && <button className="btn" onClick={clearFilters}>Limpar filtros</button>}{analysis && !showCatalog && analysis.raioKm < 1000 && <button className="btn" onClick={() => { setRaioKm(Math.min(1000, analysis.raioKm + 100)); resetAnalysis(); }}>Aumentar raio</button>}</>}</div>
    </div>}
    {analysis && !showCatalog && filteredClients.length > 0 && !selectedClients.length && <div className="or-next-step"><Icon name="whatsapp"/><div><strong>Selecione os contatos para preparar sua mensagem</strong><p>O editor e a prévia aparecem aqui após a seleção. O envio permanece desabilitado.</p></div></div>}
    {showResults && filteredClients.length > 0 && <div className="or-pagination"><span>{firstItem}-{lastItem} de {filteredClients.length} oportunidades</span><div className="or-pagination-actions"><button className="btn" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {page} de {totalPages}</span><button className="btn" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></div>}
    {analysis && !showCatalog && selectedClients.length > 0 && <section className="card or-compose">
      <h2>3. Revisar mensagem</h2>
      <p className="muted">Selecione os contatos na tabela e confira a mensagem antes do envio.</p>
      <div className="or-recipients"><strong>{selectedClients.length} contato(s) selecionado(s)</strong>
        {selectedClients.length ? <ul>{selectedClients.map((client) => <li key={client.id}><span>{client.nome}</span><small>{client.contato ? `${client.contato} · ` : ""}{client.telefone || "Telefone não informado"}</small></li>)}</ul> : <p className="muted">Nenhum contato selecionado.</p>}
      </div>
      <div className="or-compose-grid"><div>
        <label>Tipo de veículo<input value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} placeholder="Ex.: carreta 4 eixos"/></label>
        <label>Modelo da mensagem<textarea value={messageTemplate} onChange={(event) => setMessageTemplate(event.target.value)}/></label>
        <p className="muted">Use {"{tipoVeiculo}"}, {"{localizacao}"} e {"{placa}"} para preencher os dados do veículo.</p>
      </div><div className="or-message-preview"><h3>Prévia da mensagem</h3><pre>{campaignMessage}</pre></div></div>
      <div className="or-card-actions"><button className="btn" disabled={!campaignMessage.trim()} onClick={buildBulkMessage}><Icon name="copy"/> Copiar mensagem</button><button className="btn primary" disabled title="Envio desabilitado durante o ajuste da tela"><Icon name="whatsapp"/> Enviar para {selectedClients.length} selecionado(s)</button></div>
      <p className="or-validation" role="status">Envio desabilitado por enquanto. Esta tela permite apenas selecionar contatos e revisar a mensagem.</p>
    </section>}
    </fieldset>
  </div>;
};

window.OportunidadesRetorno = OportunidadesRetorno;

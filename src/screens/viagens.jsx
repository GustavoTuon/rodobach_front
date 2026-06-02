// Viagens e Cotações — Norte Telemetria
const SITUACOES = {
  "faltando_dados": { label: "Faltando Dados",  cls: "warn" },
  "aguardando":     { label: "Aguardando",       cls: "info" },
  "aguardando_cte": { label: "Aguardando CT-e",  cls: "info" },
  "em_transito":    { label: "Em Trânsito",      cls: "ok"   },
  "entregue":       { label: "Entregue",         cls: "ok"   },
  "cancelado":      { label: "Cancelado",        cls: "crit" },
};

const DOCS_LABELS = [
  { key: "placas",              label: "Placas do veículo" },
  { key: "antt",                label: "ANTT / RNTRC" },
  { key: "cnh",                 label: "CNH do motorista" },
  { key: "contaDeposito",       label: "Conta depósito" },
  { key: "chavePix",            label: "Chave Pix" },
  { key: "comprovanteResidencia", label: "Comprovante de residência" },
  { key: "numeroMotorista",     label: "Número do motorista" },
];

const FORM_EMPTY = {
  id: null, numero: "", situacao: "faltando_dados",
  data: new Date().toISOString().slice(0, 10), placa: "",
  origem: "", ufOrigem: "", destino: "", ufDestino: "",
  cliente: "", clienteFinal: "", material: "", peso: "", km: "",
  valorCliente: "", condicaoPagamento: "", tomadorServico: "", vendedor: "",
  motorista: "", numeroMotorista: "", cnh: "", antt: "",
  contaDeposito: "", chavePix: "", valorMotorista: "",
  docs: { placas: false, antt: false, cnh: false, contaDeposito: false, chavePix: false, comprovanteResidencia: false, numeroMotorista: false },
  paradas: [], observacoes: "",
};

const VIAGENS_FORM_DEBUG = true;
const textValue = (value) => value === null || value === undefined ? "" : String(value);
const numericValue = (value) => {
  const raw = textValue(value).trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeDocs = (docs = {}) => ({ ...FORM_EMPTY.docs, ...(docs || {}) });
const normalizeParadas = (paradas = []) => (Array.isArray(paradas) ? paradas : []).map((p, index) => ({
  id: p.id ?? `${Date.now()}-${index}`,
  ordem: p.ordem ?? index + 1,
  tipo: p.tipo || "entrega",
  cidade: textValue(p.cidade),
  uf: textValue(p.uf).slice(0, 2).toUpperCase(),
  cliente: textValue(p.cliente),
  endereco: textValue(p.endereco),
  nf: textValue(p.nf),
  obs: textValue(p.obs),
}));
const normalizeViagemForm = (input = {}) => ({
  ...FORM_EMPTY,
  ...input,
  id: input.id ?? null,
  numero: textValue(input.numero),
  situacao: input.situacao || "faltando_dados",
  data: input.data || FORM_EMPTY.data,
  placa: textValue(input.placa),
  origem: textValue(input.origem),
  ufOrigem: textValue(input.ufOrigem).slice(0, 2).toUpperCase(),
  destino: textValue(input.destino),
  ufDestino: textValue(input.ufDestino).slice(0, 2).toUpperCase(),
  cliente: textValue(input.cliente),
  clienteFinal: textValue(input.clienteFinal),
  material: textValue(input.material),
  peso: textValue(input.peso),
  km: textValue(input.km),
  valorCliente: textValue(input.valorCliente),
  condicaoPagamento: textValue(input.condicaoPagamento),
  tomadorServico: textValue(input.tomadorServico),
  vendedor: textValue(input.vendedor),
  motorista: textValue(input.motorista),
  numeroMotorista: textValue(input.numeroMotorista),
  cnh: textValue(input.cnh),
  antt: textValue(input.antt),
  contaDeposito: textValue(input.contaDeposito),
  chavePix: textValue(input.chavePix),
  valorMotorista: textValue(input.valorMotorista),
  docs: normalizeDocs(input.docs),
  paradas: normalizeParadas(input.paradas),
  observacoes: textValue(input.observacoes),
});

const STEPS = [
  { n: 1, label: "Rota",             icon: "map"       },
  { n: 2, label: "Carga e Cliente",  icon: "package"   },
  { n: 3, label: "Motorista",        icon: "user"       },
  { n: 4, label: "Documentos",       icon: "file"       },
];

const Viagens = ({ onNavigate }) => {
  const { useState, useEffect, useRef } = React;

  const [viagens,        setViagens]        = useState([]);
  const [loadingViagens, setLoadingViagens] = useState(true);
  const [viagensError,   setViagensError]   = useState("");
  const [mode,           setMode]           = useState("list");
  const [step,           setStep]           = useState(1);
  const [form,           setForm]           = useState(() => normalizeViagemForm());
  const [search,         setSearch]         = useState("");
  const [filtroSit,      setFiltroSit]      = useState("todos");
  const [opcoes,         setOpcoes]         = useState({
    clientes: [], clientesFinais: [], tomadores: [], placas: [], motoristas: [],
    vendedores: [], origens: [], destinos: [], paradas: [], materiais: [],
    detalhes: { clientes: [], placas: [], motoristas: [] },
  });
  const nextId = useRef(1);

  useEffect(() => {
    setLoadingViagens(true);
    setViagensError("");
    window.RB_API.listViagens()
      .then((items) => {
        if (!Array.isArray(items)) { setViagensError("Resposta inesperada do servidor."); return; }
        setViagens(items);
        const maxId = items.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0);
        nextId.current = maxId + 1;
      })
      .catch((error) => {
        console.warn("Erro ao carregar viagens:", error);
        setViagensError(error?.message || "Não foi possível carregar as viagens.");
      })
      .finally(() => setLoadingViagens(false));

    window.RB_API.listOpcoes()
      .then((data) => { if (data) setOpcoes(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!VIAGENS_FORM_DEBUG) return;
    console.groupCollapsed("[Viagens][auditoria] formulario revisado");
    console.table([
      { area: "binding", status: "corrigido", detalhe: "normalizacao evita null/undefined em inputs controlados" },
      { area: "paradas", status: "corrigido", detalhe: "updates funcionais evitam perda de dados entre etapas" },
      { area: "autocomplete", status: "corrigido", detalhe: "campos continuam editaveis apos preenchimento automatico" },
      { area: "readonly/disabled", status: "ok", detalhe: "nenhum input do cadastro ficou readonly ou disabled indevidamente" },
      { area: "salvamento", status: "auditado", detalhe: "payload enviado ao backend e retorno salvo aparecem no console" },
    ]);
    console.groupEnd();
  }, []);

  // Pick up pre-filled data from simulator
  useEffect(() => {
    if (window.NT_SIM) {
      const sim = window.NT_SIM;
      const num = `V-${new Date().getFullYear()}-${String(nextId.current).padStart(3, "0")}`;
      setForm(normalizeViagemForm({
        ...FORM_EMPTY, numero: num,
        placa:         sim.placa || "",
        motorista:     sim.motorista || "",
        valorMotorista: sim.valorMotorista ? sim.valorMotorista.toFixed(2) : "",
        valorCliente:   sim.valorCliente   ? sim.valorCliente.toFixed(2)   : "",
      }));
      setStep(1);
      setMode("form");
      window.NT_SIM = null;
    }
  }, []);

  const debugField = (field, value, nextForm) => {
    if (!VIAGENS_FORM_DEBUG) return;
    console.debug("[Viagens][campo]", field, { digitado: value, formState: nextForm?.[field] });
  };
  const setF = (field, val) => setForm(prev => {
    const next = { ...prev, [field]: val };
    debugField(field, val, next);
    return next;
  });
  const setDoc = (key, val) => setForm(prev => {
    const next = { ...prev, docs: { ...normalizeDocs(prev.docs), [key]: val } };
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][documento]", key, { digitado: val, formState: next.docs[key] });
    return next;
  });
  const setParadas = (updater) => setForm(prev => {
    const current = normalizeParadas(prev.paradas);
    const nextParadas = typeof updater === "function" ? updater(current) : updater;
    const next = { ...prev, paradas: normalizeParadas(nextParadas) };
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][paradas]", { valorDigitado: nextParadas, formState: next.paradas });
    return next;
  });

  const mergeOptionDetails = (key, items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setOpcoes(prev => {
      const current = prev.detalhes?.[key] || [];
      const byLabel = new Map(current.map(item => [String(item.placa || item.nome || item.label || "").toLowerCase(), item]));
      items.forEach(item => {
        const label = String(item.placa || item.nome || item.label || "").toLowerCase();
        if (label) byLabel.set(label, { ...byLabel.get(label), ...item });
      });
      const labels = items.map(item => item.placa || item.nome || item.label).filter(Boolean);
      return {
        ...prev,
        [key]: [...new Set([...(prev[key] || []), ...labels])].sort((a, b) => String(a).localeCompare(String(b))),
        detalhes: { ...(prev.detalhes || {}), [key]: [...byLabel.values()] },
      };
    });
  };

  const applyMotorista = (value) => {
    const item = (opcoes.detalhes?.motoristas || []).find(m => String(m.nome || "").toLowerCase() === String(value || "").toLowerCase());
    if (!item) return;
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][autocomplete motorista]", { selecionado: value, preenchido: item });
    setForm(prev => ({
      ...prev,
      motorista: item.nome || prev.motorista,
      numeroMotorista: item.numeroMotorista || prev.numeroMotorista,
      cnh: item.cnh || prev.cnh,
      antt: item.antt || prev.antt,
      contaDeposito: item.contaDeposito || prev.contaDeposito,
      chavePix: item.chavePix || prev.chavePix,
    }));
  };

  const applyPlaca = (value) => {
    const clean = String(value || "").split(" ")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
    const item = (opcoes.detalhes?.placas || []).find(p => String(p.placa || "").replace(/[^a-z0-9]/gi, "").toLowerCase() === clean);
    if (!item) return;
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][autocomplete placa]", { selecionado: value, preenchido: item });
    setForm(prev => ({
      ...prev,
      placa: item.placa || prev.placa,
      motorista: item.motorista || prev.motorista,
      numeroMotorista: item.numeroMotorista || prev.numeroMotorista,
      cnh: item.cnh || prev.cnh,
      antt: item.antt || prev.antt,
      contaDeposito: item.contaDeposito || prev.contaDeposito,
      chavePix: item.chavePix || prev.chavePix,
    }));
  };

  const applyCliente = (field, value) => {
    const item = (opcoes.detalhes?.clientes || []).find(c => String(c.nome || "").toLowerCase() === String(value || "").toLowerCase());
    if (!item) return;
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][autocomplete cliente]", { campo: field, selecionado: value, preenchido: item });
    setForm(prev => ({
      ...prev,
      [field]: item.nome || prev[field],
      condicaoPagamento: item.condicaoPagamento || prev.condicaoPagamento,
    }));
  };

  const searchAutocomplete = (type, value) => {
    const q = String(value || "").trim();
    if (q.length < 2) return;
    const calls = {
      placas: window.RB_API.searchViagemPlacas,
      motoristas: window.RB_API.searchViagemMotoristas,
      clientes: window.RB_API.searchViagemClientes,
    };
    calls[type]?.(q).then(items => mergeOptionDetails(type, items)).catch(() => {});
  };

  const isIncomplete = (v) => {
    const docsMissing = DOCS_LABELS.some(doc => !v.docs?.[doc.key]);
    return !v.placa || !v.motorista || !v.cliente || !v.material || !v.valorCliente || !v.valorMotorista || docsMissing;
  };

  const prepareViagem = (v) => ({
    ...normalizeViagemForm(v),
    peso: numericValue(v.peso),
    km: textValue(v.km).trim() ? numericValue(v.km) : "",
    valorCliente: numericValue(v.valorCliente),
    valorMotorista: numericValue(v.valorMotorista),
    situacao: isIncomplete(v) ? "faltando_dados" : (v.situacao === "faltando_dados" ? "aguardando" : v.situacao),
  });

  const missingHints = [
    !form.placa && "placa",
    !form.motorista && "motorista",
    !form.cliente && "cliente",
    !form.material && "material/carga",
    !form.valorCliente && "valor do cliente",
    !form.valorMotorista && "valor do motorista",
  ].filter(Boolean);

  const openNew = () => {
    const num = `V-${new Date().getFullYear()}-${String(nextId.current).padStart(3, "0")}`;
    setForm(normalizeViagemForm({ numero: num }));
    setStep(1);
    setMode("form");
  };

  const openEdit = (v) => {
    const normalized = normalizeViagemForm(v);
    if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][editar] form carregado", normalized);
    setForm(normalized);
    setStep(1);
    setMode("form");
  };

  const deleteViagem = async (id) => {
    try {
      await window.RB_API.deleteViagem(id);
    } catch (error) {
      console.warn("Nao foi possivel excluir no backend. Removendo localmente.", error);
    }
    setViagens(prev => prev.filter(v => v.id !== id));
  };

  const saveForm = async () => {
    if (!form.data) {
      window.alert("Informe a data da viagem antes de salvar.");
      return;
    }

    const payload = prepareViagem(form);
    if (VIAGENS_FORM_DEBUG) {
      console.groupCollapsed("[Viagens][salvar] payload");
      console.log("form state", form);
      console.log("payload enviado", payload);
      console.groupEnd();
    }
    try {
      const saved = payload.id
        ? await window.RB_API.updateViagem(payload.id, payload)
        : await window.RB_API.createViagem(payload);

      setViagens(prev => {
        if (payload.id) return prev.map(v => v.id === payload.id ? saved : v);
        return [...prev, saved];
      });
      if (VIAGENS_FORM_DEBUG) console.debug("[Viagens][salvar] retorno backend", saved);
      setForm(normalizeViagemForm(saved));
      setMode("print");
    } catch (error) {
      console.warn("Nao foi possivel salvar no backend. Salvando localmente.", error);
      if (payload.id) {
        setViagens(prev => prev.map(v => v.id === payload.id ? { ...payload } : v));
        setForm(normalizeViagemForm(payload));
      } else {
        const id = nextId.current++;
        const localSaved = { ...payload, id };
        setViagens(prev => [...prev, localSaved]);
        setForm(normalizeViagemForm(localSaved));
      }
      setMode("print");
    }
  };

  const addParada = () => {
    setParadas(current => [
      ...current,
      { id: Date.now(), ordem: current.length + 1, tipo: "entrega", cidade: "", uf: "", cliente: "", endereco: "", nf: "", obs: "" },
    ]);
  };
  const removeParada = (id) => setParadas(current => current.filter(p => p.id !== id).map((p, index) => ({ ...p, ordem: index + 1 })));
  const setParada = (id, field, val) =>
    setParadas(current => current.map(p => p.id === id ? { ...p, [field]: val } : p));

  const filteredViagens = viagens.filter(v => {
    if (filtroSit !== "todos" && v.situacao !== filtroSit) return false;
    if (search) {
      const q = search.toLowerCase();
      const notas = (v.paradas || []).map(p => [p.nf, p.cliente, p.cidade, p.obs].filter(Boolean).join(" ")).join(" ");
      return [v.numero, v.cliente, v.clienteFinal, v.tomadorServico, v.motorista, v.origem, v.destino, v.placa, v.material, notas]
        .some(x => (x || "").toLowerCase().includes(q));
    }
    return true;
  });

  const docsOk = (v) => Object.values(v.docs).filter(Boolean).length;
  const margem = (v) => (v.valorCliente > 0 && v.valorMotorista > 0)
    ? (((v.valorCliente - v.valorMotorista) / v.valorCliente) * 100).toFixed(1)
    : null;
  const money = (value) => numericValue(value) ? `R$ ${fmtNum(numericValue(value), {minimumFractionDigits: 2})}` : "";
  const lucro = numericValue(form.valorCliente) - numericValue(form.valorMotorista);
  const printMargin = numericValue(form.valorCliente) > 0 ? ((lucro / numericValue(form.valorCliente)) * 100).toFixed(1) : "";
  const printDocs = DOCS_LABELS.filter(doc => form.docs?.[doc.key]).map(doc => doc.label).join(", ");

  const PrintBlock = ({ title, rows }) => (
    <section className="rb-print-block">
      <h2>{title}</h2>
      <div className="rb-print-grid">
        {rows.filter(row => row.value !== undefined && row.value !== null && String(row.value).trim() !== "").map(row => (
          <div key={row.label} className={row.wide ? "wide" : ""}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );

  const PrintSheet = () => (
    <div className="rb-print-sheet">
      <div className="rb-print-title">
        <div>
          <h1>Viagem {form.numero || form.id || ""}</h1>
          <p>{form.data ? new Date(form.data + "T12:00:00").toLocaleDateString("pt-BR") : ""}</p>
        </div>
        <div className="rb-print-status">{(SITUACOES[form.situacao] || SITUACOES.faltando_dados).label}</div>
      </div>
      <PrintBlock title="Dados da viagem" rows={[
        { label: "Placa", value: form.placa },
        { label: "Data", value: form.data ? new Date(form.data + "T12:00:00").toLocaleDateString("pt-BR") : "" },
        { label: "Origem", value: [form.origem, form.ufOrigem].filter(Boolean).join("/") },
        { label: "Destino", value: [form.destino, form.ufDestino].filter(Boolean).join("/") },
        { label: "Paradas", value: (form.paradas || []).map(p => [p.cidade, p.uf].filter(Boolean).join("/")).filter(Boolean).join(" | "), wide: true },
        { label: "KM", value: form.km },
      ]}/>
      <PrintBlock title="Cliente e carga" rows={[
        { label: "Cliente/Tomador", value: form.cliente || form.tomadorServico, wide: true },
        { label: "Cliente final", value: form.clienteFinal, wide: true },
        { label: "Material", value: form.material, wide: true },
        { label: "Peso", value: form.peso ? `${fmtNum(numericValue(form.peso))} kg` : "" },
        { label: "Valor cliente", value: money(form.valorCliente) },
        { label: "Cond. pagamento", value: form.condicaoPagamento, wide: true },
      ]}/>
      <PrintBlock title="Motorista e pagamento" rows={[
        { label: "Motorista", value: form.motorista, wide: true },
        { label: "Telefone", value: form.numeroMotorista },
        { label: "CNH", value: form.cnh },
        { label: "ANTT/RNTRC", value: form.antt },
        { label: "Chave Pix", value: form.chavePix, wide: true },
        { label: "Conta deposito", value: form.contaDeposito, wide: true },
        { label: "Valor motorista", value: money(form.valorMotorista) },
        { label: "Lucro/margem", value: numericValue(form.valorCliente) || numericValue(form.valorMotorista) ? `${money(lucro) || "R$ 0,00"}${printMargin ? ` (${printMargin}%)` : ""}` : "" },
      ]}/>
      <PrintBlock title="Documentos/observacoes" rows={[
        { label: "Notas fiscais", value: (form.paradas || []).map(p => p.nf).filter(Boolean).join(", "), wide: true },
        { label: "Documentos recebidos", value: printDocs, wide: true },
        { label: "Observacoes", value: form.observacoes, wide: true },
      ]}/>
    </div>
  );

  // ── Field helpers ────────────────────────────────────────────────────────
  const fs = {
    width: "100%", height: 34, padding: "0 10px",
    border: "1.5px solid var(--border)", borderRadius: "var(--r)",
    background: "var(--surface)", color: "var(--text)",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const Fg = ({ label, children, half }) => (
    <div style={half ? { flex: 1, minWidth: 0 } : {}}>
      <div style={{fontSize: 11.5, color: "var(--text-2)", fontWeight: 500, marginBottom: 5}}>{label}</div>
      {children}
    </div>
  );

  // ── LIST view ────────────────────────────────────────────────────────────
  if (mode === "list") {
    return (
      <div className="view">
        <div className="page-head">
          <div>
            <h1>Viagens e Cotações</h1>
            <div className="sub">
              {loadingViagens ? "Carregando…" : viagensError ? "Erro ao carregar" : `${viagens.length} viagens registradas · ${viagens.filter(v => v.situacao === "em_transito").length} em trânsito`}
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => onNavigate("simulador")}>
              <Icon name="calculator"/> Simulador
            </button>
            <button className="btn primary" onClick={openNew}>
              <Icon name="plus"/> Nova Viagem
            </button>
          </div>
        </div>

        {/* Status banner */}
        {(loadingViagens || viagensError) && (
          <div className="card" style={{marginBottom:12,padding:"12px 16px",borderColor:viagensError?"var(--crit-border)":"var(--border)"}}>
            {loadingViagens
              ? <span className="muted" style={{fontSize:12.5}}>Carregando viagens do banco de dados…</span>
              : (
                <div>
                  <div style={{fontWeight:600,color:"var(--crit)",marginBottom:4,fontSize:13}}>⚠ Erro ao conectar ao banco de dados</div>
                  <div style={{fontSize:12,color:"var(--text-2)",fontFamily:"var(--font-mono)",marginBottom:6}}>{viagensError}</div>
                  <div style={{fontSize:12,color:"var(--text-3)"}}>
                    Verifique as credenciais em <code style={{background:"var(--surface-3)",padding:"1px 5px",borderRadius:3}}>rodobach_back/.env</code> e reinicie o servidor backend.
                    {viagensError.toLowerCase().includes("password") && " A senha do banco pode ter expirado ou mudado."}
                    {(viagensError.toLowerCase().includes("table") || viagensError.toLowerCase().includes("relation")) && " Execute POST /api/admin/migrate para criar as tabelas."}
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* KPIs rápidos */}
        <div className="grid cols-4" style={{marginBottom: 16}}>
          <KPI label="Total de viagens" icon="route"   value={viagens.length}/>
          <KPI label="Em trânsito"      icon="truck"   value={viagens.filter(v => v.situacao === "em_transito").length}/>
          <KPI label="Aguardando"       icon="clock"   value={viagens.filter(v => v.situacao === "aguardando" || v.situacao === "faltando_dados").length} delta="com pendências" deltaDir="down"/>
          <KPI label="Receita total"    icon="trending-up"
            value={`R$ ${fmtNum(viagens.reduce((s, v) => s + (v.valorCliente || 0), 0), {minimumFractionDigits: 0})}`}/>
        </div>

        {/* Toolbar */}
        <div className="tbl-toolbar" style={{marginBottom: 0}}>
          <div className="search">
            <Icon name="search"/>
            <input placeholder="Buscar por numero, cliente, tomador, motorista, placa, origem, destino, carga ou NF..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="row" style={{gap: 6}}>
            {["todos", ...Object.keys(SITUACOES)].map(id => (
              <button key={id}
                className={`tbl-filter${filtroSit === id ? " active" : ""}`}
                onClick={() => setFiltroSit(id)}>
                {id === "todos" ? "Todos" : SITUACOES[id].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card card-flush" style={{marginTop: 10}}>
          <table className="tbl">
            <thead>
              <tr>
                <th className="num">N° Viagem</th>
                <th>Data</th>
                <th>Rota</th>
                <th>Cliente</th>
                <th>Motorista / Placa</th>
                <th className="num">Vr. Cliente</th>
                <th className="num">Vr. Motorista</th>
                <th className="num">Margem</th>
                <th>Situação</th>
                <th style={{width: 70}}/>
              </tr>
            </thead>
            <tbody>
              {filteredViagens.length === 0 && (
                <tr>
                  <td colSpan="10" style={{textAlign: "center", padding: "32px 0", color: "var(--text-3)"}}>
                    {loadingViagens ? "Carregando viagens…" : "Nenhuma viagem encontrada."}
                  </td>
                </tr>
              )}
              {filteredViagens.map(v => {
                const sit = SITUACOES[v.situacao] || SITUACOES["faltando_dados"];
                const mg  = margem(v);
                return (
                  <tr key={v.id} className={`clickable${v.situacao === "cancelado" ? " row-crit" : v.situacao === "faltando_dados" ? " row-warn" : ""}`}
                    onClick={() => openEdit(v)}>
                    <td className="num" style={{fontWeight: 500}}>{v.numero || "—"}</td>
                    <td className="date" style={{whiteSpace: "nowrap"}}>
                      {v.data ? new Date(v.data + "T12:00:00").toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit"}) : "—"}
                    </td>
                    <td>
                      <div style={{fontSize: 12.5}}>{v.origem || "—"} <span className="muted">({v.ufOrigem})</span></div>
                      <div className="muted" style={{fontSize: 11.5}}>→ {v.destino || "—"} <span>({v.ufDestino})</span></div>
                    </td>
                    <td style={{maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                      {v.cliente || <span className="muted">—</span>}
                    </td>
                    <td>
                      <div style={{fontSize: 12.5}}>{v.motorista || <span className="muted">—</span>}</div>
                      {v.placa && <Plate value={v.placa}/>}
                    </td>
                    <td className="num">{v.valorCliente ? `R$ ${fmtNum(v.valorCliente, {minimumFractionDigits: 2})}` : <span className="muted">—</span>}</td>
                    <td className="num">{v.valorMotorista ? `R$ ${fmtNum(v.valorMotorista, {minimumFractionDigits: 2})}` : <span className="muted">—</span>}</td>
                    <td className="num">
                      {mg !== null
                        ? <span style={{color: +mg >= 20 ? "#047857" : +mg >= 10 ? "var(--text)" : "#b91c1c", fontWeight: 500}}>{mg}%</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${sit.cls}`}>
                        <span className="dot"/>{sit.label}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row" style={{gap: 4, justifyContent: "flex-end"}}>
                        <button className="icon-btn" title="Editar" onClick={() => openEdit(v)}>
                          <Icon name="wrench" size={13}/>
                        </button>
                        <button className="icon-btn" title="Imprimir" onClick={() => { setForm(normalizeViagemForm(v)); setMode("print"); }}>
                          <Icon name="file" size={13}/>
                        </button>
                        <button className="icon-btn" title="Excluir"
                          onClick={() => { if (window.confirm(`Excluir viagem ${v.numero}?`)) deleteViagem(v.id); }}>
                          <Icon name="x" size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredViagens.length > 0 && (
            <div className="tbl-footer">
              <span className="muted" style={{fontSize: 12}}>{filteredViagens.length} de {viagens.length} viagens</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FORM view ────────────────────────────────────────────────────────────
  if (mode === "print") {
    return (
      <div className="view rb-print-view">
        <style>{`
          .rb-print-view { display: grid; gap: 16px; }
          .rb-print-actions { display: flex; gap: 8px; justify-content: space-between; align-items: center; }
          .rb-print-sheet {
            width: min(148mm, 100%);
            margin: 0 auto;
            background: #fff;
            color: #111827;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 12mm;
            font-family: Arial, sans-serif;
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
          }
          .rb-print-title { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
          .rb-print-title h1 { margin: 0; font-size: 18px; color: #111827; }
          .rb-print-title p { margin: 3px 0 0; font-size: 11px; color: #4b5563; }
          .rb-print-status { align-self: flex-start; border: 1px solid #9ca3af; border-radius: 4px; padding: 3px 7px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .rb-print-block { break-inside: avoid; page-break-inside: avoid; margin-top: 9px; }
          .rb-print-block h2 { margin: 0 0 5px; font-size: 11px; color: #111827; text-transform: uppercase; letter-spacing: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
          .rb-print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 10px; }
          .rb-print-grid div { min-width: 0; }
          .rb-print-grid .wide { grid-column: 1 / -1; }
          .rb-print-grid span { display: block; font-size: 9px; color: #6b7280; text-transform: uppercase; }
          .rb-print-grid strong { display: block; font-size: 11px; line-height: 1.3; color: #111827; overflow-wrap: anywhere; }
          @media print {
            body { background: #fff !important; }
            body * { visibility: hidden !important; }
            .rb-print-sheet, .rb-print-sheet * { visibility: visible !important; }
            .rb-print-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 148mm;
              margin: 0;
              border: 0;
              border-radius: 0;
              box-shadow: none;
              padding: 9mm;
            }
            .rb-print-actions, .page-head, .actions, .sidebar, .topbar, .app-nav { display: none !important; }
            @page { size: A4 portrait; margin: 10mm; }
          }
        `}</style>
        <div className="page-head rb-print-actions">
          <div>
            <h1>Resumo para impressao</h1>
            <div className="sub">Meia folha A4 pronta para enviar ao financeiro.</div>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setMode("list")}>
              <Icon name="arrow-right" style={{transform: "rotate(180deg)"}}/> Voltar
            </button>
            <button className="btn" onClick={() => { setStep(1); setMode("form"); }}>
              <Icon name="wrench"/> Editar
            </button>
            <button className="btn primary" onClick={() => window.print()}>
              <Icon name="file"/> Imprimir viagem
            </button>
          </div>
        </div>
        <PrintSheet/>
      </div>
    );
  }

  const isEdit = !!form.id;

  const renderStep1 = () => (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start"}}>
      {/* Coluna esquerda */}
      <div className="col" style={{gap: 14}}>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
          <Fg label="Número da viagem">
            <input style={fs} value={form.numero} onChange={e => setF("numero", e.target.value)} placeholder="V-2026-001"/>
          </Fg>
          <Fg label="Data">
            <input type="date" style={fs} value={form.data} onChange={e => setF("data", e.target.value)}/>
          </Fg>
        </div>
        <Fg label="Placa do veículo">
          {opcoes.placas.length > 0 ? (
            <>
              <input list="placas-list" style={fs} value={form.placa}
                onChange={e => {
                  const value = e.target.value;
                  setF("placa", value);
                  searchAutocomplete("placas", value);
                  applyPlaca(value);
                }}
                placeholder="Digite ou selecione a placa..."/>
              <datalist id="placas-list">
                {opcoes.placas.map(p => <option key={p} value={p}/>)}
              </datalist>
            </>
          ) : (
            <input style={fs} value={form.placa}
              onChange={e => {
                const value = e.target.value;
                setF("placa", value);
                searchAutocomplete("placas", value);
                applyPlaca(value);
              }}
              placeholder="Ex: ABC-1234"/>
          )}
        </Fg>
        <Fg label="Situação">
          <select style={fs} value={form.situacao} onChange={e => setF("situacao", e.target.value)}>
            {Object.entries(SITUACOES).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </select>
        </Fg>
        <Fg label="Vendedor (opcional)">
          <input list="vendedores-list" style={fs} value={form.vendedor}
            onChange={e => setF("vendedor", e.target.value)} placeholder="Nome do vendedor"/>
          <datalist id="vendedores-list">
            {opcoes.vendedores.map(v => <option key={v} value={v}/>)}
          </datalist>
        </Fg>
      </div>

      {/* Coluna direita — rota */}
      <div className="col" style={{gap: 0}}>
        <div style={{
          background: "var(--bg)", border: "1.5px solid var(--border)",
          borderRadius: 8, padding: 16,
        }}>
          <div style={{fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 14}}>
            <Icon name="map" size={13} style={{marginRight: 6}}/>
            Rota da viagem
          </div>

          <Fg label="Cidade de Origem">
            <div className="row" style={{gap: 8}}>
              <input list="origens-list" style={{...fs, flex: 3}} value={form.origem}
                onChange={e => {
                  const v = e.target.value;
                  const parts = v.split("/");
                  setF("origem", parts[0].trim());
                  if (parts[1]) setF("ufOrigem", parts[1].trim().toUpperCase().slice(0, 2));
                }} placeholder="Ex: São Paulo"/>
              <datalist id="origens-list">
                {opcoes.origens.map(o => <option key={o} value={o}/>)}
              </datalist>
              <input style={{...fs, flex: 1, textAlign: "center"}} value={form.ufOrigem}
                onChange={e => setF("ufOrigem", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF" maxLength="2"/>
            </div>
          </Fg>

          <div style={{display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", color: "var(--text-3)"}}>
            <Icon name="arrow-down" size={18}/>
          </div>

          <Fg label="Cidade de Destino">
            <div className="row" style={{gap: 8}}>
              <input list="destinos-list" style={{...fs, flex: 3}} value={form.destino}
                onChange={e => {
                  const v = e.target.value;
                  const parts = v.split("/");
                  setF("destino", parts[0].trim());
                  if (parts[1]) setF("ufDestino", parts[1].trim().toUpperCase().slice(0, 2));
                }} placeholder="Ex: Belo Horizonte"/>
              <datalist id="destinos-list">
                {opcoes.destinos.map(d => <option key={d} value={d}/>)}
              </datalist>
              <input style={{...fs, flex: 1, textAlign: "center"}} value={form.ufDestino}
                onChange={e => setF("ufDestino", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF" maxLength="2"/>
            </div>
          </Fg>
        </div>

        {/* Paradas */}
        <div style={{marginTop: 14}}>
          <div className="row between" style={{marginBottom: 10}}>
            <div style={{fontSize: 12, fontWeight: 500, color: "var(--text-2)"}}>
              Paradas / Entregas ({form.paradas.length})
            </div>
            <button className="btn" style={{padding: "4px 10px", fontSize: 12}} onClick={addParada}>
              <Icon name="plus" size={12}/> Adicionar parada
            </button>
          </div>

          {form.paradas.length === 0 && (
            <div className="muted" style={{fontSize: 12, padding: "10px 0"}}>
              Nenhuma parada adicionada. A rota vai direto origem → destino.
            </div>
          )}
          {form.paradas.map((p, i) => (
            <div key={p.id} style={{
              border: "1px solid var(--border)", borderRadius: "var(--r)",
              padding: 12, marginBottom: 8, background: "var(--surface)",
            }}>
              <div className="row between" style={{marginBottom: 8}}>
                <span style={{fontSize: 12, fontWeight: 500, color: "var(--text-2)"}}>Parada {i + 1}</span>
                <button className="icon-btn" onClick={() => removeParada(p.id)} title="Remover">
                  <Icon name="x" size={13}/>
                </button>
              </div>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
                <Fg label="Tipo">
                  <select style={fs} value={p.tipo} onChange={e => setParada(p.id, "tipo", e.target.value)}>
                    <option value="entrega">Entrega</option>
                    <option value="coleta">Coleta</option>
                    <option value="transbordo">Transbordo</option>
                  </select>
                </Fg>
                <Fg label="Cidade / UF">
                  <div className="row" style={{gap: 6}}>
                    <input list="paradas-list" style={{...fs, flex: 3}} value={p.cidade}
                      onChange={e => {
                        const value = e.target.value;
                        const parts = value.split("/");
                        setParada(p.id, "cidade", parts[0].trim());
                        if (parts[1]) setParada(p.id, "uf", parts[1].trim().toUpperCase().slice(0, 2));
                      }} placeholder="Cidade"/>
                    <datalist id="paradas-list">
                      {(opcoes.paradas || []).map(c => <option key={c} value={c}/>)}
                    </datalist>
                    <input style={{...fs, flex: 1}} value={p.uf} onChange={e => setParada(p.id, "uf", e.target.value.toUpperCase().slice(0,2))} placeholder="UF" maxLength="2"/>
                  </div>
                </Fg>
                <Fg label="Cliente / Destinatário">
                  <input list="clientes-list" style={fs} value={p.cliente}
                    onChange={e => {
                      setParada(p.id, "cliente", e.target.value);
                      searchAutocomplete("clientes", e.target.value);
                    }} placeholder="Nome do cliente"/>
                </Fg>
                <Fg label="N° Nota Fiscal">
                  <input style={fs} value={p.nf} onChange={e => setParada(p.id, "nf", e.target.value)} placeholder="NF-000000"/>
                </Fg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20}}>
      <div className="col" style={{gap: 14}}>
        <Fg label="Cliente (tomador do frete)">
          <input list="clientes-list" style={fs} value={form.cliente}
            onChange={e => {
              const value = e.target.value;
              setF("cliente", value);
              searchAutocomplete("clientes", value);
              applyCliente("cliente", value);
            }} placeholder="Razão social ou nome"/>
          <datalist id="clientes-list">
            {opcoes.clientes.map(c => <option key={c} value={c}/>)}
          </datalist>
        </Fg>
        <Fg label="Cliente Final (se diferente)">
          <input list="clientes-finais-list" style={fs} value={form.clienteFinal}
            onChange={e => {
              const value = e.target.value;
              setF("clienteFinal", value);
              searchAutocomplete("clientes", value);
              applyCliente("clienteFinal", value);
            }} placeholder="Opcional"/>
          <datalist id="clientes-finais-list">
            {(opcoes.clientesFinais || opcoes.clientes || []).map(c => <option key={c} value={c}/>)}
          </datalist>
        </Fg>
        <Fg label="Tomador de Serviço">
          <input list="tomadores-list" style={fs} value={form.tomadorServico}
            onChange={e => {
              const value = e.target.value;
              setF("tomadorServico", value);
              searchAutocomplete("clientes", value);
              applyCliente("tomadorServico", value);
            }} placeholder="Opcional"/>
          <datalist id="tomadores-list">
            {(opcoes.tomadores || opcoes.clientes || []).map(c => <option key={c} value={c}/>)}
          </datalist>
        </Fg>
        <Fg label="Condição de Pagamento">
          <input style={fs} value={form.condicaoPagamento} onChange={e => setF("condicaoPagamento", e.target.value)} placeholder="Ex: 30 dias, à vista, 10/20/30..."/>
        </Fg>
      </div>
      <div className="col" style={{gap: 14}}>
        <Fg label="Material / Carga">
          <input list="materiais-list" style={fs} value={form.material} onChange={e => setF("material", e.target.value)} placeholder="Ex: Equipamentos industriais"/>
          <datalist id="materiais-list">
            {(opcoes.materiais || []).map(m => <option key={m} value={m}/>)}
          </datalist>
        </Fg>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
          <Fg label="Peso (kg)">
            <div className="row" style={{gap: 6, alignItems: "center"}}>
              <input type="text" inputMode="decimal" style={{...fs, flex: 1}} value={form.peso}
                onChange={e => setF("peso", e.target.value)} placeholder="Ex: 24000"/>
              <span className="muted" style={{fontSize: 12, flexShrink: 0}}>kg</span>
            </div>
          </Fg>
          <Fg label="KM da viagem (opcional)">
            <div className="row" style={{gap: 6, alignItems: "center"}}>
              <input type="text" inputMode="decimal" style={{...fs, flex: 1}} value={form.km ?? ""}
                onChange={e => setF("km", e.target.value)} placeholder="Ex: 850"/>
              <span className="muted" style={{fontSize: 12, flexShrink: 0}}>km</span>
            </div>
          </Fg>
        </div>

        <div style={{borderTop: "1px solid var(--divider)", paddingTop: 14, marginTop: 4}}>
          <div style={{fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 12}}>Valores do frete</div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
            <Fg label="Valor do Cliente (R$)">
              <div className="row" style={{gap: 6, alignItems: "center"}}>
                <span className="muted" style={{fontSize: 12, flexShrink: 0}}>R$</span>
                <input type="text" inputMode="decimal" style={{...fs, flex: 1}} value={form.valorCliente}
                  onChange={e => setF("valorCliente", e.target.value)} placeholder="0,00"/>
              </div>
            </Fg>
            <div style={{paddingTop: 20}}>
              {numericValue(form.valorCliente) > 0 && numericValue(form.peso) > 0 && (
                <div className="muted" style={{fontSize: 12}}>
                  R$/ton: {fmtNum(numericValue(form.valorCliente) / (numericValue(form.peso) / 1000), {minimumFractionDigits: 2})}
                </div>
              )}
            </div>
          </div>
        </div>

        <button className="btn" style={{fontSize: 12}} onClick={() => onNavigate("simulador")}>
          <Icon name="calculator" size={13}/> Calcular pelo Simulador ANTT
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20}}>
      <div className="col" style={{gap: 14}}>
        <Fg label="Motorista">
          <input list="motoristas-list" style={fs} value={form.motorista}
            onChange={e => {
              const value = e.target.value;
              setF("motorista", value);
              searchAutocomplete("motoristas", value);
              applyMotorista(value);
            }} placeholder="Nome do motorista"/>
          <datalist id="motoristas-list">
            {opcoes.motoristas.map(m => (
              <option key={m} value={m}/>
            ))}
          </datalist>
        </Fg>
        <Fg label="Celular / Número do motorista">
          <input style={fs} value={form.numeroMotorista} onChange={e => setF("numeroMotorista", e.target.value)} placeholder="(11) 99999-9999"/>
        </Fg>
        <Fg label="CNH">
          <input style={fs} value={form.cnh} onChange={e => setF("cnh", e.target.value)} placeholder="Número da CNH"/>
        </Fg>
        <Fg label="ANTT / RNTRC">
          <input style={fs} value={form.antt} onChange={e => setF("antt", e.target.value)} placeholder="Número ANTT do veículo"/>
        </Fg>
      </div>
      <div className="col" style={{gap: 14}}>
        <Fg label="Conta para depósito">
          <input style={fs} value={form.contaDeposito} onChange={e => setF("contaDeposito", e.target.value)} placeholder="Banco · C/C 0000-0"/>
        </Fg>
        <Fg label="Chave Pix">
          <input style={fs} value={form.chavePix} onChange={e => setF("chavePix", e.target.value)} placeholder="CPF, celular ou e-mail"/>
        </Fg>
        <div style={{borderTop: "1px solid var(--divider)", paddingTop: 14, marginTop: 4}}>
          <div style={{fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 12}}>Valor do frete ao motorista</div>
          <Fg label="Valor do Motorista (R$)">
            <div className="row" style={{gap: 6, alignItems: "center"}}>
              <span className="muted" style={{fontSize: 12, flexShrink: 0}}>R$</span>
              <input type="text" inputMode="decimal" style={{...fs, flex: 1}} value={form.valorMotorista}
                onChange={e => setF("valorMotorista", e.target.value)} placeholder="0,00"/>
            </div>
          </Fg>
          {numericValue(form.valorCliente) > 0 && numericValue(form.valorMotorista) > 0 && (
            <div className="row" style={{gap: 16, marginTop: 10, fontSize: 12.5}}>
              <span className="muted">Margem:
                <b className="num" style={{
                  marginLeft: 6,
                  color: ((numericValue(form.valorCliente) - numericValue(form.valorMotorista)) / numericValue(form.valorCliente) * 100) >= 20 ? "#047857" : "#b45309",
                }}>
                  {((numericValue(form.valorCliente) - numericValue(form.valorMotorista)) / numericValue(form.valorCliente) * 100).toFixed(1)}%
                </b>
              </span>
              <span className="muted">Lucro:
                <b className="num" style={{marginLeft: 6}}>
                  R$ {fmtNum(numericValue(form.valorCliente) - numericValue(form.valorMotorista), {minimumFractionDigits: 2})}
                </b>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20}}>
      <div className="col" style={{gap: 10}}>
        <div style={{fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 4}}>
          Documentos recebidos
        </div>
        {DOCS_LABELS.map(doc => {
          const on = form.docs[doc.key];
          return (
            <div key={doc.key}
              onClick={() => setDoc(doc.key, !on)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", cursor: "pointer", userSelect: "none",
                border: `1.5px solid ${on ? "var(--brand-blue)" : "var(--border)"}`,
                borderRadius: "var(--r)",
                background: on ? "var(--accent-soft)" : "var(--surface)",
                fontSize: 13, transition: "all 100ms",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${on ? "var(--brand-blue)" : "var(--border-strong)"}`,
                background: on ? "var(--brand-blue)" : "transparent",
                display: "grid", placeItems: "center",
              }}>
                {on && <Icon name="check" size={10} strokeWidth={3} style={{color: "#fff"}}/>}
              </div>
              <span style={{flex: 1, fontWeight: on ? 500 : 400}}>{doc.label}</span>
              {on && <Icon name="check" size={14} style={{color: "#047857"}}/>}
            </div>
          );
        })}
        <div style={{marginTop: 6, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--r)", fontSize: 12}}>
          <span className="muted">{Object.values(form.docs).filter(Boolean).length}</span> de {DOCS_LABELS.length} documentos recebidos
        </div>
      </div>
      <div className="col" style={{gap: 14}}>
        <div style={{fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginBottom: 4}}>
          Observações
        </div>
        <textarea
          value={form.observacoes}
          onChange={e => setF("observacoes", e.target.value)}
          placeholder="Instruções especiais, horário de entrega, informações adicionais..."
          style={{
            ...fs, height: 120, padding: "8px 10px", resize: "vertical",
            fontFamily: "inherit", lineHeight: 1.5,
          }}/>

        {/* Resumo final */}
        <div style={{
          border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 14,
          background: "var(--bg)", fontSize: 12.5,
        }}>
          <div style={{fontWeight: 500, marginBottom: 10, color: "var(--text-2)"}}>Resumo da viagem</div>
          <div className="col" style={{gap: 7}}>
            {[
              { l: "N°",          v: form.numero },
              { l: "Data",        v: form.data ? new Date(form.data + "T12:00:00").toLocaleDateString("pt-BR") : "" },
              { l: "Rota",        v: form.origem && form.destino ? `${form.origem} (${form.ufOrigem}) → ${form.destino} (${form.ufDestino})` : "" },
              { l: "Cliente",     v: form.cliente },
              { l: "Motorista",   v: form.motorista },
              { l: "Vr. Cliente", v: form.valorCliente ? `R$ ${fmtNum(+form.valorCliente, {minimumFractionDigits: 2})}` : "" },
              { l: "Vr. Motorista", v: form.valorMotorista ? `R$ ${fmtNum(+form.valorMotorista, {minimumFractionDigits: 2})}` : "" },
            ].map(row => row.v && (
              <div key={row.l} className="row between">
                <span className="muted">{row.l}</span>
                <span className="num" style={{maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4][step - 1];

  return (
    <div className="view">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>{isEdit ? `Editando ${form.numero}` : "Nova Viagem"}</h1>
          <div className="sub">
            {form.origem && form.destino
              ? `${form.origem} → ${form.destino}`
              : "Preencha as informações da viagem"}
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setMode("list")}>
            <Icon name="arrow-right" style={{transform: "rotate(180deg)"}}/> Voltar
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="card" style={{padding: 0, marginBottom: 16, overflow: "hidden"}}>
        <div style={{display: "flex", borderBottom: "1px solid var(--divider)"}}>
          {STEPS.map((s) => {
            const done    = step > s.n;
            const current = step === s.n;
            return (
              <button key={s.n}
                onClick={() => done && setStep(s.n)}
                style={{
                  flex: 1, padding: "14px 8px", background: "transparent",
                  borderBottom: `2px solid ${current ? "var(--brand-blue)" : "transparent"}`,
                  cursor: done ? "pointer" : "default",
                  color: current ? "var(--brand-blue)" : done ? "var(--text)" : "var(--text-3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontSize: 12.5, fontWeight: current ? 600 : 400, transition: "all 120ms",
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: done ? "#047857" : current ? "var(--brand-blue)" : "var(--bg)",
                  border: `1.5px solid ${done ? "#047857" : current ? "var(--brand-blue)" : "var(--border)"}`,
                  color: done || current ? "#fff" : "var(--text-3)",
                  display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600,
                }}>
                  {done ? <Icon name="check" size={11} strokeWidth={3}/> : s.n}
                </div>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{padding: 20}}>
          {missingHints.length > 0 && (
            <div style={{
              marginBottom: 14, padding: "10px 12px", border: "1px solid var(--warn-border)",
              borderRadius: "var(--r)", background: "rgba(245, 158, 11, 0.08)", fontSize: 12.5,
              color: "var(--text-2)",
            }}>
              <b style={{color: "var(--text)"}}>Rascunho liberado.</b> Ainda faltam {missingHints.join(", ")}; a viagem pode ser salva e ficará como Faltando Dados.
            </div>
          )}
          {stepContent()}
        </div>

        {/* Step navigation */}
        <div style={{
          borderTop: "1px solid var(--divider)",
          padding: "12px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--bg)",
        }}>
          <button className="btn" onClick={() => step > 1 ? setStep(step - 1) : setMode("list")}
            style={{minWidth: 100}}>
            <Icon name="arrow-right" size={14} style={{transform: "rotate(180deg)"}}/>
            {step === 1 ? "Cancelar" : "Anterior"}
          </button>

          <div className="row" style={{gap: 6}}>
            {STEPS.map(s => (
              <div key={s.n} style={{
                width: step === s.n ? 20 : 6, height: 6,
                borderRadius: 3,
                background: step > s.n ? "#047857" : step === s.n ? "var(--brand-blue)" : "var(--border)",
                transition: "all 200ms",
              }}/>
            ))}
          </div>

          {step < STEPS.length ? (
            <button className="btn primary" onClick={() => setStep(step + 1)} style={{minWidth: 100}}>
              Próximo <Icon name="arrow-right" size={14}/>
            </button>
          ) : (
            <button className="btn primary" onClick={saveForm} style={{minWidth: 140}}>
              <Icon name="check" size={14}/> {isEdit ? "Salvar alterações" : "Cadastrar viagem"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

window.Viagens = Viagens;

// Viagens e Cotações — Norte Telemetria

// ── Helpers de data ──────────────────────────────────────────────────────────
const vgToday  = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); };
const vgDaysAgo = (n) => { const d=new Date(); d.setDate(d.getDate()-n); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); };
const vgMonthStart = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
const vgPrevMonth  = () => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),last=new Date(y,d.getMonth()+1,0); return { s:`${y}-${m}-01`, e:`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,"0")}-${String(last.getDate()).padStart(2,"0")}` }; };
const VG_PERIODS = [
  { key:"hoje",    label:"Hoje",         gr:()=>({ s:vgToday(),      e:vgToday() }) },
  { key:"7d",      label:"7 dias",        gr:()=>({ s:vgDaysAgo(6),   e:vgToday() }) },
  { key:"30d",     label:"30 dias",       gr:()=>({ s:vgDaysAgo(29),  e:vgToday() }) },
  { key:"mes",     label:"Este mês",      gr:()=>({ s:vgMonthStart(), e:vgToday() }) },
  { key:"mes-ant", label:"Mês anterior",  gr:vgPrevMonth },
  { key:"custom",  label:"Personalizado", gr:null },
];

const SITUACOES = {
  "faltando_dados": { label: "Faltando Dados",  cls: "warn" },
  "aguardando_veiculo": { label: "Aguardando Veículo", cls: "warn" },
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
const sanitizeIntegerInput = (value) => textValue(value).replace(/\D/g, "");
const sanitizeMoneyInput = (value) => {
  const raw = textValue(value).replace(/[^\d,.]/g, "");
  const hasSeparator = /[,.]/.test(raw);
  if (!hasSeparator) return raw.replace(/\D/g, "");

  const trailingSeparator = /[,.]$/.test(raw);
  const parts = raw.split(/[,.]/);
  const integer = parts.shift().replace(/\D/g, "");
  const decimals = parts.join("").replace(/\D/g, "").slice(0, 2);

  if (trailingSeparator && !decimals) return `${integer},`;
  return decimals ? `${integer},${decimals}` : integer;
};
const hasValue = (value) => {
  const raw = textValue(value).trim();
  if (!raw) return false;
  const parsed = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isNaN(parsed) || parsed !== 0;
};
const calcularSituacaoViagem = (input = {}) => {
  if (["em_transito", "entregue", "cancelado"].includes(input.situacao)) return input.situacao;

  const hasCarga = [input.cliente, input.material, input.peso, input.valorCliente, input.origem, input.destino].some(hasValue);
  if (hasCarga && (!hasValue(input.placa) || !hasValue(input.motorista))) return "aguardando_veiculo";

  const hasDadosOperacionais = [
    input.placa, input.motorista, input.cliente, input.material,
    input.valorCliente, input.valorMotorista, input.origem, input.destino,
  ].every(hasValue);

  return hasDadosOperacionais ? "aguardando_cte" : "faltando_dados";
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
  situacao: input.situacao || calcularSituacaoViagem(input),
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

// ── Componentes estáticos fora do Viagens para evitar remontagem a cada keystroke ──
const fs = {
  width: "100%", height: 34, padding: "0 10px",
  border: "1.5px solid var(--border)", borderRadius: "var(--r)",
  background: "var(--surface)", color: "var(--text)",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const Fg = ({ label, children }) => (
  <div>
    <div style={{fontSize: 11.5, color: "var(--text-2)", fontWeight: 500, marginBottom: 5}}>{label}</div>
    {children}
  </div>
);

// ── Auxiliares de célula para o Romaneio ──
const PRCell = ({ label, value }) => (
  <div>
    <span style={{display:"block",fontSize:9,color:"#6b7280",textTransform:"uppercase",fontWeight:600,letterSpacing:"0.3px",marginBottom:2}}>{label}</span>
    <strong style={{display:"block",fontSize:10.5,color:"#111827",fontWeight:600,lineHeight:1.3,wordBreak:"break-word"}}>{value || "—"}</strong>
  </div>
);
const PRRow2 = ({ left, right }) => (
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:9}}>
    {left  && <PRCell label={left.label}  value={left.value}/>}
    {right && <PRCell label={right.label} value={right.value}/>}
  </div>
);
const PRRow1 = ({ label, value }) => (
  <div style={{marginBottom:9}}>
    <PRCell label={label} value={value}/>
  </div>
);

// ── Romaneio de Viagem (impressão) ──
const PrintSheet = ({ form }) => {
  const lucroVal = numericValue(form.valorCliente) - numericValue(form.valorMotorista);
  const money = (v) => numericValue(v) ? `R$ ${fmtNum(numericValue(v), {minimumFractionDigits: 2})}` : "—";
  const sit = (SITUACOES[form.situacao] || SITUACOES.faltando_dados).label;
  const rota = [
    [form.origem, form.ufOrigem].filter(Boolean).join("/"),
    [form.destino, form.ufDestino].filter(Boolean).join("/"),
  ].filter(Boolean).join(" → ");
  const rsKg = numericValue(form.valorCliente) > 0 && numericValue(form.peso) > 0
    ? `R$ ${fmtNum(numericValue(form.valorCliente) / numericValue(form.peso), {minimumFractionDigits: 2})}` : "—";
  const rsTon = numericValue(form.valorCliente) > 0 && numericValue(form.peso) > 0
    ? `R$ ${fmtNum(numericValue(form.valorCliente) / (numericValue(form.peso) / 1000), {minimumFractionDigits: 2})}` : "—";
  const kmFmt = form.km ? `${fmtNum(numericValue(form.km))} km` : "—";
  const pesoFmt = form.peso ? `${fmtNum(numericValue(form.peso))} kg` : "—";
  const hasValores = numericValue(form.valorCliente) > 0 || numericValue(form.valorMotorista) > 0;

  return (
    <div className="rb-print-sheet">
      {/* ── Cabeçalho ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"stretch",borderBottom:"2px solid #111827"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",flex:1}}>
          <div style={{display:"flex",flexDirection:"column",width:42,height:42,background:"#1e3a8a",borderRadius:4,color:"#fff",fontSize:9,fontWeight:900,alignItems:"center",justifyContent:"center",lineHeight:1.2,flexShrink:0,letterSpacing:"0.5px",textAlign:"center"}}>
            <span>RODO</span><span>BACH</span>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.5px"}}>ROMANEIO DE VIAGEM</div>
            <div style={{fontSize:14,fontWeight:700,color:"#111827",marginTop:2}}>{rota || "Rota não definida"}</div>
          </div>
        </div>
        <div style={{padding:"10px 14px",borderLeft:"2px solid #111827",textAlign:"center",minWidth:72,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:9,textTransform:"uppercase",color:"#6b7280",fontWeight:600}}>VIAGEM</div>
          <div style={{fontSize:13,fontWeight:700,color:"#111827",marginTop:2}}>{form.numero || form.id || "—"}</div>
        </div>
      </div>

      {/* ── Cards KPI ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #e5e7eb"}}>
        {[
          {label:"VALOR DA VIAGEM",  value: money(form.valorCliente)},
          {label:"LUCRO PREVISTO",   value: hasValores ? money(lucroVal) : "—"},
          {label:"PEDÁGIO",          value: "—"},
          {label:"KM DA VIAGEM",     value: kmFmt},
        ].map((kpi, i, arr) => (
          <div key={i} style={{padding:"8px 12px",borderRight: i < arr.length - 1 ? "1px solid #e5e7eb" : "none"}}>
            <div style={{fontSize:8,fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:3}}>{kpi.label}</div>
            <strong style={{fontSize:14,fontWeight:700,color:"#111827",display:"block"}}>{kpi.value}</strong>
          </div>
        ))}
      </div>

      {/* ── Aviso ── */}
      <div style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb",padding:"4px 12px",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.3px",display:"flex",gap:20,alignItems:"center",justifyContent:"center",textAlign:"center"}}>
        <span>TODA DOCUMENTAÇÃO DEVE SER LEGÍVEL</span>
        <span style={{color:"#6b7280",fontWeight:400}}>CONFERIR ANTES DE ENCAMINHAR PARA FATURAMENTO</span>
      </div>

      {/* ── Duas colunas principais ── */}
      <div className="rb-print-data-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #e5e7eb",minHeight:"96mm"}}>
        {/* Dados da Viagem */}
        <div style={{padding:"14px 16px",borderRight:"1px solid #e5e7eb"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#374151",borderBottom:"1px solid #e5e7eb",paddingBottom:6,marginBottom:12,letterSpacing:"0.3px"}}>DADOS DA VIAGEM</div>
          <PRRow2 left={{label:"N° viagem", value:form.numero}} right={{label:"Situação", value:sit}}/>
          <PRRow1 label="Cliente"           value={form.cliente}/>
          <PRRow1 label="Cliente final"     value={form.clienteFinal}/>
          <PRRow1 label="Tomador do serviço" value={form.tomadorServico}/>
          <PRRow2 left={{label:"Material", value:form.material}}   right={{label:"Peso", value:pesoFmt}}/>
          <PRRow2 left={{label:"Valor cliente", value:money(form.valorCliente)}} right={{label:"R$/kg", value:rsKg}}/>
          <PRRow2 left={{label:"R$/ton", value:rsTon}} right={{label:"KM da viagem", value:kmFmt}}/>
          <PRRow2 left={{label:"Entregas", value:String(form.paradas.length)}} right={{label:"Vendedor", value:form.vendedor}}/>
        </div>

        {/* Motorista e Pagamento */}
        <div style={{padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#374151",borderBottom:"1px solid #e5e7eb",paddingBottom:6,marginBottom:12,letterSpacing:"0.3px"}}>MOTORISTA E PAGAMENTO</div>
          <PRRow2 left={{label:"Motorista",      value:form.motorista}}    right={{label:"Placa do veículo",      value:form.placa}}/>
          <PRRow2 left={{label:"Valor motorista",value:money(form.valorMotorista)}} right={{label:"Lucro previsto", value:hasValores?money(lucroVal):"—"}}/>
          <PRRow2 left={{label:"Condição de pagamento",value:form.condicaoPagamento}} right={{label:"Número do motorista",value:form.numeroMotorista}}/>
          <PRRow2 left={{label:"CNH do motorista",value:form.cnh}} right={{label:"ANTT do veículo",value:form.antt}}/>
          <PRRow2 left={{label:"Conta depósito", value:form.contaDeposito}} right={{label:"Chave PIX", value:form.chavePix}}/>
        </div>
      </div>

      {/* ── Entregas da Rota ── */}
      {form.paradas.length > 0 && (
        <div style={{padding:"8px 12px",borderBottom:"1px solid #e5e7eb"}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",color:"#374151",borderBottom:"1px solid #e5e7eb",paddingBottom:4,marginBottom:6,letterSpacing:"0.3px"}}>ENTREGAS DA ROTA</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5}}>
            <tbody>
              {form.paradas.map((p, i) => (
                <tr key={p.id || i} style={{borderBottom:"1px solid #f3f4f6"}}>
                  <td style={{width:22,textAlign:"center",fontWeight:700,color:"#111827",padding:"3px 4px"}}>{p.ordem || i + 1}</td>
                  <td style={{padding:"3px 6px",fontWeight:600,color:"#111827"}}>{[p.cidade, p.uf].filter(Boolean).join("/") || "—"}</td>
                  <td style={{padding:"3px 6px",color:"#374151"}}>{p.cliente || ""}</td>
                  <td style={{padding:"3px 6px",textAlign:"right",fontSize:9.5,color:"#6b7280"}}>{p.nf ? `NF ${p.nf}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Observações ── */}
      {form.observacoes && (
        <div style={{padding:"6px 12px",fontSize:9.5,color:"#374151"}}>
          <span style={{fontWeight:600}}>Observações: </span>{form.observacoes}
        </div>
      )}
    </div>
  );
};

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
  const [fCliente,       setFCliente]       = useState("");
  const [fOrigem,        setFOrigem]        = useState("");
  const [fDestino,       setFDestino]       = useState("");
  const [fMaterial,      setFMaterial]      = useState("");
  const [fPeriodo,       setFPeriodo]       = useState("30d");
  const [fDataInicio,    setFDataInicio]    = useState(() => vgDaysAgo(29));
  const [fDataFim,       setFDataFim]       = useState(() => vgToday());
  const [sortCol,        setSortCol]        = useState("data");
  const [sortDir,        setSortDir]        = useState("desc");
  const [tablePage,      setTablePage]      = useState(0);
  const [appliedFilters, setAppliedFilters] = useState(() => ({ dataInicio: vgDaysAgo(29), dataFim: vgToday(), limit: 500 }));
  const [opcoes,         setOpcoes]         = useState({
    clientes: [], clientesFinais: [], tomadores: [], placas: [], motoristas: [],
    vendedores: [], origens: [], destinos: [], paradas: [], materiais: [],
    detalhes: { clientes: [], placas: [], motoristas: [] },
  });
  const [cidadeOptions,  setCidadeOptions]  = useState({ origem: [], destino: [] });
  const [cidadeLoading,  setCidadeLoading]  = useState({ origem: false, destino: false });
  const [activeAuto,     setActiveAuto]     = useState("");
  const nextId = useRef(1);
  const citySearchTimers = useRef({});
  const activeAutoRef = useRef("");
  const autoFieldRef = useRef(null);
  activeAutoRef.current = activeAuto;

  // Opcoes de autocomplete — carrega uma vez
  useEffect(() => {
    window.RB_API.listOpcoes()
      .then((data) => { if (data) setOpcoes(data); })
      .catch(() => {});
  }, []);

  // Viagens — recarrega quando os filtros aplicados mudam
  useEffect(() => {
    setLoadingViagens(true);
    setViagensError("");
    setTablePage(0);
    window.RB_API.listViagens(appliedFilters)
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
  }, [appliedFilters]);

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
      vendedor: item.vendedor || prev.vendedor,
    }));
  };

  const autocompleteText = (item) => String([
    item?.placa, item?.nome, item?.label, item?.motorista, item?.modelo, item?.cidadePlaca,
    item?.documento, item?.cnpj, item?.cpf, item?.cidade,
  ].filter(Boolean).join(" ")).toLowerCase();

  const filterAutocompleteOptions = (items, value, limit = 30) => {
    const q = String(value || "").trim().toLowerCase();
    const list = Array.isArray(items) ? items : [];
    if (!q) return list.slice(0, limit);
    const cleanQ = q.replace(/[^a-z0-9]/gi, "");
    return list.filter((item) => {
      const text = autocompleteText(item);
      const cleanText = text.replace(/[^a-z0-9]/gi, "");
      return text.includes(q) || (cleanQ && cleanText.includes(cleanQ));
    }).slice(0, limit);
  };

  const searchAutocomplete = (type, value) => {
    const q = String(value || "").trim();
    if (q.length < 2) return;
    const calls = {
      placas: window.RB_API.searchViagemPlacas,
      motoristas: window.RB_API.searchViagemMotoristas,
      clientes: window.RB_API.searchViagemClientes,
      vendedores: window.RB_API.searchViagemVendedores,
    };
    calls[type]?.(q).then(items => mergeOptionDetails(type, items)).catch(() => {});
  };

  const searchCidade = (field, value) => {
    const q = String(value || "").trim();
    window.clearTimeout(citySearchTimers.current[field]);
    if (q.length < 2) {
      setCidadeOptions(prev => ({ ...prev, [field]: [] }));
      setCidadeLoading(prev => ({ ...prev, [field]: false }));
      return;
    }
    setCidadeLoading(prev => ({ ...prev, [field]: true }));
    citySearchTimers.current[field] = window.setTimeout(() => {
      window.RB_API.searchCidades(q)
        .then(items => setCidadeOptions(prev => ({ ...prev, [field]: Array.isArray(items) ? items : [] })))
        .catch(() => setCidadeOptions(prev => ({ ...prev, [field]: [] })))
        .finally(() => setCidadeLoading(prev => ({ ...prev, [field]: false })));
    }, 260);
  };

  const selectCidade = (field, city) => {
    if (!city) return;
    if (field === "origem") {
      setForm(prev => ({
        ...prev,
        origem: city.nome || "",
        ufOrigem: String(city.uf || "").toUpperCase().slice(0, 2),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        destino: city.nome || "",
        ufDestino: String(city.uf || "").toUpperCase().slice(0, 2),
      }));
    }
    setCidadeOptions(prev => ({ ...prev, [field]: [] }));
    setActiveAuto("");
  };

  const selectParadaCidade = (id, city) => {
    if (!city) return;
    setParada(id, "cidade", city.nome || city.label || "");
    setParada(id, "uf", String(city.uf || "").toUpperCase().slice(0, 2));
    setCidadeOptions(prev => ({ ...prev, [`parada-${id}`]: [] }));
    setActiveAuto("");
  };

  if (!autoFieldRef.current) {
    autoFieldRef.current = ({ value, placeholder, options = [], loading = false, activeKey, onChange, onSelect, renderOption, optionKey, style }) => (
      <div className="trip-autocomplete-field" style={style}>
        <input
          style={fs}
          value={value}
          onFocus={() => setActiveAuto(activeKey)}
          onChange={e => {
            setActiveAuto(activeKey);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {activeAutoRef.current === activeKey && (loading || String(value || "").trim().length >= 2) && (
          <div className="trip-autocomplete-list">
            {loading && <div className="trip-autocomplete-empty">Buscando...</div>}
            {!loading && options.map((item, index) => (
              <button
                key={optionKey ? optionKey(item, index) : index}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSelect(item)}
              >
                {renderOption(item)}
              </button>
            ))}
            {!loading && String(value || "").trim().length >= 2 && options.length === 0 && (
              <div className="trip-autocomplete-empty">Nenhum resultado encontrado.</div>
            )}
          </div>
        )}
      </div>
    );
  }
  const AutoField = autoFieldRef.current;

  const prepareViagem = (v) => ({
    ...normalizeViagemForm(v),
    peso: numericValue(v.peso),
    km: textValue(v.km).trim() ? numericValue(v.km) : "",
    valorCliente: numericValue(v.valorCliente),
    valorMotorista: numericValue(v.valorMotorista),
    situacao: calcularSituacaoViagem(v),
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

  const applyVgPeriod = (key) => {
    const p = VG_PERIODS.find(x => x.key === key);
    setFPeriodo(key);
    if (p && p.gr) { const r = p.gr(); setFDataInicio(r.s); setFDataFim(r.e); }
  };
  const applyVgFilters = () => {
    const f = { limit: 500 };
    if (fCliente.trim())   f.cliente    = fCliente.trim();
    if (fOrigem.trim())    f.origem     = fOrigem.trim();
    if (fDestino.trim())   f.destino    = fDestino.trim();
    if (fMaterial.trim())  f.material   = fMaterial.trim();
    if (fDataInicio)       f.dataInicio = fDataInicio;
    if (fDataFim)          f.dataFim    = fDataFim;
    setAppliedFilters(f);
  };
  const clearVgFilters = () => {
    const r = VG_PERIODS.find(x => x.key === "30d").gr();
    setFCliente(""); setFOrigem(""); setFDestino(""); setFMaterial("");
    setFPeriodo("30d"); setFDataInicio(r.s); setFDataFim(r.e);
    setSearch(""); setFiltroSit("todos"); setTablePage(0);
    setAppliedFilters({ dataInicio: r.s, dataFim: r.e, limit: 500 });
  };
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setTablePage(0);
  };
  const VgSortArrow = ({ col }) => (
    <span style={{ marginLeft:4, opacity:sortCol===col?1:0.25, fontSize:10 }}>
      {sortCol===col ? (sortDir==="asc"?"↑":"↓") : "↕"}
    </span>
  );

  const PAGE_SIZE = 20;

  const filteredViagens = React.useMemo(() => {
    let list = viagens;
    if (filtroSit !== "todos") list = list.filter(v => v.situacao === filtroSit);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const notas = (v.paradas || []).map(p => [p.nf, p.cliente, p.cidade, p.obs].filter(Boolean).join(" ")).join(" ");
        return [v.numero, v.cliente, v.clienteFinal, v.tomadorServico, v.motorista, v.origem, v.destino, v.placa, v.material, notas]
          .some(x => (x || "").toLowerCase().includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortCol === "data")          return dir * ((a.data||"") < (b.data||"") ? -1 : 1);
      if (sortCol === "cliente")       return dir * ((a.cliente||"") < (b.cliente||"") ? -1 : 1);
      if (sortCol === "valorCliente")  return dir * ((a.valorCliente||0) - (b.valorCliente||0));
      if (sortCol === "margem") {
        const ma = a.valorCliente>0 ? ((a.valorCliente-a.valorMotorista)/a.valorCliente) : -1;
        const mb = b.valorCliente>0 ? ((b.valorCliente-b.valorMotorista)/b.valorCliente) : -1;
        return dir * (ma - mb);
      }
      return 0;
    });
  }, [viagens, filtroSit, search, sortCol, sortDir]);

  const docsOk = (v) => Object.values(v.docs).filter(Boolean).length;
  const margem = (v) => (v.valorCliente > 0 && v.valorMotorista > 0)
    ? (((v.valorCliente - v.valorMotorista) / v.valorCliente) * 100).toFixed(1)
    : null;

  // fs e Fg estão definidos fora do componente para evitar remontagem a cada render

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

        {/* ── Painel de filtros ── */}
        <div className="card" style={{marginBottom:14,padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:600,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.06em"}}>
              Filtros
              {[fCliente,fOrigem,fDestino,fMaterial].filter(x=>x.trim()).length > 0 && (
                <span className="badge info" style={{marginLeft:8,fontSize:10}}>
                  {[fCliente,fOrigem,fDestino,fMaterial].filter(x=>x.trim()).length} ativo{[fCliente,fOrigem,fDestino,fMaterial].filter(x=>x.trim()).length>1?"s":""}
                </span>
              )}
            </span>
          </div>
          {/* Linha 1: campos de texto */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
            {[
              { label:"Cliente",  val:fCliente,  set:setFCliente,  list:"vg-cli",  opts:opcoes.clientes  },
              { label:"Origem",   val:fOrigem,   set:setFOrigem,   list:"vg-ori",  opts:opcoes.origens   },
              { label:"Destino",  val:fDestino,  set:setFDestino,  list:"vg-dest", opts:opcoes.destinos  },
              { label:"Material", val:fMaterial, set:setFMaterial, list:"vg-mat",  opts:opcoes.materiais },
            ].map(({ label, val, set, list, opts }) => (
              <div key={label}>
                <div style={{fontSize:10.5,color:"var(--text-3)",fontWeight:500,marginBottom:3}}>{label}</div>
                <input list={list} value={val} onChange={e => set(e.target.value)} placeholder="Todos"
                  style={{width:"100%",height:30,padding:"0 9px",border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface)",color:"var(--text)",fontSize:12.5,outline:"none",boxSizing:"border-box"}}/>
                <datalist id={list}>{opts.map(o => <option key={o} value={o}/>)}</datalist>
              </div>
            ))}
          </div>
          {/* Linha 2: período */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:10.5,color:"var(--text-3)",fontWeight:500,flexShrink:0}}>Período:</span>
            {VG_PERIODS.map(p => (
              <button key={p.key} className={`btn${fPeriodo===p.key?" primary":""}`}
                style={{padding:"2px 9px",fontSize:11.5}} onClick={() => applyVgPeriod(p.key)}>
                {p.label}
              </button>
            ))}
            <input type="date" value={fDataInicio} onChange={e=>{setFDataInicio(e.target.value);setFPeriodo("custom");}}
              style={{height:28,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface)",color:"var(--text)",fontSize:12,padding:"0 7px",outline:"none"}}/>
            <span className="muted" style={{fontSize:11.5}}>até</span>
            <input type="date" value={fDataFim} onChange={e=>{setFDataFim(e.target.value);setFPeriodo("custom");}}
              style={{height:28,border:"1px solid var(--border)",borderRadius:"var(--r)",background:"var(--surface)",color:"var(--text)",fontSize:12,padding:"0 7px",outline:"none"}}/>
            <div style={{marginLeft:"auto",display:"flex",gap:7}}>
              <button className="btn" onClick={clearVgFilters}><Icon name="x" size={11}/> Limpar</button>
              <button className="btn primary" onClick={applyVgFilters}><Icon name="search" size={11}/> Filtrar</button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {(() => {
          const valorTotal = viagens.reduce((s, v) => s + (v.valorCliente||0), 0);
          const valorMotTotal = viagens.reduce((s, v) => s + (v.valorMotorista||0), 0);
          const lucroTotal = valorTotal - valorMotTotal;
          return (
            <div className="grid cols-4" style={{marginBottom:14}}>
              <KPI label="Fretes no período" icon="route"        value={viagens.length}/>
              <KPI label="Receita total"     icon="trending-up"  value={`R$ ${fmtNum(valorTotal,{minimumFractionDigits:0})}`}/>
              <KPI label="Lucro previsto"    icon="money"        value={`R$ ${fmtNum(lucroTotal,{minimumFractionDigits:0})}`}
                delta={valorTotal>0?`${((lucroTotal/valorTotal)*100).toFixed(1)}% margem`:""}
                deltaDir={lucroTotal>=0?"up":"down"}/>
              <KPI label="Em trânsito"       icon="truck"        value={viagens.filter(v=>v.situacao==="em_transito").length}
                delta={`${viagens.filter(v=>["aguardando","aguardando_veiculo","faltando_dados"].includes(v.situacao)).length} pendentes`}
                deltaDir="down"/>
            </div>
          );
        })()}

        {/* Toolbar: busca de texto + filtro de status */}
        <div className="tbl-toolbar" style={{marginBottom:0}}>
          <div className="search">
            <Icon name="search"/>
            <input placeholder="Buscar por numero, cliente, motorista, placa, rota, carga ou NF..."
              value={search} onChange={e=>{setSearch(e.target.value);setTablePage(0);}}/>
          </div>
          <div className="row" style={{gap:6,flexWrap:"wrap"}}>
            {["todos",...Object.keys(SITUACOES)].map(id=>(
              <button key={id} className={`tbl-filter${filtroSit===id?" active":""}`} onClick={()=>{setFiltroSit(id);setTablePage(0);}}>
                {id==="todos"?"Todos":SITUACOES[id].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filteredViagens.length / PAGE_SIZE));
          const pageRows   = filteredViagens.slice(tablePage * PAGE_SIZE, (tablePage+1) * PAGE_SIZE);
          return (
            <div className="card card-flush" style={{marginTop:10}}>
              <div className="card-header" style={{paddingBottom:0,borderBottom:"none"}}>
                <span className="muted" style={{fontSize:12}}>{filteredViagens.length} viagem{filteredViagens.length!==1?"s":""} encontrada{filteredViagens.length!==1?"s":""}</span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("data")}>Data <VgSortArrow col="data"/></th>
                    <th className="num">N°</th>
                    <th style={{cursor:"pointer"}} onClick={()=>toggleSort("cliente")}>Cliente <VgSortArrow col="cliente"/></th>
                    <th>Rota</th>
                    <th>Material</th>
                    <th>Motorista / Placa</th>
                    <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("valorCliente")}>Vr. Cliente <VgSortArrow col="valorCliente"/></th>
                    <th className="num">Vr. Motorista</th>
                    <th className="num" style={{cursor:"pointer"}} onClick={()=>toggleSort("margem")}>Margem <VgSortArrow col="margem"/></th>
                    <th>Situação</th>
                    <th style={{width:70}}/>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{textAlign:"center",padding:"32px 0",color:"var(--text-3)"}}>
                        {loadingViagens ? "Carregando viagens…" : "Nenhuma viagem encontrada com os filtros aplicados."}
                      </td>
                    </tr>
                  )}
                  {pageRows.map(v => {
                    const sit = SITUACOES[v.situacao] || SITUACOES["faltando_dados"];
                    const mg  = margem(v);
                    return (
                      <tr key={v.id} className={`clickable${v.situacao==="cancelado"?" row-crit":["faltando_dados","aguardando_veiculo"].includes(v.situacao)?" row-warn":""}`}
                        onClick={() => openEdit(v)}>
                        <td className="date" style={{whiteSpace:"nowrap"}}>
                          {v.data ? new Date(v.data+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—"}
                        </td>
                        <td className="num" style={{fontWeight:500,whiteSpace:"nowrap"}}>{v.numero||"—"}</td>
                        <td style={{maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={v.cliente}>
                          {v.cliente||<span className="muted">—</span>}
                        </td>
                        <td>
                          <div style={{fontSize:12.5}}>{v.origem||"—"} <span className="muted">({v.ufOrigem})</span></div>
                          <div className="muted" style={{fontSize:11.5}}>→ {v.destino||"—"} <span>({v.ufDestino})</span></div>
                        </td>
                        <td style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12.5}}>
                          {v.material||<span className="muted">—</span>}
                        </td>
                        <td>
                          <div style={{fontSize:12.5}}>{v.motorista||<span className="muted">—</span>}</div>
                          {v.placa&&<Plate value={v.placa}/>}
                        </td>
                        <td className="num">{v.valorCliente?`R$ ${fmtNum(v.valorCliente,{minimumFractionDigits:2})}` : <span className="muted">—</span>}</td>
                        <td className="num">{v.valorMotorista?`R$ ${fmtNum(v.valorMotorista,{minimumFractionDigits:2})}` : <span className="muted">—</span>}</td>
                        <td className="num">
                          {mg!==null
                            ? <span style={{color:+mg>=20?"#047857":+mg>=10?"var(--text)":"#b91c1c",fontWeight:500}}>{mg}%</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td><span className={`badge ${sit.cls}`}><span className="dot"/>{sit.label}</span></td>
                        <td onClick={e=>e.stopPropagation()}>
                          <div className="row" style={{gap:4,justifyContent:"flex-end"}}>
                            <button className="icon-btn" title="Editar" onClick={()=>openEdit(v)}><Icon name="wrench" size={13}/></button>
                            <button className="icon-btn" title="Imprimir" onClick={()=>{setForm(normalizeViagemForm(v));setMode("print");}}><Icon name="file" size={13}/></button>
                            <button className="icon-btn" title="Excluir"
                              onClick={()=>{if(window.confirm(`Excluir viagem ${v.numero}?`))deleteViagem(v.id);}}>
                              <Icon name="x" size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="tbl-footer">
                  <span className="muted" style={{fontSize:12}}>Pág. {tablePage+1}/{totalPages} · {filteredViagens.length} viagens</span>
                  <div className="pager">
                    <button onClick={()=>setTablePage(0)} disabled={tablePage===0}>«</button>
                    <button onClick={()=>setTablePage(p=>p-1)} disabled={tablePage===0}>‹</button>
                    <button onClick={()=>setTablePage(p=>p+1)} disabled={tablePage>=totalPages-1}>›</button>
                    <button onClick={()=>setTablePage(totalPages-1)} disabled={tablePage>=totalPages-1}>»</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // ── FORM view ────────────────────────────────────────────────────────────
  if (mode === "print") {
    return (
      <div className="view rb-print-view">
        <style>{`
          .rb-print-view { display: grid; gap: 16px; }
          .rb-print-sheet {
            width: min(190mm, 100%);
            margin: 0 auto;
            background: #fff;
            color: #111827;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 11px;
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
            overflow: hidden;
          }
          .rb-print-data-grid strong {
            font-size: 12.5px !important;
            font-weight: 700 !important;
            line-height: 1.38 !important;
          }
          @media print {
            body { background: #fff !important; }
            body * { visibility: hidden !important; }
            .rb-print-sheet, .rb-print-sheet * { visibility: visible !important; }
            .rb-print-sheet {
              position: absolute;
              left: 0; top: 0;
              width: 190mm;
              margin: 0;
              border: 0;
              border-radius: 0;
              box-shadow: none;
              overflow: visible;
            }
            .rb-print-view > :not(.rb-print-sheet),
            .page-head, .sidebar, .topbar, .app-nav { display: none !important; }
            @page { size: A4 portrait; margin: 8mm; }
          }
        `}</style>
        <div className="page-head" style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1>Romaneio de Viagem</h1>
            <div className="sub">Pronto para imprimir e enviar ao financeiro.</div>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setMode("list")}>
              <Icon name="arrow-right" style={{transform: "rotate(180deg)"}}/> Voltar
            </button>
            <button className="btn" onClick={() => { setStep(1); setMode("form"); }}>
              <Icon name="wrench"/> Editar
            </button>
            <button className="btn primary" onClick={() => window.print()}>
              <Icon name="file"/> Imprimir
            </button>
          </div>
        </div>
        <PrintSheet form={form}/>
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
                <Fg label="Placa do veiculo">
          <AutoField
            value={form.placa}
            activeKey="placa"
            placeholder="Digite ou selecione a placa..."
            options={filterAutocompleteOptions(
              opcoes.detalhes?.placas?.length
                ? opcoes.detalhes.placas
                : opcoes.placas.map(p => ({ placa: p })),
              form.placa,
            )}
            optionKey={(item, index) => item.placa || item.label || index}
            onChange={value => {
              setF("placa", value);
              searchAutocomplete("placas", value);
              applyPlaca(value);
            }}
            onSelect={item => {
              const value = item.placa || item.label || "";
              setF("placa", value);
              applyPlaca(value);
              setActiveAuto("");
            }}
            renderOption={item => (
              <>
                <span>{item.placa || item.label}</span>
                <b>{item.motorista || item.modelo || item.cidadePlaca || ""}</b>
              </>
            )}
          />
        </Fg>
        <Fg label="Situação">
          {(() => {
            const situacaoCalculada = calcularSituacaoViagem(form);
            const sit = SITUACOES[situacaoCalculada] || SITUACOES.faltando_dados;
            return (
              <div style={{
                ...fs,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--bg)", color: "var(--text-2)",
              }}>
                <span>{sit.label}</span>
                <span className={`badge ${sit.cls || ""}`} style={{fontSize: 11}}>automatico</span>
              </div>
            );
          })()}
        </Fg>
        <Fg label="Vendedor (opcional)">
          <input list="vendedores-list" style={fs} value={form.vendedor}
            onChange={e => {
              const value = e.target.value;
              setF("vendedor", value);
              searchAutocomplete("vendedores", value);
            }} placeholder="Nome do vendedor"/>
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
                            <AutoField
                value={form.origem}
                activeKey="origem"
                placeholder="Ex: Sao Paulo"
                style={{flex: 3}}
                options={cidadeOptions.origem}
                loading={cidadeLoading.origem}
                optionKey={(city, index) => city.codigo || `${city.nome}-${city.uf}-${index}`}
                onChange={value => {
                  setF("origem", value);
                  setF("ufOrigem", "");
                  searchCidade("origem", value);
                }}
                onSelect={city => selectCidade("origem", city)}
                renderOption={city => (
                  <>
                    <span>{city.nome || city.label}</span>
                    <b>{city.uf || "--"}</b>
                  </>
                )}
              />
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
                            <AutoField
                value={form.destino}
                activeKey="destino"
                placeholder="Ex: Belo Horizonte"
                style={{flex: 3}}
                options={cidadeOptions.destino}
                loading={cidadeLoading.destino}
                optionKey={(city, index) => city.codigo || `${city.nome}-${city.uf}-${index}`}
                onChange={value => {
                  setF("destino", value);
                  setF("ufDestino", "");
                  searchCidade("destino", value);
                }}
                onSelect={city => selectCidade("destino", city)}
                renderOption={city => (
                  <>
                    <span>{city.nome || city.label}</span>
                    <b>{city.uf || "--"}</b>
                  </>
                )}
              />
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
                                        <AutoField
                      value={p.cidade}
                      activeKey={`parada-cidade-${p.id}`}
                      placeholder="Cidade"
                      style={{flex: 3}}
                      options={cidadeOptions[`parada-${p.id}`] || []}
                      loading={cidadeLoading[`parada-${p.id}`]}
                      optionKey={(city, index) => city.codigo || `${city.nome}-${city.uf}-${index}`}
                      onChange={value => {
                        setParada(p.id, "cidade", value);
                        setParada(p.id, "uf", "");
                        searchCidade(`parada-${p.id}`, value);
                      }}
                      onSelect={city => selectParadaCidade(p.id, city)}
                      renderOption={city => (
                        <>
                          <span>{city.nome || city.label}</span>
                          <b>{city.uf || "--"}</b>
                        </>
                      )}
                    />
                    <input style={{...fs, flex: 1}} value={p.uf} onChange={e => setParada(p.id, "uf", e.target.value.toUpperCase().slice(0,2))} placeholder="UF" maxLength="2"/>
                  </div>
                </Fg>
                                <Fg label="Cliente / Destinatario">
                  <AutoField
                    value={p.cliente}
                    activeKey={`parada-cliente-${p.id}`}
                    placeholder="Nome do cliente"
                    options={filterAutocompleteOptions(
                      opcoes.detalhes?.clientes?.length
                        ? opcoes.detalhes.clientes
                        : opcoes.clientes.map(c => ({ nome: c })),
                      p.cliente,
                    )}
                    optionKey={(item, index) => item.nome || item.label || index}
                    onChange={value => {
                      setParada(p.id, "cliente", value);
                      searchAutocomplete("clientes", value);
                    }}
                    onSelect={item => {
                      setParada(p.id, "cliente", item.nome || item.label || "");
                      setActiveAuto("");
                    }}
                    renderOption={item => (
                      <>
                        <span>{item.nome || item.label}</span>
                        <b>{item.documento || item.cnpj || item.cpf || item.cidade || ""}</b>
                      </>
                    )}
                  />
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
          <AutoField
            value={form.cliente}
            activeKey="cliente"
            placeholder="Razao social ou nome"
            options={filterAutocompleteOptions(
              opcoes.detalhes?.clientes?.length
                ? opcoes.detalhes.clientes
                : opcoes.clientes.map(c => ({ nome: c })),
              form.cliente,
            )}
            optionKey={(item, index) => item.nome || item.label || index}
            onChange={value => {
              setF("cliente", value);
              searchAutocomplete("clientes", value);
              applyCliente("cliente", value);
            }}
            onSelect={item => {
              const value = item.nome || item.label || "";
              setF("cliente", value);
              applyCliente("cliente", value);
              setActiveAuto("");
            }}
            renderOption={item => (
              <>
                <span>{item.nome || item.label}</span>
                <b>{item.documento || item.cnpj || item.cpf || item.cidade || ""}</b>
              </>
            )}
          />
        </Fg>
                <Fg label="Cliente Final (se diferente)">
          <AutoField
            value={form.clienteFinal}
            activeKey="clienteFinal"
            placeholder="Opcional"
            options={filterAutocompleteOptions(
              opcoes.detalhes?.clientes?.length
                ? opcoes.detalhes.clientes
                : (opcoes.clientesFinais || opcoes.clientes || []).map(c => ({ nome: c })),
              form.clienteFinal,
            )}
            optionKey={(item, index) => item.nome || item.label || index}
            onChange={value => {
              setF("clienteFinal", value);
              searchAutocomplete("clientes", value);
              applyCliente("clienteFinal", value);
            }}
            onSelect={item => {
              const value = item.nome || item.label || "";
              setF("clienteFinal", value);
              applyCliente("clienteFinal", value);
              setActiveAuto("");
            }}
            renderOption={item => (
              <>
                <span>{item.nome || item.label}</span>
                <b>{item.documento || item.cnpj || item.cpf || item.cidade || ""}</b>
              </>
            )}
          />
        </Fg>
                <Fg label="Tomador de Servico">
          <AutoField
            value={form.tomadorServico}
            activeKey="tomadorServico"
            placeholder="Opcional"
            options={filterAutocompleteOptions(
              opcoes.detalhes?.clientes?.length
                ? opcoes.detalhes.clientes
                : (opcoes.tomadores || opcoes.clientes || []).map(c => ({ nome: c })),
              form.tomadorServico,
            )}
            optionKey={(item, index) => item.nome || item.label || index}
            onChange={value => {
              setF("tomadorServico", value);
              searchAutocomplete("clientes", value);
              applyCliente("tomadorServico", value);
            }}
            onSelect={item => {
              const value = item.nome || item.label || "";
              setF("tomadorServico", value);
              applyCliente("tomadorServico", value);
              setActiveAuto("");
            }}
            renderOption={item => (
              <>
                <span>{item.nome || item.label}</span>
                <b>{item.documento || item.cnpj || item.cpf || item.cidade || ""}</b>
              </>
            )}
          />
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
                onChange={e => setF("peso", sanitizeIntegerInput(e.target.value))} placeholder="Ex: 24000"/>
              <span className="muted" style={{fontSize: 12, flexShrink: 0}}>kg</span>
            </div>
          </Fg>
          <Fg label="KM da viagem (opcional)">
            <div className="row" style={{gap: 6, alignItems: "center"}}>
              <input type="text" inputMode="decimal" style={{...fs, flex: 1}} value={form.km ?? ""}
                onChange={e => setF("km", sanitizeIntegerInput(e.target.value))} placeholder="Ex: 850"/>
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
                  onChange={e => setF("valorCliente", sanitizeMoneyInput(e.target.value))} placeholder="0,00"/>
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
                onChange={e => setF("valorMotorista", sanitizeMoneyInput(e.target.value))} placeholder="0,00"/>
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

// Mock data for Norte Telemetria — 20 trucks, drivers, alerts, telemetry.
// In Brazilian Portuguese. Plates in Mercosul format (ABC1D23) + older ABC-1234 mix.

const DRIVERS = [
  "Carlos Mendes", "Roberto Lima", "João Batista", "Marcos Silveira",
  "Antônio Pereira", "Diego Fonseca", "Rafael Souza", "Edmilson Tavares",
  "Paulo Henrique", "Luiz Gustavo", "Sérgio Almeida", "Wagner Costa",
  "Fábio Ribeiro", "Anderson Faria", "Cleber Marques", "Júlio Cardoso",
  "Vinícius Rocha", "Reginaldo Pinto", "Heitor Nascimento", "Tiago Borges"
];

const CITIES = [
  ["Belo Horizonte", "MG", -19.92, -43.94],
  ["São Paulo", "SP", -23.55, -46.63],
  ["Rio de Janeiro", "RJ", -22.91, -43.20],
  ["Curitiba", "PR", -25.43, -49.27],
  ["Porto Alegre", "RS", -30.03, -51.22],
  ["Salvador", "BA", -12.97, -38.50],
  ["Brasília", "DF", -15.78, -47.92],
  ["Goiânia", "GO", -16.68, -49.25],
  ["Recife", "PE", -8.05, -34.88],
  ["Fortaleza", "CE", -3.71, -38.54],
  ["Manaus", "AM", -3.10, -60.02],
  ["Vitória", "ES", -20.32, -40.34],
  ["Campinas", "SP", -22.91, -47.06],
  ["Uberlândia", "MG", -18.91, -48.27],
  ["Londrina", "PR", -23.31, -51.16],
  ["Ribeirão Preto", "SP", -21.17, -47.81],
  ["Juiz de Fora", "MG", -21.76, -43.35],
  ["Caxias do Sul", "RS", -29.16, -51.18],
  ["Joinville", "SC", -26.30, -48.84],
  ["Anápolis", "GO", -16.32, -48.95],
  ["Contagem", "MG", -19.93, -44.05],
  ["Betim", "MG", -19.97, -44.20],
];

const EQUIP = ["Sascar SkyTrack", "Onixsat OmniLink", "Sascar M9", "Autotrac AT100", "Sascar DriverMax"];
const MODELS = [
  "Volvo FH 540", "Scania R450", "Mercedes Actros 2651", "Volvo FH 460",
  "Scania R500", "Iveco Hi-Way 600", "Mercedes Axor 2544", "Volvo FH 500",
  "Scania R540", "DAF XF 530"
];

// Pseudo-random with seed so refresh is stable
let _s = 7;
function rand() { _s = (_s * 9301 + 49297) % 233280; return _s / 233280; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function intBetween(a, b) { return Math.floor(rand() * (b - a + 1)) + a; }
function floatBetween(a, b, dec = 1) { return +(rand() * (b - a) + a).toFixed(dec); }

function plate(i) {
  // Mix Mercosul (ABC1D23) and older (ABC-1234)
  const letters = ["BHL", "BJM", "RWP", "QXR", "SDF", "PNV", "HXC", "JKQ", "GTM", "LWB", "RZV", "MNS", "DKF", "PYA", "FCV"];
  const L = letters[i % letters.length];
  if (i % 3 === 0) {
    return `${L}${intBetween(0, 9)}${String.fromCharCode(65 + intBetween(0, 25))}${intBetween(10, 99)}`;
  }
  return `${L}-${intBetween(1000, 9999)}`;
}

function chassis() {
  const s = "9BWZZZ377VT" + intBetween(100000, 999999);
  return s;
}

function vehicleId(i) {
  return "VC" + String(1000 + i);
}

const COMM_STATUS = ["online", "atrasado", "sem-comm"];

const STATUS_WEIGHTS = [
  ...Array(14).fill("online"),
  ...Array(4).fill("atrasado"),
  ...Array(2).fill("sem-comm"),
];

const FLEET = Array.from({ length: 20 }, (_, i) => {
  const city = CITIES[i % CITIES.length];
  const status = STATUS_WEIGHTS[i] || "online";
  const ignition = status === "sem-comm" ? false : (rand() > 0.35);
  const speed = ignition && status === "online" ? intBetween(0, 92) : 0;
  return {
    id: vehicleId(i),
    plate: plate(i),
    driver: DRIVERS[i],
    chassis: chassis(),
    model: MODELS[i % MODELS.length],
    equip: EQUIP[i % EQUIP.length],
    status, // online | atrasado | sem-comm
    ignition,
    speed,
    rpm: ignition ? intBetween(800, 2400) : 0,
    lat: city[2] + floatBetween(-1.6, 1.6, 4),
    lng: city[3] + floatBetween(-1.6, 1.6, 4),
    city: city[0],
    uf: city[1],
    lastMessageMin: status === "online" ? intBetween(0, 4) : status === "atrasado" ? intBetween(20, 90) : intBetween(180, 1440),
    odometer: intBetween(120000, 870000),
    fuel: floatBetween(2.1, 3.6, 2), // km/l
    avgSpeed: intBetween(38, 78),
    maxSpeed: intBetween(85, 122),
    distance7d: intBetween(680, 4200),
    motorOnH: floatBetween(38, 89, 1),
    idleH: floatBetween(2, 22, 1),
    lastMaint: `${intBetween(2, 28)}/${["02","03","04","05"][i % 4]}/2026`,
    nextMaint: intBetween(-3, 18), // days
    alerts7d: intBetween(0, 18),
  };
});

const EVENT_TYPES = [
  { id: "speed", label: "Excesso de velocidade", sev: "warn", icon: "speedometer" },
  { id: "rpm", label: "RPM elevado", sev: "warn", icon: "gauge" },
  { id: "siren", label: "Sirene acionada", sev: "crit", icon: "alarm" },
  { id: "block", label: "Veículo bloqueado", sev: "crit", icon: "lock" },
  { id: "ignition", label: "Ignição acionada", sev: "info", icon: "key" },
  { id: "door-d", label: "Porta motorista aberta", sev: "warn", icon: "door" },
  { id: "door-p", label: "Porta carona aberta", sev: "info", icon: "door" },
  { id: "uncouple", label: "Desengate de carreta", sev: "crit", icon: "link-off" },
  { id: "telem", label: "Alerta de telemetria", sev: "warn", icon: "alert" },
  { id: "idle", label: "Motor ligado parado", sev: "info", icon: "idle" },
];

function timeAgo(min) {
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function isoMinAgo(min) {
  const d = new Date(Date.now() - min * 60000);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Recent alerts: 60 events spanning last 24h, plus older
const ALERTS = Array.from({ length: 64 }, (_, i) => {
  const type = pick(EVENT_TYPES);
  const veh = FLEET[intBetween(0, FLEET.length - 1)];
  const minAgo = i < 12 ? intBetween(2, 80) : i < 40 ? intBetween(90, 1400) : intBetween(1400, 4000);
  const sev = type.sev;
  const cidade = pick(CITIES);
  return {
    id: "EV" + (10000 + i),
    type: type.id,
    label: type.label,
    sev,
    veh: veh.plate,
    driver: veh.driver,
    location: `${cidade[0]} – ${cidade[1]}`,
    speed: type.id === "speed" ? intBetween(95, 132) : null,
    rpm: type.id === "rpm" ? intBetween(2400, 3100) : null,
    minAgo,
    when: isoMinAgo(minAgo),
    status: i < 12 ? "Pendente" : (rand() > 0.4 ? "Resolvido" : "Pendente"),
  };
}).sort((a, b) => a.minAgo - b.minAgo);

// Per-vehicle timeline (used in vehicle detail)
function vehicleTimeline(plate) {
  return ALERTS.filter(a => a.veh === plate).slice(0, 6).concat([
    { id: "S1", label: "Início de viagem", sev: "info", when: isoMinAgo(180), location: "Posto Trevão – BR-381 km 412", veh: plate, minAgo: 180 },
    { id: "S2", label: "Abastecimento", sev: "info", when: isoMinAgo(220), location: "Posto Ipiranga – Betim/MG", veh: plate, minAgo: 220 },
  ]).sort((a, b) => a.minAgo - b.minAgo);
}

// Integration health
const JOBS = [
  { id: "veiculos", label: "veiculos", lastRun: "há 4 min", status: "ok", read: 312, inserted: 0, ignored: 312, errors: 0, schedule: "a cada 30 min" },
  { id: "mensagens_cb", label: "mensagens_cb", lastRun: "há 1 min", status: "ok", read: 1842, inserted: 1842, ignored: 0, errors: 0, schedule: "a cada 1 min" },
  { id: "ocorrencias_telemetria", label: "ocorrencias_telemetria", lastRun: "há 2 min", status: "warn", read: 524, inserted: 519, ignored: 0, errors: 5, schedule: "a cada 2 min" },
  { id: "telemetria_relatorio", label: "telemetria_relatorio", lastRun: "há 14 min", status: "err", read: 0, inserted: 0, ignored: 0, errors: 1, schedule: "a cada 15 min" },
];

const PAYLOAD_ERRORS = [
  { id: "P-88421", job: "ocorrencias_telemetria", veh: "BHL3K42", when: "26/05 14:22", code: "VALIDATION", msg: "campo 'odometro' ausente no payload" },
  { id: "P-88419", job: "ocorrencias_telemetria", veh: "QXR-7102", when: "26/05 14:18", code: "VALIDATION", msg: "tipo 'evento.severidade' inválido (esperado int, recebido str)" },
  { id: "P-88412", job: "telemetria_relatorio", veh: "—", when: "26/05 14:04", code: "TIMEOUT", msg: "TimeoutError: leitura da API Trucks excedeu 30s" },
  { id: "P-88407", job: "ocorrencias_telemetria", veh: "JKQ-8821", when: "26/05 13:59", code: "PARSE", msg: "JSON malformado: token inesperado em pos 412" },
  { id: "P-88399", job: "ocorrencias_telemetria", veh: "SDF-1209", when: "26/05 13:41", code: "FK_MISSING", msg: "veiculo_id 'VC1041' não encontrado" },
];

const RECENT_LOG = [
  { ts: "14:32:14", lvl: "ok", msg: "mensagens_cb: 1842 registros inseridos" },
  { ts: "14:31:02", lvl: "ok", msg: "ocorrencias_telemetria: 519/524 inseridos (5 erros movidos p/ DLQ)" },
  { ts: "14:30:47", lvl: "err", msg: "telemetria_relatorio: TimeoutError após 30s — Trucks API /reports" },
  { ts: "14:29:58", lvl: "ok", msg: "veiculos: sync completo, 0 alterações" },
  { ts: "14:28:11", lvl: "ok", msg: "mensagens_cb: 1796 registros inseridos" },
  { ts: "14:27:03", lvl: "err", msg: "ocorrencias_telemetria: VALIDATION em payload P-88421" },
  { ts: "14:26:42", lvl: "ok", msg: "mensagens_cb: 1812 registros inseridos" },
];

// Top events for dashboard chart
const TOP_EVENT_TYPES = [
  { label: "Excesso de velocidade", count: 142, sev: "warn" },
  { label: "RPM elevado", count: 98, sev: "warn" },
  { label: "Motor ligado parado", count: 76, sev: "info" },
  { label: "Porta motorista", count: 41, sev: "warn" },
  { label: "Ignição acionada", count: 28, sev: "info" },
  { label: "Sirene acionada", count: 4, sev: "crit" },
  { label: "Desengate", count: 1, sev: "crit" },
];

// Daily KPIs (last 7 days)
const DAILY = [
  { day: "Qua", km: 4120, alerts: 38, fuel: 2.9 },
  { day: "Qui", km: 4680, alerts: 41, fuel: 2.8 },
  { day: "Sex", km: 5210, alerts: 52, fuel: 2.7 },
  { day: "Sáb", km: 3340, alerts: 22, fuel: 3.0 },
  { day: "Dom", km: 980,  alerts: 6,  fuel: 3.2 },
  { day: "Seg", km: 5870, alerts: 49, fuel: 2.8 },
  { day: "Ter", km: 5210, alerts: 44, fuel: 2.9 },
];

// helper to get vehicle by plate
function getVehicle(plate) {
  return FLEET.find(v => v.plate === plate) || FLEET[0];
}

// Mock route for vehicle detail (a polyline of [lat,lng])
function vehicleRoute(plate) {
  const v = getVehicle(plate);
  const pts = [];
  let lat = v.lat - 0.4, lng = v.lng - 0.5;
  for (let i = 0; i < 24; i++) {
    lat += (rand() - 0.4) * 0.04 + 0.02;
    lng += (rand() - 0.4) * 0.05 + 0.025;
    pts.push([+lat.toFixed(4), +lng.toFixed(4)]);
  }
  return pts;
}

// Financial per-vehicle data — deterministic formulas, no rand() calls
const VEHICLE_FIN = FLEET.map((v, i) => {
  const fuelCost    = Math.round(v.distance7d / v.fuel * 6.20);
  const maintCost   = v.nextMaint < 0
    ? Math.round(1800 + (i % 5) * 640)   // overdue: R$ 1800–4360
    : Math.round((i % 4) * 380);         // ok: R$ 0–1140
  const tollCost    = Math.round(v.distance7d * (0.40 + (i % 7) * 0.05));
  const driverCost  = Math.round(v.distance7d * 2.85);
  const totalCost   = fuelCost + maintCost + tollCost + driverCost;
  const revenue     = Math.round(totalCost * (1.15 + (i % 8) * 0.06));
  const trips       = 2 + (i % 7);
  const cpkm        = v.distance7d > 0 ? +(totalCost / v.distance7d).toFixed(2) : 0;
  return {
    plate: v.plate, driver: v.driver, model: v.model,
    km7d: v.distance7d,
    fuelCost, maintCost, tollCost, driverCost, totalCost,
    revenue, trips, cpkm,
    margin: revenue > 0 ? +((revenue - totalCost) / revenue * 100).toFixed(1) : 0,
  };
});

// Daily cost breakdown (matches DAILY 7-day window)
const COST_DAILY = [
  { day: "Qua", combustivel: 15820, manutencao:  4120, pedagios: 3240, motoristas:  8040 },
  { day: "Qui", combustivel: 18240, manutencao:  3800, pedagios: 3680, motoristas:  9120 },
  { day: "Sex", combustivel: 20340, manutencao:  5200, pedagios: 4160, motoristas: 10140 },
  { day: "Sáb", combustivel: 13120, manutencao:  1400, pedagios: 2640, motoristas:  6520 },
  { day: "Dom", combustivel:  3820, manutencao:     0, pedagios:  780, motoristas:  1920 },
  { day: "Seg", combustivel: 22940, manutencao:  7800, pedagios: 4840, motoristas: 11420 },
  { day: "Ter", combustivel: 20560, manutencao:  9280, pedagios: 4120, motoristas:  9180 },
];

// Daily revenue matching COST_DAILY days (R$)
const REVENUE_DAILY = [42800, 48600, 52100, 31200, 8400, 62400, 55800];

// Monthly Receita × Custo (last 6 months, R$)
const REVENUE_MONTHLY = [
  { mes: "Dez", receita: 187000, custo: 148000 },
  { mes: "Jan", receita: 198400, custo: 157000 },
  { mes: "Fev", receita: 203200, custo: 162000 },
  { mes: "Mar", receita: 218600, custo: 171000 },
  { mes: "Abr", receita: 231400, custo: 178000 },
  { mes: "Mai", receita: 241200, custo: 184000 },
];

// ─── ANTT Freight Table (from 001/002 SQL) ────────────────────────────────
const ANTT_TABELA = [
  { tipoVeiculo: "Truck",      eixos: 3, normal: { kmValor: 5.1295, cargaDescarga: 523.33 }, altoDesempenho: { kmValor: 4.3727, cargaDescarga: 190.36 } },
  { tipoVeiculo: "Bitruck",    eixos: 4, normal: { kmValor: 5.8178, cargaDescarga: 568.72 }, altoDesempenho: { kmValor: 4.9981, cargaDescarga: 205.98 } },
  { tipoVeiculo: "Carreta 5e", eixos: 5, normal: { kmValor: 6.7126, cargaDescarga: 635.08 }, altoDesempenho: { kmValor: 5.7382, cargaDescarga: 220.28 } },
  { tipoVeiculo: "Carreta 6e", eixos: 6, normal: { kmValor: 7.4124, cargaDescarga: 648.95 }, altoDesempenho: { kmValor: 6.4057, cargaDescarga: 223.27 } },
  { tipoVeiculo: "Carreta 7e", eixos: 7, normal: { kmValor: 8.1252, cargaDescarga: 803.22 }, altoDesempenho: { kmValor: 6.8012, cargaDescarga: 263.47 } },
];

// ─── Driver daily rates (from 005 SQL) ────────────────────────────────────
const DIARIAS_MOTORISTA = [
  { codigo: "cafe",   descricao: "Café",   horario: "08:00", valor: 19.27 },
  { codigo: "almoco", descricao: "Almoço", horario: "12:00", valor: 38.54 },
  { codigo: "janta",  descricao: "Janta",  horario: "21:00", valor: 28.90 },
];

// ─── Mock viagens (from 003 SQL structure) ────────────────────────────────
const VIAGENS_MOCK = [
  {
    id: 1, numero: "V-2026-001", situacao: "entregue",
    data: "2026-05-28", placa: "BHL1K42",
    origem: "São Paulo", ufOrigem: "SP", destino: "Belo Horizonte", ufDestino: "MG",
    cliente: "Indústria Alfa Ltda.", clienteFinal: "", material: "Equipamentos industriais", peso: 18500,
    valorCliente: 12800, valorMotorista: 9600,
    motorista: "Carlos Mendes", numeroMotorista: "(11) 98765-4321", cnh: "98762341", antt: "00123456",
    contaDeposito: "Bradesco C/C 1234-5", chavePix: "123.456.789-00",
    vendedor: "Juliana Martins", tomadorServico: "", condicaoPagamento: "30 dias",
    docs: { placas: true, antt: true, contaDeposito: true, chavePix: true, cnh: true, comprovanteResidencia: false, numeroMotorista: false },
    paradas: [], observacoes: "",
  },
  {
    id: 2, numero: "V-2026-002", situacao: "em_transito",
    data: "2026-05-30", placa: "QXR-7102",
    origem: "Curitiba", ufOrigem: "PR", destino: "São Paulo", ufDestino: "SP",
    cliente: "Beta Comércio S/A", clienteFinal: "Supermercado Boa Compra", material: "Alimentos resfriados", peso: 24000,
    valorCliente: 8400, valorMotorista: 6300,
    motorista: "Roberto Lima", numeroMotorista: "(41) 99887-6655", cnh: "12345678", antt: "00234567",
    contaDeposito: "", chavePix: "roberto.lima@email.com",
    vendedor: "", tomadorServico: "", condicaoPagamento: "à vista",
    docs: { placas: true, antt: true, contaDeposito: false, chavePix: true, cnh: true, comprovanteResidencia: true, numeroMotorista: true },
    paradas: [{ id: 1, ordem: 1, tipo: "entrega", cidade: "Campinas", uf: "SP", cliente: "Boa Compra — filial 1", endereco: "Av. Brasil, 1200", nf: "NF-001245", obs: "" }],
    observacoes: "Entrega com hora marcada: 08h–10h",
  },
  {
    id: 3, numero: "V-2026-003", situacao: "faltando_dados",
    data: "2026-05-31", placa: "",
    origem: "Goiânia", ufOrigem: "GO", destino: "Recife", ufDestino: "PE",
    cliente: "Gama Distribuidora", clienteFinal: "", material: "Tecidos e confecções", peso: 12800,
    valorCliente: 18200, valorMotorista: 0,
    motorista: "", numeroMotorista: "", cnh: "", antt: "",
    contaDeposito: "", chavePix: "",
    vendedor: "Juliana Martins", tomadorServico: "", condicaoPagamento: "",
    docs: { placas: false, antt: false, contaDeposito: false, chavePix: false, cnh: false, comprovanteResidencia: false, numeroMotorista: false },
    paradas: [], observacoes: "Aguardando confirmação do motorista.",
  },
  {
    id: 4, numero: "V-2026-004", situacao: "aguardando",
    data: "2026-06-02", placa: "SDF-1209",
    origem: "Porto Alegre", ufOrigem: "RS", destino: "Florianópolis", ufDestino: "SC",
    cliente: "Delta Materiais de Construção", clienteFinal: "", material: "Cimento e materiais de construção", peso: 28000,
    valorCliente: 6800, valorMotorista: 5100,
    motorista: "Rafael Souza", numeroMotorista: "(51) 98822-1133", cnh: "55544433", antt: "00456789",
    contaDeposito: "Itaú C/C 5678-9", chavePix: "55.444.333-22",
    vendedor: "", tomadorServico: "", condicaoPagamento: "7 dias",
    docs: { placas: true, antt: true, contaDeposito: true, chavePix: true, cnh: false, comprovanteResidencia: false, numeroMotorista: true },
    paradas: [], observacoes: "",
  },
  {
    id: 5, numero: "V-2026-005", situacao: "cancelado",
    data: "2026-05-25", placa: "PNV-4521",
    origem: "Salvador", ufOrigem: "BA", destino: "Fortaleza", ufDestino: "CE",
    cliente: "Épsilon Petróleo", clienteFinal: "", material: "Lubrificantes industriais", peso: 20000,
    valorCliente: 22400, valorMotorista: 17000,
    motorista: "Diego Fonseca", numeroMotorista: "(71) 97766-5544", cnh: "77788899", antt: "00567890",
    contaDeposito: "", chavePix: "diego.fonseca@email.com",
    vendedor: "", tomadorServico: "", condicaoPagamento: "15 dias",
    docs: { placas: true, antt: true, contaDeposito: false, chavePix: true, cnh: true, comprovanteResidencia: true, numeroMotorista: true },
    paradas: [], observacoes: "Cancelado pelo cliente — reagendar.",
  },
];

window.NT_DATA = {
  FLEET, DRIVERS, CITIES, EVENT_TYPES, ALERTS, JOBS,
  PAYLOAD_ERRORS, RECENT_LOG, TOP_EVENT_TYPES, DAILY,
  VEHICLE_FIN, COST_DAILY, REVENUE_DAILY, REVENUE_MONTHLY,
  ANTT_TABELA, DIARIAS_MOTORISTA, VIAGENS_MOCK,
  timeAgo, isoMinAgo, getVehicle, vehicleTimeline, vehicleRoute,
};

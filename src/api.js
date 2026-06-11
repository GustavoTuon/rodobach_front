const LOCAL_API_BASE = "http://localhost:3333/api";
const PRODUCTION_API_BASE = "https://rodobach-rodobach-back-consultoria.eupgpd.easypanel.host/api";

const API_BASE = window.RB_API_BASE
  || (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? LOCAL_API_BASE
    : PRODUCTION_API_BASE);

const TOKEN_KEY = "rodobach_token";
const USER_KEY  = "rodobach_user";

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("rodobach:unauthorized"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail ? ` — ${data.detail}` : "";
    const message = data?.error || `Erro HTTP ${response.status}`;
    if (response.status === 404 && /rota n[aã]o encontrada/i.test(message)) {
      throw new Error("Nao foi possivel carregar este modulo. Verifique se o backend esta atualizado e acessivel.");
    }
    throw new Error(message + detail);
  }

  return data;
}

// ── Autenticação ──────────────────────────────────────────────────────────────
window.RB_AUTH = {
  getToken: () => localStorage.getItem(TOKEN_KEY),

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },

  login: async (login, senha) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((result?.error) || `Erro ${response.status}`);
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  me: () => apiRequest("/auth/me"),
};

// ── API ───────────────────────────────────────────────────────────────────────
window.RB_API = {
  // ── Tabela ANTT ──────────────────────────────────────────────────────────
  listAntt: () => apiRequest("/frete/antt"),

  // ── Diárias ──────────────────────────────────────────────────────────────
  listDiarias: () => apiRequest("/motoristas/diarias"),

  calcularDiarias: (payload) => apiRequest("/motoristas/diarias/calcular", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // ── Frete ─────────────────────────────────────────────────────────────────
  calcularFrete: (payload) => apiRequest("/frete/calcular", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  searchCidades: (search = "") => apiRequest(`/localidades/cidades${buildQuery({ search })}`),

  // ── Viagens ───────────────────────────────────────────────────────────────
  listViagens: (filters = {}) => apiRequest(`/viagens${buildQuery(filters)}`),

  listOpcoes: (q = "") => apiRequest(`/viagens/opcoes${buildQuery({ q })}`),
  searchViagemPlacas: (q = "") => apiRequest(`/viagens/opcoes/placas${buildQuery({ q })}`),
  searchViagemMotoristas: (q = "") => apiRequest(`/viagens/opcoes/motoristas${buildQuery({ q })}`),
  searchViagemClientes: (q = "") => apiRequest(`/viagens/opcoes/clientes${buildQuery({ q })}`),
  searchViagemVendedores: (q = "") => apiRequest(`/viagens/opcoes/vendedores${buildQuery({ q })}`),

  createViagem: (payload) => apiRequest("/viagens", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateViagem: (id, payload) => apiRequest(`/viagens/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deleteViagem: (id) => apiRequest(`/viagens/${id}`, {
    method: "DELETE",
  }),

  // ── Financeiro ────────────────────────────────────────────────────────────
  getFinanceiroResumo: (period) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : "";
    return apiRequest(`/financeiro/resumo${query}`);
  },
  getReceitasResumo: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/receitas${buildQuery(params)}`);
  },
  getCustosResumo: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/custos${buildQuery(params)}`);
  },
  getFinanceiroPorPlaca: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/por-placa${buildQuery(params)}`);
  },
  getCustosVeiculos: (filters = {}) => apiRequest(`/financeiro/custos-veiculos${buildQuery(filters || {})}`),
  getCustosVeiculosFiltros: () => apiRequest("/financeiro/custos-veiculos/filtros"),
  getCustosVeiculoDetalhe: (placa, filters = {}) => apiRequest(`/financeiro/custos-veiculos/${encodeURIComponent(placa)}${buildQuery(filters || {})}`),
  getDemonstrativoFinanceiro: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/demonstrativo${buildQuery(params)}`);
  },
  getDreEmpresarial: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/dre-empresarial${buildQuery(params)}`);
  },
  getDreEmpresarialResumo: (filters) => apiRequest(`/financeiro/dre-empresarial/resumo${buildQuery(filters || {})}`),
  getDreEmpresarialEvolucao: (filters) => apiRequest(`/financeiro/dre-empresarial/evolucao${buildQuery(filters || {})}`),
  getDreEmpresarialRankings: (filters) => apiRequest(`/financeiro/dre-empresarial/rankings${buildQuery(filters || {})}`),
  getDreEmpresarialCentros: (filters) => apiRequest(`/financeiro/dre-empresarial/centros${buildQuery(filters || {})}`),
  getDreEmpresarialPlacas: (filters) => apiRequest(`/financeiro/dre-empresarial/placas${buildQuery(filters || {})}`),
  getDreEmpresarialLancamentos: (filters) => apiRequest(`/financeiro/dre-empresarial/lancamentos${buildQuery(filters || {})}`),
  getAnaliseClientes: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/analise-clientes${buildQuery(params)}`);
  },
  getRentabilidadeClientes: (filters = {}) => apiRequest(`/clientes/rentabilidade${buildQuery(filters || {})}`),

  // ── Manutenção ────────────────────────────────────────────────────────────
  listVeiculosManutencao: () => apiRequest("/manutencao/veiculos"),
  listManutencao: () => apiRequest("/manutencao"),
  createManutencao: (payload) => apiRequest("/manutencao", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateManutencao: (id, payload) => apiRequest(`/manutencao/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deleteManutencao: (id) => apiRequest(`/manutencao/${id}`, { method: "DELETE" }),

  // ── WhatsApp / Evolution API ──────────────────────────────────────────────
  whatsappStatus: () => apiRequest("/whatsapp/status"),
  whatsappConnect: () => apiRequest("/whatsapp/connect", { method: "POST" }),

  // ── Gerenciamento de usuários (admin) ─────────────────────────────────────
  listUsuarios: () => apiRequest("/usuarios"),
  createUsuario: (payload) => apiRequest("/usuarios", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  updateUsuario: (id, payload) => apiRequest(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  deleteUsuario: (id) => apiRequest(`/usuarios/${id}`, { method: "DELETE" }),
  // ── Pneus ─────────────────────────────────────────────────────────────────
  searchPneusVeiculos: (q = "") => apiRequest(`/pneus/veiculos${buildQuery({ q })}`),

  getPneusPosicoes: () => apiRequest("/pneus/posicoes"),

  getEstadoPneus: (veiculo) => apiRequest(`/pneus/veiculo/${encodeURIComponent(veiculo)}`),

  getPneusEstoque: () => apiRequest("/pneus/estoque"),

  getHistoricoPneus: (filters = {}) => apiRequest(`/pneus/historico${buildQuery(filters)}`),

  registrarMovimentacaoPneu: (payload) => apiRequest("/pneus/movimentar", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};

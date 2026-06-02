const LOCAL_API_BASE = "http://localhost:3333/api";
const PRODUCTION_API_BASE = "https://rodobach-rodobach-back-consultoria.eupgpd.easypanel.host/api";

const API_BASE = window.RB_API_BASE
  || (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? LOCAL_API_BASE
    : PRODUCTION_API_BASE);

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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail ? ` — ${data.detail}` : "";
    throw new Error((data?.error || `Erro HTTP ${response.status}`) + detail);
  }

  return data;
}

window.RB_API = {
  // ── Tabela ANTT ──────────────────────────────────────────────────────────
  listAntt: () => apiRequest("/frete/antt"),

  // ── Diárias ──────────────────────────────────────────────────────────────
  listDiarias: () => apiRequest("/motoristas/diarias"),

  // Calcula diárias no servidor (period-based)
  calcularDiarias: (payload) => apiRequest("/motoristas/diarias/calcular", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // ── Frete ─────────────────────────────────────────────────────────────────
  // Cálculo completo: ANTT + seguro carga + seguro RC + RPA/TAC + ICMS + margem
  calcularFrete: (payload) => apiRequest("/frete/calcular", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // ── Viagens ───────────────────────────────────────────────────────────────
  listViagens: (filters = {}) => apiRequest(`/viagens${buildQuery(filters)}`),

  // Retorna listas de clientes, placas, motoristas, etc. para autocomplete
  listOpcoes: (q = "") => apiRequest(`/viagens/opcoes${buildQuery({ q })}`),
  searchViagemPlacas: (q = "") => apiRequest(`/viagens/opcoes/placas${buildQuery({ q })}`),
  searchViagemMotoristas: (q = "") => apiRequest(`/viagens/opcoes/motoristas${buildQuery({ q })}`),
  searchViagemClientes: (q = "") => apiRequest(`/viagens/opcoes/clientes${buildQuery({ q })}`),

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
    const query = buildQuery(params);
    return apiRequest(`/financeiro/receitas${query}`);
  },
  getCustosResumo: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    const query = buildQuery(params);
    return apiRequest(`/financeiro/custos${query}`);
  },
  getFinanceiroPorPlaca: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    const query = buildQuery(params);
    return apiRequest(`/financeiro/por-placa${query}`);
  },
  getDemonstrativoFinanceiro: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    const query = buildQuery(params);
    return apiRequest(`/financeiro/demonstrativo${query}`);
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
    const query = buildQuery(params);
    return apiRequest(`/financeiro/analise-clientes${query}`);
  },
};

const LOCAL_API_BASE = "http://localhost:3333/api";
const PRODUCTION_API_BASE =
  "https://rodobach-rodobach-back-consultoria.eupgpd.easypanel.host/api";

const API_BASE =
  window.RB_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? LOCAL_API_BASE
    : PRODUCTION_API_BASE);
window.RB_API_BASE_URL = API_BASE;

const TOKEN_KEY = "rodobach_token";
const USER_KEY = "rodobach_user";

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      throw new Error(
        "Nao foi possivel carregar este modulo. Verifique se o backend esta atualizado e acessivel.",
      );
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
      throw new Error(result?.error || `Erro ${response.status}`);
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
  consultarNcmRateio: (filters = {}) =>
    apiRequest(`/cte/ncm-rateio${buildQuery(filters)}`),
  consultarNfeIbrap: (nota, serie) =>
    apiRequest(`/cte/esaf${buildQuery({ nota, serie })}`),
  listCanhotos: (filters = {}) => apiRequest(`/canhotos${buildQuery(filters)}`),
  baixarCanhotos: (payload) =>
    apiRequest("/canhotos/baixa", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  estornarCanhoto: (payload) =>
    apiRequest("/canhotos/baixa", {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
  estornarCanhotosLote: (documentos) =>
    apiRequest("/canhotos/baixa/lote", {
      method: "DELETE",
      body: JSON.stringify({ documentos }),
    }),
  listMotoristasFolgas: (filters = {}) =>
    apiRequest(`/motoristas/folgas${buildQuery(filters)}`),
  getJornadaMacros: (filters = {}) =>
    apiRequest(`/motoristas/jornada-macros${buildQuery(filters)}`),
  registrarSaidaMotorista: (payload) =>
    apiRequest("/motoristas/folgas/saidas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  registrarRetornoMotorista: (id, payload) =>
    apiRequest(
      `/motoristas/folgas/jornadas/${encodeURIComponent(id)}/retorno`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    ),
  registrarMovimentoFolga: (payload) =>
    apiRequest("/motoristas/folgas/movimentos", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // ── Tabela ANTT ──────────────────────────────────────────────────────────
  listAntt: () => apiRequest("/frete/antt"),

  // ── Diárias ──────────────────────────────────────────────────────────────
  // ── Frete ─────────────────────────────────────────────────────────────────
  calcularFrete: (payload) =>
    apiRequest("/frete/calcular", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  searchCidades: (search = "") =>
    apiRequest(`/localidades/cidades${buildQuery({ search })}`),

  // ── Viagens ───────────────────────────────────────────────────────────────
  listViagens: (filters = {}) => apiRequest(`/viagens${buildQuery(filters)}`),

  listOpcoes: (q = "") => apiRequest(`/viagens/opcoes${buildQuery({ q })}`),
  searchViagemPlacas: (q = "") =>
    apiRequest(`/viagens/opcoes/placas${buildQuery({ q })}`),
  searchViagemMotoristas: (q = "") =>
    apiRequest(`/viagens/opcoes/motoristas${buildQuery({ q })}`),
  searchViagemClientes: (q = "") =>
    apiRequest(`/viagens/opcoes/clientes${buildQuery({ q })}`),
  searchViagemVendedores: (q = "") =>
    apiRequest(`/viagens/opcoes/vendedores${buildQuery({ q })}`),
  searchViagemDocumentos: (q = "") =>
    apiRequest(`/viagens/documentos-financeiros${buildQuery({ q })}`),

  createViagem: (payload) =>
    apiRequest("/viagens", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateViagem: (id, payload) =>
    apiRequest(`/viagens/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteViagem: (id) =>
    apiRequest(`/viagens/${id}`, {
      method: "DELETE",
    }),
  updateViagemAprovacao: (id, payload) =>
    apiRequest(`/viagens/${id}/aprovacao`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getViagemAuditoria: (id) => apiRequest(`/viagens/${id}/auditoria`),

  getCargasViagensV2Resumo: () => apiRequest("/cargas-viagens-v2/resumo"),
  getCargasViagensV2Filtros: () => apiRequest("/cargas-viagens-v2/filtros"),
  listCargasV2: (filters = {}) =>
    apiRequest(`/cargas-viagens-v2/cargas${buildQuery(filters)}`),
  getCargaV2: (id) => apiRequest(`/cargas-viagens-v2/cargas/${id}`),
  createCargaV2: (payload) =>
    apiRequest("/cargas-viagens-v2/cargas", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCargaV2: (id, payload) =>
    apiRequest(`/cargas-viagens-v2/cargas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCargaV2: (id) =>
    apiRequest(`/cargas-viagens-v2/cargas/${id}`, { method: "DELETE" }),
  updateCargaAprovacaoV2: (id, payload) =>
    apiRequest(`/cargas-viagens-v2/cargas/${id}/aprovacao`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listViagensV2: (filters = {}) =>
    apiRequest(`/cargas-viagens-v2/viagens${buildQuery(filters)}`),
  getViagemV2: (id) => apiRequest(`/cargas-viagens-v2/viagens/${id}`),
  createViagemV2: (payload) =>
    apiRequest("/cargas-viagens-v2/viagens", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateViagemV2: (id, payload) =>
    apiRequest(`/cargas-viagens-v2/viagens/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteViagemV2: (id) =>
    apiRequest(`/cargas-viagens-v2/viagens/${id}`, { method: "DELETE" }),
  saveCargaDocumentosV2: (id, documentos) =>
    apiRequest(`/cargas-viagens-v2/cargas/${id}/documentos`, {
      method: "PUT",
      body: JSON.stringify({ documentos }),
    }),

  // ── Financeiro ────────────────────────────────────────────────────────────
  calcularPrecoCargaV2: (payload) =>
    apiRequest("/cargas-viagens-v2/gestao/preco", { method: "POST", body: JSON.stringify(payload) }),
  consultarCotacaoFretesV2: (payload) =>
    apiRequest("/cargas-viagens-v2/gestao/cotacao", { method: "POST", body: JSON.stringify(payload) }),

  getAnaliseFrota: (filters = {}) =>
    apiRequest(`/frota/analise${buildQuery(filters || {})}`),
  getAnaliseAbastecimentos: (filters = {}) =>
    apiRequest(`/frota/abastecimentos${buildQuery(filters || {})}`),
  listAbastecimentoAcordos: (filters = {}) =>
    apiRequest(`/abastecimentos/acordos${buildQuery(filters || {})}`),
  saveAbastecimentoAcordo: (payload) =>
    apiRequest(
      payload?.id
        ? `/abastecimentos/acordos/${encodeURIComponent(payload.id)}`
        : "/abastecimentos/acordos",
      {
        method: payload?.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    ),
  deleteAbastecimentoAcordo: (id) =>
    apiRequest(`/abastecimentos/acordos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  listPostosAbastecimento: (q = "") =>
    apiRequest(`/abastecimentos/acordos/postos${buildQuery({ q })}`),
  listGruposClientes: () =>
    apiRequest("/abastecimentos/acordos/grupos-clientes"),
  getDivergenciasAbastecimento: (filters = {}) =>
    apiRequest(
      `/abastecimentos/acordos/divergencias${buildQuery(filters || {})}`,
    ),
  getStatusCargaFrota: (filters = {}) =>
    apiRequest(`/frota/status-carga${buildQuery(filters || {})}`),
  getOciosidadeFrota: (filters = {}) =>
    apiRequest(`/frota/ociosidade${buildQuery(filters || {})}`),
  listMultasFrota: (filters = {}) =>
    apiRequest(`/frota/multas${buildQuery(filters || {})}`),
  saveControleMultaFrota: (empresa, codigo, payload) =>
    apiRequest(
      `/frota/multas/${encodeURIComponent(empresa)}/${encodeURIComponent(codigo)}/controle`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  getAuditoriaMultaFrota: (empresa, codigo) =>
    apiRequest(
      `/frota/multas/${encodeURIComponent(empresa)}/${encodeURIComponent(codigo)}/auditoria`,
    ),
  getCustosVeiculos: (filters = {}) =>
    apiRequest(`/financeiro/custos-veiculos${buildQuery(filters || {})}`),
  getResultadoVeiculos: (filters = {}) =>
    apiRequest(
      `/financeiro/custos-veiculos/resultado${buildQuery(filters || {})}`,
    ),
  getAuditoriaCustosVeiculos: (filters = {}) =>
    apiRequest(
      `/financeiro/custos-veiculos/auditoria${buildQuery(filters || {})}`,
    ),
  getCustosVeiculosFiltros: () =>
    apiRequest("/financeiro/custos-veiculos/filtros"),
  getCustosVeiculoDetalhe: (placa, filters = {}) =>
    apiRequest(
      `/financeiro/custos-veiculos/${encodeURIComponent(placa)}${buildQuery(filters || {})}`,
    ),
  getManutencoesVeiculos: (filters = {}) =>
    apiRequest(`/financeiro/manutencoes-veiculos${buildQuery(filters || {})}`),
  getManutencoesVeiculosFiltros: () =>
    apiRequest("/financeiro/manutencoes-veiculos/filtros"),
  getManutencaoVeiculoDetalhe: (placa, filters = {}) =>
    apiRequest(
      `/financeiro/manutencoes-veiculos/${encodeURIComponent(placa)}${buildQuery(filters || {})}`,
    ),
  getDreEmpresarial: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/dre-empresarial${buildQuery(params)}`);
  },
  getFluxoCaixa: (filters = {}) =>
    apiRequest(`/financeiro/fluxo-caixa${buildQuery(filters || {})}`),
  getDespesasFuturas: (filters = {}) =>
    apiRequest(`/financeiro/despesas-futuras${buildQuery(filters || {})}`),
  getDreLancamentoDetalhe: (detailKey = {}) =>
    apiRequest(
      `/financeiro/dre-empresarial/lancamento-detalhe${buildQuery(detailKey)}`,
    ),
  getTrafegusDashboard: () => apiRequest("/trafegus/dashboard"),
  refreshTrafegus: () => apiRequest("/trafegus/atualizar", { method: "POST" }),
  getTrafegusGoogleRoute: (smId) =>
    apiRequest(`/trafegus/sms/${encodeURIComponent(smId)}/rota-google`),
  getOportunidadesRetorno: () => apiRequest("/oportunidades-retorno"),
  importOportunidadesClientes: (payload) =>
    apiRequest("/oportunidades-retorno/importar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  analyzeOportunidadesRetorno: (payload) =>
    apiRequest("/oportunidades-retorno/analisar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendOportunidadesN8n: (payload) =>
    apiRequest("/oportunidades-retorno/enviar-n8n", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendOportunidadeCliente: (payload) =>
    apiRequest("/oportunidades-retorno/enviar-cliente", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  downloadOportunidadesModelo: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(
      `${API_BASE}/oportunidades-retorno/modelo.xlsx`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!response.ok)
      throw new Error("Nao foi possivel baixar o modelo da planilha.");
    return response.blob();
  },
  getAnaliseClientes: (filters) => {
    const params = typeof filters === "object" ? filters : { period: filters };
    return apiRequest(`/financeiro/analise-clientes${buildQuery(params)}`);
  },
  getRentabilidadeClientes: (filters = {}) =>
    apiRequest(`/clientes/rentabilidade${buildQuery(filters || {})}`),
  getLucroViagens: (filters = {}) =>
    apiRequest(`/financeiro/lucro-viagens${buildQuery(filters || {})}`),
  getResultadoFretes: (filters = {}) =>
    apiRequest(`/financeiro/resultado-fretes${buildQuery(filters || {})}`),
  getFaturamentoDiario: (filters = {}) =>
    apiRequest(`/financeiro/faturamento-diario${buildQuery(filters || {})}`),
  getFaturamentoMensalComparativo: (filters = {}) =>
    apiRequest(
      `/financeiro/faturamento-mensal-comparativo${buildQuery(filters || {})}`,
    ),

  // ── Manutenção ────────────────────────────────────────────────────────────
  listVeiculosManutencao: () => apiRequest("/manutencao/veiculos"),
  listComponentesPosicao: (placa) =>
    apiRequest(`/manutencao/componentes-posicao${buildQuery({ placa })}`),
  consultaComponentesPosicao: (filters = {}) =>
    apiRequest(
      `/manutencao/componentes-posicao/consulta${buildQuery(filters)}`,
    ),
  getOpcoesComponentesPosicao: () =>
    apiRequest("/manutencao/componentes-posicao/opcoes"),
  createComponentePosicao: (payload) =>
    apiRequest("/manutencao/componentes-posicao", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createComponentesPosicaoLote: (payload) =>
    apiRequest("/manutencao/componentes-posicao/lote", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateComponentePosicao: (id, payload) =>
    apiRequest(`/manutencao/componentes-posicao/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  cancelComponentesPosicao: (payload) =>
    apiRequest("/manutencao/componentes-posicao/cancelar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listContatosManutencao: () => apiRequest("/manutencao/contatos"),
  createContatoManutencao: (payload) =>
    apiRequest("/manutencao/contatos", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listManutencao: () => apiRequest("/manutencao"),
  listRegistrosManutencao: (placa = "") =>
    apiRequest(`/manutencao/registros${buildQuery(placa ? { placa } : {})}`),
  createRegistroManutencao: (payload) =>
    apiRequest("/manutencao/registros", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createManutencao: (payload) =>
    apiRequest("/manutencao", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateManutencao: (id, payload) =>
    apiRequest(`/manutencao/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteManutencao: (id) =>
    apiRequest(`/manutencao/${id}`, { method: "DELETE" }),

  // ── WhatsApp / Evolution API ──────────────────────────────────────────────
  whatsappStatus: () => apiRequest("/whatsapp/status"),
  whatsappConnect: () => apiRequest("/whatsapp/connect", { method: "POST" }),

  // ── Gerenciamento de usuários (admin) ─────────────────────────────────────
  listAutomacoesN8n: () => apiRequest("/automacoes/n8n"),
  getAutomacaoN8n: (id) =>
    apiRequest(`/automacoes/n8n/${encodeURIComponent(id)}`),
  ativarAutomacaoN8n: (id) =>
    apiRequest(`/automacoes/n8n/${encodeURIComponent(id)}/ativar`, {
      method: "POST",
    }),
  desativarAutomacaoN8n: (id) =>
    apiRequest(`/automacoes/n8n/${encodeURIComponent(id)}/desativar`, {
      method: "POST",
    }),
  executarNovamenteAutomacaoN8n: (id) =>
    apiRequest(`/automacoes/n8n/${encodeURIComponent(id)}/executar-novamente`, {
      method: "POST",
    }),
  getAutomacaoVencimentoClientes: () =>
    apiRequest("/automacoes/vencimento-clientes"),
  ativarAutomacaoVencimentoClientes: () =>
    apiRequest("/automacoes/vencimento-clientes/ativar", { method: "POST" }),
  desativarAutomacaoVencimentoClientes: () =>
    apiRequest("/automacoes/vencimento-clientes/desativar", { method: "POST" }),

  listUsuarios: () => apiRequest("/usuarios"),
  createUsuario: (payload) =>
    apiRequest("/usuarios", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUsuario: (id, payload) =>
    apiRequest(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteUsuario: (id) => apiRequest(`/usuarios/${id}`, { method: "DELETE" }),
  // ── Pneus ─────────────────────────────────────────────────────────────────
  searchPneusVeiculos: (q = "") =>
    apiRequest(`/pneus/veiculos${buildQuery({ q })}`),

  getEstadoPneus: (veiculo) =>
    apiRequest(`/pneus/veiculo/${encodeURIComponent(veiculo)}`),

  getOdometroPneusVeiculo: (veiculo) =>
    apiRequest(`/pneus/veiculo/${encodeURIComponent(veiculo)}/odometro`),

  getPneusEstoque: () => apiRequest("/pneus/estoque"),

  getHistoricoPneus: (filters = {}) =>
    apiRequest(`/pneus/historico${buildQuery(filters)}`),

  registrarMovimentacaoPneu: (payload) =>
    apiRequest("/pneus/movimentar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const SCREEN_FILES = {
  diretoria: "diretoria", simulador: "simulador", viagens: "cargas-viagens-v2",
  "folgas-motoristas": "folgas-motoristas", "status-carga": "status-carga", "painel-tv": "painel-tv",
  "ociosidade-frota": "ociosidade-frota", trafegus: "trafegus", "oportunidades-retorno": "oportunidades-retorno",
  "dre-empresarial": "dre-empresarial", "fluxo-caixa": "fluxo-caixa", "despesas-futuras": "despesas-futuras",
  abastecimentos: "analise-frota", "precos-combustivel": "precos-combustivel", "resultado-veiculos": "resultado-veiculos",
  "evolucao-custos": "evolucao-custos", "manutencoes-veiculos": "manutencoes-veiculos",
  clientes: "analise-clientes", "clientes-ranking": "analise-clientes", "clientes-embarques": "embarques-clientes",
  "clientes-lucro": "client-margin", "lucro-viagens": "resultado-fretes",
  "faturamento-diario": "faturamento-diario", "comparativo-faturamento": "comparativo-faturamento",
  manutencao: "manutencao", "manutencao-posicoes": "manutencao-posicoes", pneus: "pneus", "multas-frota": "multas-frota",
  "automacoes-n8n": "automacoes", "consulta-cte": "consulta-cte", "controle-canhotos": "controle-canhotos", usuarios: "usuarios",
};

export function createScreenLoader(modules) {
  const loaded = new Map();
  return async screen => {
    if (screen === "settings") return;
    const file = SCREEN_FILES[screen];
    const load = modules[`./screens/${file}.jsx`];
    if (!load) throw new Error("Tela indisponível.");
    if (!loaded.has(file)) {
      const promise = Promise.resolve().then(load).catch(error => { loaded.delete(file); throw error; });
      loaded.set(file, promise);
    }
    await loaded.get(file);
  };
}

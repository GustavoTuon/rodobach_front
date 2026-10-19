const item = (id, label, description, explicit = false) => ({ id: `perm_${id}`, label, description, explicit });

export const PERMISSION_GROUPS = [
  { id: "direcao", label: "Visão geral e financeiro", telas: [
    item("diretoria", "Diretoria", "Resumo executivo e indicadores da operação."),
    item("dre_empresarial", "DRE, Fluxo de Caixa e Despesas Futuras", "Libera as três telas financeiras em conjunto."),
    item("faturamento_diario", "Faturamento Diário", "Consulta e acompanhamento do faturamento por dia."),
    item("comparativo_faturamento", "Comparativo Mensal", "Comparação do faturamento entre meses."),
    item("custos_veiculos", "Resultado por Veículo e Análise de custos", "Resultados, custos e auditoria por veículo compartilham este acesso."),
    item("lucro_viagens", "Viagens por região e Consulta de viagens", "Libera as duas consultas de resultados de viagens."),
    item("clientes", "Análise, Ranking e Embarques de clientes", "Libera as três visões de análise de clientes."),
    item("clientes_lucro", "Rentabilidade de Clientes", "Consulta de lucro e rentabilidade por cliente."),
  ]},
  { id: "operacao", label: "Operação", telas: [
    item("simulador", "Calculadora de Frete ANTT", "Simulação e cálculo do frete."),
    item("viagens", "Cargas e viagens", "Acesso à gestão de cargas e viagens. Aprovação comercial possui controle separado."),
    item("aprovar_viagens", "Aprovar viagens (Comercial)", "Autoriza a aprovação comercial. Requer acesso à tela Cargas e viagens."),
    item("folgas_motoristas", "Folgas", "Jornada e folgas dos motoristas.", true),
    item("status_carga", "Status Carga", "Acompanhamento do status de carga da frota.", true),
    item("trafegus", "Trafegus", "Consulta de SMs e rotas."),
    item("oportunidades_retorno", "Retorno", "Clientes próximos e oportunidades de carga de retorno."),
    item("consulta_nfe", "NF / NCM e rateio", "Consulta de documentos, NCM e rateio de frete."),
    item("controle_canhotos", "Canhotos", "Consulta e controle de canhotos."),
    item("compras", "Compras", "Portal de compras: cotações, fornecedores, análise e decisão."),
    item("ociosidade_frota", "Ociosidade (teste)", "Visão experimental de ociosidade da frota."),
  ]},
  { id: "frota", label: "Frota e manutenção", telas: [
    item("abastecimentos", "Abastecimentos", "Análise dos abastecimentos da frota."),
    item("precos_combustivel", "Preços dos Postos", "Consulta e cadastro de preços combinados de combustível."),
    item("pneus", "Pneus", "Controle e movimentação de pneus."),
    item("multas_frota", "Multas", "Controle de multas da frota."),
    item("manutencao_posicoes", "Manutenções por posição", "Gestão de peças e componentes por posição."),
    item("manutencoes_veiculos", "Manutenções por Veículo", "Consulta de custos e histórico de manutenções por veículo."),
    item("manutencao", "Alertas de Manutenção", "Planos e automações de manutenção, com acesso às funções de componentes."),
  ]},
  { id: "plantao", label: "Despesas e manutenção de plantão", telas: [
    item("manutencao_plantao", "Manutenção de plantão — lançar", "Registrar despesas e gerenciar os próprios lançamentos pendentes. Placas disponíveis conforme o perfil de despesas."),
    item("conferencia_manutencao", "Manutenção de plantão — conferir", "Conferir despesas da frota, controlar pagamentos e corrigir lançamentos pendentes. Independente da permissão de lançar."),
  ]},
  { id: "sistema", label: "Ferramentas e sistema", telas: [
    item("automacoes_n8n", "Automações n8n", "Acesso às automações e integrações n8n.", true),
    item("painel_tv", "Painel TV", "Painel de acompanhamento da frota."),
    item("settings", "Configurações", "Acesso às configurações do sistema."),
  ]},
  { id: "legado", label: "Acessos complementares", telas: [
    item("analise_frota", "Análise de frota e condução (legado)", "Permissão de consultas de frota e condução mantidas na API; sem atalho próprio no menu atual."),
  ]},
];

export const PERMISSION_ITEMS = PERMISSION_GROUPS.flatMap(group => group.telas);
export const isPermissionEffective = (permission, user) => Boolean(
  (user.admin && !permission.explicit) || user[permission.id] === true
);
export function filterPermissionGroups(search) {
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(search.trim());
  return PERMISSION_GROUPS.map(group => ({ ...group, telas: group.telas.filter(permission =>
    normalize(`${group.label} ${permission.label} ${permission.description}`).includes(query)
  ) })).filter(group => group.telas.length);
}

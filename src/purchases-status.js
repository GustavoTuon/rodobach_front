export function quoteProgress(q) {
  const total = Number(q.fornecedores ?? q.convites?.length ?? 0);
  const answered = Number(
    q.respostas ??
      q.convites?.filter((c) => c.resposta || c.respondido_em).length ??
      0,
  );
  if (q.origem_chave)
    return { key: "historico", label: "Histórico do sistema", total, answered };
  if (q.status === "cancelada")
    return { key: "cancelada", label: "Cancelada", total, answered };
  if (q.status === "encerrada")
    return { key: "encerrada", label: "Encerrada", total, answered };
  if (new Date(q.prazo) <= new Date())
    return { key: "encerrada", label: "Prazo encerrado", total, answered };
  if (!answered)
    return {
      key: "aguardando",
      label: "Aguardando respostas",
      total,
      answered,
    };
  if (answered < total)
    return { key: "parcial", label: "Respostas parciais", total, answered };
  return { key: "respondida", label: "Pronta para análise", total, answered };
}

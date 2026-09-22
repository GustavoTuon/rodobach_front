const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function summarizeClients(clients = []) {
  const sum = field => clients.reduce((total, row) => total + number(row[field]), 0);
  const billing = clients.filter(row => number(row.totalPeriodo) > 0);
  const totalFaturado = sum('totalPeriodo');
  const totalAnoAnterior = sum('totalAnoAnterior');
  const documentosPeriodo = sum('lancamentos');
  const documentosAnoAnterior = sum('documentosAnoAnterior');
  const top = [...billing].sort((a, b) => number(b.totalPeriodo) - number(a.totalPeriodo));
  const change = (current, previous) => previous > 0 ? (current - previous) / previous * 100 : null;
  return {
    totalFaturado, totalAnoAnterior, documentosPeriodo, documentosAnoAnterior,
    totalRecebido: sum('totalRecebido'), totalAberto: sum('totalAberto'),
    totalVencido: sum('totalVencido'), totalInadimplente: sum('totalInadimplente'),
    clientesAtivos: billing.length,
    ticketMedio: billing.length ? billing.reduce((s, c) => s + number(c.totalPeriodo), 0) / billing.length : null,
    variacaoAnoAnterior: change(totalFaturado, totalAnoAnterior),
    variacaoDocumentosAnoAnterior: change(documentosPeriodo, documentosAnoAnterior),
    topCliente: top[0] ? { nome: top[0].nome, valor: number(top[0].totalPeriodo) } : null,
    concentracaoTop5: totalFaturado > 0 ? top.slice(0, 5).reduce((s, c) => s + number(c.totalPeriodo), 0) / totalFaturado * 100 : null,
  };
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

import React from 'react';

const money = value => value == null ? 'Não apurado' : Number(value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const percent = value => value == null ? 'Não apurada' : `${Number(value).toLocaleString('pt-BR', {maximumFractionDigits: 2})}%`;
const scope = 'Resultado parcial: receita de CT-es menos frete contratado ou comissão identificada. Não inclui combustível, manutenção, impostos e despesas gerais; não representa lucro líquido. Clientes com documentos sem receita ou custo identificado ficam separados do ranking. Empresas são mantidas separadas por cadastro.';

export function clientProfitRanking(clients, search = '') {
  const groups = {positive: [], negative: [], neutral: [], pending: []};
  for (const client of clients) {
    const a = client.atual;
    if (!a.documentos || !`${client.cliente} ${client.empresa}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) continue;
    const complete = a.documentosComCusto === a.documentos && !a.documentosSemReceita && Number.isFinite(a.saldoParcial) && Number.isFinite(a.custoDireto);
    const group = !complete ? 'pending' : a.saldoParcial > 0 ? 'positive' : a.saldoParcial < 0 ? 'negative' : 'neutral';
    groups[group].push({...client, average: complete ? a.saldoParcial / a.documentos : null});
  }
  const tie = (a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR') || String(a.id).localeCompare(String(b.id));
  groups.positive.sort((a,b) => b.atual.saldoParcial - a.atual.saldoParcial || tie(a,b));
  groups.negative.sort((a,b) => a.atual.saldoParcial - b.atual.saldoParcial || tie(a,b));
  groups.pending.sort((a,b) => b.atual.receitaSemCusto - a.atual.receitaSemCusto || tie(a,b));
  groups.neutral.sort(tie);
  return groups;
}

const sections = [['positive', 'Maiores saldos positivos'], ['negative', 'Maiores saldos negativos'], ['neutral', 'Saldo parcial zerado'], ['pending', 'Apuração pendente']];
const headers = ['Cliente / empresa', 'Receita documental', 'Custo direto', 'Saldo parcial', 'Margem parcial', 'Saldo médio por CT-e', 'Documentos com custo'];
const values = row => [`${row.cliente} · ${row.empresa}`, money(row.atual.receita), money(row.atual.custoDireto), money(row.atual.saldoParcial), percent(row.atual.margemParcial), money(row.average), `${row.atual.documentosComCusto}/${row.atual.documentos}`];

export function clientProfitReport(groups, payload, search = '') {
  const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const period = payload.periodos.current;
  const date = value => value.split('-').reverse().join('/');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Resultado parcial por cliente</title><style>body{font:14px Arial,sans-serif;color:#172033;margin:32px}h1{font-size:26px}h2{margin-top:30px}p{line-height:1.5}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}th{background:#eef2f7}tr{break-inside:avoid}small{color:#465166}@media print{body{margin:12px}@page{size:A4 landscape;margin:12mm}}</style><h1>Resultado parcial por cliente</h1><p>Período: ${escape(date(period.startDate))} a ${escape(date(period.endDate))}<br>Dados atualizados em ${escape(new Date(payload.atualizadoEm).toLocaleString('pt-BR'))}${search ? `<br>Busca aplicada: ${escape(search)}` : ''}</p><p><strong>${escape(scope)}</strong></p><p>${escape(payload.metodologia)}</p>${sections.map(([key,title]) => `<h2>${title} (${groups[key].length})</h2>${key === 'pending' ? '<p>Fora do ranking: os saldos parciais abaixo abrangem somente documentos com custo identificado.</p>' : ''}${groups[key].length ? `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${groups[key].map(row=>`<tr>${values(row).map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>Nenhum cliente nesta situação.</p>'}`).join('')}<p><small>Ordem por valor absoluto do saldo em reais, não por faturamento. Saldo médio = saldo parcial ÷ quantidade de CT-es, somente para clientes com custo direto identificado em todos os documentos. Um saldo positivo ainda pode se tornar negativo após os demais custos. Para salvar em PDF, use Imprimir no navegador.</small></p></html>`;
}

export function ClientProfitRanking({clients, payload, search, onSelect}) {
  const groups = clientProfitRanking(clients, search);
  function download() {
    const url = URL.createObjectURL(new Blob([clientProfitReport(groups, payload, search)], {type: 'text/html;charset=utf-8'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `resultado-parcial-clientes-${payload.periodos.current.startDate}-${payload.periodos.current.endDate}.html`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div>
    <div className="row between"><h2>Quais clientes deixam maior saldo?</h2><button className="btn" onClick={download} disabled={!Object.values(groups).some(rows=>rows.length)}>Baixar relatório para apresentar</button></div>
    <p>{scope}</p>
    <p className="muted">O relatório inclui todas as situações e a busca aplicada. Abra o arquivo no navegador para apresentar ou imprimir em PDF. Média calculada por CT-e, não por viagem.</p>
    {sections.map(([key,title]) => <section key={key} aria-label={title} style={{marginTop:24}}>
      <h3>{title} ({groups[key].length})</h3>
      {key === 'pending' && <p>Fora do ranking. Complete os vínculos e valores antes de avaliar o resultado destes clientes. Os saldos exibidos cobrem somente os documentos com custo identificado.</p>}
      {groups[key].length ? <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Posição</th>{headers.map(h=><th key={h}>{h}</th>)}<th>Rastrear</th></tr></thead><tbody>{groups[key].map((row,i)=><tr key={row.id}><td>{key === 'pending' ? '—' : i+1}</td>{values(row).map((value,j)=><td key={j}>{value}</td>)}<td><button className="btn" onClick={()=>onSelect({...row,type:'clientes'})}>Ver documentos</button></td></tr>)}</tbody></table></div> : <p>Nenhum cliente nesta situação.</p>}
    </section>)}
  </div>;
}

import React from 'react';
import {costDeviations} from './cost-deviations-model.js';
import {ecMoney, ecPct} from './cost-analysis-model.js';

export function CostDeviations({rows, previous, months, distance, month, onOpen}) {
  const [showAll, setShowAll] = React.useState(false);
  const model = React.useMemo(() => costDeviations(rows, previous, {months, distance}), [rows, previous, months, distance]);
  if (month) return <section className="ec-panel"><h2>Desvios de custos</h2><p>Remova o filtro de mês para comparar os dois períodos completos de mesma duração.</p></section>;
  const visible = showAll ? model.items : model.items.slice(0, 10);
  return <section className="ec-panel" aria-label="Desvios de custos">
    <div className="ec-panel-head"><div><h2>O que explica a variação dos custos?</h2><p>Veículos e categorias ordenados pelo aumento em reais, respeitando os filtros selecionados.</p></div></div>
    <p>Aumentos registrados: <strong>{ecMoney(model.increase)}</strong> · Reduções registradas: <strong>{ecMoney(-model.decrease)}</strong> · Variação líquida: <strong>{ecMoney(model.delta)}</strong></p>
    {model.invalid > 0 && <p role="alert">Análise parcial: {model.invalid} lançamentos sem valor válido foram excluídos.</p>}
    {!visible.length ? <p>Sem lançamentos nos períodos selecionados para analisar desvios.</p> : <div className="ec-table-scroll"><table className="ec-table">
      <thead><tr><th>Veículo</th><th>Categoria</th><th>Anterior</th><th>Atual</th><th>Diferença</th><th>Variação</th><th>Atual/km</th><th>Base de comparação</th><th>Investigar</th></tr></thead>
      <tbody>{visible.map(item => <tr key={JSON.stringify([item.plate, item.category])}>
        <td>{item.plate}</td><td>{item.category}</td>
        <td>{item.previousCount ? ecMoney(item.previous) : '—'}</td><td>{item.currentCount ? ecMoney(item.current) : '—'}</td>
        <td>{ecMoney(item.delta)}</td><td>{item.percent === null ? '—' : ecPct(item.percent)}</td>
        <td>{item.costKm === null ? '—' : ecMoney(item.costKm)}</td><td>{item.status}</td>
        <td>{item.plate !== 'Sem placa' && item.currentCount > 0 ? <button className="btn" onClick={() => onOpen(item.plate)}>Ver lançamentos</button> : '—'}</td>
      </tr>)}</tbody></table></div>}
    {model.items.length > 10 && <button className="btn" onClick={() => setShowAll(value => !value)}>{showAll ? 'Mostrar 10' : `Ver todos (${model.items.length})`}</button>}
    <p className="ec-footnote">Diferenças refletem os lançamentos encontrados, não economia ou desperdício comprovados. Ausência de lançamentos não comprova custo zero. R$/km usa o custo da categoria e o deslocamento total do veículo no período, apenas com cobertura completa. Os dados disponíveis aqui não permitem separar efeitos de preço e consumo de combustível.</p>
  </section>;
}

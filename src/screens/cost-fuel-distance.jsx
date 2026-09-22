import {ecDistanceMonths,ecMonth} from './cost-analysis-model.js';

export function FuelDistance({months,plates,distance,selected}) {
  const rows=ecDistanceMonths(months,plates,distance).filter(row=>!selected||row.mes===selected);
  const complete=rows.length>0&&rows.every(row=>row.km!==null);
  const km=value=>`${value.toLocaleString('pt-BR',{maximumFractionDigits:1})} km`;
  return <section className="ec-panel" aria-label="Quilometragem do combustível">
    <div className="ec-panel-head"><div><h2>KM rodado · Combustível</h2><p>Telemetria das placas selecionadas no mesmo período da análise.</p></div>
      <strong>{complete?km(rows.reduce((sum,row)=>sum+row.km,0)):'KM total indisponível'}</strong></div>
    <div className="ec-table-scroll"><table className="ec-table"><thead><tr><th>Mês</th><th>KM rodado</th><th>Cobertura por veículo</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.mes}><td>{ecMonth(row.mes)}</td><td>{row.km===null?'Sem cobertura suficiente':km(row.km)}</td><td>{row.covered} de {row.vehicles}</td></tr>)}</tbody></table></div>
    <p className="ec-footnote">Quilometragem apurada pelo odômetro do rastreador. Meses incompletos ou com inconsistências não entram como zero. Fornecedor e centro de custo selecionam as placas dos lançamentos; o KM corresponde ao deslocamento dessas placas no período, não apenas aos abastecimentos naquele fornecedor.</p>
  </section>;
}

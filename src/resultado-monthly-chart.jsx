import React from 'react';
import './resultado-monthly-chart.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
export function monthRange(month, range) {
  const [year, number] = month.split('-').map(Number);
  const first = `${month}-01`;
  const last = `${month}-${new Date(year, number, 0).getDate()}`;
  return {startDate:first > range.startDate ? first : range.startDate, endDate:last < range.endDate ? last : range.endDate};
}
export function monthlySeries(rows, range) {
  if (!range?.startDate || !range?.endDate) return [];
  const indexed = new Map(rows.map(row=>[String(row.mes).slice(0,7),row]));
  const cursor = new Date(`${range.startDate.slice(0,7)}-01T12:00:00`);
  const result = [];
  while (cursor.toISOString().slice(0,7) <= range.endDate.slice(0,7) && result.length < 240) {
    const mes = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;
    const row = indexed.get(mes);
    result.push({mes, receita:Number(row?.receita || 0), custo:Number(row?.custo || 0), label:cursor.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','')});
    cursor.setMonth(cursor.getMonth()+1);
  }
  return result;
}
export default function ResultadoMonthlyChart({rows, range, selected, onSelect, onClear}) {
  const [hovered,setHovered] = React.useState(null);
  const series = monthlySeries(rows,range);
  const max = Math.max(1,...series.flatMap(r=>[r.receita,r.custo]));
  const min = Math.min(0,...series.flatMap(r=>[r.receita,r.custo]));
  const y = value => (max-value)/(max-min)*100;
  const current = series.find(r=>r.mes===hovered);
  return <section className="card rvm-chart" aria-label="Receitas e custos por mês">
    <header><div><span className="rvm-eyebrow">EVOLUÇÃO MENSAL</span><h2>Receitas e custos</h2><p>Clique em um mês para filtrar o resultado. Clique novamente para voltar ao período completo.</p></div>{selected && <button className="btn" onClick={onClear}>Limpar mês selecionado</button>}</header>
    <div className="rvm-legend"><span><i className="income"/>Receita</span><span><i className="expense"/>Custos</span><small>{range.startDate.split('-').reverse().join('/')} a {range.endDate.split('-').reverse().join('/')}</small></div>
    <div className="rvm-inspect" aria-live="polite">{current ? <div role="tooltip"><b>{current.label}</b><span>Receita <strong>{money(current.receita)}</strong></span><span>Custos <strong>{money(current.custo)}</strong></span><span>Resultado <strong className={current.receita-current.custo>=0?'positive':'negative'}>{money(current.receita-current.custo)}</strong></span></div> : <span>Passe o mouse ou navegue pelos meses com Tab para consultar os valores.</span>}</div>
    <div className="rvm-scroll"><div className="rvm-plot" style={{minWidth:Math.max(360,series.length*76)}}>
      {[0,25,50,75,100].map(t=><div key={t} className="rvm-grid" style={{top:`${t}%`}}><span>{new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(max-(max-min)*t/100)}</span></div>)}
      <div className="rvm-zero" style={{top:`${y(0)}%`}}/>
      <div className="rvm-months">{series.map(row=><button type="button" key={row.mes} className={`rvm-month ${selected===row.mes?'selected':''}`} aria-pressed={selected===row.mes} aria-label={`${row.label}: receita ${money(row.receita)}, custos ${money(row.custo)}. Filtrar mês`} onMouseEnter={()=>setHovered(row.mes)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(row.mes)} onBlur={()=>setHovered(null)} onClick={()=>onSelect(row.mes)}>
        <span className="rvm-bars">{['receita','custo'].map(key=><i key={key} className={key==='receita'?'income':'expense'} style={{top:`${y(Math.max(0,row[key]))}%`,height:`${Math.max(0.6,Math.abs(row[key])/(max-min)*100)}%`}}/>)}</span><span className="rvm-label">{row.label}</span>
      </button>)}</div>
    </div></div>
    <p className="rvm-note">Valores dentro do período consultado; meses de início e fim podem estar parciais. Meses sem movimentação aparecem zerados.</p>
  </section>;
}

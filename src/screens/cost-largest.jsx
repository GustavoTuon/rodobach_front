import React from 'react';
import {largestCosts,largestGroupName} from './cost-largest-model.js';
import {ecMoney,ecPct} from './cost-analysis-model.js';
import {CostTransactionsTable} from './cost-analysis-components.jsx';

export function LargestCosts({rows,monthCount,onOpenVehicle}){
 const [mode,setMode]=React.useState('vehicle'),[selected,setSelected]=React.useState(''),[showAll,setShowAll]=React.useState(false);
 const model=React.useMemo(()=>largestCosts(rows,monthCount,mode),[rows,monthCount,mode]);
 const selection=model.groups.some(g=>g.name===selected)?selected:'';
 const detailRows=selection?rows.filter(r=>largestGroupName(r,mode)===selection):rows;
 const display=value=>value==null?'—':ecMoney(value);
 const groups=showAll?model.groups:model.groups.slice(0,10);
 return <div>
  <style>{`.ec-largest-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.ec-largest-metrics>div{padding:18px;border:1px solid var(--border);border-radius:10px;background:var(--surface-1)}.ec-largest-metrics span,.ec-largest-metrics small{display:block;color:var(--text-3);font-size:12px}.ec-largest-metrics strong{display:block;font-size:22px;margin:8px 0}.ec-largest-modes{display:flex;gap:8px;flex-wrap:wrap}.ec-largest-row-selected{background:rgba(104,159,255,.1)}.ec-largest-share{height:4px;background:rgba(104,159,255,.15);margin-top:5px;min-width:65px}.ec-largest-share>span{display:block;height:100%;background:#689fff}@media(max-width:900px){.ec-largest-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.ec-largest-metrics{grid-template-columns:1fr}}`}</style>
  <h2>Maiores gastos e origem dos custos</h2><p className="muted">Compare os gastos nos filtros atuais e abra os documentos para conferir fornecedor, placa e itens de origem.</p>
  <div className="ec-largest-metrics">
   <div><span>Custo total selecionado</span><strong>{ecMoney(model.total)}</strong><small>{model.documents} documentos por veículo · {rows.length} rateios</small></div>
   <div><span>Média mensal</span><strong>{ecMoney(model.averageMonth)}</strong><small>{monthCount} {monthCount===1?'mês selecionado':'meses selecionados'}, incluindo meses sem gastos</small></div>
   <div><span>Média por veículo no período</span><strong>{display(model.averageVehicle)}</strong><small>{model.vehicleCount} placas identificadas com lançamentos</small></div>
   <div><span>Média por documento/veículo</span><strong>{display(model.averageDocument)}</strong><small>Valor dentro dos filtros, não da nota inteira</small></div>
  </div>
  {model.largestDocument&&<p className="ec-footnote">Maior documento por veículo: <b>{ecMoney(model.largestDocument.valor)}</b> · {model.largestDocument.placa||'Placa não identificada'} · {model.largestDocument.fornecedor||'Fornecedor não informado'}. Consulte os itens no detalhamento abaixo.</p>}
  <section className="ec-panel">
   <div className="ec-panel-head"><div><h2>Onde estão os maiores gastos?</h2><p>Selecione uma linha para rastrear os lançamentos daquele grupo.</p></div><div className="ec-largest-modes" aria-label="Agrupar maiores gastos">{[['vehicle','Por veículo'],['category','Por categoria'],['supplier','Por fornecedor']].map(([value,label])=><button className={`btn ${mode===value?'primary':''}`} aria-pressed={mode===value} key={value} onClick={()=>{setMode(value);setSelected('');setShowAll(false);}}>{label}</button>)}</div></div>
   <div className="ec-table-scroll"><table className="ec-table"><thead><tr>{['Posição / grupo','Custo total','Participação','Média mensal','Média por documento/veículo','Placas envolvidas','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{groups.map((g,index)=><tr key={g.name} className={selection===g.name?'ec-largest-row-selected':''}>
    <td><button className="ec-link" aria-pressed={selection===g.name} onClick={()=>setSelected(selection===g.name?'':g.name)}>{index+1}. {g.name}</button><small style={{display:'block'}}>{g.documents} documentos por veículo</small></td>
    <td><b>{ecMoney(g.value)}</b></td><td>{g.share==null?'—':ecPct(g.share)}<div className="ec-largest-share"><span style={{width:`${Math.max(0,Math.min(100,g.share||0))}%`}}/></div></td>
    <td>{ecMoney(g.averageMonth)}</td><td>{display(g.averageDocument)}</td><td style={{maxWidth:280,whiteSpace:'normal'}}>{g.plates.join(' · ')}</td>
    <td><button className="btn" onClick={()=>setSelected(g.name)}>Ver lançamentos</button>{mode==='vehicle'&&/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(g.name)&&<button className="btn" onClick={()=>onOpenVehicle(g.name)}>Abrir veículo</button>}</td>
   </tr>)}</tbody></table></div>
   {!groups.length&&<p>Nenhum custo nos filtros selecionados.</p>}
   {model.groups.length>10&&<button className="btn" onClick={()=>setShowAll(!showAll)}>{showAll?'Mostrar os 10 maiores':`Mostrar todos (${model.groups.length})`}</button>}
   <p className="ec-footnote">Médias consideram o período filtrado, inclusive meses parciais. Comparação por valor não mede eficiência nem considera km ou tipo de veículo. Créditos e ajustes mantêm seu sinal original. Fornecedores são agrupados pelo nome exibido.</p>
  </section>
  <div className="ec-panel-head" style={{marginTop:20}}><h2>{selection?`Rastrear: ${selection}`:'Maiores documentos do período'}</h2>{selection&&<button className="btn" onClick={()=>setSelected('')}>Ver todos os grupos</button>}</div>
  <p className="muted">Ordenados do maior para o menor valor. Use “Detalhar itens” para consultar o documento, os rateios e a origem no ERP. Os valores de origem não são somados novamente.</p>
  <CostTransactionsTable key={`${mode}:${selection}`} rows={detailRows} initialSort={{key:'valor',direction:-1}}/>
 </div>;
}

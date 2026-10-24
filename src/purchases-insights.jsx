import React, {useEffect, useState} from "react";
import {purchasesApi as api} from "./purchases-api.js";
import {analysisRows} from "./purchases-analysis.jsx";
import {money, quantity, dateLabel, priceDifference, historyDate} from "./purchases-item-history.jsx";
import ItemHistory from "./purchases-item-history.jsx";
import "./purchases-insights.css";

const percent = value => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR",{maximumFractionDigits:2})}%`;
const unitKey = value => String(value || "").trim().toUpperCase();
export function productComparison(product, rows) {
  const offers = rows.filter(row=>row.productId === product.id);
  const valid = row => row.available && Number.isFinite(Number(row.price)) && row.price>0 && row.quantity>0
    && unitKey(row.unit) === unitKey(product.unidade) && !["", "—", "NÃO INFORMADA"].includes(unitKey(row.unit));
  const comparable = offers.filter(valid);
  const minimum = comparable.length ? Math.min(...comparable.map(row=>Number(row.price))) : null;
  return {minimum, offers:offers.map(row=>({...row, comparable:valid(row),
    difference:valid(row) && minimum ? (row.price / minimum - 1) * 100 : null,
    partial:product.quantidade>0 && row.quantity<product.quantidade,
  })).sort((a,b)=>Number(b.comparable)-Number(a.comparable) || (a.price ?? Infinity)-(b.price ?? Infinity))};
}

const chartSeries = [
  {key:"maximum", label:"Maior cotação ERP", color:"#c94a57"},
  {key:"minimum", label:"Menor cotação ERP", color:"#15906b"},
  {key:"purchase", label:"Última compra do mês", color:"#bf790b"},
];
export function trendSegments(series, key, point) {
  const segments=[]; let current=[];
  series.forEach((row,index)=>{
    if(row[key] == null || !Number.isFinite(Number(row[key]))) { if(current.length) segments.push(current); current=[]; }
    else current.push(point(Number(row[key]),index));
  });
  if(current.length) segments.push(current);
  return segments;
}
function PriceChart({series, unit, hasPurchases=false}) {
  const values=series.flatMap(row=>chartSeries.map(s=>row[s.key])).filter(v=>v != null && Number.isFinite(Number(v))).map(Number);
  if(!values.length) return hasPurchases ? <p className="insights-footnote">Compras exibidas nas unidades originais da nota. Sem pontos comparáveis para o gráfico neste período.</p> : <div className="insights-empty">Sem preços comparáveis no ERP para este produto, empresa e unidade no período.</div>;
  const max=Math.max(...values)*1.15 || 1;
  const x=index=>64 + index * (660 / Math.max(1,series.length-1));
  const y=value=>225 - (value/max)*185;
  return <>
    <ul className="insights-legend">{chartSeries.map(s=><li key={s.key}><i style={{background:s.color}}/>{s.label}</li>)}</ul>
    <div className="insights-chart-scroll">
      <svg viewBox="0 0 770 275" role="img" aria-label={`Evolução mensal dos preços por ${unit}. Valores detalhados na tabela abaixo.`}>
        {[0,.25,.5,.75,1].map(f=><g key={f}><line x1="64" x2="724" y1={y(f*max)} y2={y(f*max)} stroke="#e5eaf0" strokeDasharray="4 4"/><text x="56" y={y(f*max)+4} textAnchor="end" className="insights-axis">{(f*max).toLocaleString("pt-BR",{maximumFractionDigits:2})}</text></g>)}
        {series.map((row,i)=><text key={row.month} x={x(i)} y="249" textAnchor="middle" className="insights-axis">{row.month.slice(5)}/{row.month.slice(2,4)}</text>)}
        {chartSeries.map(s=><g key={s.key}>
          {trendSegments(series,s.key,(v,i)=>`${x(i)},${y(v)}`).map((points,i)=><polyline key={i} points={points.join(" ")} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.key === "purchase" ? "6 3" : undefined}/>)}
          {series.map((row,i)=>row[s.key] != null && <circle key={row.month} cx={x(i)} cy={y(row[s.key])} r="4" fill={s.color}><title>{row.month} · {s.label}: {money(row[s.key])}</title></circle>)}
        </g>)}
      </svg>
    </div>
    <details className="insights-chart-values"><summary>Ver valores do gráfico</summary><div className="insights-table-scroll"><table><thead><tr><th>Mês</th>{chartSeries.map(s=><th key={s.key}>{s.label}</th>)}</tr></thead><tbody>{series.map(row=><tr key={row.month}><td>{row.month}</td>{chartSeries.map(s=><td key={s.key}>{row[s.key] == null ? "—" : money(row[s.key])}</td>)}</tr>)}</tbody></table></div></details>
  </>;
}

function ProductAnalysis({quote, onOpen}) {
  const [chartMode,setChartMode]=useState("offers");
  const [onlyComparable,setOnlyComparable]=useState(false);
  const [selected,setSelected]=useState(quote.itens[0]?.id || ""), [query,setQuery]=useState("");
  const [history,setHistory]=useState({loading:true,rows:[],error:""}), [trend,setTrend]=useState({loading:true,series:[],error:""});
  const [retry,setRetry]=useState(0);
  const [reference,setReference]=useState("abertura");
  const referenceQuery=reference === "atual" ? "?referencia=atual" : "";
  const product=quote.itens.find(item=>item.id===selected);
  useEffect(()=>{
    let active=true;setHistory({loading:true,rows:[],error:""});
    api(`/cotacoes/${quote.id}/historico${referenceQuery}`).then(rows=>{if(active)setHistory({loading:false,rows,error:""});})
      .catch(error=>{if(active)setHistory({loading:false,rows:[],error:error.message});});
    return()=>{active=false;};
  },[quote.id,retry,referenceQuery]);
  useEffect(()=>{
    if(!selected)return;
    let active=true;setTrend({productId:selected,loading:true,series:[],error:""});
    api(`/cotacoes/${quote.id}/tendencia?${new URLSearchParams({produtoId:selected,...(reference === "atual" ? {referencia:"atual"} : {})})}`)
      .then(data=>{if(active)setTrend({...data,productId:selected,loading:false,error:""});})
      .catch(error=>{if(active)setTrend({productId:selected,loading:false,series:[],error:error.message});});
    return()=>{active=false;};
  },[quote.id,selected,retry,reference]);
  if(!product) return <p className="insights-empty">Esta cotação não possui produtos.</p>;
  const {minimum,offers}=productComparison(product,analysisRows(quote));
  const comparableOffers=offers.filter(row=>row.comparable);
  const visibleOffers=onlyComparable ? comparableOffers : offers;
  const maximum=Math.max(1,...comparableOffers.map(row=>Number(row.price)));
  const previous=history.loading ? undefined : history.rows.filter(row=>String(row.produto_id)===String(product.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)))[0];
  const delta=priceDifference(minimum,previous,product.unidade);
  const historicalLabel=history.loading ? "Consultando…" : history.error ? "Indisponível" : "Sem compra anterior";
  const previousPurchases=history.rows.filter(row=>String(row.produto_id)===String(product.id)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const filtered=quote.itens.filter(item=>`${item.nome} ${item.codigo}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <>
    <div className="insights-toolbar"><div className="insights-context"><div><span className="purchase-eyebrow">PRODUTO EM ANÁLISE</span><h3>{product.nome}</h3><p>Empresa {product.empresa} · Código {product.codigo} · {product.quantidade == null ? "Quantidade solicitada não informada" : `${quantity(product.quantidade)} ${product.unidade} solicitados`}</p></div><button onClick={()=>onOpen(quote.id)}>Abrir cotação →</button></div>
    <label className="insights-reference">Consultar compras e preços<select value={reference} onChange={e=>setReference(e.target.value)}><option value="abertura">Até a abertura da cotação</option><option value="atual">Até hoje — incluir compras posteriores</option></select></label></div>
    <div className="insights-kpis">
      <article className="insights-kpi best"><span>Menor unitário cotado</span><strong>{minimum == null ? "Sem oferta válida" : money(minimum)}</strong><small>por {product.unidade} · sem frete</small></article>
      <article className="insights-kpi supplier"><span>Fornecedor da última compra</span><strong>{previous ? previous.fornecedor || "Fornecedor não informado" : historicalLabel}</strong><small>{reference === "atual" ? "Compras registradas até hoje" : "Até a abertura da cotação"}</small></article>
      <article className="insights-kpi"><span>Data da última compra</span><strong>{previous ? dateLabel(previous.data) : "—"}</strong><small>Entrada / emissão da nota</small></article>
      <article className="insights-kpi"><span>Último unitário na NF</span><strong>{previous ? money(previous.valor_unitario) : "—"}</strong><small>{previous ? previous.unidade || "Unidade não informada" : historicalLabel}</small></article>
      <article className={`insights-kpi ${delta == null ? "unknown" : ""} ${delta < 0 ? "down" : delta > 0 ? "up" : ""}`}><span>Variação vs última compra</span><strong>{percent(delta)}</strong><small>{delta == null ? "Requer preço e unidade compatíveis" : delta < 0 ? "Menor cotação abaixo da compra anterior" : delta > 0 ? "Menor cotação acima da compra anterior" : "Mesmo preço unitário"}</small></article>
    </div>
    {previous && <details key={`${selected}-${reference}`} className="purchase-card insights-invoice">
      <summary><span>Nota fiscal da última compra <small>NF {previous.documento || "—"} · {dateLabel(previous.data)}</small></span><span>Ver detalhes +</span></summary>
      <section aria-label="Nota fiscal da última compra">
      <p>NF {previous.documento || "não informada"}{previous.serie != null ? ` · Série ${previous.serie}` : ""} · {dateLabel(previous.data)}</p>
      <dl><div><dt>Unitário na nota</dt><dd>{money(previous.valor_unitario)}</dd></div><div><dt>Quantidade</dt><dd>{quantity(previous.quantidade)} {previous.unidade || "(unidade não informada)"}</dd></div><div><dt>Total do produto na nota</dt><dd>{money(previous.total_nota)}</dd></div><div><dt>Desconto registrado do item</dt><dd>{money(previous.desconto)}</dd></div><div><dt>Frete registrado do item</dt><dd>{money(previous.frete)}</dd></div></dl>
      <p className="insights-footnote">Valores lançados na nota fiscal de entrada, sem confirmação de pagamento. O total é deste produto, não da nota inteira. Descontos e frete são exibidos conforme registrados, sem recalcular o total.</p>
      {!previous.unidade && <p className="insights-footnote">A unidade não está identificada no cadastro da nota; este preço não entra na comparação percentual nem no gráfico.</p>}
    </section></details>}
    {history.error && <p role="alert">Compras anteriores indisponíveis: {history.error} <button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></p>}
    <div className="insights-middle">
      <aside className="purchase-card insights-products"><label>Produtos da cotação<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nome ou código"/></label><div className="insights-product-list">{filtered.map(item=><button key={item.id} aria-pressed={item.id===selected} onClick={()=>setSelected(item.id)}><span>{item.nome}</span><small>Cód. {item.codigo} · {item.unidade}</small></button>)}{!filtered.length && <p>Nenhum produto encontrado.</p>}</div></aside>
      <section className="purchase-card insights-trend"><header><div><h3>{chartMode === "offers" ? "Preços desta cotação" : "Cotado × comprado"}</h3><p>{chartMode === "offers" ? `${comparableOffers.length} ofertas comparáveis · preço por ${product.unidade}` : `12 meses até ${dateLabel(reference === "atual" ? trend.cutoff || new Date().toISOString() : historyDate(quote))} · valores por ${product.unidade}`}</p></div><div className="insights-tabs" role="group" aria-label="Visualização de preços"><button aria-pressed={chartMode === "offers"} onClick={()=>setChartMode("offers")}>Fornecedores</button><button aria-pressed={chartMode === "history"} onClick={()=>setChartMode("history")}>Histórico ERP</button></div></header>
        {chartMode === "history" && !history.loading && previousPurchases.length>0 && <section className="insights-recent" aria-label="Valores das últimas compras">
          <h4>Últimas compras registradas <small>Até a data de referência · independente da unidade</small></h4>
          <div className="insights-recent-grid">{previousPurchases.slice(0,3).map((purchase,index)=><article key={`${purchase.documento}-${index}`}>
            <header><strong>{dateLabel(purchase.data)}</strong><span>{index===0 ? "Mais recente" : `${index+1}ª anterior`}</span></header>
            <p className="insights-recent-supplier">{purchase.fornecedor || "Fornecedor não informado"}</p>
            <span className="insights-recent-label">Valor unitário na NF</span>
            <strong className="insights-recent-price">{money(purchase.valor_unitario)} <small>/ {purchase.unidade || "unidade não informada"}</small></strong>
            <dl><div><dt>Quantidade</dt><dd>{quantity(purchase.quantidade)} {purchase.unidade || ""}</dd></div><div><dt>Total do produto na NF</dt><dd>{money(purchase.total_nota)}</dd></div></dl>
            <footer>NF {purchase.documento || "—"}{purchase.serie != null ? ` · Série ${purchase.serie}` : ""}</footer>
          </article>)}</div>
        </section>}
        {chartMode === "offers" ? <div className="insights-bars" aria-label="Preços por fornecedor">
          {comparableOffers.map(row=><div key={row.id} className={`insights-bar-row ${Number(row.price)===minimum ? "best" : ""}`}><div><span title={row.supplier}>{row.supplier}</span><strong>{money(row.price)}</strong></div><div className="insights-bar-track"><span style={{width:`${Number(row.price)/maximum*100}%`}}/></div><small>{Number(row.price)===minimum ? "Menor unitário" : `${percent(row.difference)} sobre o menor`}{row.partial ? " · Quantidade parcial" : ""}</small></div>)}
          {!comparableOffers.length && <p className="insights-empty">Ainda não há ofertas com preço e unidade comparáveis. Confira as condições na tabela abaixo.</p>}
        </div> : trend.productId!==selected || trend.loading ? <p role="status" className="insights-empty">Consultando evolução de preços…</p> : trend.error ? <p role="alert">Histórico de preços indisponível: {trend.error} <button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></p> : <PriceChart series={trend.series} unit={product.unidade} hasPurchases={previousPurchases.length>0}/>}
        {chartMode === "history" && previousPurchases.length>0 && <div className="insights-history-notice"><strong>Este produto já foi comprado nesta empresa.</strong><span>Confira as notas abaixo. O gráfico mostra apenas preços na mesma unidade e dentro dos 12 meses; a lista mantém também os demais registros.</span></div>}
        <p className="insights-footnote">{chartMode === "offers" ? "Verde identifica o menor unitário; azul, as demais ofertas. Valores sem frete. Confira quantidade, marca e prazo antes de decidir." : "Cotações ERP não recusadas: total ÷ quantidade. Compra: último unitário registrado no mês. Mesma empresa e unidade; meses sem registro ficam sem ponto. O gráfico não inclui propostas criadas no portal."}</p>
      </section>
    </div>
    <section className="purchase-card insights-purchase-history">
      <ItemHistory key={`${selected}-${reference}`} product={product} preview={previousPurchases} cutoff={reference === "atual" ? historyDate({criado_em:new Date().toISOString()}) : historyDate(quote)} loading={history.loading} error={history.error}/>
      <p className="insights-footnote">Notas fiscais de entrada da empresa {product.empresa}. PC, UN e outras unidades são preservadas como registradas; não há conversão automática. Use “Ver histórico completo” para consultar outras datas e filtrar fornecedores.</p>
    </section>
    <section className="purchase-card insights-offers"><header><div><h3>Comparativo de fornecedores <span className="insights-count">{offers.length}</span></h3><p>Compare preço, quantidade e condição de entrega.</p></div><label className="insights-filter"><input type="checkbox" checked={onlyComparable} onChange={e=>setOnlyComparable(e.target.checked)}/> Somente preços comparáveis</label></header>
      <p className="insights-footnote">Diferença calculada sobre o menor unitário disponível, inclusive ofertas parciais. Frete é por proposta e não entra neste ranking. Preço menor não define o vencedor.</p>
      <div className="insights-table-scroll" role="region" aria-label="Comparativo de fornecedores" tabIndex={0}><table><thead><tr><th>Fornecedor</th><th>Quantidade</th><th>Unitário</th><th>Diferença</th><th>Total ofertado</th><th>Condição</th><th>Marca / observações</th></tr></thead><tbody>{visibleOffers.map(row=><tr key={row.id} className={row.comparable && row.price===minimum ? "is-lowest" : ""}><td><strong>{row.supplier}</strong><small>{row.delivery ? `Entrega: ${row.delivery} · ` : ""}{row.payment || ""}</small></td><td>{quantity(row.quantity)} {row.unit}</td><td>{money(row.price)}</td><td><span className={`insights-difference ${row.difference === 0 ? "lowest" : row.difference > 0 ? "higher" : ""}`}>{percent(row.difference)}</span></td><td>{money(row.total)}</td><td><span className={`insights-condition ${row.partial || !row.comparable ? "attention" : ""}`}>{!row.available ? row.status : !row.comparable ? "Preço não comparável" : row.partial ? "Quantidade parcial" : product.quantidade == null ? "Quantidade solicitada desconhecida" : "Atende quantidade"}</span>{row.comparable && row.price===minimum && <small>Menor unitário</small>}</td><td>{row.brand}<small>{row.notes || "Sem observações"}</small></td></tr>)}</tbody></table></div>
      {!offers.length && <p className="insights-empty">Ainda não há propostas para este produto.</p>}
    </section>
  </>;
}

export default function PurchaseInsights({quotes, onOpen}) {
  const [choice,setChoice]=useState(""), [state,setState]=useState({loading:true}), [retry,setRetry]=useState(0);
  const id=quotes.some(q=>q.id===choice) ? choice : quotes[0]?.id;
  useEffect(()=>{
    if(!id)return;
    let active=true;setState({id,loading:true});
    api(`/cotacoes/${id}`).then(quote=>{if(active)setState({id,loading:false,quote});}).catch(error=>{if(active)setState({id,loading:false,error:error.message});});
    return()=>{active=false;};
  },[id,retry]);
  return <div className="purchase-insights"><header className="purchase-card insights-picker"><div><span className="purchase-eyebrow">INTELIGÊNCIA DE COMPRAS</span><h2>Análise de cotações</h2><p>Compare propostas e acompanhe o preço de cada produto.</p></div><label>Cotação em análise<select value={id || ""} onChange={e=>setChoice(e.target.value)}>{!quotes.length && <option value="">Nenhuma cotação disponível</option>}{quotes.map(q=><option key={q.id} value={q.id}>{q.titulo} · {dateLabel(q.criado_em)}</option>)}</select></label></header>
    {!id ? <p className="insights-empty">Crie uma cotação ou importe as cotações do sistema para começar.</p> : state.id!==id || state.loading ? <p role="status">Carregando análise…</p> : state.error ? <p role="alert">{state.error} <button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></p> : <ProductAnalysis key={id} quote={state.quote} onOpen={onOpen}/>}
  </div>;
}

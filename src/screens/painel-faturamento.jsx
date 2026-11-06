import React,{useEffect,useRef,useState} from 'react';
import './painel-faturamento.css';

const money=value=>value==null ? '—' : Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const date=value=>value ? value.split('-').reverse().join('/') : 'nenhum dia encerrado';
const labels={acima:'No ritmo da meta',atencao:'Próximo do ritmo',abaixo:'Abaixo do ritmo',sem_base:'Sem base suficiente'};
const monthLabel=month=>new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
export function RevenueGraph({item,period}) {
  const width=560,height=170,pad=10;
  const max=Math.max(1,item.target || 0,...item.series.map(point=>point.revenue));
  const xy=(day,value)=>`${pad+day/period.days*(width-2*pad)},${height-pad-value/max*(height-2*pad)}`;
  const points=item.series.map(point=>xy(point.day,point.revenue)).join(' ');
  const end=item.series.at(-1);
  return <svg className="fr-graph" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Faturamento acumulado de ${item.plate}: ${money(item.actual)}; meta mensal ${money(item.target)}. Linha tracejada indica a meta proporcional.`}>
    {[.25,.5,.75,1].map(n=><line key={n} x1={pad} x2={width-pad} y1={height-pad-n*(height-2*pad)} y2={height-pad-n*(height-2*pad)} className="fr-gridline"/>)}
    {item.target!=null && <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad-item.target/max*(height-2*pad)} className="fr-target-line"/>}
    {end && <polygon points={`${xy(0,0)} ${points} ${xy(end.day,0)}`} className="fr-area"/>}
    <polyline points={points} className="fr-revenue-line"/>
    {end && <circle cx={xy(end.day,end.revenue).split(',')[0]} cy={xy(end.day,end.revenue).split(',')[1]} r="4" className="fr-dot"/>}
  </svg>;
}
export function RevenueCard({item,period,onDetails}) {
  const progress=item.target>0 ? item.actual/item.target*100 : null;
  const remainingDays=Math.max(0,period.days-period.elapsed);
  const dailyNeed=item.remaining!=null && remainingDays>0 ? item.remaining/remainingDays : null;
  const gapLabel=item.gap==null ? 'Comparação indisponível' : item.gap===0 ? 'No valor esperado' : item.gap>0 ? 'Acima do esperado' : 'Falta para o ritmo';
  return <article className={`fr-card fr-${item.status}`} aria-label={`Veículo ${item.plate}`}>
    <div className="fr-card-top"><div><h2>{item.plate}</h2><p title={item.driver || item.model}>{item.driver || item.model || 'Veículo da frota'}</p></div><span className="fr-badge"><i/>{labels[item.status]}</span></div>
    <div className="fr-main-number"><span>FATURADO NO MÊS{period.cutoff ? ` · ATÉ ${date(period.cutoff).slice(0,5)}` : ' · SEM DIA ENCERRADO'}</span><strong>{money(item.actual)}</strong><div>{item.pace==null ? (item.target==null ? 'Histórico insuficiente para definir a meta' : 'Aguardando dias completos') : <><b>{item.pace.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</b> do ritmo esperado</>}{item.provisional && item.target!=null && ' · referência provisória'}</div></div>
    <div className="fr-chart-space"><RevenueGraph item={item} period={period}/><div className="fr-chart-legend"><span>━━ Faturamento</span><span>┄ Meta proporcional</span></div><div className="fr-chart-days"><span>01</span><span>{String(period.days).padStart(2,'0')}</span></div></div>
    <div className="fr-card-metrics"><div><span>Meta mensal de caixa</span><strong>{money(item.target)}</strong></div><div><span>{item.profit ? 'Mínimo de caixa / mês' : 'Esperado até a data'}</span><strong>{money(item.profit ? item.profit.cashBreakEven : item.expected)}</strong></div><div><span>{gapLabel}</span><strong>{money(item.gap==null ? null : Math.abs(item.gap))}</strong></div></div>
    {item.profit && <div className="fr-cost-note">{item.targetMode==='plano_novembro' ? 'Meta definida de novembro' : 'Meta simulada'}{item.trailers?.length ? ` · conjunto com ${item.trailers.join(', ')}` : ''}<br/>{item.planNeedsReview ? 'Custos atuais exigem revisão do plano' : item.profit.reason || (item.profit.beyondHistory ? 'Meta acima do melhor mês · rever custos ou operação' : `Sobra desejada: ${item.profit.margin}% · estimativa por custos registrados`)}</div>}
    {progress!=null && <div className="fr-progress"><div><span>Meta do mês alcançada</span><strong>{progress.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</strong></div><div role="progressbar" aria-label={`Meta mensal de ${item.plate}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,progress))} aria-valuetext={`${progress.toFixed(1)}% da meta mensal`} className="fr-progress-track"><i style={{width:`${Math.min(100,Math.max(0,progress))}%`}}/></div><small>{item.remaining===0 ? 'Meta mensal atingida' : remainingDays===0 ? 'Mês encerrado' : dailyNeed!=null ? `${money(dailyNeed)}/dia nos ${remainingDays} dias restantes para atingir a meta` : 'Meta em acompanhamento'}</small></div>}
    <footer><span>{item.sampleMonths} meses na base · Ano: {money(item.yearRevenue)}</span><button onClick={()=>onDetails(item)}>Ver histórico ↗</button></footer>
  </article>;
}
export function RevenueSummary({data}) {
  const statuses=[['acima','NO RITMO DA META','≥ 100% do esperado','good'],['atencao','PRÓXIMOS DA META','De 90% a menos de 100%','near'],['abaixo','ABAIXO DO RITMO','Abaixo de 90% do esperado','low'],['sem_base','SEM AVALIAÇÃO','Histórico ou dias insuficientes','neutral']];
  return <div className="fr-summary" aria-label="Resumo de todos os veículos da frota">
    <div><span>FATURAMENTO DA FROTA</span><strong>{money(data.summary.actual)}</strong><small>Até {date(data.period.cutoff)}</small></div>
    <div><span>METAS MENSAIS SOMADAS</span><strong>{money(data.summary.target)}</strong><small>{data.summary.withTarget} de {data.items.length} veículos com referência</small></div>
    {statuses.map(([status,label,note,tone])=><div key={status} className={`fr-summary-${tone}`} aria-label={label}><span>{label}</span><strong>{String(data.items.filter(item=>item.status===status).length).padStart(2,'0')} <small>veículos</small></strong><small>{note}</small></div>)}
  </div>;
}
function RevenueHistory({item,onClose,method}) {
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog className="fr-history" ref={dialog} onCancel={onClose} onClick={event=>{if(event.target===dialog.current)onClose();}} aria-labelledby="fr-history-title">
    <header><div><span>BASE DA META</span><h2 id="fr-history-title">{item.plate} · {money(item.target)}/mês</h2></div><button autoFocus onClick={onClose} aria-label="Fechar histórico">×</button></header>
    <p><strong>{item.targetReason}</strong></p>
    {item.plannedTarget!=null && <p>Meta definida para novembro: <strong>{money(item.plannedTarget)}</strong>. Alterar o cenário não modifica esse plano.</p>}
    {item.trailers?.length>0 && <p>Conjunto considerado: {item.plate} + {item.trailers.join(' + ')}. Piso gerencial: {money(item.managementFloor)}.</p>}
    <p>{method.plan}</p><p>{method.target}</p><p>{item.acquired ? `Aquisição: ${date(item.acquired)}.` : 'Aquisição não informada; início estimado pelo primeiro CT-e do ano.'} Base a partir de {monthLabel(item.baseStart)}.</p>
    {item.profit && <section className="fr-profit-details"><h3>Memória do cálculo</h3><dl>
      <div><dt>Custo variável sobre o faturamento</dt><dd>{item.profit.variableRate ?? '—'}%</dd></div>
      <div><dt>Orçamento fixo mensal</dt><dd>{money(item.profit.fixed)}</dd></div>
      <div><dt>Parcelas mensais de referência</dt><dd>{money(item.profit.finance)}</dd></div>
      <div><dt>Reserva adicional por mês</dt><dd>{money(item.profit.reserve)}</dd></div>
      <div><dt>Equilíbrio operacional (sem parcelas)</dt><dd>{money(item.profit.operatingBreakEven)}</dd></div>
      <div><dt>Equilíbrio de caixa (com parcelas)</dt><dd>{money(item.profit.cashBreakEven)}</dd></div>
      <div><dt>Necessário para sobra de {item.profit.margin}%</dt><dd>{money(item.profit.requiredForMargin)}</dd></div>
      <div><dt>Média histórica de faturamento</dt><dd>{money(item.profit.historicalAverage)}</dd></div>
    </dl><p>{item.profit.reason || `${item.profit.coveredMonths} meses com custos na base. Sobra estimada na meta: ${money(item.profit.estimatedCashAtTarget)}.`}</p>
    <details><summary>Contas incluídas e excluídas</summary><table><thead><tr><th>Conta / placa</th><th>Total da base</th><th>Tratamento</th></tr></thead><tbody>{item.profit.accounts.map(row=><tr key={`${row.plate}:${row.account}`}><td>{row.account}<br/><small>{row.plate}</small></td><td>{money(row.total)}</td><td>{{variable:'Variável',fixed:'Orçamento fixo',finance:'Parcelas',excluded:'Excluído'}[row.kind]}</td></tr>)}</tbody></table></details><p>{method.limits}</p></section>}
    {item.provisional && <p className="fr-alert">Menos de três meses válidos ou sem receita suficiente. Esta referência ainda não recebe avaliação de desempenho.</p>}
    <table><thead><tr><th>Mês</th><th>Faturamento</th><th>Uso na meta</th></tr></thead><tbody>{item.history.map(row=><tr key={row.month}><td>{monthLabel(row.month)}</td><td>{money(row.revenue)}</td><td>{row.eligible ? 'Incluído' : 'Fora da base'}</td></tr>)}</tbody></table>
    <p>Projeção linear de fechamento: <strong>{money(item.projection)}</strong>. Restante para a meta mensal: <strong>{money(item.remaining)}</strong>.</p><p>{method.note}</p>
  </dialog>;
}
export default function PainelFaturamento() {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [month,setMonth]=useState(today.slice(0,7)),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[order,setOrder]=useState('pace'),[size,setSize]=useState(9),[page,setPage]=useState(0);
  const [automatic,setAutomatic]=useState(false),[full,setFull]=useState(false),[details,setDetails]=useState(null),[attempt,setAttempt]=useState(0);
  const [margin,setMargin]=useState(15),[reserve,setReserve]=useState(0),[scenario,setScenario]=useState({margin:15,reserve:0});
  const [tvMode,setTvMode]=useState(false);
  const host=useRef(null),lastMonth=useRef(null);
  const [viewport,setViewport]=useState({width:window.innerWidth,height:window.innerHeight});
  useEffect(()=>{const resize=()=>setViewport({width:window.innerWidth,height:window.innerHeight});window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{
    let live=true,busy=false;
    const selection=`${month}:${scenario.margin}:${scenario.reserve}`;
    if(lastMonth.current!==selection){setData(null);setDetails(null);setPage(0);lastMonth.current=selection;}
    async function refresh(){
      if(busy)return;busy=true;setLoading(true);
      try{const value=await window.RB_API.getFleetRevenue(month,scenario);if(live){setData(value);setError('');}}
      catch(error){if(live)setError(error.message || 'Não foi possível consultar o faturamento.');}
      finally{busy=false;if(live)setLoading(false);}
    }
    refresh();const timer=setInterval(refresh,300000);
    return()=>{live=false;clearInterval(timer);};
  },[month,attempt,scenario]);
  useEffect(()=>{const changed=()=>setFull(document.fullscreenElement===host.current);document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
  let items=(data?.items || []).filter(item=>(filter==='all'||item.status===filter) && `${item.plate} ${item.driver||''} ${item.model||''}`.toLowerCase().includes(search.toLowerCase()));
  items=[...items].sort((a,b)=>order==='plate' ? a.plate.localeCompare(b.plate) : order==='revenue' ? b.actual-a.actual : (a.pace??Infinity)-(b.pace??Infinity)||a.plate.localeCompare(b.plate));
  const columns=viewport.width>1200 ? 3 : viewport.width>700 ? 2 : 1;
  const television=full||tvMode;
  const tvRows=Math.max(1,Math.min(2,Math.floor((viewport.height-(viewport.width<=1450?320:230))/420)));
  const pageSize=television ? Math.min(size,columns*tvRows) : size;
  const pages=Math.max(1,Math.ceil(items.length/pageSize)),current=Math.min(page,pages-1),visible=items.slice(current*pageSize,(current+1)*pageSize);
  useEffect(()=>{if(!automatic || pages<2 || details)return;const timer=setInterval(()=>setPage(value=>(value+1)%pages),20000);return()=>clearInterval(timer);},[automatic,pages,details]);
  async function toggleTv(){if(television){setTvMode(false);setAutomatic(false);if(document.fullscreenElement)await document.exitFullscreen();return;}setTvMode(true);setAutomatic(true);setPage(0);try{await host.current.requestFullscreen();}catch{/* Expanded TV layout remains available without fullscreen support. */}}
  return <section className={`fr-panel ${television?'fr-full fr-television':''}`} ref={host}>
    <header className="fr-header"><div><span className="fr-eyebrow">NORTE / INTELIGÊNCIA DA FROTA</span><h1>Faturamento em movimento<span>.</span></h1><p>Uma meta para cada veículo. Um olhar para o ritmo da operação.</p></div><div className="fr-period"><strong>{monthLabel(month)}</strong><span>Somente frota própria · dias encerrados</span></div></header>
    <div className="fr-toolbar"><button className="fr-primary" onClick={toggleTv}>{television?'Sair da TV':'Iniciar na TV ↗'}</button><button onClick={()=>setAttempt(value=>value+1)} disabled={loading}>{loading?'Atualizando…':'Atualizar'}</button><label>Mês<input type="month" min={`${today.slice(0,4)}-01`} max={today.slice(0,7)} value={month} onChange={event=>{if(event.target.value)setMonth(event.target.value);}}/></label><label className="fr-search">Buscar veículo<input placeholder="Placa ou motorista" value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}}/></label><label>Situação<select value={filter} onChange={event=>{setFilter(event.target.value);setPage(0);}}><option value="all">Todos os veículos</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Ordem<select value={order} onChange={event=>{setOrder(event.target.value);setPage(0);}}><option value="pace">Menor ritmo primeiro</option><option value="revenue">Maior faturamento</option><option value="plate">Placa</option></select></label><label>Cartões<select value={size} onChange={event=>{setSize(Number(event.target.value));setPage(0);}}><option value={9}>9 por página</option><option value={6}>6 por página</option><option value={3}>3 por página</option></select></label></div>
    <form className="fr-scenario" onSubmit={event=>{event.preventDefault();setScenario({margin:Number(margin),reserve:Number(reserve)});}}>
      <label>Sobra de caixa desejada (%)<input type="number" min="0" max="40" step="1" value={margin} required onChange={event=>setMargin(event.target.value)}/></label>
      <label>Reserva adicional por veículo (R$/mês)<input type="number" min="0" max="100000" step="100" value={reserve} required onChange={event=>setReserve(event.target.value)}/></label>
      <button disabled={loading}>Aplicar cenário</button><p>{month==='2026-11' && scenario.margin===15 && scenario.reserve===0 ? 'Plano de novembro: metas individuais definidas em 05/11.' : 'Simulação: não altera as metas definidas de novembro.'} Estimativa de caixa, não lucro líquido. Cenário: {scenario.margin}% e reserva de {money(scenario.reserve)}/mês por veículo.</p>
    </form>
    {television && <div className="fr-tv-context"><span>Até {date(data?.period.cutoff)} · sobra desejada {scenario.margin}% · reserva {money(scenario.reserve)}/veículo</span><span>{automatic?'Rotação automática · 20s':'Rotação pausada'} · {current+1}/{pages}</span></div>}
    {error && <p className="fr-alert" role="alert">{error}{data && ' Exibindo a última consulta; os valores podem estar desatualizados.'}</p>}
    {data && <><RevenueSummary data={data}/>
    <div className="fr-section-label"><span><i/> DESEMPENHO POR VEÍCULO <b>{items.length} de {data.items.length}</b></span><small>Linha contínua: realizado · tracejada: meta proporcional</small></div>
    <div className="fr-cards">{visible.map(item=><RevenueCard key={item.plate} item={item} period={data.period} onDetails={setDetails}/>)}</div>
    {!items.length && <div className="fr-empty">Nenhum veículo encontrado para os filtros selecionados.</div>}
    <footer className="fr-pagination"><span>Consulta: {new Date(data.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · atualiza a cada 5 min</span><div><button disabled={pages<2} onClick={()=>setAutomatic(value=>!value)}>{automatic?'Pausar rotação':'Girar páginas · 20s'}</button><button aria-label="Página anterior" disabled={pages<2} onClick={()=>setPage((current+pages-1)%pages)}>←</button><span aria-live="polite">{current+1} / {pages}{television && pageSize<size ? ` · ${pageSize} por tela` : ""}</span><button aria-label="Próxima página" disabled={pages<2} onClick={()=>setPage((current+1)%pages)}>→</button></div></footer>
    <details className="fr-method"><summary>Como calculamos a meta e as cores</summary>{Object.values(data.method).map((text,index)=><p key={index}>{text}</p>)}<p>O mês selecionado não participa da própria meta. Dia atual ainda em andamento fica fora do faturamento e da comparação.</p></details>
    {details && <RevenueHistory item={details} method={data.method} onClose={()=>setDetails(null)}/>}</>}
    {!data && <div className="fr-empty" role="status">{loading?'Consultando o histórico de faturamento da frota…':'Faturamento indisponível. Use Atualizar para tentar novamente.'}</div>}
  </section>;
}
window.PainelFaturamento=PainelFaturamento;

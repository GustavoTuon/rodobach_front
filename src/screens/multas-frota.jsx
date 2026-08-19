const { useEffect, useState } = React;

const brlMulta = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataMulta = value => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day).toLocaleDateString("pt-BR") : "—";
};
const indicacaoLabels = { nao_aplicavel:"Não se aplica", pendente:"Pendente", indicada:"Indicada", confirmada:"Confirmada", prazo_perdido:"Prazo perdido" };
const internoLabels = { acompanhar:"Acompanhar", em_defesa:"Em defesa", deferida:"Deferida", indeferida:"Indeferida", encerrada:"Encerrada" };
const motoristaLabels = { empresa:"Responsabilidade da empresa", descontado:"Descontado do motorista", em_aberto:"Em aberto", alerta:"Alerta: paga e não descontada" };
const multaLabels = { desconto_20:"Com desconto de 20%", desconto_40:"Com desconto de 40%", recorrer:"Recorrer", paga:"Paga" };
const prioridadeLabels = { critica:"Crítica", alta:"Alta", atencao:"Atenção", normal:"Normal" };

function MultaKpi({ label, value, sub, tone }) {
  return <div className="card" style={{padding:14,borderTop:`3px solid ${tone}`}}><small className="muted">{label}</small><div style={{fontSize:24,fontWeight:700,marginTop:5}}>{value}</div><small className="muted">{sub}</small></div>;
}

const MultaFiltro = ({ label, children }) => <label className="multa-filter-field"><span>{label}</span>{children}</label>;

function MultasFrota() {
  const initialFilters = { q:"", placa:"", motorista:"", status:"aberta", indicacao:"todos", statusMotorista:"todos", statusMulta:"todos", vencimentoDe:"", vencimentoAte:"", ordenar:"placa", direcao:"asc", rapido:"todas" };
  const [data,setData]=useState({resumo:{},alertas:[],rankings:{},evolucao:[],qualidade:{},multas:[],paginacao:{page:1,pageSize:40,total:0,totalPages:1}});
  const [filters,setFilters]=useState(initialFilters);
  const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(40);
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [selected,setSelected]=useState(null); const [form,setForm]=useState(null); const [saving,setSaving]=useState(false);
  const [audit,setAudit]=useState([]); const [auditLoading,setAuditLoading]=useState(false); const [quickSaving,setQuickSaving]=useState("");
  const [moreFilters,setMoreFilters]=useState(false);
  const [rankingMetric,setRankingMetric]=useState("quantidade");
  const [evolutionMetric,setEvolutionMetric]=useState("quantidade");

  const load = async (requestedPage=page) => {
    setLoading(true); setError("");
    try { const result=await window.RB_API.listMultasFrota({...filters,page:requestedPage,pageSize}); setData(result); setPage(result.paginacao?.page||requestedPage); }
    catch(e){setError(e.message);} finally{setLoading(false);}
  };
  useEffect(()=>{ const timer=setTimeout(()=>{setPage(1);load(1);},350); return ()=>clearTimeout(timer); },[filters.q,filters.placa,filters.motorista,filters.status,filters.indicacao,filters.statusMotorista,filters.statusMulta,filters.vencimentoDe,filters.vencimentoAte,filters.ordenar,filters.direcao,filters.rapido,pageSize]);
  const open = async item => {
    setSelected(item); setForm({...item.controle}); setAudit([]); setAuditLoading(true);
    try { const result=await window.RB_API.getAuditoriaMultaFrota(item.empresa,item.codigo); setAudit(result.auditoria||[]); }
    catch { setAudit([]); } finally { setAuditLoading(false); }
  };
  const save = async () => { setSaving(true); try { await window.RB_API.saveControleMultaFrota(selected.empresa,selected.codigo,form); setSelected(null); await load(page); } catch(e){window.alert(e.message);} finally{setSaving(false);} };
  const quickSave = async (item, changes) => {
    setQuickSaving(item.id);
    try { await window.RB_API.saveControleMultaFrota(item.empresa,item.codigo,{...item.controle,...changes}); await load(page); }
    catch(e){window.alert(e.message);} finally{setQuickSaving("");}
  };
  const goToPage = next => { setPage(next); load(next); };
  const sortBy = column => setFilters(current => ({...current, ordenar:column, direcao:current.ordenar===column&&current.direcao==="asc"?"desc":"asc"}));
  const sortHeader = (column, label) => <button className={`multa-sort ${filters.ordenar===column?"active":""}`} onClick={()=>sortBy(column)}>{label}<span>{filters.ordenar===column?(filters.direcao==="asc"?"↑":"↓"):"↕"}</span></button>;
  const clearFilters = () => setFilters(initialFilters);
  const daysUntil = value => value ? Math.ceil((new Date(`${value}T12:00:00`)-new Date())/86400000) : null;
  const dueLabel = item => {
    if (!item.vencimento) return "Sem vencimento";
    const days=item.diasParaVencimento;
    if (item.paga) return "Pago";
    if (days<0) return `vencida há ${Math.abs(days)} dia(s)`;
    if (days===0) return "vence hoje";
    return `vence em ${days} dia(s)`;
  };
  const alertsFor = item => {
    const alerts=[]; const dueDays=daysUntil(item.vencimento); const defenseDays=daysUntil(item.limiteDefesa);
    if(item.controle.statusMotorista==="alerta") alerts.push("Multa paga e ainda não descontada do motorista.");
    if(!item.motorista&&item.controle.statusMotorista!=="empresa") alerts.push("Motorista não identificado.");
    if(!item.paga&&dueDays!==null&&dueDays>=0&&dueDays<=10) alerts.push(`Vencimento em ${dueDays} dia(s).`);
    if(!item.paga&&item.vencida) alerts.push("Boleto vencido e ainda não pago.");
    if(defenseDays!==null&&defenseDays>=0&&defenseDays<=10) alerts.push(`Prazo de defesa em ${defenseDays} dia(s).`);
    return alerts;
  };
  const r=data.resumo||{}; const p=data.paginacao||{page:1,total:0,totalPages:1,pageSize};
  const rankValue=item=>Number(item?.[rankingMetric]||0);
  const maxDriverRank=Math.max(1,...(data.rankings?.motoristas||[]).map(rankValue));
  const maxVehicleRank=Math.max(1,...(data.rankings?.veiculos||[]).map(rankValue));
  const evolutionValue=item=>Number(item?.[evolutionMetric]||0);
  const maxEvolution=Math.max(1,...(data.evolucao||[]).map(evolutionValue));
  let previousPlate = null;
  return <div className="view multas-page">
    <div className="page-head"><div><h1>Multas da Frota</h1><div className="sub">Controle por placa, motorista, vencimento, desconto e andamento da multa.</div></div><button className="btn" onClick={()=>load(page)}>Atualizar</button></div>
    <div className="multas-kpis">
      <MultaKpi label="Em aberto" value={r.abertas||0} sub={brlMulta(r.valorAberto)} tone="#f59e0b"/><MultaKpi label="Vencendo em 7 dias" value={r.vencendo7||0} sub={brlMulta(r.valorVencendo7)} tone="#f97316"/><MultaKpi label="Vencidas" value={r.vencidas||0} sub={brlMulta(r.valorVencido)} tone="#ef4444"/><MultaKpi label="Indicação pendente" value={r.indicacaoPendente||0} sub="condutores" tone="#eab308"/><MultaKpi label="Pagas" value={r.pagas||0} sub={brlMulta(r.valorPago)} tone="#22c55e"/><MultaKpi label="Total" value={r.total||0} sub={`${brlMulta(r.valorOriginal)} original`} tone="#64748b"/>
    </div>
    <div className="multas-secondary-kpis">
      <div><span>Empresa responsável</span><strong>{r.responsabilidadeEmpresa||0} multas</strong><small>{brlMulta(r.valorResponsabilidadeEmpresa)}</small></div>
      <div><span>Motoristas responsáveis</span><strong>{r.responsabilidadeMotorista||0} multas</strong><small>{brlMulta(r.valorResponsabilidadeMotorista)}</small></div>
      <div><span>Registros incompletos</span><strong>{r.incompletos||0}</strong><small>precisam de revisão</small></div>
    </div>
    {!!data.alertas?.length&&<div className="card multas-attention"><div className="section-head"><div><h2>Atenção agora</h2><span className="muted">Pendências ordenadas por urgência</span></div></div><div className="multas-alert-grid">{data.alertas.map((alert,index)=><button key={index} onClick={()=>setFilters(current=>({...current,rapido:alert.filtro,status:"todos"}))} className={alert.prioridade}><Icon name="alert"/><span><strong>{alert.titulo}</strong><small>{alert.detalhe}</small></span></button>)}</div></div>}
    <div className="multas-quick-filters">{[["todas","Todas"],["abertas","Em aberto"],["vencendo","Vencendo"],["vencidas","Vencidas"],["sem_indicacao","Sem indicação"],["empresa","Empresa"],["motorista","Motorista"],["sem_responsavel","Sem responsável"],["incompletas","Incompletas"]].map(([value,label])=><button key={value} className={filters.rapido===value?"active":""} onClick={()=>setFilters(current=>({...current,rapido:value,status:"todos"}))}>{label}</button>)}</div>
    <div className="card multas-filtros"><div className="multas-filter-grid extended">
      <MultaFiltro label="Busca"><input placeholder="Auto, infração ou cidade" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Placa"><input placeholder="Digite a placa" value={filters.placa} onChange={e=>setFilters({...filters,placa:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Motorista"><input placeholder="Digite o motorista" value={filters.motorista} onChange={e=>setFilters({...filters,motorista:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Pagamento"><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value,rapido:"todas"})}><option value="todos">Todos os pagamentos ERP</option><option value="aberta">Em aberto</option><option value="vencida">Vencidas</option><option value="paga">Pagas</option></select></MultaFiltro>
      <MultaFiltro label="Mais filtros"><button className={`btn ${moreFilters?"active":""}`} onClick={()=>setMoreFilters(value=>!value)}>Filtros avançados {moreFilters?"−":"+"}</button></MultaFiltro>
      {moreFilters&&<>
      <MultaFiltro label="Responsabilidade"><select value={filters.statusMotorista} onChange={e=>setFilters({...filters,statusMotorista:e.target.value})}><option value="todos">Todos: motorista/empresa</option>{Object.entries(motoristaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></MultaFiltro>
      <MultaFiltro label="Status da multa"><select value={filters.statusMulta} onChange={e=>setFilters({...filters,statusMulta:e.target.value})}><option value="todos">Todos os status da multa</option>{Object.entries(multaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></MultaFiltro>
      <MultaFiltro label="Indicação"><select value={filters.indicacao} onChange={e=>setFilters({...filters,indicacao:e.target.value})}><option value="todos">Todas as indicações</option>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></MultaFiltro>
      <MultaFiltro label="Vencimento de"><input type="date" value={filters.vencimentoDe} onChange={e=>setFilters({...filters,vencimentoDe:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Vencimento até"><input type="date" value={filters.vencimentoAte} onChange={e=>setFilters({...filters,vencimentoAte:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Ordenar por"><select value={filters.ordenar} onChange={e=>setFilters({...filters,ordenar:e.target.value})}><option value="placa">Agrupar por placa</option><option value="auto">Auto/infração</option><option value="vencimento">Vencimento</option><option value="dataInfracao">Data da infração</option><option value="valor">Valor</option><option value="motorista">Motorista</option><option value="statusMotorista">Status do motorista</option><option value="statusMulta">Status da multa</option><option value="responsavel">Responsável</option></select></MultaFiltro>
      <MultaFiltro label="Ordem"><select value={filters.direcao} onChange={e=>setFilters({...filters,direcao:e.target.value})}><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></MultaFiltro>
      <MultaFiltro label="Ações"><button className="btn" onClick={clearFilters}>Limpar filtros</button></MultaFiltro>
      </>}
    </div><small className="muted multa-filter-hint">Os resultados são atualizados automaticamente ao preencher os filtros.</small></div>
    {error&&<div className="alert danger">{error}</div>}
    <div className="card multas-table-card"><div className="multas-table-head"><span><strong>{p.total||0}</strong> multas encontradas</span><span>Página {p.page||1} de {p.totalPages||1}</span></div><div className="table-wrap"><table className="data-table multas-table"><thead><tr><th>{sortHeader("prioridade","Prioridade")}</th><th>{sortHeader("auto","Auto / infração")}</th><th>{sortHeader("placa","Placa / motorista")}</th><th>{sortHeader("dataInfracao","Data da infração")}</th><th>{sortHeader("vencimento","Prazo")}</th><th className="num">{sortHeader("valor","Valor")}</th><th>{sortHeader("statusMotorista","Status motorista")}</th><th>{sortHeader("statusMulta","Status multa")}</th><th>{sortHeader("responsavel","Responsável")}</th></tr></thead><tbody>
      {!loading&&!data.multas?.length&&<tr><td colSpan="9" className="muted" style={{textAlign:"center",padding:30}}>Nenhuma multa encontrada.</td></tr>}
      {loading&&<tr><td colSpan="9" className="muted" style={{textAlign:"center",padding:30}}>Carregando multas…</td></tr>}
      {!loading&&(data.multas||[]).map(item=>{ const showGroup=filters.ordenar==="placa"&&item.placa!==previousPlate; previousPlate=item.placa; const group=data.gruposPlaca?.[item.placa||"Sem placa"]; return <React.Fragment key={item.id}>{showGroup&&<tr className="multa-plate-group"><td colSpan="9"><div><strong>{item.placa||"Sem placa"}</strong>{group&&<span>{group.quantidade} multa(s) · {brlMulta(group.valorTotal)} · {group.pagas} paga(s) · {group.abertas} aberta(s){group.alertas?` · ${group.alertas} alerta(s)`:""}</span>}</div></td></tr>}<tr className="clickable" onClick={()=>open(item)}><td><span className={`multa-priority ${item.prioridade}`}>{prioridadeLabels[item.prioridade]||item.prioridade}</span></td><td><strong>{item.auto||`#${item.codigo}`}</strong><div className="muted multa-desc">{item.infracaoCategoria} · {item.infracaoDescricao||item.infracao}</div></td><td><strong className="plate-text">{item.placa||"Sem placa"}</strong><div className="muted multa-driver">{item.motorista||"Sem motorista"}</div></td><td className="date">{dataMulta(item.dataInfracao)}</td><td className={`date ${item.vencida?"multa-overdue":""}`}><strong>{dataMulta(item.vencimento)}</strong><small className="muted">{dueLabel(item)}</small></td><td className="num"><strong>{brlMulta(item.valorFinal)}</strong>{item.desconto>0&&<small className="muted">Desconto para pagamento: {brlMulta(item.desconto)}</small>}</td><td><span className={`multa-status driver-${item.controle.statusMotorista}`}>{motoristaLabels[item.controle.statusMotorista]}</span></td><td onClick={e=>e.stopPropagation()}>{item.paga?<span className="multa-status fine-paga">Paga</span>:<select className="multa-quick-select" disabled={quickSaving===item.id} value={item.controle.statusMulta} onChange={e=>quickSave(item,{statusMulta:e.target.value})}>{Object.entries(multaLabels).filter(([v])=>v!=="paga").map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}</td><td onClick={e=>e.stopPropagation()}><select className="multa-quick-select" disabled={quickSaving===item.id} value={item.controle.statusInterno} onChange={e=>quickSave(item,{statusInterno:e.target.value})}>{Object.entries(internoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><small className="muted">{item.controle.responsavel||"Sem responsável"}</small></td></tr></React.Fragment>;})}
    </tbody></table></div><div className="multas-pagination"><button className="btn" disabled={p.page<=1||loading} onClick={()=>goToPage(p.page-1)}>Anterior</button><span>{p.total?((p.page-1)*p.pageSize+1):0}–{Math.min(p.page*p.pageSize,p.total||0)} de {p.total||0}</span><label>Por página <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option>20</option><option>40</option><option>60</option><option>100</option></select></label><button className="btn" disabled={p.page>=p.totalPages||loading} onClick={()=>goToPage(p.page+1)}>Próxima</button></div></div>
    <section className="multas-management">
      <div className="card multas-evolution"><div className="section-head"><div><h2>Evolução das multas</h2><span className="muted">Últimos 12 meses pela data da infração</span></div><select value={evolutionMetric} onChange={e=>setEvolutionMetric(e.target.value)}><option value="quantidade">Quantidade</option><option value="valor">Valor total</option><option value="aberto">Valor em aberto</option></select></div><div className="multas-evolution-chart">{(data.evolucao||[]).map(item=><div key={item.mes}><span title={evolutionMetric==="quantidade"?`${item.quantidade} multas`:brlMulta(item[evolutionMetric])} style={{height:`${Math.max(4,evolutionValue(item)/maxEvolution*100)}%`}}/><small>{item.mes.slice(5)}/{item.mes.slice(2,4)}</small></div>)}</div>{!data.evolucao?.length&&<div className="muted">Sem dados mensais para o período.</div>}</div>
      <div className="card multas-rankings"><div className="section-head"><div><h2>Rankings operacionais</h2><span className="muted">Concentração de ocorrências</span></div><select value={rankingMetric} onChange={e=>setRankingMetric(e.target.value)}><option value="quantidade">Quantidade</option><option value="valor">Valor</option><option value="abertas">Em aberto</option></select></div><div className="multas-ranking-columns"><div><h3>Motoristas</h3>{(data.rankings?.motoristas||[]).slice(0,5).map(item=><div className="multa-rank-row" key={item.motorista}><span><strong>{item.motorista}</strong><small>{item.quantidade} multas · {item.abertas} abertas</small></span><i><b style={{width:`${rankValue(item)/maxDriverRank*100}%`}}/></i><em>{rankingMetric==="valor"?brlMulta(item.valor):rankValue(item)}</em></div>)}</div><div><h3>Veículos</h3>{(data.rankings?.veiculos||[]).slice(0,5).map(item=><div className="multa-rank-row" key={item.placa}><span><strong>{item.placa}</strong><small>{item.quantidade} multas · {item.abertas} abertas</small></span><i><b style={{width:`${rankValue(item)/maxVehicleRank*100}%`}}/></i><em>{rankingMetric==="valor"?brlMulta(item.valor):rankValue(item)}</em></div>)}</div></div></div>
    </section>
    <details className="card multas-quality"><summary>Qualidade dos registros <span className="muted">Abrir conferência</span></summary><div className="multas-quality-grid">{[["Sem vencimento",data.qualidade?.semVencimento],["Sem motorista",data.qualidade?.semMotorista],["Sem placa",data.qualidade?.semPlaca],["Sem responsável",data.qualidade?.semResponsavel],["Sem auto",data.qualidade?.semAuto],["Sem valor",data.qualidade?.semValor]].map(([label,value])=><button key={label} onClick={()=>setFilters(current=>({...current,rapido:"incompletas",status:"todos"}))}><strong>{value||0}</strong><span>{label}</span></button>)}</div></details>
    {selected&&form&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="modal-box multa-detail-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>MULTA {selected.auto||selected.codigo} · CÓDIGO {selected.codigo}</small><h2>{selected.placa||"Sem placa"} · {selected.motorista||"Sem motorista"}</h2><div className="multa-modal-badges"><span className={`multa-priority ${selected.prioridade}`}>{prioridadeLabels[selected.prioridade]}</span><span className="multa-status">{internoLabels[selected.controle.statusInterno]}</span></div></div><button className="icon-btn" onClick={()=>setSelected(null)}><Icon name="x"/></button></div><div className="modal-body">
      <section className="multa-next-action"><small>Próxima ação</small><strong>{selected.proximaAcao}</strong>{selected.vencimento&&<span>{dataMulta(selected.vencimento)} · {dueLabel(selected)}</span>}</section>
      {!!alertsFor(selected).length&&<section className="multa-alert-list">{alertsFor(selected).map(message=><div key={message}><Icon name="alert"/><span>{message}</span></div>)}</section>}
      <section className="multa-detail-section"><h3>Informações da infração</h3><div className="multa-info-grid"><div><small>Código da infração</small><strong>{selected.infracao}</strong></div><div><small>Tipo da infração</small><strong className="multa-category">{selected.infracaoCategoria}</strong></div><div><small>Gravidade / pontos</small><strong>{selected.gravidadeDescricao||"Não informada"}{selected.pontos?` · ${selected.pontos} pontos`:""}</strong></div><div className="wide"><small>O que é a infração?</small><strong>{selected.infracaoDescricao||"Descrição não cadastrada no ERP"}</strong></div><div><small>Data e hora</small><strong>{dataMulta(selected.dataInfracao)}{selected.horaInfracao?` · ${String(selected.horaInfracao).slice(0,5)}`:""}</strong></div><div><small>Local</small><strong>{selected.local||selected.cidade||"Não informado"}</strong></div><div><small>Motorista</small><strong>{selected.motorista||"Não identificado"}</strong></div><div><small>Responsabilidade</small><strong>{motoristaLabels[selected.controle.statusMotorista]}</strong></div></div></section>
      <section className="multa-detail-section"><h3>Valores e pagamento</h3><div className="multa-values-grid"><div><small>Valor original</small><strong>{brlMulta(selected.valor)}</strong></div><div><small>Desconto</small><strong>{brlMulta(selected.desconto)}</strong></div><div><small>Juros</small><strong>{brlMulta(selected.juros)}</strong></div><div className="primary"><small>Valor final</small><strong>{brlMulta(selected.valorFinal)}</strong></div><div className={selected.paga?"paid":""}><small>Valor pago</small><strong>{selected.paga?brlMulta(selected.valorPago):"Ainda não pago"}</strong></div></div></section>
      <section className="multa-detail-section"><h3>Prazos e andamento</h3><div className="multa-timeline"><div className="done"><i/><span><small>Infração</small><b>{dataMulta(selected.dataInfracao)}</b></span></div><div className={selected.limiteDefesaPrevia?"done":""}><i/><span><small>Defesa prévia</small><b>{dataMulta(selected.limiteDefesaPrevia)}</b></span></div><div className={selected.limiteDefesa?"done":""}><i/><span><small>Prazo de recurso</small><b>{dataMulta(selected.limiteDefesa)}</b></span></div><div className={selected.paga?"done":selected.vencida?"danger":""}><i/><span><small>Vencimento</small><b>{dataMulta(selected.vencimento)}</b></span></div><div className={selected.paga?"done":""}><i/><span><small>Pagamento</small><b>{selected.paga?dataMulta(selected.dataPagamento):"Pendente"}</b></span></div><div className={selected.controle.statusMotorista==="descontado"?"done":selected.controle.statusMotorista==="alerta"?"danger":""}><i/><span><small>Desconto motorista</small><b>{motoristaLabels[selected.controle.statusMotorista]}</b></span></div></div></section>
      <section className="multa-detail-section"><h3>Controle interno</h3><div className="multa-form-grid"><label><span>Status do motorista <small className="muted">(ERP)</small></span><select value={form.statusMotorista} disabled>{Object.entries(motoristaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Status da multa {selected.paga&&<small className="muted">(pago no ERP)</small>}</span><select value={form.statusMulta} disabled={selected.paga} onChange={e=>setForm({...form,statusMulta:e.target.value})}>{Object.entries(multaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Status da indicação</span><select value={form.statusIndicacao} onChange={e=>setForm({...form,statusIndicacao:e.target.value})}>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Data da indicação</span><input type="date" value={form.indicadoEm||""} onChange={e=>setForm({...form,indicadoEm:e.target.value})}/></label><label><span>Status interno</span><select value={form.statusInterno} onChange={e=>setForm({...form,statusInterno:e.target.value})}>{Object.entries(internoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Responsável</span><input value={form.responsavel||"Será definido ao salvar"} readOnly/></label></div><label><span>Link do comprovante/documento</span><input value={form.comprovanteUrl||""} onChange={e=>setForm({...form,comprovanteUrl:e.target.value})}/></label><label><span>Observações internas</span><textarea rows="3" value={form.observacoes||""} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>{selected.observacaoErp&&<div className="multa-erp-note"><small>Observação do ERP</small><p>{selected.observacaoErp}</p></div>}</section>
      <section className="multa-detail-section"><h3>Histórico de alterações</h3>{auditLoading?<div className="muted">Carregando histórico…</div>:!audit.length?<div className="muted">Nenhuma alteração interna registrada.</div>:<div className="multa-audit-list">{audit.map(entry=><div key={entry.id}><i/><span><strong>{entry.usuario_login||"Sistema"}</strong><small>{new Date(entry.criado_em).toLocaleString("pt-BR")}</small></span><p>{internoLabels[entry.dados_novos?.status_interno]||entry.dados_novos?.status_interno} · {multaLabels[entry.dados_novos?.status_multa]||entry.dados_novos?.status_multa}</p></div>)}</div>}</section>
    </div><div className="modal-foot"><button className="btn" onClick={()=>setSelected(null)}>Cancelar</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Salvando…":"Salvar controle"}</button></div></div></div>}
  </div>;
}

window.MultasFrota=MultasFrota;

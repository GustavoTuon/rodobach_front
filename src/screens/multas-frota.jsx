import MultaAutocomplete from '../multa-autocomplete.jsx';
import { loadGroupedMultas } from '../multas-groups.js';

const { useEffect, useState, useRef } = React;

const localTodayMulta = () => { const now=new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; };
const brlMulta = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataMulta = value => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day).toLocaleDateString("pt-BR") : "—";
};
const indicacaoLabels = { nao_aplicavel:"Não se aplica", pendente:"Pendente", indicada:"Indicada", confirmada:"Confirmada", prazo_perdido:"Prazo perdido" };
const internoLabels = { acompanhar:"Acompanhar", em_defesa:"Em defesa", deferida:"Deferida", indeferida:"Indeferida", encerrada:"Encerrada" };
const motoristaLabels = { empresa:"Responsabilidade da empresa", descontado:"Descontado do motorista", em_aberto:"Em aberto", alerta:"Alerta: paga e não descontada" };
const prioridadeLabels = { critica:"Crítica", alta:"Alta", atencao:"Atenção", normal:"Normal" };

function MultaKpi({ label, value, sub, tone }) {
  return <div className="card" style={{padding:14,borderTop:`3px solid ${tone}`}}><small className="muted">{label}</small><div style={{fontSize:24,fontWeight:700,marginTop:5}}>{value}</div><small className="muted">{sub}</small></div>;
}

const MultaFiltro = ({ label, children }) => <label className="multa-filter-field"><span>{label}</span>{children}</label>;

function MultasFrota() {
  const initialFilters = { q:"", infracaoDe:"2026-01-01", infracaoAte:"", placa:"", motorista:"", status:"todos", indicacao:"todos", statusMotorista:"todos", vencimentoDe:"", vencimentoAte:"", agrupar:"motorista", ordenar:"dataInfracao", direcao:"asc", rapido:"todas" };
  const [data,setData]=useState({resumo:{},alertas:[],rankings:{},evolucao:[],qualidade:{},multas:[],paginacao:{page:1,pageSize:40,total:0,totalPages:1}});
  const [suggestions,setSuggestions]=useState({motoristas:[],placas:[]});
  const [filters,setFilters]=useState(initialFilters);
  const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(10);
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [selected,setSelected]=useState(null); const [form,setForm]=useState(null); const [saving,setSaving]=useState(false);
  const [audit,setAudit]=useState([]); const [auditLoading,setAuditLoading]=useState(false); const [quickSaving,setQuickSaving]=useState("");
  const [moreFilters,setMoreFilters]=useState(false);
  const [expanded,setExpanded]=useState({});
  const [indication,setIndication]=useState(null);
  const [indicationError,setIndicationError]=useState("");
  const indicationTrigger=useRef(null);
  const indicationDialog=useRef(null);
  const closeIndication=()=>{setIndication(null);setTimeout(()=>indicationTrigger.current?.focus(),0);};
  const openIndication=(item,event)=>{
    indicationTrigger.current=event.currentTarget;setIndicationError("");
    setIndication({item,statusIndicacao:["indicada","confirmada"].includes(item.controle.statusIndicacao)?item.controle.statusIndicacao:"indicada",indicadoEm:item.controle.indicadoEm||"",prazoIndicacao:item.controle.prazoIndicacao||""});
  };
  useEffect(()=>{if(indication)indicationDialog.current?.querySelector("select")?.focus();},[Boolean(indication)]);
  const saveIndication=async event=>{
    event.preventDefault();setIndicationError("");setQuickSaving(indication.item.id);
    try {
      const {item,statusIndicacao,indicadoEm,prazoIndicacao}=indication;
      await window.RB_API.saveControleMultaFrota(item.empresa,item.codigo,{statusIndicacao,indicadoEm:["indicada","confirmada"].includes(statusIndicacao)?indicadoEm:null,prazoIndicacao:prazoIndicacao||null});
      closeIndication();await load(page);
    } catch(e){setIndicationError(e.message);} finally{setQuickSaving("");}
  };
  const [rankingMetric,setRankingMetric]=useState("quantidade");
  const [evolutionMetric,setEvolutionMetric]=useState("quantidade");

  const requestId = useRef(0);
  const load = async (requestedPage=page) => {
    const id=++requestId.current;
    setLoading(true); setError("");
    try { const result=await loadGroupedMultas(window.RB_API.listMultasFrota,{...filters,page:requestedPage,pageSize},()=>id===requestId.current); if(!result||id!==requestId.current)return; setData(result); setSuggestions(current=>({motoristas:[...new Set([...current.motoristas,...(result.opcoesFiltros?.motoristas||[])])].sort(),placas:[...new Set([...current.placas,...(result.opcoesFiltros?.placas||[])])].sort()})); setPage(result.paginacao?.page||requestedPage); }
    catch(e){if(id===requestId.current)setError(e.message);} finally{if(id===requestId.current)setLoading(false);}
  };
  useEffect(()=>{ const timer=setTimeout(()=>{setPage(1);load(1);},350); return ()=>clearTimeout(timer); },[filters.infracaoDe,filters.infracaoAte,filters.agrupar,filters.q,filters.placa,filters.motorista,filters.status,filters.indicacao,filters.statusMotorista,filters.vencimentoDe,filters.vencimentoAte,filters.ordenar,filters.direcao,filters.rapido,pageSize]);
  const open = async item => {
    setSelected(item); setForm({...item.controle}); setAudit([]); setAuditLoading(true);
    try { const result=await window.RB_API.getAuditoriaMultaFrota(item.empresa,item.codigo); setAudit(result.auditoria||[]); }
    catch { setAudit([]); } finally { setAuditLoading(false); }
  };
  const save = async () => { setSaving(true); try { await window.RB_API.saveControleMultaFrota(selected.empresa,selected.codigo,form); setSelected(null); await load(page); } catch(e){window.alert(e.message);} finally{setSaving(false);} };
  const quickSave = async (item, changes) => {
    setQuickSaving(item.id);
    try { await window.RB_API.saveControleMultaFrota(item.empresa,item.codigo,changes); await load(page); }
    catch(e){window.alert(e.message);} finally{setQuickSaving("");}
  };
  const goToPage = next => { setPage(next); load(next); };
  const clearFilters = () => setFilters(initialFilters);
  const daysUntil = value => value ? Math.round((new Date(`${String(value).slice(0,10)}T00:00:00`)-new Date(`${localTodayMulta()}T00:00:00`))/86400000) : null;
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
  const groups=data.grupos||[];
  return <div className="view multas-page">
    <div className="page-head"><div><h1>Multas da Frota</h1><div className="sub">Multas do sistema, indicação do condutor e desconto do motorista em um só lugar.</div></div><button className="btn" onClick={()=>load(page)}>Atualizar</button></div>
    <p className="muted multa-filter-hint">Indicadores dos filtros selecionados · as abas abaixo selecionam as pendências desse conjunto.</p>
    <div className="multas-kpis">
      <MultaKpi label="Em aberto" value={r.abertas||0} sub={brlMulta(r.valorAberto)} tone="#f59e0b"/><MultaKpi label="A descontar do motorista" value={r.aDescontar||0} sub={brlMulta(r.valorADescontar)} tone="#f97316"/><MultaKpi label="Vencidas" value={r.vencidas||0} sub={brlMulta(r.valorVencido)} tone="#ef4444"/><MultaKpi label="Indicação pendente" value={r.indicacaoPendente||0} sub="multas a indicar" tone="#eab308"/><MultaKpi label="Pagas" value={r.pagas||0} sub={brlMulta(r.valorPago)} tone="#22c55e"/><MultaKpi label="Total" value={r.total||0} sub={`${brlMulta(r.valorOriginal)} original`} tone="#64748b"/>
    </div>
    <div className="multas-secondary-kpis">
      <div><span>Empresa responsável</span><strong>{r.responsabilidadeEmpresa||0} multas</strong><small>{brlMulta(r.valorResponsabilidadeEmpresa)}</small></div>
      <div><span>Motoristas responsáveis</span><strong>{r.responsabilidadeMotorista||0} multas</strong><small>{brlMulta(r.valorResponsabilidadeMotorista)}</small></div>
      <div><span>Sem vencimento informado</span><strong>{r.semVencimento||0}</strong><small>multas em aberto para conferir</small></div>
    </div>
    <div className="multas-quick-filters">{[["todas","Todas"],["sem_indicacao","A indicar"],["a_descontar","A descontar"],["abertas","A pagar"],["descontadas","Descontadas"]].map(([value,label])=><button key={value} className={filters.rapido===value?"active":""} onClick={()=>setFilters(current=>({...current,rapido:value,status:"todos",indicacao:"todos",statusMotorista:"todos"}))}>{label} <span>{({todas:r.total,sem_indicacao:r.indicacaoPendente,a_descontar:r.aDescontar,abertas:r.abertas,descontadas:r.descontadas})[value]||0}</span></button>)}</div>
    <div className="card multas-filtros"><div className="multas-filter-grid extended">
      <MultaFiltro label="Motorista"><MultaAutocomplete label="Motorista" value={filters.motorista} onChange={value=>setFilters(current=>({...current,motorista:value}))} options={suggestions.motoristas} placeholder="Digite ou selecione o motorista"/></MultaFiltro>
      <MultaFiltro label="Placa"><MultaAutocomplete label="Placa" value={filters.placa} onChange={value=>setFilters(current=>({...current,placa:value}))} options={suggestions.placas} placeholder="Digite ou selecione a placa" uppercase/></MultaFiltro>
      <MultaFiltro label="Data da infração — de"><input type="date" max={filters.infracaoAte||undefined} value={filters.infracaoDe} onChange={e=>setFilters({...filters,infracaoDe:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Data da infração — até"><input type="date" min={filters.infracaoDe||undefined} value={filters.infracaoAte} onChange={e=>setFilters({...filters,infracaoAte:e.target.value})}/></MultaFiltro>
    </div><small className="muted multa-filter-hint">Período pela data da infração. Deixe a data final vazia para incluir todas as multas a partir da data inicial.</small></div>
    <details className="card multas-filtros"><summary>Outros filtros <span className="muted">Busca, pagamento e vencimento</span></summary><div className="multas-filter-grid extended">
      <MultaFiltro label="Busca"><input placeholder="Auto, infração ou cidade" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Pagamento"><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value,rapido:"todas"})}><option value="todos">Todos os pagamentos ERP</option><option value="aberta">Em aberto</option><option value="vencida">Vencidas</option><option value="paga">Pagas</option></select></MultaFiltro>
      <MultaFiltro label="Mais filtros"><button className={`btn ${moreFilters?"active":""}`} onClick={()=>setMoreFilters(value=>!value)}>Filtros avançados {moreFilters?"−":"+"}</button></MultaFiltro>
      {moreFilters&&<>
      <MultaFiltro label="Responsabilidade"><select value={filters.statusMotorista} onChange={e=>setFilters({...filters,statusMotorista:e.target.value})}><option value="todos">Todos: motorista/empresa</option>{Object.entries(motoristaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></MultaFiltro>
      <MultaFiltro label="Indicação"><select value={filters.indicacao} onChange={e=>setFilters({...filters,indicacao:e.target.value})}><option value="todos">Todas as indicações</option>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></MultaFiltro>
      <MultaFiltro label="Vencimento de"><input type="date" value={filters.vencimentoDe} onChange={e=>setFilters({...filters,vencimentoDe:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Vencimento até"><input type="date" value={filters.vencimentoAte} onChange={e=>setFilters({...filters,vencimentoAte:e.target.value})}/></MultaFiltro>
      <MultaFiltro label="Ordenar por"><select value={filters.ordenar} onChange={e=>setFilters({...filters,ordenar:e.target.value})}><option value="placa">Placa</option><option value="auto">Auto/infração</option><option value="vencimento">Vencimento</option><option value="dataInfracao">Data da infração</option><option value="valor">Valor</option><option value="motorista">Motorista</option><option value="statusMotorista">Status do motorista</option><option value="responsavel">Responsável</option></select></MultaFiltro>
      <MultaFiltro label="Ordem"><select value={filters.direcao} onChange={e=>setFilters({...filters,direcao:e.target.value})}><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></MultaFiltro>
      <MultaFiltro label="Ações"><button className="btn" onClick={clearFilters}>Limpar filtros</button></MultaFiltro>
      </>}
    </div><small className="muted multa-filter-hint">Os resultados são atualizados automaticamente ao preencher os filtros.</small></details>
    {error&&<div className="alert danger">{error}</div>}
    <section className="multas-workspace" aria-label="Multas agrupadas">
      <div className="multas-group-toolbar"><div><h2>Acompanhamento das multas</h2><span className="muted">{data.totalMultas||0} multas · {p.total||0} {filters.agrupar==="motorista"?"motoristas":"placas"}</span></div><div className="multas-group-switch" aria-label="Agrupar multas">{[["motorista","Por motorista"],["placa","Por placa"]].map(([value,label])=><button key={value} aria-pressed={filters.agrupar===value} onClick={()=>{setExpanded({});setFilters(current=>({...current,agrupar:value}));}}>{label}</button>)}</div></div>
      <p className="multas-points-note">Pontos das infrações nos filtros selecionados · não representa o saldo oficial da CNH.</p>
      {loading?<div className="card multas-empty" role="status">Carregando grupos…</div>:error?<div className="card multas-empty"><button className="btn" onClick={()=>load(page)}>Tentar novamente</button></div>:!groups.length?<div className="card multas-empty">Nenhuma multa encontrada. <button className="btn" onClick={clearFilters}>Limpar filtros</button></div>:groups.map(group=>{
        const key=`${filters.agrupar}:${group.id}`;
        const done=group.etapas===group.concluidas;
        return <section className={`multa-group ${done?"complete":""}`} key={key}>
          <button className="multa-group-header" aria-expanded={Boolean(expanded[key])} aria-controls={`multas-group-${encodeURIComponent(key)}`} onClick={()=>setExpanded(current=>({...current,[key]:!current[key]}))}>
            <span className="multa-group-person"><span className="multa-avatar" aria-hidden="true">{filters.agrupar==="placa"?"▤":group.nome.split(" ").filter(Boolean).slice(0,2).map(part=>part[0]).join("")}</span><span><strong>{group.nome}</strong><small>{group.multas.length} {group.multas.length===1?"multa":"multas"}</small></span></span>
            <span className="multa-group-points"><b>{group.pontos}</b><small>pontos nas multas{group.semPontos>0?` · ${group.semPontos} sem pontuação`:""}</small></span>
            <span className="multa-group-value"><small>Valor total</small><strong>{brlMulta(group.valorTotal)}</strong><small>{group.valorAberto>0?`${brlMulta(group.valorAberto)} a pagar`:"Boletos pagos"}</small></span>
            <span className="multa-group-progress"><span className={done?"multa-complete-label":""}>{done?"✓ Tudo em dia":`${group.concluidas}/${group.etapas} tarefas concluídas`}</span><span className="multa-progress-track"><i style={{width:`${group.progresso}%`}}/></span><small>{done?"Controle concluído":`${group.progresso}% do controle concluído`}</small></span>
            <span className="multa-group-chevron" aria-hidden="true">{expanded[key]?"⌃":"⌄"}</span>
          </button>
          {expanded[key]&&<div className="multa-group-records" id={`multas-group-${encodeURIComponent(key)}`}>{group.multas.map(item=>{
            const indicated=["indicada","confirmada"].includes(item.controle.statusIndicacao);
            const remaining=daysUntil(item.controle.prazoIndicacao);
            const company=item.controle.statusMotorista==="empresa";
            return <article className={`multa-record ${indicated&&item.paga&&(company||item.controle.descontadoMotorista)?"is-complete":""}`} key={item.id}>
              <div className="multa-record-main"><div className="multa-record-date"><strong>{dataMulta(item.dataInfracao)}</strong><small>Data da infração</small></div>
                <div className="multa-record-description"><div className="multa-vehicle-identity"><span className="multa-vehicle-plate" aria-label={`Placa do veículo: ${item.placa||"não informada"}`}>{item.placa||"Sem placa"}</span><span className="multa-vehicle-driver">{item.motorista||"Sem motorista"}</span></div><strong>{item.infracaoDescricao||item.infracao}</strong><small>Auto {item.auto||item.codigo}</small><div className="multa-record-tags"><span>{item.gravidadeDescricao||"Gravidade não informada"}</span><span>{item.pontos==null?"Pontos não informados":`${item.pontos} pontos`}</span>{company&&<span>Responsabilidade da empresa</span>}</div></div>
                <div className="multa-record-value"><strong>{brlMulta(item.valorFinal)}</strong><small className={item.paga?"multa-paid":item.vencida?"multa-overdue":"muted"}>{item.paga?"Boleto pago":"A pagar"}</small></div><button className="btn" onClick={()=>open(item)}>Ver detalhes</button>
              </div>
              <div className="multa-record-context"><div><span>Órgão autuador</span><strong>{item.controle.orgaoAutuador||item.orgaoAutuador||"Órgão não informado"}</strong></div><div><span>Local da infração</span><strong>{[item.local,item.cidade].filter(Boolean).join(" · ")||"Local não informado"}</strong></div></div>
              <div className="multa-checkpoints" aria-label={`Acompanhamento do auto ${item.auto||item.codigo}`}>
                <div className={`multa-checkpoint ${indicated?"done":item.controle.statusIndicacao==="nao_aplicavel"?"neutral":"pending"}`}><span className="multa-checkpoint-icon" aria-hidden="true">{indicated?"✓":item.controle.statusIndicacao==="nao_aplicavel"?"—":"○"}</span><div><small>Indicação</small><strong>{indicated?"Já indicada":item.controle.statusIndicacao==="nao_aplicavel"?"Não se aplica":"A indicar"}</strong><small>{indicated?(item.controle.indicadoEm?dataMulta(item.controle.indicadoEm):"Data não informada"):item.controle.statusIndicacao==="nao_aplicavel"?"Sem indicação necessária":remaining===null?"Prazo não informado":remaining<0?`Prazo vencido há ${Math.abs(remaining)} dias`:`${remaining} dias para indicar`}</small></div></div>
                <div className={`multa-checkpoint ${item.paga?"done":"pending"}`}><span className="multa-checkpoint-icon" aria-hidden="true">{item.paga?"✓":"○"}</span><div><small>Pagamento</small><strong>{item.paga?"Já paga":item.vencida?"Pagamento vencido":"A pagar"}</strong><small>{item.paga?(item.dataPagamento?dataMulta(item.dataPagamento):"Confirmado no sistema"):item.vencimento?`Vence em ${dataMulta(item.vencimento)}`:"Vencimento não informado"}</small></div></div>
                <div className={`multa-checkpoint ${item.controle.descontadoMotorista?"done":company?"neutral":"pending"}`}><span className="multa-checkpoint-icon" aria-hidden="true">{item.controle.descontadoMotorista?"✓":company?"—":"○"}</span><div><small>Desconto do motorista</small><strong>{item.controle.descontadoMotorista?"Já descontada":company?"Empresa responsável":"A descontar"}</strong><small>{item.controle.descontoErp?"Confirmado no sistema":item.controle.descontadoEm?dataMulta(item.controle.descontadoEm):company?"Sem desconto do motorista":"Desconto pendente"}</small></div></div>
              </div>
              <div className="multa-record-actions"><span className="muted">Auto {item.auto||item.codigo}</span>
                <div className="multa-record-buttons"><button className={`btn ${indicated?"":"primary"}`} disabled={Boolean(quickSaving)} aria-label={`Indicação ${item.auto}`} onClick={event=>openIndication(item,event)}>{indicated?"Editar indicação":"Indicar motorista"}</button>
                {!company&&<button className="btn" disabled={Boolean(quickSaving)||item.controle.descontoErp} aria-label={`Desconto do motorista ${item.auto}`} onClick={()=>quickSave(item,{descontadoMotorista:!item.controle.descontadoMotorista,descontadoEm:item.controle.descontadoMotorista?null:localTodayMulta()})}>{item.controle.descontadoMotorista?"✓ Descontado":"Marcar desconto"}</button>}</div>
              </div>
            </article>;
          })}</div>}
        </section>;
      })}
      <div className="multas-pagination"><button className="btn" disabled={p.page<=1||loading} onClick={()=>goToPage(p.page-1)}>Anterior</button><span>Página {p.page||1} de {p.totalPages||1}</span><label>Grupos por página <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option>5</option><option>10</option><option>20</option><option>30</option></select></label><button className="btn" disabled={p.page>=p.totalPages||loading} onClick={()=>goToPage(p.page+1)}>Próxima</button></div>
    </section>
    {indication&&<div className="modal-backdrop" onMouseDown={()=>{if(!quickSaving)closeIndication();}}><form ref={indicationDialog} className="modal-box multa-indication-modal" role="dialog" aria-modal="true" aria-labelledby="multa-indication-title" onSubmit={saveIndication} onMouseDown={e=>e.stopPropagation()} onKeyDown={event=>{
      if(event.key==="Escape"&&!quickSaving){event.preventDefault();closeIndication();}
      if(event.key==="Tab"){const nodes=[...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    }}><div className="modal-head"><div><h2 id="multa-indication-title">Indicação do motorista</h2><small>Auto {indication.item.auto} · {indication.item.placa}</small></div><button type="button" className="btn" disabled={Boolean(quickSaving)} aria-label="Fechar indicação" onClick={closeIndication}>×</button></div><div className="modal-body"><p>{indication.item.motorista||"Motorista não identificado no sistema"}</p><label>Situação da indicação<select value={indication.statusIndicacao} disabled={Boolean(quickSaving)} onChange={e=>setIndication({...indication,statusIndicacao:e.target.value})}>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Data da indicação<input type="date" required={["indicada","confirmada"].includes(indication.statusIndicacao)} disabled={Boolean(quickSaving)||!["indicada","confirmada"].includes(indication.statusIndicacao)} value={indication.indicadoEm} onChange={e=>setIndication({...indication,indicadoEm:e.target.value})}/></label><label>Prazo para indicar <small className="muted">(opcional)</small><input type="date" disabled={Boolean(quickSaving)} value={indication.prazoIndicacao} onChange={e=>setIndication({...indication,prazoIndicacao:e.target.value})}/></label>{indicationError&&<p role="alert" className="multa-overdue">{indicationError}</p>}</div><div className="modal-foot"><button type="button" className="btn" disabled={Boolean(quickSaving)} onClick={closeIndication}>Cancelar</button><button className="btn primary" type="submit" disabled={Boolean(quickSaving)}>{quickSaving?"Salvando…":"Salvar indicação"}</button></div></form></div>}
    <details className="card multas-reports"><summary>Análises e rankings</summary><section className="multas-management">
      <div className="card multas-evolution"><div className="section-head"><div><h2>Evolução das multas</h2><span className="muted">Últimos 12 meses pela data da infração</span></div><select value={evolutionMetric} onChange={e=>setEvolutionMetric(e.target.value)}><option value="quantidade">Quantidade</option><option value="valor">Valor total</option><option value="aberto">Valor em aberto</option></select></div><div className="multas-evolution-chart">{(data.evolucao||[]).map(item=><div key={item.mes}><span title={evolutionMetric==="quantidade"?`${item.quantidade} multas`:brlMulta(item[evolutionMetric])} style={{height:`${Math.max(4,evolutionValue(item)/maxEvolution*100)}%`}}/><small>{item.mes.slice(5)}/{item.mes.slice(2,4)}</small></div>)}</div>{!data.evolucao?.length&&<div className="muted">Sem dados mensais para o período.</div>}</div>
      <div className="card multas-rankings"><div className="section-head"><div><h2>Rankings operacionais</h2><span className="muted">Concentração de ocorrências</span></div><select value={rankingMetric} onChange={e=>setRankingMetric(e.target.value)}><option value="quantidade">Quantidade</option><option value="valor">Valor</option><option value="abertas">Em aberto</option></select></div><div className="multas-ranking-columns"><div><h3>Motoristas</h3>{(data.rankings?.motoristas||[]).slice(0,5).map(item=><div className="multa-rank-row" key={item.motorista}><span><strong>{item.motorista}</strong><small>{item.quantidade} multas · {item.abertas} abertas</small></span><i><b style={{width:`${rankValue(item)/maxDriverRank*100}%`}}/></i><em>{rankingMetric==="valor"?brlMulta(item.valor):rankValue(item)}</em></div>)}</div><div><h3>Veículos</h3>{(data.rankings?.veiculos||[]).slice(0,5).map(item=><div className="multa-rank-row" key={item.placa}><span><strong>{item.placa}</strong><small>{item.quantidade} multas · {item.abertas} abertas</small></span><i><b style={{width:`${rankValue(item)/maxVehicleRank*100}%`}}/></i><em>{rankingMetric==="valor"?brlMulta(item.valor):rankValue(item)}</em></div>)}</div></div></div>
    </section></details>
    <details className="card multas-quality"><summary>Qualidade dos registros <span className="muted">Abrir conferência</span></summary><div className="multas-quality-grid">{[["Sem vencimento",data.qualidade?.semVencimento],["Sem motorista",data.qualidade?.semMotorista],["Sem placa",data.qualidade?.semPlaca],["Sem responsável",data.qualidade?.semResponsavel],["Sem auto",data.qualidade?.semAuto],["Sem valor",data.qualidade?.semValor]].map(([label,value])=><button key={label} onClick={()=>setFilters(current=>({...current,rapido:"incompletas",status:"todos"}))}><strong>{value||0}</strong><span>{label}</span></button>)}</div></details>
    {selected&&form&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="modal-box multa-detail-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>MULTA {selected.auto||selected.codigo} · CÓDIGO {selected.codigo}</small><h2>{selected.placa||"Sem placa"} · {selected.motorista||"Sem motorista"}</h2><div className="multa-modal-badges"><span className={`multa-priority ${selected.prioridade}`}>{prioridadeLabels[selected.prioridade]}</span><span className="multa-status">{internoLabels[selected.controle.statusInterno]}</span></div></div><button className="icon-btn" onClick={()=>setSelected(null)}><Icon name="x"/></button></div><div className="modal-body">
      <section className="multa-next-action"><small>Próxima ação</small><strong>{selected.proximaAcao}</strong>{selected.vencimento&&<span>{dataMulta(selected.vencimento)} · {dueLabel(selected)}</span>}</section>
      {!!alertsFor(selected).length&&<section className="multa-alert-list">{alertsFor(selected).map(message=><div key={message}><Icon name="alert"/><span>{message}</span></div>)}</section>}
      <section className="multa-detail-section"><h3>Informações da infração</h3><div className="multa-info-grid"><div><small>Código da infração</small><strong>{selected.infracao}</strong></div><div><small>Tipo da infração</small><strong className="multa-category">{selected.infracaoCategoria}</strong></div><div><small>Gravidade / pontos</small><strong>{selected.gravidadeDescricao||"Não informada"}{selected.pontos!=null?` · ${selected.pontos} pontos`:" · Pontos não informados"}</strong></div><div className="wide"><small>O que é a infração?</small><strong>{selected.infracaoDescricao||"Descrição não cadastrada no ERP"}</strong></div><div><small>Data e hora</small><strong>{dataMulta(selected.dataInfracao)}{selected.horaInfracao?` · ${String(selected.horaInfracao).slice(0,5)}`:""}</strong></div><div><small>Órgão autuador</small><strong>{selected.controle.orgaoAutuador||selected.orgaoAutuador||"Não informado"}</strong></div><div><small>Local</small><strong>{[selected.local,selected.cidade].filter(Boolean).join(" · ")||"Não informado"}</strong></div><div><small>Motorista</small><strong>{selected.motorista||"Não identificado"}</strong></div><div><small>Responsabilidade</small><strong>{motoristaLabels[selected.controle.statusMotorista]}</strong></div></div></section>
      <section className="multa-detail-section"><h3>Valores e pagamento</h3><div className="multa-values-grid"><div><small>Valor original</small><strong>{brlMulta(selected.valor)}</strong></div><div><small>Desconto</small><strong>{brlMulta(selected.desconto)}</strong></div><div><small>Juros</small><strong>{brlMulta(selected.juros)}</strong></div><div className="primary"><small>Valor final</small><strong>{brlMulta(selected.valorFinal)}</strong></div><div className={selected.paga?"paid":""}><small>Valor pago</small><strong>{selected.paga?brlMulta(selected.valorPago):"Ainda não pago"}</strong></div></div></section>
      <section className="multa-detail-section"><h3>Prazos e andamento</h3><div className="multa-timeline"><div className="done"><i/><span><small>Infração</small><b>{dataMulta(selected.dataInfracao)}</b></span></div><div className={selected.limiteDefesaPrevia?"done":""}><i/><span><small>Defesa prévia</small><b>{dataMulta(selected.limiteDefesaPrevia)}</b></span></div><div className={selected.limiteDefesa?"done":""}><i/><span><small>Prazo de recurso</small><b>{dataMulta(selected.limiteDefesa)}</b></span></div><div className={selected.paga?"done":selected.vencida?"danger":""}><i/><span><small>Vencimento</small><b>{dataMulta(selected.vencimento)}</b></span></div><div className={selected.paga?"done":""}><i/><span><small>Pagamento</small><b>{selected.paga?dataMulta(selected.dataPagamento):"Pendente"}</b></span></div><div className={selected.controle.statusMotorista==="descontado"?"done":selected.controle.statusMotorista==="alerta"?"danger":""}><i/><span><small>Desconto motorista</small><b>{motoristaLabels[selected.controle.statusMotorista]}</b></span></div></div></section>
      <section className="multa-detail-section"><h3>Controle interno</h3><div className="multa-form-grid"><label><span>Órgão autuador</span><input maxLength="160" list="multas-orgaos" placeholder="Ex.: PRF, DNIT, DER-SP, prefeitura" value={form.orgaoAutuador||""} onChange={e=>setForm({...form,orgaoAutuador:e.target.value})}/><datalist id="multas-orgaos">{["PRF","DNIT","ANTT","DER-SP","DER-PR","DER-SC","DETRAN-SC"].map(value=><option key={value} value={value}/>)}</datalist><small className="muted">Informe o órgão que consta na notificação.</small></label><label><span>Status do motorista <small className="muted">(ERP)</small></span><select value={form.statusMotorista} disabled>{Object.entries(motoristaLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Desconto do motorista</span><select value={form.descontadoMotorista?"sim":"nao"} disabled={selected.controle.descontoErp||selected.controle.statusMotorista==="empresa"} onChange={e=>setForm({...form,descontadoMotorista:e.target.value==="sim",descontadoEm:e.target.value==="sim"?(form.descontadoEm||localTodayMulta()):null})}><option value="nao">Ainda não descontado</option><option value="sim">Já descontado</option></select></label><label><span>Data do desconto</span><input type="date" disabled={!form.descontadoMotorista||selected.controle.descontoErp} value={form.descontadoEm||""} onChange={e=>setForm({...form,descontadoEm:e.target.value})}/></label><label><span>Prazo para indicar</span><input type="date" value={form.prazoIndicacao||""} onChange={e=>setForm({...form,prazoIndicacao:e.target.value})}/></label><label><span>Status da indicação</span><select value={form.statusIndicacao} onChange={e=>setForm({...form,statusIndicacao:e.target.value})}>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Data da indicação</span><input type="date" value={form.indicadoEm||""} onChange={e=>setForm({...form,indicadoEm:e.target.value})}/></label><label><span>Status interno</span><select value={form.statusInterno} onChange={e=>setForm({...form,statusInterno:e.target.value})}>{Object.entries(internoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Responsável</span><input value={form.responsavel||"Será definido ao salvar"} readOnly/></label></div><label><span>Link do comprovante/documento</span><input value={form.comprovanteUrl||""} onChange={e=>setForm({...form,comprovanteUrl:e.target.value})}/></label><label><span>Observações internas</span><textarea rows="3" value={form.observacoes||""} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>{selected.observacaoErp&&<div className="multa-erp-note"><small>Observação do ERP</small><p>{selected.observacaoErp}</p></div>}</section>
      <section className="multa-detail-section"><h3>Histórico de alterações</h3>{auditLoading?<div className="muted">Carregando histórico…</div>:!audit.length?<div className="muted">Nenhuma alteração interna registrada.</div>:<div className="multa-audit-list">{audit.map(entry=><div key={entry.id}><i/><span><strong>{entry.usuario_login||"Sistema"}</strong><small>{new Date(entry.criado_em).toLocaleString("pt-BR")}</small></span><p>{indicacaoLabels[entry.dados_novos?.status_indicacao]} · {entry.dados_novos?.descontado_motorista?"Descontado":"Sem desconto manual"}</p></div>)}</div>}</section>
    </div><div className="modal-foot"><button className="btn" onClick={()=>setSelected(null)}>Cancelar</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Salvando…":"Salvar controle"}</button></div></div></div>}
  </div>;
}

window.MultasFrota=MultasFrota;

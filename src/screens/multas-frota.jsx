const { useEffect, useState } = React;

const brlMulta = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataMulta = value => {
  if (!value) return "—";
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day).toLocaleDateString("pt-BR") : "—";
};
const indicacaoLabels = { nao_aplicavel:"Não se aplica", pendente:"Pendente", indicada:"Indicada", confirmada:"Confirmada", prazo_perdido:"Prazo perdido" };
const internoLabels = { acompanhar:"Acompanhar", em_defesa:"Em defesa", deferida:"Deferida", indeferida:"Indeferida", encerrada:"Encerrada" };

function MultaKpi({ label, value, sub, tone }) {
  return <div className="card" style={{padding:14,borderTop:`3px solid ${tone}`}}><small className="muted">{label}</small><div style={{fontSize:24,fontWeight:700,marginTop:5}}>{value}</div><small className="muted">{sub}</small></div>;
}

function MultasFrota() {
  const [data,setData]=useState({resumo:{},multas:[]});
  const [filters,setFilters]=useState({q:"",status:"todos",indicacao:"todos"});
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [selected,setSelected]=useState(null); const [form,setForm]=useState(null); const [saving,setSaving]=useState(false);
  const [page,setPage]=useState(1); const pageSize=40;

  const load = async () => { setLoading(true); setError(""); try { setData(await window.RB_API.listMultasFrota(filters)); } catch(e){setError(e.message);} finally{setLoading(false);} };
  useEffect(()=>{ setPage(1); load(); },[filters.status,filters.indicacao]);
  const open = item => { setSelected(item); setForm({...item.controle}); };
  const save = async () => { setSaving(true); try { await window.RB_API.saveControleMultaFrota(selected.empresa,selected.codigo,form); setSelected(null); await load(); } catch(e){window.alert(e.message);} finally{setSaving(false);} };
  const r=data.resumo||{};
  const totalPages=Math.max(1,Math.ceil((data.multas?.length||0)/pageSize));
  const pageItems=(data.multas||[]).slice((page-1)*pageSize,page*pageSize);
  return <div className="page multas-page">
    <div className="page-head"><div><h1>Multas da Frota</h1><div className="sub">Leitura do ERP com acompanhamento interno de pagamento, indicação e defesa.</div></div><button className="btn" onClick={load}>Atualizar</button></div>
    <div className="multas-kpis">
      <MultaKpi label="Total" value={r.total||0} sub="lançamentos no ERP" tone="#64748b"/><MultaKpi label="Em aberto" value={r.abertas||0} sub={brlMulta(r.valorAberto)} tone="#f59e0b"/><MultaKpi label="Vencidas" value={r.vencidas||0} sub="requer atenção" tone="#ef4444"/><MultaKpi label="Indicação pendente" value={r.indicacaoPendente||0} sub="condutores" tone="#8b5cf6"/><MultaKpi label="Pagas" value={r.pagas||0} sub="identificadas no ERP" tone="#22c55e"/>
    </div>
    <div className="card multas-filtros"><div className="multas-filter-grid"><input placeholder="Placa, auto, infração ou motorista" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} onKeyDown={e=>e.key==="Enter"&&(setPage(1),load())}/><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="todos">Todos os pagamentos</option><option value="aberta">Em aberto</option><option value="vencida">Vencidas</option><option value="paga">Pagas</option></select><select value={filters.indicacao} onChange={e=>setFilters({...filters,indicacao:e.target.value})}><option value="todos">Todas as indicações</option>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="btn primary" onClick={()=>{setPage(1);load();}}>Pesquisar</button></div></div>
    {error&&<div className="alert danger">{error}</div>}
    <div className="card multas-table-card"><div className="multas-table-head"><span><strong>{data.multas?.length||0}</strong> multas encontradas</span><span>Página {page} de {totalPages}</span></div><div className="table-wrap"><table className="data-table multas-table"><thead><tr><th>Auto / infração</th><th>Placa / motorista</th><th>Data</th><th>Vencimento</th><th className="num">Valor</th><th>Pagamento</th><th>Indicação</th><th>Controle</th></tr></thead><tbody>
      {!loading&&!data.multas?.length&&<tr><td colSpan="8" className="muted" style={{textAlign:"center",padding:30}}>Nenhuma multa encontrada.</td></tr>}
      {loading&&<tr><td colSpan="8" className="muted" style={{textAlign:"center",padding:30}}>Carregando multas…</td></tr>}
      {pageItems.map(item=><tr key={item.id} className="clickable" onClick={()=>open(item)}><td><strong>{item.auto||`#${item.codigo}`}</strong><div className="muted multa-desc">{item.infracao}</div></td><td><strong className="plate-text">{item.placa||"Sem placa"}</strong><div className="muted multa-driver">{item.motorista||"Sem motorista"}</div></td><td className="date">{dataMulta(item.dataInfracao)}</td><td className={`date ${item.vencida?"multa-overdue":""}`}>{dataMulta(item.vencimento)}</td><td className="num"><strong>{brlMulta(item.valorFinal)}</strong></td><td><span className={`badge ${item.paga?"success":item.vencida?"danger":"warning"}`}>{item.paga?"Paga":item.vencida?"Vencida":"Aberta"}</span></td><td><span className={`multa-status indication-${item.controle.statusIndicacao}`}>{indicacaoLabels[item.controle.statusIndicacao]}</span></td><td>{internoLabels[item.controle.statusInterno]}</td></tr>)}
    </tbody></table></div><div className="multas-pagination"><button className="btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{(page-1)*pageSize+1}–{Math.min(page*pageSize,data.multas?.length||0)} de {data.multas?.length||0}</span><button className="btn" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></div>
    {selected&&form&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="modal-box" style={{maxWidth:720}} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>MULTA {selected.auto||selected.codigo}</small><h2>{selected.placa} · {brlMulta(selected.valorFinal)}</h2></div><button className="icon-btn" onClick={()=>setSelected(null)}><Icon name="x"/></button></div><div className="modal-body">
      <div className="card" style={{padding:12,marginBottom:12}}><strong>{selected.infracao}</strong><div className="muted">{dataMulta(selected.dataInfracao)} · {selected.local||selected.cidade||"Local não informado"} · {selected.motorista||"Motorista não informado"}</div><div style={{marginTop:6}}>Pagamento no ERP: <strong>{selected.paga?`Pago em ${dataMulta(selected.dataPagamento)}`:selected.vencida?"Vencido":"Em aberto"}</strong></div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><label><span>Status da indicação</span><select value={form.statusIndicacao} onChange={e=>setForm({...form,statusIndicacao:e.target.value})}>{Object.entries(indicacaoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Data da indicação</span><input type="date" value={form.indicadoEm||""} onChange={e=>setForm({...form,indicadoEm:e.target.value})}/></label><label><span>Responsável</span><input value={form.responsavel||""} onChange={e=>setForm({...form,responsavel:e.target.value})} placeholder="Quem está acompanhando"/></label><label><span>Status interno</span><select value={form.statusInterno} onChange={e=>setForm({...form,statusInterno:e.target.value})}>{Object.entries(internoLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
      <label><span>Link do comprovante/documento</span><input value={form.comprovanteUrl||""} onChange={e=>setForm({...form,comprovanteUrl:e.target.value})} placeholder="Link para indicação, defesa ou comprovante"/></label><label><span>Observações internas</span><textarea rows="4" value={form.observacoes||""} onChange={e=>setForm({...form,observacoes:e.target.value})}/></label>
    </div><div className="modal-foot"><button className="btn" onClick={()=>setSelected(null)}>Cancelar</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Salvando…":"Salvar controle"}</button></div></div></div>}
  </div>;
}

window.MultasFrota=MultasFrota;

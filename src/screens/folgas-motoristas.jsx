const fmDateTimeLocal = (value) => {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const fmDate = (value) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const fmStatus = {
  fora: { label: "Viajando", color: "#2563eb", bg: "#eff6ff" },
  em_folga: { label: "Em folga", color: "#1d4ed8", bg: "#eff6ff" },
  disponivel: { label: "Disponível", color: "#047857", bg: "#ecfdf5" },
};
const fmValidation = {
  confirmado: { label: "Confirmado", color: "#059669", bg: "rgba(5,150,105,.12)" },
  provavel: { label: "Provável", color: "#d97706", bg: "rgba(217,119,6,.12)" },
  revisar: { label: "Revisar", color: "#dc2626", bg: "rgba(220,38,38,.12)" },
  sem_dados: { label: "Sem telemetria", color: "#71717a", bg: "rgba(113,113,122,.12)" },
};
const fmIsoDay = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const fmHours = (value) => {
  const minutes = Math.round(Number(value || 0) * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
};

const FolgasMotoristas = () => {
  const [data, setData] = React.useState({ itens: [], resumo: {}, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [pagina, setPagina] = React.useState(1);
  const [modal, setModal] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState(null);
  const initialMacroEnd = React.useMemo(() => new Date(), []);
  const initialMacroStart = React.useMemo(() => new Date(initialMacroEnd.getTime() - 7 * 86400000), [initialMacroEnd]);
  const [macroFilters, setMacroFilters] = React.useState({ placa: "SXY5D26", inicio: fmIsoDay(initialMacroStart), fim: fmIsoDay(initialMacroEnd) });
  const [macroData, setMacroData] = React.useState(null);
  const [macroLoading, setMacroLoading] = React.useState(true);
  const [macroError, setMacroError] = React.useState("");
  const limite = 50;

  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      setData(await RB_API.listMotoristasFolgas({ busca, status, pagina, limite }));
      setUpdatedAt(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [busca, status, pagina]);

  React.useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  const loadMacros = React.useCallback(async () => {
    setMacroLoading(true); setMacroError("");
    try { setMacroData(await RB_API.getJornadaMacros(macroFilters)); }
    catch (e) { setMacroError(e.message); }
    finally { setMacroLoading(false); }
  }, [macroFilters]);
  React.useEffect(() => { loadMacros(); }, []); // carrega o teste inicial do SXY

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (modal.tipo === "saida") {
        await RB_API.registrarSaidaMotorista({
          empresa: modal.item.empresa, codigo: modal.item.codigo,
          saidaEm: new Date(modal.saidaEm).toISOString(),
          retornoPrevistoEm: modal.retornoPrevistoEm ? new Date(modal.retornoPrevistoEm).toISOString() : null,
          observacoes: modal.observacoes,
        });
      } else if (modal.tipo === "retorno") {
        await RB_API.registrarRetornoMotorista(modal.item.jornada.id, {
          retornoEm: new Date(modal.retornoEm).toISOString(), observacoes: modal.observacoes,
        });
      } else {
        await RB_API.registrarMovimentoFolga({
          empresa: modal.item.empresa, codigo: modal.item.codigo, tipo: "uso",
          quantidade: Number(modal.quantidade), dataMovimento: modal.dataMovimento,
          observacoes: modal.observacoes,
        });
      }
      setModal(null); await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const card = (label, value, color) => (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"16px 18px"}}>
      <div style={{fontSize:12,color:"var(--muted)",marginBottom:7}}>{label}</div>
      <div style={{fontSize:25,fontWeight:700,color:color || "var(--text)"}}>{value ?? 0}</div>
    </div>
  );

  return (
    <div style={{padding:"22px 24px",overflow:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,margin:0,color:"var(--text)"}}>Jornada e folgas</h1>
          <p style={{fontSize:13,color:"var(--muted)",margin:"6px 0 10px"}}>Jornadas calculadas automaticamente pelas datas de saída e chegada do controle de viagens.</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span title="Os dias completos fora são somados. A cada 6 dias, uma folga é gerada; o restante continua no próximo ciclo." style={{padding:"5px 9px",border:"1px solid var(--border)",borderRadius:999,fontSize:11.5,color:"var(--text-2)",background:"var(--surface)"}}>ⓘ 1 dia de folga a cada 6 dias fora</span>
            <span style={{padding:"5px 9px",border:"1px solid var(--border)",borderRadius:999,fontSize:11.5,color:"var(--muted)"}}>Data de corte 01/03/2026 · saída = chegada significa em viagem</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}><button className="btn" onClick={load} disabled={loading}><Icon name="refresh" size={14}/> {loading?"Atualizando…":"Atualizar"}</button>{updatedAt&&<div style={{fontSize:10.5,color:"var(--muted)",marginTop:6}}>Atualizado às {updatedAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>}</div>
      </div>

      <div className="fm-summary-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(130px,1fr))",gap:12,marginBottom:16}}>
        {card("Total de motoristas", data.total)}
        {card("Viajando", data.resumo?.fora, "#2563eb")}
        {card("Em folga", data.resumo?.emFolga, "#1d4ed8")}
        {card("Disponíveis", data.resumo?.disponiveis, "#047857")}
        {card("Saldo calculado de folgas", (data.itens||[]).reduce((s,x)=>s+(x.retroativo?.folgasDisponiveis||0),0), "#7c3aed")}
      </div>

      <section style={{border:"1px solid var(--border)",borderRadius:11,background:"var(--surface)",padding:18,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:14}}>
          <div><h2 style={{fontSize:16,margin:0}}>Tempo trabalhado pelas macros</h2><p style={{fontSize:12,color:"var(--muted)",margin:"5px 0 0"}}>Início e reinício abrem um trecho; parada, refeição, abastecimento, chegada e fim encerram o trecho.</p></div>
          <span style={{fontSize:10.5,color:"#b45309",background:"rgba(217,119,6,.1)",padding:"6px 9px",borderRadius:999}}>Controle operacional</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) 150px 150px auto",gap:9,alignItems:"end",marginBottom:14}}>
          <label style={{fontSize:11,color:"var(--muted)"}}>Veículo<select value={macroFilters.placa} onChange={e=>setMacroFilters(current=>({...current,placa:e.target.value}))} style={{display:"block",width:"100%",height:36,marginTop:5,background:"var(--surface-2)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:7,padding:"0 9px"}}>{(macroData?.veiculos || [{placa:"SXY5D26",motorista:""}]).map(item=><option key={item.placa} value={item.placa}>{item.placa}{item.motorista?` · ${item.motorista}`:""}</option>)}</select></label>
          <label style={{fontSize:11,color:"var(--muted)"}}>Início<input type="date" value={macroFilters.inicio} onChange={e=>setMacroFilters(current=>({...current,inicio:e.target.value}))} style={{display:"block",width:"100%",height:36,marginTop:5,boxSizing:"border-box",background:"var(--surface-2)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:7,padding:"0 9px"}}/></label>
          <label style={{fontSize:11,color:"var(--muted)"}}>Fim<input type="date" value={macroFilters.fim} onChange={e=>setMacroFilters(current=>({...current,fim:e.target.value}))} style={{display:"block",width:"100%",height:36,marginTop:5,boxSizing:"border-box",background:"var(--surface-2)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:7,padding:"0 9px"}}/></label>
          <button className="btn primary" onClick={loadMacros} disabled={macroLoading} style={{height:36}}>{macroLoading?"Calculando…":"Calcular período"}</button>
        </div>
        {macroError && <div style={{padding:11,background:"rgba(220,38,38,.1)",color:"#ef4444",borderRadius:7,marginBottom:12,fontSize:12}}>{macroError}</div>}
        {macroData && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(120px,1fr))",gap:9,marginBottom:14}}>
            {card("Tempo trabalhado", fmHours(macroData.resumo?.horasTrabalhadas), "#2563eb")}
            {card("Tempo em paradas", fmHours(macroData.resumo?.horasParadas), "#d97706")}
            {card("Trechos trabalhados", macroData.resumo?.trechosTrabalhados)}
            {card("Maior trecho contínuo", fmHours(macroData.resumo?.maiorTrechoHoras), "#7c3aed")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}><div style={{padding:"9px 11px",background:"var(--surface-2)",fontSize:11,fontWeight:600}}>Trechos trabalhados</div><div style={{maxHeight:260,overflow:"auto"}}>{(macroData.sessoes||[]).slice().reverse().map((item,index)=><div key={`${item.inicio}-${index}`} style={{padding:"10px 11px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",gap:10,fontSize:11.5}}><div><strong>{fmDate(item.inicio)} → {fmDate(item.fim)}</strong><span style={{display:"block",color:"var(--muted)",marginTop:3}}>{item.inicioMacro} → {item.fimMacro || "Em andamento"}</span></div><b style={{color:"#60a5fa",whiteSpace:"nowrap"}}>{fmHours(item.duracaoHoras)}</b></div>)}{!macroData.sessoes?.length&&<div style={{padding:18,color:"var(--muted)",fontSize:12}}>Nenhum trecho completo no período.</div>}</div></div>
            <div style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}><div style={{padding:"9px 11px",background:"var(--surface-2)",fontSize:11,fontWeight:600}}>Macros recebidas</div><div style={{maxHeight:260,overflow:"auto"}}>{(macroData.eventos||[]).slice(0,50).map(item=><div key={item.id} style={{padding:"9px 11px",borderTop:"1px solid var(--border)",display:"grid",gridTemplateColumns:"110px 1fr auto",gap:9,fontSize:11.5}}><span style={{color:"var(--muted)"}}>{fmDate(item.dataHora)}</span><strong>{item.descricao}</strong><span style={{color:"var(--muted)"}}>{[item.municipio,item.uf].filter(Boolean).join("/")}</span></div>)}{!macroData.eventos?.length&&<div style={{padding:18,color:"var(--muted)",fontSize:12}}>Nenhuma macro recebida no período.</div>}</div></div>
          </div>
          <p style={{fontSize:10.5,color:"var(--muted)",margin:"11px 0 0"}}>ⓘ {macroData.aviso}</p>
        </>}
      </section>

      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{position:"relative",flex:1,maxWidth:430}}>
          <Icon name="search" size={15} style={{position:"absolute",left:11,top:10,color:"var(--muted)"}}/>
          <input value={busca} onChange={e=>{setBusca(e.target.value);setPagina(1)}} placeholder="Buscar motorista, apelido ou placa"
            style={{width:"100%",height:36,padding:"0 12px 0 34px",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",boxSizing:"border-box"}}/>
        </div>
        <select value={status} onChange={e=>{setStatus(e.target.value);setPagina(1)}}
          style={{height:36,padding:"0 30px 0 10px",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)"}}>
          <option value="">Todos os status</option><option value="fora">Fora</option><option value="em_folga">Em folga</option><option value="disponivel">Disponíveis</option>
        </select>
      </div>

      {error && <div style={{padding:12,background:"#fef2f2",color:"#b91c1c",borderRadius:7,marginBottom:12,fontSize:13}}>{error}</div>}
      <div style={{border:"1px solid var(--border)",borderRadius:9,overflow:"hidden",background:"var(--surface)"}}>
        <div className="fm-table-row fm-table-head" style={{display:"grid",gridTemplateColumns:"minmax(180px,1.6fr) 82px 100px minmax(190px,1.4fr) 105px 120px 145px 110px",gap:9,padding:"10px 14px",background:"var(--surface-2)",color:"var(--muted)",fontSize:11,fontWeight:600,textTransform:"uppercase"}}>
          <span>Motorista</span><span>Veículo</span><span>Situação</span><span>Última viagem lançada</span><span>Dias da viagem</span><span>Histórico</span><span>Saldo de folga</span><span>Ações</span>
        </div>
        {loading ? <div style={{padding:32,textAlign:"center",color:"var(--muted)"}}>Carregando motoristas…</div> :
          data.itens.map(item => {
            const sit = fmStatus[item.status] || fmStatus.disponivel;
            const progresso = item.retroativo?.saldoDias || 0;
            return <div key={`${item.empresa}-${item.codigo}`} className="fm-table-row" style={{display:"grid",gridTemplateColumns:"minmax(180px,1.6fr) 82px 100px minmax(190px,1.4fr) 105px 120px 145px 110px",gap:9,padding:"14px",alignItems:"center",borderTop:"1px solid var(--border)",fontSize:12.5}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{width:32,height:32,borderRadius:"50%",display:"grid",placeItems:"center",background:"rgba(59,130,246,.12)",color:"#60a5fa",fontWeight:700,fontSize:11}}>{item.nome.split(" ").slice(0,2).map(x=>x[0]).join("")}</span><div><strong style={{display:"block",color:"var(--text)"}}>{item.nome}</strong><span style={{color:"var(--muted)",fontSize:11.5}}>{item.telefone || `Código ${item.codigo}`}</span></div></div>
              <span style={{fontFamily:"Geist Mono",color:"var(--text-2)",padding:"4px 7px",border:"1px solid var(--border)",borderRadius:5,justifySelf:"start"}}>{item.placa || "Sem veículo"}</span>
              <div><span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,color:sit.color,background:sit.bg,fontSize:11,fontWeight:600}}>{sit.label}</span>{item.jornada?.viagem && <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>Viagem #{item.jornada.viagem}</div>}</div>
              <div>{item.jornada ? <><strong style={{display:"block"}}>Viagem #{item.jornada.viagem}</strong><span style={{display:"block",fontSize:10.5,color:"var(--muted)",marginTop:3}}>Saída: {fmDate(item.jornada.saidaEm)}</span><span style={{display:"block",fontSize:10.5,color:"var(--muted)",marginTop:2}}>{item.jornada.retornoEm ? `Chegada: ${fmDate(item.jornada.retornoEm)}` : "Chegada: aguardando retorno"}</span></> : <span style={{color:"var(--muted)"}}>Nenhuma viagem desde o corte</span>}</div>
              <div title="Dias calculados pela última viagem lançada"><strong style={{fontSize:17,color:item.status==="fora"?"#60a5fa":"var(--text)"}}>{item.diasFora || 0} dias</strong><div style={{fontSize:10.5,color:"var(--muted)",marginTop:3}}>{item.status==="fora"?"fora atualmente":"última viagem"}</div></div>
              <div title="Viagens concluídas e dias fora acumulados desde 01/03/2026"><strong>{item.retroativo?.viagensCompletas || 0} viagens</strong><div style={{color:item.retroativo?.viagensPendentes?"#b45309":"var(--muted)",fontSize:10.5,marginTop:3}}>{item.retroativo?.diasFora || 0} dias concluídos</div><div style={{color:"var(--muted)",fontSize:10}}>{item.retroativo?.viagensPendentes || 0} em andamento</div></div>
              <div title="Saldo calculado com os usos registrados nesta tela. Folgas usufruídas antes desta implantação ainda precisam ser lançadas."><strong style={{fontSize:15,color:item.retroativo?.folgasDisponiveis>0?"#a78bfa":"var(--text)"}}>{item.retroativo?.folgasDisponiveis||0} dias calculados</strong><div style={{fontSize:10.5,color:"var(--muted)",marginTop:3}}>Geradas {item.retroativo?.diasFolga||0} • usadas {item.retroativo?.folgasUtilizadas||0}</div><div style={{height:4,background:"var(--border)",borderRadius:4,marginTop:7,overflow:"hidden"}}><div style={{height:"100%",width:`${progresso/6*100}%`,background:"#60a5fa"}}/></div><div style={{fontSize:9.5,color:"var(--muted)",marginTop:3}}>Próxima folga: {progresso} de 6 dias</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontSize:10,color:"var(--muted)",textAlign:"center"}}>Jornada automática</span>
                <button className="btn" disabled={!item.retroativo?.folgasDisponiveis} onClick={()=>setModal({tipo:"folga",item,quantidade:"1",dataMovimento:new Date().toISOString().slice(0,10),observacoes:""})}>Registrar folga</button></div>
            </div>;
          })}
        {!loading && !data.itens.length && <div style={{padding:32,textAlign:"center",color:"var(--muted)"}}>Nenhum motorista encontrado.</div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,fontSize:12,color:"var(--muted)"}}>
        <span>Página {pagina} • {data.total || 0} registros</span>
        <div style={{display:"flex",gap:8}}><button className="btn" disabled={pagina===1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><button className="btn" disabled={pagina*limite>=data.total} onClick={()=>setPagina(p=>p+1)}>Próxima</button></div>
      </div>

      {modal && <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
        <form onSubmit={save} style={{width:"100%",maxWidth:470,background:"var(--surface)",borderRadius:12,padding:22,boxShadow:"0 20px 50px rgba(0,0,0,.25)"}}>
          <h2 style={{fontSize:18,margin:"0 0 4px"}}>{modal.tipo==="saida"?"Registrar saída":modal.tipo==="retorno"?"Confirmar retorno":"Registrar folga utilizada"}</h2>
          <p style={{margin:"0 0 18px",fontSize:13,color:"var(--muted)"}}>{modal.item.nome}{modal.item.placa?` • ${modal.item.placa}`:""}</p>
          {modal.tipo!=="folga"&&<><label style={{display:"block",fontSize:12,marginBottom:5}}>{modal.tipo==="saida"?"Data e hora da saída":"Data e hora do retorno"}</label>
          <input type="datetime-local" required value={modal.tipo==="saida"?modal.saidaEm:modal.retornoEm} onChange={e=>setModal({...modal,[modal.tipo==="saida"?"saidaEm":"retornoEm"]:e.target.value})}
            style={{width:"100%",height:38,padding:"0 10px",boxSizing:"border-box",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",marginBottom:14}}/></>}
          {modal.tipo==="saida" && <><label style={{display:"block",fontSize:12,marginBottom:5}}>Retorno previsto (opcional)</label><input type="datetime-local" value={modal.retornoPrevistoEm} onChange={e=>setModal({...modal,retornoPrevistoEm:e.target.value})}
            style={{width:"100%",height:38,padding:"0 10px",boxSizing:"border-box",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",marginBottom:14}}/></>}
          {modal.tipo==="folga"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{display:"block",fontSize:12,marginBottom:5}}>Dias utilizados</label><input type="number" min="0.5" step="0.5" max={modal.item.retroativo?.folgasDisponiveis} required value={modal.quantidade} onChange={e=>setModal({...modal,quantidade:e.target.value})} style={{width:"100%",height:38,padding:"0 10px",boxSizing:"border-box",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",marginBottom:14}}/></div><div><label style={{display:"block",fontSize:12,marginBottom:5}}>Data</label><input type="date" required value={modal.dataMovimento} onChange={e=>setModal({...modal,dataMovimento:e.target.value})} style={{width:"100%",height:38,padding:"0 10px",boxSizing:"border-box",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",marginBottom:14}}/></div></div>}
          <label style={{display:"block",fontSize:12,marginBottom:5}}>Observações</label>
          <textarea value={modal.observacoes} onChange={e=>setModal({...modal,observacoes:e.target.value})} rows="3"
            style={{width:"100%",padding:10,boxSizing:"border-box",border:"1px solid var(--border)",borderRadius:7,background:"var(--surface)",color:"var(--text)",resize:"vertical"}}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}><button type="button" className="btn" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="btn primary" disabled={saving}>{saving?"Salvando…":"Salvar"}</button></div>
        </form>
      </div>}
    </div>
  );
};

window.FolgasMotoristas = FolgasMotoristas;

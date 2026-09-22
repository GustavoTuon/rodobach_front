import React from 'react';

const localInput = date => new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
export function PainelCargaForm({items, onClose, onSaved}) {
  const options = [...items].sort((a,b)=>Number(b.carga.codigo==='conferir')-Number(a.carga.codigo==='conferir')||a.placa.localeCompare(b.placa));
  const [placa,setPlaca]=React.useState(options[0]?.placa||'');
  const [situacao,setSituacao]=React.useState('');
  const [quando,setQuando]=React.useState(localInput(new Date()));
  const [validade,setValidade]=React.useState(()=>localInput(new Date(Date.now()+24*3600000)));
  const [motivo,setMotivo]=React.useState('');
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [history,setHistory]=React.useState([]),[historyError,setHistoryError]=React.useState(''),[revision,setRevision]=React.useState(0);
  const dialog=React.useRef(null);
  React.useEffect(()=>{
    const previous=document.activeElement;
    dialog.current?.querySelector('select')?.focus();
    return ()=>previous?.focus?.();
  },[]);
  React.useEffect(()=>{
    let active=true;setHistory([]);setHistoryError('');
    if(placa)window.RB_API.getPainelCargaHistorico(placa).then(data=>{if(active)setHistory(data.registros);}).catch(error=>{if(active)setHistoryError(error.message||'Falha ao consultar histórico.');});
    return ()=>{active=false;};
  },[placa,revision]);
  async function save(event) {
    event.preventDefault();setError('');setBusy(true);
    try {
      const item=items.find(item=>item.placa===placa);
      if (situacao!=='vazio' && (!validade || new Date(validade) <= new Date())) throw new Error('Informe uma data e hora futura em Manter situação até.');
      await window.RB_API.savePainelCarga({placa,situacao,confirmadoEm:new Date(quando).toISOString(),expiraEm:situacao==='vazio'?null:new Date(validade).toISOString(),motivo,contexto:item?.contextoCarga});
      await onSaved();onClose();
    } catch(error){setError(error.message||'Não foi possível salvar.');}finally{setBusy(false);}
  }
  async function cancel(id) {
    setError('');setBusy(true);
    try{await window.RB_API.cancelPainelCarga(id);await onSaved();setRevision(value=>value+1);}
    catch(error){setError(error.message||'Não foi possível desfazer.');}finally{setBusy(false);}
  }
  function keys(event) {
    if(event.key==='Escape'&&!busy){event.stopPropagation();onClose();}
    if(event.key==='Tab'){
      const nodes=dialog.current.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled)');
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }
  return <div style={{position:'fixed',inset:0,background:'#000b',zIndex:20000,display:'grid',placeItems:'center',padding:16}}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cargo-correction-title" onKeyDown={keys} style={{background:'#132238',color:'#f4f8ff',border:'1px solid #55769c',borderRadius:12,padding:24,width:'min(760px,100%)',maxHeight:'90vh',overflow:'auto'}}>
      <div className="row between"><h2 id="cargo-correction-title">Corrigir carga</h2><button type="button" disabled={busy} onClick={onClose}>Fechar</button></div>
      <p>Confirmação manual somente no Painel TV. Vazio permanece até o próximo documento de carga. Carregado vale até a data escolhida ou a mudança da operação.</p>
      <form onSubmit={save}>
        <fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gap:12}}>
          <label>Veículo<select required value={placa} onChange={event=>{setPlaca(event.target.value);setSituacao('');setMotivo('');setError('');}} style={{display:'block',width:'100%'}}>{options.map(item=><option key={item.placa} value={item.placa}>{item.placa} · {item.carga.label||item.carga.codigo}</option>)}</select></label>
          <label>Situação confirmada<select required value={situacao} onChange={event=>setSituacao(event.target.value)} style={{display:'block',width:'100%'}}><option value="">Selecione</option><option value="carregado">Carregado</option><option value="vazio">Vazio</option></select></label>
          <label>{situacao==='vazio'?'Data e hora da descarga':'Data e hora da confirmação'}<input required type="datetime-local" value={quando} max={localInput(new Date())} onChange={event=>setQuando(event.target.value)} style={{display:'block',width:'100%',padding:10}}/></label>
          <small>Horário do navegador. Para vazio, informe quando a descarga terminou; o tempo vazio será contado desse momento.</small>
          {situacao!=='vazio'&&<><label>Manter situação até<input required type="datetime-local" value={validade} min={localInput(new Date())} onChange={event=>setValidade(event.target.value)} style={{display:'block',width:'100%',padding:10}}/></label>
          <small>Escolha o último dia e horário de validade. Para manter até o fim do dia 23, informe dia 23 às 23:59.</small></>}
          {situacao==='vazio'&&<small>Permanece vazio até entrar um novo documento de carga para o veículo, sem data de vencimento.</small>}
          <label>Motivo / observação<textarea required minLength={5} maxLength={500} value={motivo} onChange={event=>setMotivo(event.target.value)} rows={3} style={{display:'block',width:'100%',padding:10}}/></label>
          <button type="submit" disabled={!placa||!situacao} className="tv-primary">{busy?'Salvando…':'Salvar confirmação'}</button>
        </fieldset>
      </form>
      {error&&<p role="alert">{error}</p>}
      <h3>Histórico do veículo</h3>
      {historyError&&<p role="alert">{historyError} <button onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></p>}
      {history.map(record=><div key={record.id} style={{borderTop:'1px solid #55769c',padding:'12px 0'}}>
        <strong>{record.situacao==='vazio'?'Vazio':'Carregado'} · {record.estado}</strong>
        <p>{record.motivo}</p><small>{record.usuario_nome} · salvo em {new Date(record.criado_em).toLocaleString('pt-BR')} · confirmado em {new Date(record.confirmado_em).toLocaleString('pt-BR')}{record.cancelado_em&&` · desfeito em ${new Date(record.cancelado_em).toLocaleString('pt-BR')}`}</small>
        <p>{record.documentos_referencia?'Válida até o próximo documento de carga':`Válida até ${new Date(record.expira_em).toLocaleString('pt-BR')}`}</p>
        {record.estado==='Ativa'&&<button type="button" disabled={busy} onClick={()=>cancel(record.id)} style={{marginLeft:12}}>Desfazer confirmação</button>}
      </div>)}
      {!history.length&&!historyError&&<p>Nenhuma confirmação carregada para este veículo.</p>}
    </section>
  </div>;
}

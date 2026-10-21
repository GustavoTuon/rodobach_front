import React from 'react';
import './painel-carga-form.css';

const localInput = date => new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
export function PainelCargaForm({items, onClose, onSaved}) {
  const pending=item=>item.carga.confirmacaoPendente||['conferir','sem_confirmacao','provavelmente_vazio'].includes(item.carga.codigo);
  const options = [...items].sort((a,b)=>Number(Boolean(pending(b)))-Number(Boolean(pending(a)))||a.placa.localeCompare(b.placa));
  const [placa,setPlaca]=React.useState(options[0]?.placa||'');
  const [situacao,setSituacao]=React.useState('');
  const [quando,setQuando]=React.useState(localInput(new Date()));
  const [validade,setValidade]=React.useState(()=>localInput(new Date(Date.now()+24*3600000)));
  const [motivo,setMotivo]=React.useState('');
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [history,setHistory]=React.useState([]),[historyError,setHistoryError]=React.useState(''),[revision,setRevision]=React.useState(0);
  const dialog=React.useRef(null);
  const locked=React.useRef(false),successHeading=React.useRef(null);
  const [success,setSuccess]=React.useState(null),[done,setDone]=React.useState([]);
  const [historyLoading,setHistoryLoading]=React.useState(false);
  const item=items.find(item=>item.placa===placa);
  const dateValid=Boolean(quando)&&Number.isFinite(+new Date(quando))&&new Date(quando)<=new Date()&&Date.now()-new Date(quando)<=180*86400000;
  const ready=Boolean(item?.contextoCarga&&situacao&&dateValid&&motivo.trim().length>=5&&motivo.trim().length<=500&&(situacao==='vazio'||(validade&&new Date(validade)>new Date()&&new Date(validade)>new Date(quando))));
  const steps=Number(Boolean(item))+Number(Boolean(situacao))+Number(ready);
  const next=options.find(option=>pending(option)&&!done.includes(option.placa));
  const reasons=situacao==='vazio'?['Descarga confirmada pelo motorista','Última entrega concluída','Veículo vazio conferido na base']:['Carregamento confirmado pelo motorista','Carregamento concluído no cliente','Veículo ainda está com carga'];
  function selectVehicle(value){setPlaca(value);setSituacao('');setMotivo('');setError('');setSuccess(null);setQuando(localInput(new Date()));setValidade(localInput(new Date(Date.now()+24*3600000)));}
  React.useEffect(()=>{if(success)successHeading.current?.focus();},[success]);
  React.useEffect(()=>{
    const previous=document.activeElement;
    dialog.current?.querySelector('select')?.focus();
    return ()=>previous?.focus?.();
  },[]);
  React.useEffect(()=>{
    let active=true;setHistory([]);setHistoryError('');setHistoryLoading(Boolean(placa));
    if(placa)window.RB_API.getPainelCargaHistorico(placa).then(data=>{if(active)setHistory(data.registros);}).catch(error=>{if(active)setHistoryError(error.message||'Falha ao consultar histórico.');}).finally(()=>{if(active)setHistoryLoading(false);});
    return ()=>{active=false;};
  },[placa,revision]);
  async function save(event) {
    event.preventDefault();
    if(locked.current||success)return;
    if(!ready){setError('Confira a situação, as datas e o motivo (mínimo de 5 caracteres).');return;}
    locked.current=true;setError('');setBusy(true);
    try {
      const item=items.find(item=>item.placa===placa);
      if (situacao!=='vazio' && (!validade || new Date(validade) <= new Date())) throw new Error('Informe uma data e hora futura em Manter situação até.');
      await window.RB_API.savePainelCarga({placa,situacao,confirmadoEm:new Date(quando).toISOString(),expiraEm:situacao==='vazio'?null:new Date(validade).toISOString(),motivo,contexto:item?.contextoCarga});
      setSuccess({placa,situacao});setDone(values=>[...new Set([...values,placa])]);setRevision(value=>value+1);
      try{await onSaved();}catch{setError('Confirmação salva. Atualize o painel ao fechar para visualizar a alteração.');}
    } catch(error){setError(error.message||'Não foi possível salvar.');}finally{locked.current=false;setBusy(false);}
  }
  async function cancel(id) {
    if(locked.current)return;
    locked.current=true;setError('');setBusy(true);
    try{await window.RB_API.cancelPainelCarga(id);setRevision(value=>value+1);setSuccess(null);setDone(values=>values.filter(value=>value!==placa));await onSaved();}
    catch(error){setError(error.message||'Não foi possível desfazer.');}finally{locked.current=false;setBusy(false);}
  }
  function keys(event) {
    if(event.key==='Escape'&&!busy){event.stopPropagation();onClose();}
    if(event.key==='Tab'){
      const nodes=[...dialog.current.querySelectorAll('button,select,input,textarea,summary')].filter(node=>!node.matches(':disabled')&&(!node.closest('details:not([open])')||node.tagName==='SUMMARY'));
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }
  return <div className="pc-overlay">
    <section className="pc-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cargo-correction-title" onKeyDown={keys}>
      <header className="pc-header"><div><span className="pc-eyebrow">CONFERÊNCIA DA FROTA</span><h2 id="cargo-correction-title">Corrigir carga</h2><p>Uma situação confirmada. Um painel mais confiável.</p></div><button type="button" disabled={busy} onClick={onClose}>Fechar</button></header>
      {success?<div className="pc-success"><span className="pc-success-icon" aria-hidden="true">✓</span><h3 ref={successHeading} tabIndex={-1}>Conferência concluída!</h3><p><strong>{success.placa}</strong> confirmado como <strong>{success.situacao==='vazio'?'vazio':'carregado'}</strong>.</p><p>{done.length} {done.length===1?'veículo conferido':'veículos conferidos'} nesta sessão.</p><div className="pc-success-actions">{next&&<button type="button" className="pc-primary" disabled={busy} onClick={()=>selectVehicle(next.placa)}>Conferir próximo · {next.placa}</button>}<button type="button" disabled={busy} onClick={onClose}>Voltar ao painel</button></div></div>:<>
      <div className="pc-progress" aria-label={`${steps} de 3 etapas preenchidas`}><div><span>Seu progresso</span><strong>{steps}/3 etapas</strong></div><div className="pc-progress-track"><span style={{width:`${steps/3*100}%`}}/></div></div>
      <form onSubmit={save}>
        <fieldset disabled={busy} className="pc-fields">
          <section className="pc-step"><h3><span className="pc-step-number">1</span> Escolha o veículo <small>{item?'✓ Selecionado':'Pendente'}</small></h3>
          <label>Veículo<select required value={placa} onChange={event=>selectVehicle(event.target.value)}>{!options.length&&<option value="">Nenhum veículo disponível</option>}{options.map(item=><option key={item.placa} value={item.placa}>{item.placa} · {item.carga.label||item.carga.codigo}{pending(item)?' · Conferir':''}</option>)}</select></label>
          {item&&<div className="pc-vehicle"><strong>{item.placa}</strong><span>{item.motorista||'Motorista não informado'}</span>{item.carga.fonte&&<p>{item.carga.fonte}</p>}</div>}</section>
          <section className="pc-step"><h3><span className="pc-step-number">2</span> Como ele está agora? <small>{situacao?'✓ Escolhido':'Escolha uma opção'}</small></h3>
          <div className="pc-choices" role="group" aria-label="Situação confirmada">{[['vazio','○','Vazio','Descarga concluída, sem carga a bordo'],['carregado','▣','Carregado','Carga a bordo do veículo']].map(([value,icon,title,description])=><button key={value} type="button" aria-pressed={situacao===value} className={`pc-choice ${value} ${situacao===value?'selected':''}`} onClick={()=>{if(situacao!==value){setSituacao(value);setMotivo('');setError('');}}}><span aria-hidden="true">{icon}</span><strong>{title}</strong><small>{description}</small><b aria-hidden="true">{situacao===value?'✓':'+'}</b></button>)}</div></section>
          <section className="pc-step"><h3><span className="pc-step-number">3</span> Confirme os detalhes <small>{ready?'✓ Pronto':'Horário e motivo'}</small></h3>
          <div className="pc-dates">
          <label>{situacao==='vazio'?'Data e hora da descarga':'Data e hora da confirmação'}<input required type="datetime-local" value={quando} max={localInput(new Date())} onChange={event=>setQuando(event.target.value)} style={{display:'block',width:'100%',padding:10}}/></label>
          {situacao==='carregado'&&<label>Manter situação até<input required type="datetime-local" value={validade} min={localInput(new Date())} onChange={event=>setValidade(event.target.value)}/></label>}</div>
          <p className="pc-help">Horário do navegador. {situacao==='vazio'?'Informe quando a descarga terminou; o tempo vazio começa nesse momento.':'Informe quando a situação foi conferida.'}</p>
          {situacao&&<><span className="pc-help">Motivos rápidos · selecione apenas o que você confirmou</span><div className="pc-reasons">{reasons.map(reason=><button type="button" key={reason} aria-pressed={motivo===reason} onClick={()=>setMotivo(reason)}>{motivo===reason?'✓ ': '+ '}{reason}</button>)}</div></>}
          <label>Motivo / observação<textarea required minLength={5} maxLength={500} value={motivo} onChange={event=>setMotivo(event.target.value)} rows={3} style={{display:'block',width:'100%',padding:10}}/></label>
          <div className="pc-summary"><strong>{situacao?`${placa} → ${situacao==='vazio'?'Vazio':'Carregado'}`:'Escolha a situação para revisar'}</strong><span>{situacao==='vazio'?'Permanece vazio até o próximo documento de carga.':situacao==='carregado'?'Vale até a data escolhida ou a mudança da operação.':'A confirmação altera somente o Painel TV.'}</span>{situacao&&<small>Somente no Painel TV. Não altera documentos ou o financeiro.</small>}</div></section>
          <div className="pc-save"><span>{ready?'Tudo pronto. Confira e confirme.':'Complete as etapas para liberar a confirmação.'}</span><button type="submit" disabled={!ready||busy} className="pc-primary">{busy?'Salvando…':'Salvar confirmação'}</button></div>
        </fieldset>
      </form></>}
      {error&&<p className="pc-error" role="alert">{error}</p>}
      <details className="pc-history"><summary>Histórico do veículo <span>{historyLoading?'Carregando…':`${history.length} registros`}</span></summary>
      {historyError&&<p role="alert">{historyError} <button onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></p>}
      {history.map(record=><div key={record.id} style={{borderTop:'1px solid #55769c',padding:'12px 0'}}>
        <strong>{record.situacao==='vazio'?'Vazio':'Carregado'} · {record.estado}</strong>
        <p>{record.motivo}</p><small>{record.usuario_nome} · salvo em {new Date(record.criado_em).toLocaleString('pt-BR')} · confirmado em {new Date(record.confirmado_em).toLocaleString('pt-BR')}{record.cancelado_em&&` · desfeito em ${new Date(record.cancelado_em).toLocaleString('pt-BR')}`}</small>
        <p>{record.documentos_referencia?'Válida até o próximo documento de carga':`Válida até ${new Date(record.expira_em).toLocaleString('pt-BR')}`}</p>
        {record.estado==='Ativa'&&<button type="button" disabled={busy} onClick={()=>cancel(record.id)} style={{marginLeft:12}}>Desfazer confirmação</button>}
      </div>)}
      {!history.length&&!historyError&&!historyLoading&&<p>Nenhuma confirmação registrada para este veículo.</p>}
      </details>
    </section>
  </div>;
}

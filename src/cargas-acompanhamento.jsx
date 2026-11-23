import React, {useEffect,useState} from 'react';
import './cargas-acompanhamento.css';

const reasons=['Cliente desistiu','Não coube no caminhão','Motorista não coletou','Carga indisponível','Outro'];
const levels={vencida:'Previsão vencida',hoje:'Hoje',amanha:'Amanhã',sem_previsao:'Sem previsão',no_prazo:'No prazo'};
export const forecastDate=value=>value ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)} às ${value.slice(11,16)}` : 'Não informada';
export function ForecastFields({form,set,initial,kind}) {
  const previous=initial?.previsao || '';
  const changed=previous && (form.previsao || '')!==previous;
  return <section className="cv2-forecast-fields">
    <label className="cv2-field"><span>{kind==='carga'?'Previsão de carregamento':'Previsão de término da viagem'}</span>
      <input type="datetime-local" value={form.previsao || ''} onChange={e=>{set('previsao',e.target.value);set('previsaoAnterior',previous || null);}} />
      <small>Horário de Brasília. A previsão gera lembretes; não conclui a operação.</small>
    </label>
    {changed && <label className="cv2-field"><span>Motivo do reagendamento</span><input aria-label="Motivo do reagendamento" required minLength={5} maxLength={500} value={form.motivoPrevisao || ''} onChange={e=>set('motivoPrevisao',e.target.value)} placeholder="Explique a mudança ou remoção da previsão"/><small>Anterior: {forecastDate(previous)}</small></label>}
  </section>;
}
export function ForecastBadge({item}) {
  return <div className={`cv2-forecast-badge ${item.alerta?.nivel || ''}`}>
    <strong>{item.previsao ? forecastDate(item.previsao) : 'Sem previsão'}</strong>
    {item.alerta && <small>{levels[item.alerta.nivel]} · {item.alerta.pendencia}</small>}
    {item.acompanhamento?.naoCarregada && <small>{item.acompanhamento.naoCarregada.motivo}</small>}
  </div>;
}
export function ForecastDashboard({kind,selected,onFilter,revision}) {
  const [data,setData]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    const load=()=>{if(!window.RB_API.getPrevisoesV2)return;window.RB_API.getPrevisoesV2().then(result=>{if(active){setData(result);setError(false);}}).catch(()=>{if(active)setError(true);});};
    load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer);};
  },[revision,attempt]);
  return <section className="cv2-forecast-dashboard" aria-label="Acompanhamento de prazos">
    <div className="cv2-forecast-heading"><div><b>Acompanhe os próximos passos</b><p>{kind==='carga'?'Carregamento e documentação pendentes':'Término das viagens em aberto'} · Totais gerais, atualizados a cada minuto.</p></div>{selected && <button className="btn" onClick={()=>onFilter('')}>Limpar filtro de prazo</button>}</div>
    {error ? <p role="alert">Não foi possível atualizar os alertas. <button className="btn" onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></p> : <div className="cv2-forecast-cards">{['vencida','hoje','amanha','sem_previsao'].map(level=><button key={level} className={`${level} ${selected===level?'selected':''}`} aria-pressed={selected===level} onClick={()=>onFilter(selected===level?'':level)}><span>{levels[level]}</span><strong>{data?.[kind]?.[level] ?? '—'}</strong><small>{level==='vencida'?'Precisa de atenção':level==='sem_previsao'?'Definir data e hora':'Conferir programação'}</small></button>)}</div>}
  </section>;
}
export function ForecastHistory({item}) {
  const entries=item.acompanhamento?.historico || [];
  return <section className="cv2-forecast-history"><h3>Histórico de acompanhamento</h3>{!entries.length?<p>Nenhuma alteração registrada.</p>:<ol>{[...entries].reverse().map((entry,index)=><li key={index}><b>{entry.tipo==='previsao'?'Previsão atualizada':entry.tipo==='reabertura'?'Carga reaberta':'Não carregada'}</b><small>{new Date(entry.em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {entry.usuario || 'Sistema'}</small>{entry.tipo==='previsao'&&<p>{forecastDate(entry.anterior)} → {forecastDate(entry.previsao)}</p>}<p>{[entry.motivo,entry.observacoes].filter(Boolean).join(' · ')}</p></li>)}</ol>}</section>;
}
export function NotLoadedForm({item,onSaved,onClose}) {
  const reopening=item.status==='nao_carregada';
  const [motivo,setMotivo]=useState(''),[observacoes,setObservacoes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const save=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await window.RB_API.markNaoCarregadaV2(item.id,{motivo,observacoes,reabrir:reopening});onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <form onSubmit={save}><div className="cv2-modal-body">
    <p>{reopening?'A carga voltará para “Somente carga”, preservando o histórico. Confira a previsão ao reabrir.':'A carga sairá da programação pendente e ficará no relatório de não carregadas.'}</p>
    <label className="cv2-field"><span>{reopening?'Motivo da reabertura':'Motivo do não carregamento'}</span>{reopening?<input required minLength={5} maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)}/>:<select required value={motivo} onChange={e=>setMotivo(e.target.value)}><option value="">Selecione o motivo</option>{reasons.map(reason=><option key={reason}>{reason}</option>)}</select>}</label>
    <label className="cv2-field"><span>Observações</span><textarea aria-label="Observações" required={motivo==='Outro'} minLength={motivo==='Outro'?5:undefined} maxLength={500} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></label>
    {error&&<p role="alert" className="cv2-alert error">{error}</p>}
  </div><footer className="cv2-modal-actions"><button type="button" className="btn" disabled={busy} onClick={onClose}>Voltar</button><button className="btn primary" disabled={busy}>{busy?'Salvando…':reopening?'Reabrir carga':'Confirmar não carregamento'}</button></footer></form>;
}
export function NotLoadedReportButton() {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const download=async()=>{setBusy(true);setError('');try{
    const rows=await window.RB_API.reportNaoCarregadasV2();
    const cell=value=>`"${String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')}"`;
    const lines=[['Carga','Cliente','Origem','Destino','Responsável','Previsão de carregamento','Motivo','Observações','Registrado por','Registrado em'],...rows.map(r=>{const a=r.acompanhamento || {},n=a.naoCarregada || {};return [r.codigo,r.cliente,r.origem,r.destino,r.responsavel,forecastDate(a.previsao),n.motivo,n.observacoes,n.usuario,n.em?new Date(n.em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):''];})];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(line=>line.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='cargas-nao-carregadas.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e.message);}finally{setBusy(false);}};
  return <div><button className="btn" disabled={busy} onClick={download}>{busy?'Gerando relatório…':'Exportar não carregadas (todas)'}</button>{error&&<p role="alert">{error}</p>}</div>;
}

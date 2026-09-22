import React from 'react';

const format=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const when=value=>value&&Number.isFinite(+new Date(value))?format.format(new Date(value)):'Data não informada';
export function PainelCargaMacros({macros}){
 if(!macros?.disponivel)return <div className="tv-note">Macros indisponíveis nesta consulta.</div>;
 if(!macros.ultima)return <div className="tv-note">Sem macros recebidas nos últimos 30 dias.</div>;
 const latest=macros.ultima;
 return <details className="tv-note tv-macro-details">
  <summary>Última macro: {latest.descricao} · {when(latest.dataHora)}</summary>
  <div style={{paddingTop:6}}>
   {macros.operacional&&macros.operacional.id!==latest.id&&<p>Evento da operação: {macros.operacional.descricao} · {when(macros.operacional.dataHora)}</p>}
   <ol aria-label="Histórico recente de macros" style={{paddingLeft:18,margin:'6px 0'}}>
    {macros.historico.map(event=><li key={event.id} style={{marginBottom:6}}>
     <strong>{when(event.dataHora)}</strong> · {event.descricao}
     {event.local&&<span> · {event.local}</span>}{event.ponto&&<span> · {event.ponto}</span>}
     {!event.operacaoAtual&&<span> · Anterior à operação atual</span>}
    </li>)}
   </ol>
   <span>Chegada ao cliente e fim de viagem não comprovam a última descarga.</span>
  </div>
 </details>;
}

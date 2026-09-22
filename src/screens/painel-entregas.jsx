import React from 'react';

export function PainelEntregas({entregas}) {
  if (!entregas) return null;
  if (!entregas.disponivel) return <div className="tv-note">{entregas.observacao}</div>;
  if (!entregas.total) return null;
  const next=entregas.proxima;
  return <div className="tv-route">
    <div style={{whiteSpace:'normal'}}><span>{next?'Próxima parada prevista: ':'Entregas: '}</span><strong>{next?`${next.ordem}/${entregas.total} · ${next.descricao}`:'Todas com descarga confirmada'}</strong></div>
    {next&&<div className="tv-note">{next.situacao}{next.previsao?` · Previsão Elite: ${next.previsao}`:''}</div>}
    <details className="tv-note"><summary>Sequência Elite · {entregas.concluidas}/{entregas.total} descargas confirmadas</summary>
      <p>{entregas.observacao}</p>
      <ol style={{paddingLeft:20,maxHeight:180,overflow:'auto'}}>{entregas.paradas.map(stop=><li key={stop.ordem} style={{marginBottom:8}}>
        <strong>{stop.descricao}</strong><br/>{stop.situacao}
        {stop.previsao&&<><br/>Previsão: {stop.previsao}</>}
        {stop.concluidaEm&&<><br/>Descarga: {new Date(stop.concluidaEm).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</>}
      </li>)}</ol>
    </details>
  </div>;
}

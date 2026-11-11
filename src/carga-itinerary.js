export const formatVolumes = value => value == null || value === '' ? 'Não informado' : Number(value).toLocaleString('pt-BR');
export function volumesSummary(loads) {
  const known=loads.filter(item=>item.volumes!=null && item.volumes!=='');
  const total=known.reduce((sum,item)=>sum+Number(item.volumes),0);
  return {total,missing:loads.length-known.length,text:known.length===loads.length ? formatVolumes(total) : `${formatVolumes(total)} informados · ${loads.length-known.length} carga(s) sem quantidade`};
}
export function buildItinerary(loads) {
  return loads.flatMap(load=>{
    const stops=load.paradas||[];
    const remainder=tipo=>{
      const matching=stops.filter(stop=>stop.tipo===tipo);
      if(load.volumes==null || load.volumes==='' || matching.some(stop=>stop.volumes==null || stop.volumes===''))return null;
      return Math.max(0,Number(load.volumes)-matching.reduce((sum,stop)=>sum+Number(stop.volumes),0));
    };
    const base={carga:load.codigo,material:load.material||''};
    return [
      {...base,id:`${load.id}-coleta`,tipo:'coleta',cliente:load.cliente,cidade:load.origem,uf:load.ufOrigem,volumes:remainder('coleta')},
      ...stops.map((stop,index)=>({...base,id:`${load.id}-parada-${index}`,tipo:stop.tipo,cliente:stop.cliente,cidade:stop.cidade,uf:stop.uf,endereco:stop.endereco,nf:stop.nf,volumes:stop.volumes})),
      {...base,id:`${load.id}-entrega`,tipo:'entrega',cliente:load.clienteFinal,cidade:load.destino,uf:load.ufDestino,volumes:remainder('entrega')},
    ];
  });
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function itineraryHtml(trip,loads,stops) {
  const summary=volumesSummary(loads);
  const document=trip.documentoErp ? `${trip.documentoErp.tipo==='viagem_frota'?'V':'C'}-${trip.documentoErp.numero}` : 'Não vinculado';
  const pending=summary.missing || stops.some(stop=>stop.volumes==null||stop.volumes==='');
  const groups=[{tipo:'coleta',title:'Coletas'},{tipo:'entrega',title:'Entregas'}]
    .map(group=>({...group,items:stops.map((stop,index)=>({stop,index})).filter(({stop})=>stop.tipo===group.tipo)}))
    .filter(group=>group.items.length);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Itinerário ${escape(trip.numero)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#e9edf3;color:#172235;font:11px Arial,sans-serif;line-height:1.3}.toolbar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:12px 24px;background:#172235;color:white}.toolbar button{padding:9px 16px;margin-left:8px;cursor:pointer}.sheet{width:190mm;margin:20px auto;background:white;padding:16px}header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #284577;padding-bottom:8px}h1{font-size:18px;margin:0 0 4px}.reference{text-align:right}small{display:block;font-size:10px;color:#465369}.meta{display:flex;flex-wrap:wrap;gap:4px 20px;padding:8px 0;border-bottom:1px solid #bdc9dc}.summary{margin:7px 0;font-size:10px}.instruction{margin:6px 0 10px;font-size:10px}.pending-note{font-size:10px;margin:6px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px}caption{text-align:left;font-weight:700;padding:5px 0;break-after:avoid}th,td{border:1px solid #bdc9dc;padding:6px 5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{font-size:9px;background:#f0f4fa}td{font-size:10px}td small{font-size:9px;margin-top:2px}.center{text-align:center}.box{display:inline-block;width:15px;height:15px;border:1.4px solid #36465e;background:white;vertical-align:middle}.check{vertical-align:middle}.write-line{display:block;min-height:17px;border-bottom:1px solid #8e9bac}.signatures{display:flex;gap:30px;margin-top:28px;break-inside:avoid}.signatures>div{flex:1;border-top:1px solid #687b96;padding-top:4px;font-size:10px}
  @page{size:A4 portrait;margin:10mm}@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.sheet{margin:0;padding:0;width:100%}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}header,.meta{break-inside:avoid}}
  </style></head><body><div class="toolbar"><span>Itinerário · lista de conferência A4</span><div><button id="close-print">Fechar</button><button id="print-document">Imprimir</button></div></div><main class="sheet">
  <header><div><h1>Itinerário de conferência</h1><small>Rodobach · Coletas e entregas</small></div><div class="reference"><b>${escape(trip.numero)}</b><small>Documento: ${escape(document)}</small></div></header>
  <div class="meta"><span><b>Placa:</b> ${escape(trip.placa||'Não informada')}</span><span><b>Motorista:</b> ${escape(trip.motorista||'Não informado')}</span><span><b>Data:</b> ${escape(String(trip.data||'').slice(0,10).split('-').reverse().join('/'))}</span>${trip.numeroMotorista?`<span><b>Contato:</b> ${escape(trip.numeroMotorista)}</span>`:''}</div>
  <p class="summary"><b>Volumes previstos:</b> ${escape(summary.text)} · ${loads.length} carga(s) · ${stops.length} parada(s) &nbsp; <b>Total carregado:</b> __________</p>
  <p class="instruction">Marque a caixa após conferir cada parada. Anote os volumes conferidos. A numeração identifica a posição da parada no itinerário.</p>
  ${pending?'<p class="pending-note"><b>Volumes pendentes:</b> complete as quantidades não informadas antes da saída. Campo vazio não significa zero.</p>':''}
  ${groups.map(group=>`<table data-stop-type="${group.tipo}"><caption>${group.title}</caption><colgroup><col style="width:5%"><col style="width:6%"><col style="width:14%"><col style="width:40%"><col style="width:17%"><col style="width:9%"><col style="width:9%"></colgroup><thead><tr><th class="center">OK</th><th class="center">Nº</th><th>Tipo / carga</th><th>Cliente / local</th><th>Material / NF</th><th class="center">Vol. prev.</th><th class="center">Vol. conf.</th></tr></thead><tbody>
  ${group.items.map(({stop,index})=>`<tr class="itinerary-stop"><td class="center check"><span class="box" aria-label="Conferir parada ${index+1}"></span></td><td class="center">${index+1}</td><td><b>${stop.tipo==='coleta'?'Coleta':'Entrega'}</b><small>${escape(stop.carga)}</small></td><td><b>${escape(stop.cliente||'Cliente/local não informado')}</b><small>${escape([stop.cidade,stop.uf].filter(Boolean).join(' / ')||'Cidade não informada')}</small>${stop.endereco?`<small>${escape(stop.endereco)}</small>`:''}</td><td>${escape(stop.material||'—')}${stop.nf?`<small>NF: ${escape(stop.nf)}</small>`:''}</td><td class="center">${stop.volumes==null||stop.volumes===''?'A definir':escape(formatVolumes(stop.volumes))}</td><td><span class="write-line"></span></td></tr>`).join('')}
  </tbody></table>`).join('')}
  <div class="signatures"><div>Conferente · nome e assinatura</div><div>Motorista · nome e assinatura</div></div>
  </main></body></html>`;
}

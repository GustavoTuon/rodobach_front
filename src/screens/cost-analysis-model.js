export const ecMoney = v => Number(v || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
export const ecCategory = r => /borrach|vulcan|recap/i.test(`${r.descricao} ${r.historico}`) ? 'Borracharia' : ({Abastecimento:'Combustível',Manutencao:'Manutenção',Pneus:'Pneus',Lavacao:'Lavagem'}[r.tipoCusto] || r.tipoCusto);
export const ecSum = rows => rows.reduce((sum,r)=>sum+r.valor,0);
export function ecGroups(rows,key) {
  const map=new Map();
  for(const r of rows) {const name=key(r)||'Não identificado';map.set(name,(map.get(name)||0)+r.valor);}
  return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
}
function payableDocumentKey(row) {
  const parts=String(row.id || '').split(':');
  if(parts[0]!=='pagar' || parts.length!==8)return null;
  return JSON.stringify([parts[0],parts[1],parts[2],parts[3],parts[5],row.placa]);
}
export function ecDocumentRows(rows) {
  const documents=new Map(),result=[];
  for(const row of rows) {
    const key=payableDocumentKey(row);
    if(!key){result.push(row);continue;}
    let document=documents.get(key);
    if(!document){document={...row,valor:0,documentGrouped:true,sourceRows:[]};documents.set(key,document);result.push(document);}
    document.sourceRows.push(row);
    document.valor+=Number(row.valor || 0);
  }
  for(const document of documents.values()) {
    document.valor=Math.round((document.valor+Number.EPSILON)*100)/100;
    for(const field of ['descricao','tipoCusto','historico'])document[field]=[...new Set(document.sourceRows.map(row=>row[field]).filter(Boolean))].join(' / ');
    document.data=document.sourceRows.map(row=>row.data).filter(Boolean).sort()[0];
  }
  return result;
}
export const ecEvents = rows => new Set(rows.map(r=>payableDocumentKey(r) || `${r.empresa}|${r.placa}|${r.fornecedorCodigo}|${r.documento || r.id}`)).size;
export const ecServices = rows => rows.filter(r=>['Manutenção','Borracharia','Pneus','Lavagem'].includes(ecCategory(r)));
export const ecMonth = value => new Date(`${value}-01T12:00:00Z`).toLocaleDateString('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'}).replace('.','');
export const ecDate = value => value?.split('-').reverse().join('/') || '—';
export const ecPct = value => `${value.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const palette=['#689fff','#a78bfa','#42baa0','#e3af59','#e78395','#79c2d2','#adbb78','#bd98cf','#b99376','#8298b3'];
const categoryColors={'Combustível':'#689fff','Manutenção':'#42baa0','Borracharia':'#e3af59','Pneus':'#a78bfa','Pedagio':'#79c2d2','Seguro':'#8298b3','Multas':'#e78395','Outros':'#a4a7b4','Lavagem':'#adbb78','Motorista/frete':'#bd98cf'};
export function ecColor(name) {return categoryColors[name] || palette[[...name].reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0)%palette.length];}
export function ecGrowth(current,previous) {return previous>0 ? (current/previous-1)*100 : null;}
export function ecAlerts(rows,previous,monthSelected) {
  const total=ecSum(rows), vehicles=ecGroups(rows,r=>r.placa), categories=ecGroups(rows,ecCategory), suppliers=ecGroups(rows,r=>r.fornecedor);
  const alerts=[];
  if(categories[0]&&total>0) alerts.push({label:'Composição',text:`${categories[0].name} representa ${ecPct(categories[0].value/total*100)} dos custos selecionados.`});
  if(suppliers[0]&&total>0) alerts.push({label:'Concentração',text:`${suppliers[0].name} concentra ${ecPct(suppliers[0].value/total*100)} dos gastos.`});
  if(vehicles.length>1&&total>0) alerts.push({label:'Gasto por veículo',text:`${vehicles[0].name} está ${ecPct((vehicles[0].value/(total/vehicles.length)-1)*100)} acima da média de gasto dos ${vehicles.length} veículos selecionados. Isso não considera distância ou tipo de veículo.`});
  if(!monthSelected) {
    const prior=ecGroups(previous,ecCategory);
    const changes=categories.map(c=>({...c,change:ecGrowth(c.value,prior.find(p=>p.name===c.name)?.value)})).filter(c=>c.change!==null&&c.change>0).sort((a,b)=>b.change-a.change);
    if(changes[0]) alerts.push({label:'Variação de custo',text:`${changes[0].name} aumentou ${ecPct(changes[0].change)} frente ao período anterior equivalente.`,attention:true});
  }
  return alerts;
}

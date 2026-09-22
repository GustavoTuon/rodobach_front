import {ecCategory,ecDocumentRows,ecSum} from './cost-analysis-model.js';
export const largestGroupName=(row,mode)=>String(({vehicle:row.placa,category:ecCategory(row),supplier:row.fornecedor})[mode]||'Não identificado');
export function largestCosts(rows,monthCount,mode='vehicle'){
 const months=Math.max(1,monthCount),total=ecSum(rows),documents=ecDocumentRows(rows);
 const plates=new Set(rows.map(r=>r.placa).filter(p=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p||'')));
 const vehicleTotal=ecSum(rows.filter(r=>plates.has(r.placa)));
 const groups=new Map();
 for(const row of rows){const name=largestGroupName(row,mode);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);}
 return {total,documents:documents.length,vehicleCount:plates.size,
  averageVehicle:plates.size?vehicleTotal/plates.size:null,averageDocument:documents.length?total/documents.length:null,
  averageMonth:total/months,largestDocument:[...documents].sort((a,b)=>b.valor-a.valor)[0]||null,
  groups:[...groups].map(([name,related])=>{
   const value=ecSum(related),count=ecDocumentRows(related).length;
   return {name,value,documents:count,averageDocument:count?value/count:null,averageMonth:value/months,
    share:total>0?value/total*100:null,plates:[...new Set(related.map(r=>r.placa||'Não identificada'))].sort()};
  }).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'pt-BR'))};
}

import React,{useEffect,useRef,useState} from 'react';

export function useExpenseDuplicateWarning() {
  const [pending,setPending]=useState(null);
  const resolve=useRef(null);
  useEffect(()=>()=>{resolve.current?.(false);},[]);
  async function check(body,excludeId=null) {
    if(!window.RB_API.checkPlantaoDuplicates)return true;
    let matches=[],failed=false;
    try {const result=await window.RB_API.checkPlantaoDuplicates({plate:body.plate,amount:body.amount,supplier:body.supplier,excludeId});matches=result.matches||[];}
    catch {failed=true;}
    if(!failed&&!matches.length)return true;
    const proceed=await new Promise(done=>{resolve.current=done;setPending({matches,failed,plate:body.plate,supplier:body.supplier,amount:body.amount});});
    if(proceed)body.acknowledgeRecentDuplicate=true;
    return proceed;
  }
  function decide(value){resolve.current?.(value);resolve.current=null;setPending(null);}
  return {check,warning:pending?<ExpenseDuplicateWarning pending={pending} onDecide={decide}/>:null};
}
function ExpenseDuplicateWarning({pending,onDecide}) {
  const ref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView?.({block:'center'});ref.current?.focus();},[]);
  const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  return <section className="mp-recent-duplicate" role="alert" tabIndex={-1} ref={ref} aria-label="Aviso de possível duplicidade">
    <h3>{pending.failed?'Não foi possível verificar despesas recentes':'Atenção: despesa semelhante lançada nos últimos 3 dias'}</h3>
    <p><strong>{pending.plate} · {pending.supplier} · {money(pending.amount)}</strong></p>
    <p>{pending.failed?'A consulta falhou. Você pode revisar ou continuar sem a verificação.':'Encontramos a mesma placa, fornecedor e valor em lançamentos feitos nas últimas 72 horas. Pode ser outro serviço; este aviso não impede o registro.'}</p>
    {pending.matches.length>0&&<ul>{pending.matches.map(row=><li key={row.id}><strong>{row.service} · {money(row.amount)}</strong><br/>Documento: {row.document||'Sem número informado'} · Lançado em {new Date(row.createdAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</li>)}</ul>}
    <div className="mp-recent-duplicate-actions"><button type="button" className="mp-cancel-edit" onClick={()=>onDecide(false)}>Voltar e revisar</button><button type="button" className="mp-submit" onClick={()=>onDecide(true)}>Lançar mesmo assim</button></div>
  </section>;
}

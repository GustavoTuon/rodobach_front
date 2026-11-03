import React,{useEffect,useState} from 'react';
import './expense-tire-picker.css';

export default function ExpenseTirePicker({plate,value,number,onChange,disabled=false}) {
  const [tires,setTires]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [search,setSearch]=useState('');
  const [manual,setManual]=useState(Boolean(number && !value));
  useEffect(()=>{
    let active=true;
    setTires([]);setError('');setLoading(true);setSearch('');
    (async()=>{
      try {
        const result=await window.RB_API.listPlantaoTires(plate);
        if(!Array.isArray(result.tires)) throw new Error();
        if(active)setTires(result.tires);
      } catch {if(active)setError('Não foi possível consultar os pneus desta placa. Tente novamente ou informe o número manualmente.');}
      finally {if(active)setLoading(false);}
    })();
    return ()=>{active=false;};
  },[plate,attempt]);
  const query=search.trim().toLocaleLowerCase('pt-BR');
  const matches=tires.filter(tire=>[tire.code,tire.positionName,tire.brand,tire.model].join(' ').toLocaleLowerCase('pt-BR').includes(query));
  const selected=tire=>value?.code===tire.code && value?.company===tire.company;
  return <section className="expense-tire-picker" aria-label="Vincular pneu à despesa">
    <div className="expense-tire-heading"><span className="expense-tire-symbol" aria-hidden="true">◎</span><div><small>BORRACHARIA · {plate}</small><h3>Qual pneu recebeu o serviço?</h3><p>Escolha pelo número de fogo. A posição ajuda a encontrar o pneu certo.</p></div></div>
    <ol className="expense-tire-progress" aria-label="Etapas do vínculo"><li className="done"><b>✓</b>Placa escolhida</li><li className={value ? 'done' : 'current'}><b>{value ? '✓' : '2'}</b>Escolha o pneu</li><li className={value ? 'done' : ''}><b>{value ? '✓' : '3'}</b>Vínculo pronto</li></ol>
    {value && <div className="expense-tire-selected" role="status"><strong>✓ Pneu {value.code} vinculado</strong><span>{[value.positionName || 'Posição não informada',value.brand,value.size].filter(Boolean).join(' · ')}</span><small>Este pneu será identificado na revisão e no histórico da despesa.</small><button type="button" disabled={disabled} onClick={()=>onChange(null,'')}>Remover vínculo</button></div>}
    {loading && <p role="status">Buscando os pneus da placa {plate}…</p>}
    {error && <div role="alert"><p>{error}</p><button className="mp-cancel-edit" type="button" disabled={disabled} onClick={()=>setAttempt(n=>n+1)}>Tentar carregar pneus novamente</button></div>}
    {!loading && !error && <>
      {tires.length>0 ? <>
        <label>Encontrar pneu<input type="search" value={search} disabled={disabled} onChange={event=>setSearch(event.target.value)} placeholder="Número, posição ou marca" /></label>
        <div className="expense-tire-options" role="group" aria-label="Pneus da placa">{matches.map(tire=><button type="button" key={`${tire.company}:${tire.code}`} className={`expense-tire-option ${selected(tire) ? 'selected' : ''}`} disabled={disabled} aria-pressed={selected(tire)} onClick={()=>{setManual(false);onChange(tire,tire.code);}}>
          <span className="expense-tire-option-top"><small>NÚMERO DO PNEU</small><b aria-hidden="true">{selected(tire) ? '✓' : '+'}</b></span><strong>{tire.code}</strong><span>{tire.positionName || 'Posição não informada'}</span><small>{[tire.brand,tire.model,tire.size].filter(Boolean).join(' · ') || 'Marca não informada'}</small>
        </button>)}</div>
        {!matches.length && <p>Nenhum pneu encontrado nessa busca. Tente outro número ou posição.</p>}
      </> : <p>Nenhum pneu cadastrado como montado nesta placa. Você pode informar o número manualmente.</p>}
    </>}
    <div className="expense-tire-alternative"><button type="button" className="mp-cancel-edit" aria-expanded={manual} disabled={disabled} onClick={()=>setManual(open=>!open)}>Não encontrei o pneu / informar número</button>
      {manual && <label>Número de fogo do pneu — opcional<input aria-label="Número de fogo do pneu — opcional" maxLength={80} value={value ? '' : number} disabled={disabled} onChange={event=>onChange(null,event.target.value)} placeholder="Ex.: 12345" /><small>O número digitado será salvo como informação manual, sem vínculo com o cadastro.</small></label>}
      {!value && !number && <small>Não sabe o número? Você pode continuar sem identificar o pneu.</small>}
    </div>
  </section>;
}

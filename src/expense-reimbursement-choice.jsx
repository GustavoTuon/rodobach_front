import React from "react";

export default function ExpenseReimbursementChoice({value,onChange}) {
  return <fieldset className="unload-reimbursement"><legend>Haverá reembolso pelo cliente?</legend>
    <p>Informe se este custo deverá ser devolvido à empresa pelo cliente.</p>
    <div className="unload-reimbursement-options">{[{value:true,title:'Sim, haverá reembolso'},{value:false,title:'Não haverá reembolso'}].map(option=><button key={String(option.value)} type="button" aria-pressed={value===option.value} onClick={()=>onChange(option.value)}><span>{option.title}</span><span className="unload-radio" aria-hidden="true">{value===option.value ? '✓' : ''}</span></button>)}</div>
  </fieldset>;
}

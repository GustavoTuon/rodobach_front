import React from 'react';
import './expense-document-fields.css';

export const documentTypes = {sem_documento:'Sem documento fiscal',nf_produto:'Nota fiscal de produto',nf_servico:'Nota fiscal de serviço',cupom_fiscal:'Cupom fiscal'};
export default function ExpenseDocumentFields({type,onTypeChange,number,onNumberChange}) {
  return <>
    <fieldset className="expense-document-picker">
      <legend>Tipo de documento fiscal</legend>
      <p>Selecione o documento desta despesa.</p>
      <div className="expense-document-options">
        {Object.entries(documentTypes).map(([value,label])=><label key={value} className={`expense-document-option ${type===value ? 'is-selected' : ''}`}>
          <input type="radio" aria-label={label} name="expense-document-type" value={value} checked={type===value} onChange={()=>onTypeChange(value)} required />
          <span className="expense-document-copy"><strong>{label}</strong><small>{{sem_documento:'Despesa sem documento fiscal',nf_produto:'Compra de peças ou materiais',nf_servico:'Serviços e reparos · número obrigatório',cupom_fiscal:'Comprovante emitido no caixa'}[value]}</small></span>
          <span className="expense-document-check" aria-hidden="true">{type===value ? '✓' : ''}</span>
        </label>)}
      </div>
    </fieldset>
    <label>Número da nota / comprovante{type==='nf_servico' ? ' — obrigatório' : ' — opcional'}<input maxLength={80} value={number} required={type==='nf_servico'} onChange={e=>onNumberChange(e.target.value)} /></label>
  </>;
}

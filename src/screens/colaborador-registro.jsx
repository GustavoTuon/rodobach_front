export const RECORD_TYPES = {
 advertencia_verbal:{label:'Advertência verbal',icon:'◌',color:'amber',hint:'Registre a orientação e a ciência.',date:'Data da orientação',description:'Motivo da orientação',placeholder:'Descreva o ocorrido e a orientação dada.',requiredDescription:true,fields:[['ciencia','Ciência em','date']]},
 advertencia_escrita:{label:'Advertência por escrito',icon:'✎',color:'amber',hint:'Formalize o motivo e anexe o documento.',date:'Data da advertência',description:'Motivo da advertência',placeholder:'Descreva o motivo da advertência.',requiredDescription:true,fields:[['ciencia','Ciência em','date']]},
 avaria:{label:'Avaria',icon:'⚒',color:'coral',hint:'Identifique o dano e acompanhe a solução.',date:'Data da avaria',description:'O que foi danificado?',placeholder:'Informe o dano e como foi identificado.',requiredDescription:true,fields:[['placa','Placa (se houver)','text'],['valor','Valor estimado (R$)','number']]},
 acidente:{label:'Acidente',icon:'△',color:'coral',hint:'Registre o ocorrido, o veículo e as fotos.',date:'Data do acidente',description:'O que aconteceu?',placeholder:'Descreva o local e as circunstâncias do acidente.',requiredDescription:true,fields:[['placa','Placa (se houver)','text'],['valor','Valor estimado (R$)','number']]},
 ferias:{label:'Férias',icon:'☀',color:'blue',hint:'Organize o período e a volta ao trabalho.',date:null,description:'Observações',placeholder:'Algum detalhe sobre este período?',fields:[['inicio','Início das férias','date',true],['fim','Último dia de férias','date',true],['retorno','Retorno ao trabalho','date',true]]},
 epi:{label:'EPI',icon:'⬡',color:'green',hint:'Registre a entrega e a próxima troca.',date:'Data da entrega',description:'Observações',placeholder:'Detalhes adicionais da entrega, se necessário.',fields:[['item','EPI entregue','text',true],['quantidade','Quantidade','number',true],['tamanho','Tamanho','text'],['ca','CA do EPI','text'],['troca','Próxima troca','date']]},
 uniforme:{label:'Uniforme',icon:'♧',color:'purple',hint:'Informe a peça, o tamanho e a quantidade.',date:'Data da entrega',description:'Observações',placeholder:'Detalhes adicionais da entrega, se necessário.',fields:[['item','Peça entregue','text',true],['quantidade','Quantidade','number',true],['tamanho','Tamanho','text']]},
 celular:{label:'Celular / IMEI',icon:'▯',color:'blue',hint:'Vincule o aparelho e o IMEI ao colaborador.',date:'Data da entrega',description:'Observações',placeholder:'Detalhes adicionais do aparelho, se necessário.',fields:[['item','Aparelho / modelo','text',true],['imei','IMEI (15 dígitos)','text',true],['condicao','Condição do aparelho','text']]},
};
export function RegistroIcon({tipo}){
 const paths={
  advertencia_verbal:'M4 4h16v12H9l-5 4V4 M8 8h8 M8 12h5',
  advertencia_escrita:'M6 3h9l4 4v14H6V3 M14 3v5h5 M9 12h7 M9 16h5',
  avaria:'M14 4a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-3-3 2-4Z',
  acidente:'M12 3 2 21h20L12 3Z M12 9v5 M12 17v1',
  ferias:'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  epi:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2Z M8 12l3 3 5-6',
  uniforme:'M8 3 2 7l3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z',
  celular:'M7 2h10v20H7V2Z M10 5h4 M11 19h2',
 };
 return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[tipo]}/></svg>;
}
const dateLabel=value=>value?value.split('-').reverse().join('/'):'—';
export function recordDescription(form){
 if(form.descricao.trim())return form.descricao.trim();
 const d=form.detalhes;
 if(form.tipo==='ferias')return `Férias de ${dateLabel(d.inicio)} a ${dateLabel(d.fim)}. Retorno em ${dateLabel(d.retorno)}.`;
 if(['epi','uniforme'].includes(form.tipo))return `Entrega de ${d.quantidade} × ${d.item}.`;
 if(form.tipo==='celular')return `Entrega do aparelho ${d.item}.`;
 return '';
}
export function recordIssue(form){
 const d=form.detalhes;
 if(RECORD_TYPES[form.tipo].requiredDescription&&!form.descricao.trim())return 'Descreva o motivo ou o ocorrido para continuar.';
 if(form.tipo==='ferias'&&d.inicio&&d.fim&&d.retorno&&(d.fim<d.inicio||d.retorno<=d.fim))return 'Confira o período: o retorno deve ser após o último dia de férias.';
 if(form.prazo&&form.prazo<form.data)return 'O prazo de acompanhamento não pode ser anterior à data do registro.';
 for(const [key,label] of [['ciencia','A ciência'],['troca','A próxima troca'],['devolucao','A devolução']])if(d[key]&&d[key]<form.data)return `${label} não pode ser anterior à data do registro.`;
 return '';
}

export default function ColaboradorRegistro({form,setForm,person,saving,error,onSave,onAttach,onClose,startStep=0}){
 const [step,setStep]=React.useState(startStep),[validation,setValidation]=React.useState('');
 const dialog=React.useRef(null),scroller=React.useRef(null),heading=React.useRef(null);
 const config=RECORD_TYPES[form.tipo];
 React.useEffect(()=>{const focus=document.activeElement;const element=dialog.current;element.showModal();return()=>{element.close();focus?.focus();};},[]);
 React.useEffect(()=>{if(scroller.current)scroller.current.scrollTop=0;heading.current?.focus();},[step]);
 React.useEffect(()=>{if(error&&scroller.current)scroller.current.scrollTop=0;},[error]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value}));
 const fields=config.fields;
 const completed=fields.filter(([key,,,required])=>required&&form.detalhes[key]).length+(config.requiredDescription&&form.descricao.trim()?1:0)+(config.date&&form.data?1:0);
 const requiredCount=fields.filter(([, , ,required])=>required).length+(config.requiredDescription?1:0)+(config.date?1:0);
 function selectType(tipo){
  if(tipo!==form.tipo)setForm(f=>({...f,tipo,detalhes:['epi','uniforme'].includes(tipo)?{quantidade:1}:{},descricao:'',prazo:null}));
  else if(['epi','uniforme'].includes(tipo)&&!form.detalhes.quantidade)setForm(f=>({...f,detalhes:{...f.detalhes,quantidade:1}}));
  setValidation('');setStep(1);
 }
 function proceed(event){
  event.preventDefault();if(saving||step===0)return;
  const issue=recordIssue(form);setValidation(issue);if(issue){if(scroller.current)scroller.current.scrollTop=0;return;}
  if(step===1){setStep(2);return;}
  onSave(event);
 }
 function field([key,label,type='text',required=false]){
  const imei=key==='imei'||key==='imei2';
  return <label key={key}>{label}{required&&<span className="col-required">Obrigatório</span>}<input type={type} required={required} maxLength={imei?15:type==='text'?200:undefined} inputMode={imei?'numeric':undefined} pattern={imei?'[0-9]{15}':undefined} min={type==='number'?(key==='quantidade'?1:0):key==='fim'?form.detalhes.inicio:undefined} step={key==='valor'?'0.01':undefined} value={form.detalhes[key]??''} onChange={e=>setForm(f=>({...f,detalhes:{...f.detalhes,[key]:type==='number'?(e.target.value===''?null:Number(e.target.value)):type==='date'?(e.target.value||null):e.target.value}}))}/></label>;
 }
 const optionalFields=[...(form.tipo==='celular'?[['imei2','IMEI 2 (opcional)','text']]:[]),...(['epi','uniforme','celular'].includes(form.tipo)?[['devolucao','Data da devolução','date']]:[])];
 return <dialog ref={dialog} className="col-dialog" aria-labelledby="col-dialog-title" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}>
  <form onSubmit={proceed}>
   <header className="col-dialog-header"><div><span className="col-eyebrow">{form.version?'ATUALIZAR ACOMPANHAMENTO':'NOVO ACOMPANHAMENTO'}</span><h2 id="col-dialog-title" ref={heading} tabIndex={-1}>{['O que vamos registrar?',config.label,'Tudo pronto para salvar?'][step]}</h2><p>{person?.nome}</p></div><button type="button" className="col-close" disabled={saving} onClick={onClose} aria-label="Fechar formulário">×</button></header>
   <ol className="col-steps" aria-label="Etapas do lançamento">{['Escolher tipo','Preencher','Confirmar'].map((label,index)=><li key={label} className={step===index?'current':step>index?'done':''} aria-current={step===index?'step':undefined}><span>{step>index?'✓':index+1}</span>{label}</li>)}</ol>
   <div className="col-dialog-body" ref={scroller}>
    {(error||validation)&&<div role="alert" className="col-error">{validation||error}</div>}
    {step===0?<><p className="col-help">Escolha uma categoria. Vamos pedir apenas os dados desse lançamento.</p><div className="col-type-grid">{Object.entries(RECORD_TYPES).map(([key,type])=><button type="button" key={key} className={`col-type-card tone-${type.color}`} onClick={()=>selectType(key)}><span className="col-type-icon" aria-hidden="true">{<RegistroIcon tipo={key}/>}</span><span><strong>{type.label}</strong><small>{type.hint}</small></span><b aria-hidden="true">→</b></button>)}</div></>:step===1?<fieldset disabled={saving}>
     <div className={`col-step-banner tone-${config.color}`}><span className="col-type-icon" aria-hidden="true">{<RegistroIcon tipo={form.tipo}/>}</span><div><strong>{config.hint}</strong><small>{completed} de {requiredCount} dados essenciais preenchidos</small></div><span className="col-mini-progress">{requiredCount?Math.round(completed/requiredCount*100):100}%</span></div>
     <div className="col-form-grid">
      {config.date&&<label>{config.date}<input type="date" required value={form.data} onChange={e=>change('data',e.target.value)}/></label>}
      {fields.map(field)}
      <label className="col-full">{config.description}{!config.requiredDescription&&<span className="col-required">Opcional</span>}<textarea required={config.requiredDescription} rows={3} placeholder={config.placeholder} maxLength={5000} value={form.descricao} onChange={e=>change('descricao',e.target.value)}/></label>
     </div>
     <details className="col-options"><summary>Mais detalhes e comprovantes <span>{form.anexos.length?`${form.anexos.length} anexo(s)`:'Opcional'}</span></summary><div className="col-form-grid">
      {optionalFields.map(field)}
      {form.tipo==='ferias'&&<label>Data do registro<input type="date" required value={form.data} onChange={e=>change('data',e.target.value)}/></label>}
      <label className="col-full">Comprovantes e fotos<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" multiple onChange={onAttach}/><small>Até 3 arquivos PDF, PNG, JPG ou WebP de 1 MB cada.</small></label>
      <div className="col-full col-attachments">{form.anexos.map((a,index)=><span key={index}>{a.nome}<button type="button" className="btn" aria-label={`Remover ${a.nome}`} onClick={()=>change('anexos',form.anexos.filter((_,i)=>i!==index))}>×</button></span>)}</div>
     </div></details>
    </fieldset>:<fieldset disabled={saving}>
     <div className="col-review-card"><span className={`col-type-icon tone-${config.color}`} aria-hidden="true">{<RegistroIcon tipo={form.tipo}/>}</span><div><small>{config.label} · {dateLabel(form.data)}</small><h3>{person?.nome}</h3><p>{recordDescription(form)}</p></div><button type="button" className="btn" onClick={()=>setStep(1)}>Corrigir dados</button></div>
     <dl className="col-review-details">{[...fields,...optionalFields].filter(([key])=>form.detalhes[key]!=null&&form.detalhes[key]!=='').map(([key,label,type])=><div key={key}><dt>{label}</dt><dd>{type==='date'?dateLabel(form.detalhes[key]):form.detalhes[key]}</dd></div>)}</dl>
     {form.anexos.length>0&&<p className="col-help">{form.anexos.length} comprovante(s): {form.anexos.map(a=>a.nome).join(', ')}</p>}
     <div className="col-outcome"><h3>Como fica este acompanhamento?</h3><div className="col-outcome-options">{[['pendente','◷','Acompanhar','Ainda há algo a resolver.'],['concluido','✓','Concluído','As ações já foram finalizadas.'],...(form.version?[['cancelado','×','Cancelado','Manter no histórico, sem pendência.']]:[])].map(([value,icon,label,hint])=><button type="button" aria-pressed={form.status===value} key={value} className={form.status===value?'selected':''} onClick={()=>change('status',value)}><b aria-hidden="true">{icon}</b><strong>{label}</strong>{' '}<small>{hint}</small></button>)}</div></div>
     <div className="col-form-grid col-followup">
      {form.status==='pendente'&&<label>Prazo para acompanhar <span className="col-required">Opcional</span><input type="date" min={form.data} value={form.prazo||''} onChange={e=>change('prazo',e.target.value||null)}/></label>}
      <label>Responsável<input required maxLength={200} value={form.responsavel} onChange={e=>change('responsavel',e.target.value)}/></label>
      {form.status==='cancelado'&&field(['cancelamento','Motivo do cancelamento','text',true])}
     </div>
    </fieldset>}
   </div>
   <footer className="col-dialog-footer"><span>Etapa {step+1} de 3</span><div><button type="button" className="btn" disabled={saving} onClick={()=>{if(step>0){setValidation('');setStep(step-1);}else onClose();}}>{step?'← Voltar':'Cancelar'}</button>{step>0&&<button type="submit" className="btn primary" disabled={saving}>{saving?'Salvando…':step===1?'Revisar registro →':'✓ Salvar registro'}</button>}</div></footer>
  </form>
 </dialog>;
}

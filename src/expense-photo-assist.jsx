import React, {useEffect, useRef, useState} from "react";
import {createLocalOcrJob} from "./expense-ocr.js";
import ExpensePhotoCrop from "./expense-photo-crop.jsx";
const names = {odometer:"Painel / hodômetro",pump:"Bomba de combustível",invoice:"Nota / comprovante"};
export default function ExpensePhotoAssist({photos, knownPhotos, fuel, photoKinds, suggestionFields, preparePhoto, onPhoto, onApply, onLoadSaved, onBusy, values}) {
  const [reading,setReading]=useState(null);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState(null);
  const [message,setMessage]=useState("");
  const [uploading,setUploading]=useState(false);
  const [editing,setEditing]=useState(null);
  const job=useRef(null), alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;job.current?.cancel();};},[]);
  const kinds=photoKinds || (fuel ? ["odometer","pump","invoice"] : ["invoice"]);
  async function read(kind, options = {}) {
    if (reading || uploading) return;
    setEditing(null);setReading(kind);setProgress(0);setResult(null);setMessage("");
    try {
      const photo=photos[kind] || (await onLoadSaved())?.[kind];
      if (!alive.current) return;
      if (!photo) throw new Error("Adicione uma foto para tentar a leitura, ou preencha manualmente.");
      const current=createLocalOcrJob(photo,kind,m=>{if(alive.current) setProgress(previous=>Math.max(previous,Math.round(m.progress*100)));},options);
      job.current=current;
      const extracted=await current.promise;
      if(alive.current) setResult({...extracted,suggestions:suggestionFields ? extracted.suggestions.filter(item=>suggestionFields.includes(item.field)) : extracted.suggestions,kind});
    } catch(error) {if(alive.current) setMessage(error.message || "Não foi possível ler a foto. Preencha manualmente.");}
    finally {job.current=null;if(alive.current) setReading(null);}
  }
  return <section className="expense-photo-assist" aria-label="Preenchimento por fotos">
    <p className="expense-photo-intro">{suggestionFields ? "Leia a nota para sugerir o posto e o local. Você escolhe quais dados usar." : "Anexe uma foto e use a leitura para ajudar a preencher. Revise as sugestões antes de aplicar."}</p>
    <div className="expense-photo-grid">{kinds.map(kind=>{
      const exists=photos[kind] !== undefined ? Boolean(photos[kind]) : Boolean(knownPhotos[kind]);
      return <div className="expense-photo-slot" key={kind}>
        <div className="expense-photo-slot-title"><strong>{names[kind]}</strong><span>{exists ? "Foto anexada" : "Opcional"}</span></div>
        <label className={`expense-upload ${exists ? "has-photo" : ""}`}><span className="expense-upload-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h4l2-2h4l2 2h4v14H4z" strokeLinejoin="round"/><circle cx="12" cy="12" r="4"/></svg></span><span className="expense-upload-copy"><strong>{exists ? "Trocar foto" : "Adicionar foto"}</strong><small>Fotografe ou escolha da galeria</small></span><span className="expense-upload-plus" aria-hidden="true">+</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={kind === "invoice" ? "Foto da nota ou comprovante — opcional" : `Foto de ${names[kind]}`} disabled={Boolean(reading) || uploading} onChange={async e=>{
          const file=e.target.files?.[0];e.target.value="";if(!file)return;
          setUploading(true);onBusy(true);setMessage("");setResult(null);setEditing(null);
          try {const image=await preparePhoto(file);if(alive.current)onPhoto(kind,image);} catch(error){if(alive.current)setMessage(error.message);}finally{if(alive.current)setUploading(false);onBusy(false);}
        }} /></label>
        {photos[kind] && <img src={photos[kind]} alt={`Prévia: ${names[kind]}`} />}
        {exists && <><div className="expense-photo-actions"><button type="button" disabled={Boolean(reading) || uploading} className="expense-photo-read" aria-label={`Ler foto de ${names[kind]}`} onClick={()=>read(kind)}>Ler foto</button><button type="button" disabled={Boolean(reading) || uploading} aria-label={`Ajustar área de ${names[kind]}`} onClick={async()=>{try{const photo=photos[kind] || (await onLoadSaved())?.[kind];if(alive.current && photo){setResult(null);setEditing({kind,photo});}}catch{setMessage("Não foi possível carregar a foto.");}}}>Ajustar área</button><button type="button" disabled={Boolean(reading) || uploading} className="expense-photo-remove" aria-label={`Remover ${names[kind]}`} onClick={()=>{setEditing(null);onPhoto(kind,null);setResult(null);}}>Remover</button></div></>}
      </div>;
    })}</div>
    <p className="expense-photo-tip">{kinds.includes("invoice") ? "Enquadre a nota inteira, com o nome do posto e os valores legíveis." : "Fotografe de frente, sem reflexos. Inclua todos os dígitos e o separador decimal."}</p>
    {editing && <ExpensePhotoCrop source={editing.photo} kind={editing.kind} onRead={options=>read(editing.kind,options)} onClose={()=>setEditing(null)}/> }
    {uploading && <p role="status">Preparando foto…</p>}
    {reading && <div className="expense-ocr-progress" role="status"><span>{progress ? `Lendo ${names[reading]}: ${progress}%` : "Preparando leitura local…"}</span><progress max="100" value={progress} /><button type="button" onClick={()=>job.current?.cancel()}>Cancelar leitura</button></div>}
    {message && <p className="expense-ocr-message" role="status">{message}</p>}
    {result && <div className="expense-ocr-results"><strong>{result.suggestions.length ? "Sugestões da foto — revise antes de usar" : "Leitura sem dados confirmados"}</strong>
      {suggestionFields && !result.suggestions.length && <p>Posto e local não foram identificados com segurança. Você pode ajustar a foto ou preencher os campos acima.</p>}
      {result.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
      {result.suggestions.map((item,i)=><div className="expense-ocr-suggestion" key={`${item.field}-${i}`}><span>{item.label}<b>{typeof item.value === "number" ? item.value.toLocaleString("pt-BR",{maximumFractionDigits:3}) : item.value}</b>{values[item.field] && <small>Atual: {values[item.field]}</small>}</span><button type="button" onClick={()=>{onApply(item.field,item.value);setMessage("Sugestão aplicada. Você pode corrigir o campo antes de enviar.");}}>Usar {item.label}</button></div>)}
      {result.text && <details><summary>Ver trechos reconhecidos (podem conter erros)</summary><pre>{result.text}</pre></details>}
    </div>}
    <small className="expense-ocr-local">Leitura no seu aparelho · A foto será salva junto com a despesa.</small>
  </section>;
}

import React,{useState,useEffect,useRef} from 'react';
import './bloco-notas.css';
const when=value=>value ? new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) : '';
const payload=note=>({id:note.id,title:note.title,plate:note.plate,text:note.text,version:note.version});
export function readNoteDraft(key){try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value.id==='string'&&typeof value.title==='string'&&typeof value.text==='string'&&typeof value.plate==='string'&&Number.isInteger(value.version) ? value : null;}catch{return null;}}
export default function BlocoNotas({user}) {
 const draftKey=`rodobach:notes:draft:${user.id}`;
 const [note,setNote]=useState(()=>readNoteDraft(draftKey)),[dirty,setDirty]=useState(()=>Boolean(readNoteDraft(draftKey)));
 const [notes,setNotes]=useState([]),[query,setQuery]=useState(''),[more,setMore]=useState(false),[tick,setTick]=useState(0);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[opening,setOpening]=useState(false);
 const [error,setError]=useState(''),[listError,setListError]=useState(''),[message,setMessage]=useState(''),[conflict,setConflict]=useState(false);
 const [draftError,setDraftError]=useState(false),[plates,setPlates]=useState([]),[platesError,setPlatesError]=useState(false);
 const busy=useRef(false),openRequest=useRef(0),editor=useRef(null);
 useEffect(()=>{if(note&&window.innerWidth<=600)editor.current?.scrollIntoView?.({block:'start'});},[note?.id]);
 useEffect(()=>{
  if(!dirty||!note)return;
  try{localStorage.setItem(draftKey,JSON.stringify(note));setDraftError(false);}catch{setDraftError(true);}
 },[dirty,note,draftKey]);
 useEffect(()=>{
  let live=true,inFlight=false;
  const refresh=async()=>{
   if(inFlight)return;inFlight=true;setLoading(true);
   try{const data=await window.RB_API.listNotes(query);if(live){setNotes(data.notes);setMore(data.hasMore);setListError('');}}
   catch(error){if(live)setListError(error.message||'Não foi possível carregar as notas.');}
   finally{inFlight=false;if(live)setLoading(false);}
  };
  const debounce=setTimeout(refresh,200),timer=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);
  return()=>{live=false;clearTimeout(debounce);clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[query,tick]);
 useEffect(()=>{let live=true;window.RB_API.notePlates().then(data=>{if(live)setPlates(data.plates);}).catch(()=>{if(live)setPlatesError(true);});return()=>{live=false;openRequest.current++;};},[]);
 function clearDraft(){try{localStorage.removeItem(draftKey);}catch{/* Saving to the server still succeeded. */}}
 function canSwitch(){return !dirty||window.confirm('Há alterações não salvas no sistema. Descartar este rascunho e continuar?');}
 function fresh(){if(busy.current||!canSwitch())return;openRequest.current++;clearDraft();setNote({id:crypto.randomUUID(),title:'',plate:'',text:'',version:0});setDirty(false);setConflict(false);setError('');setMessage('');}
 async function open(id){
  if(busy.current||!canSwitch())return;
  const request=++openRequest.current;setOpening(true);setError('');
  try{const data=await window.RB_API.getNote(id);if(request!==openRequest.current)return;clearDraft();setNote(data.note);setDirty(false);setConflict(false);setMessage('');}
  catch(error){if(request===openRequest.current)setError(error.message);}
  finally{if(request===openRequest.current)setOpening(false);}
 }
 function edit(field,value){setNote(current=>({...current,[field]:value}));setDirty(true);setMessage('');}
 async function save(event){
  event.preventDefault();if(busy.current||user.readOnly||!note)return;
  if(!note.title.trim()&&!note.plate){setError('Informe um título ou selecione uma placa.');return;}
  if(!note.text.trim()){setError('Escreva o texto da anotação.');return;}
  busy.current=true;setSaving(true);setError('');setMessage('');
  try{const data=await window.RB_API.saveNote(payload(note));setNote(data.note);setDirty(false);clearDraft();setConflict(false);setMessage('Salvo no sistema. Disponível no celular e no PC com o mesmo usuário.');setTick(value=>value+1);}
  catch(error){setError(error.message);setConflict(error.status===409||error.status===404);}
  finally{busy.current=false;setSaving(false);}
 }
 async function remove(){
  if(busy.current||!note?.version||!window.confirm('Excluir esta anotação? Ela deixará de aparecer no celular e no PC.'))return;
  busy.current=true;setSaving(true);setError('');
  try{await window.RB_API.deleteNote(note.id,note.version);clearDraft();setNote(null);setDirty(false);setMessage('Anotação excluída.');setTick(value=>value+1);}
  catch(error){setError(error.message);}finally{busy.current=false;setSaving(false);}
 }
 const changedElsewhere=note?.version>0 && notes.some(row=>row.id===note.id&&row.version>note.version);
 return <section className="bn-page">
  <header className="bn-heading"><div><span>SEU ESPAÇO DE ANOTAÇÕES</span><h1>Bloco de notas<span>.</span></h1><p>Anote no celular. Continue no computador.</p></div><button className="bn-primary" onClick={fresh} disabled={user.readOnly||saving||opening}>＋ Nova anotação</button></header>
  <div className="bn-layout">
   <aside className="bn-sidebar"><label className="bn-search">Buscar anotações<input type="search" value={query} maxLength={120} placeholder="Título, placa ou texto" onChange={event=>setQuery(event.target.value)}/></label>
    <div className="bn-list-heading"><span>MINHAS NOTAS · {notes.length}{more?'+':''}</span><button onClick={()=>setTick(value=>value+1)} disabled={loading}>{loading?'Atualizando…':'Atualizar'}</button></div>
    {listError && <p className="bn-error" role="alert">{listError}</p>}
    {!loading&&!listError&&!notes.length&&<p className="bn-empty-list">{query?'Nenhuma nota encontrada.':'Suas anotações salvas vão aparecer aqui.'}</p>}
    <div className="bn-list">{notes.map(row=><button key={row.id} className={`bn-note ${note?.id===row.id?'is-selected':''}`} aria-pressed={note?.id===row.id} onClick={()=>open(row.id)} disabled={saving||opening}><strong>{row.title||row.plate}</strong>{row.plate&&<span className="bn-plate">{row.plate}</span>}<p>{row.text}</p><small>{when(row.updatedAt)}</small></button>)}</div>
    {more&&<p className="bn-help">Exibindo as 100 notas mais recentes. Use a busca para encontrar as anteriores.</p>}
    <p className="bn-private">Notas pessoais · visíveis apenas para seu usuário.</p>
   </aside>
   <main className="bn-editor-wrap" ref={editor}>
    {error&&<p role="alert" className="bn-error">{error}</p>}{message&&<p role="status" className="bn-success">{message}</p>}
    {changedElsewhere&&<p className="bn-error">Há uma versão mais recente em outro aparelho. <button disabled={saving||opening} onClick={()=>open(note.id)}>Reabrir versão salva</button></p>}
    {opening&&<p role="status">Abrindo anotação…</p>}
    {note ? <form className="bn-editor" onSubmit={save}>
      <div className="bn-paper-head"><span>{note.version?'ANOTAÇÃO':'NOVA ANOTAÇÃO'}</span><span role="status">{dirty ? draftError ? 'Rascunho sem proteção local' : 'Rascunho neste aparelho · falta salvar' : note.version ? `Salvo · ${when(note.updatedAt)}` : 'Ainda não salva'}</span></div>
      <div className="bn-fields"><label>Título<input value={note.title} maxLength={120} placeholder="O que você precisa lembrar?" onChange={event=>edit('title',event.target.value)} disabled={saving||opening||user.readOnly}/></label><label>Placa (opcional)<input list="bn-plates" value={note.plate} maxLength={7} pattern="[A-Z]{3}[0-9][A-Z0-9][0-9]{2}|" placeholder="Selecione ou digite" onChange={event=>edit('plate',event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} disabled={saving||opening||user.readOnly}/><datalist id="bn-plates">{plates.map(plate=><option value={plate} key={plate}/>)}</datalist></label></div>
      {platesError&&<p className="bn-help">Cadastro de placas indisponível. Você pode digitar a placa ou usar apenas um título.</p>}
      <label className="bn-text-label">Anotação<textarea value={note.text} maxLength={20000} placeholder="Escreva aqui… serviço para fazer, lembrete, conversa com o motorista, o que precisar." onChange={event=>edit('text',event.target.value)} disabled={saving||opening||user.readOnly}/></label>
      <div className="bn-wordcount">{note.text.length.toLocaleString('pt-BR')} / 20.000 caracteres</div>
      {draftError&&dirty&&<p className="bn-error">Não foi possível guardar o rascunho neste aparelho. Salve no sistema antes de sair.</p>}
      {user.readOnly&&<p className="bn-help">Seu acesso permite somente consultar as notas.</p>}
      <footer className="bn-actions">{note.version>0&&!user.readOnly&&<button type="button" className="bn-delete" disabled={saving||opening} onClick={remove}>Excluir</button>}<span/>{conflict&&!user.readOnly&&<button type="button" disabled={saving} onClick={()=>{setNote(current=>({...current,id:crypto.randomUUID(),version:0}));setDirty(true);setConflict(false);setError('');}}>Manter texto como nova nota</button>}<button type="submit" className="bn-primary" disabled={saving||opening||user.readOnly||(!dirty&&note.version>0)}>{saving?'Salvando…':'Salvar anotação'}</button></footer>
     </form> : <div className="bn-welcome"><span aria-hidden="true">✎</span><h2>Uma ideia, uma placa, um lembrete.</h2><p>Crie uma anotação ou escolha uma da lista.<br/>Tudo que você salvar fica disponível nos seus aparelhos.</p><button className="bn-primary" onClick={fresh} disabled={user.readOnly}>Criar minha primeira nota</button></div>}
   </main>
  </div>
 </section>;
}
window.BlocoNotas=BlocoNotas;

import React,{useEffect,useRef,useState} from 'react';
import NoteEditor from './note-editor.jsx';
import './bloco-notas.css';
export {readNoteDraft} from './note-editor.jsx';
export default function BlocoNotas({user}) {
 const [vehicles,setVehicles]=useState([]),[tasks,setTasks]=useState([]),[selected,setSelected]=useState(null);
 const [query,setQuery]=useState(''),[pendingOnly,setPendingOnly]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [tick,setTick]=useState(0),[creating,setCreating]=useState(false),[title,setTitle]=useState(''),[checked,setChecked]=useState([]),[taskSearch,setTaskSearch]=useState(''),[saving,setSaving]=useState(false),[batchId,setBatchId]=useState('');
 const [categories,setCategories]=useState(['caminhao','carreta']),[createMenu,setCreateMenu]=useState(false),[noteRequest,setNoteRequest]=useState(0);
 const noteEditor=useRef(null),menuWrap=useRef(null);
 const busy=useRef(false),revision=useRef(0),detail=useRef(null);
 useEffect(()=>{
  let live=true,inFlight=false;
  async function refresh(){
   if(inFlight||busy.current)return;inFlight=true;const started=revision.current;setLoading(true);
   try{const [fleet,data]=await Promise.all([window.RB_API.noteFleet(),window.RB_API.noteTasks()]);if(live&&started===revision.current){setVehicles(fleet.vehicles);setTasks(data.tasks);setError('');}}
   catch(e){if(live)setError(e.message||'Não foi possível carregar a frota.');}
   finally{inFlight=false;if(live)setLoading(false);}
  }
  refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);
  return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[tick]);
 useEffect(()=>{if(selected&&window.innerWidth<=600)detail.current?.scrollIntoView?.({block:'start'});},[selected]);
 useEffect(()=>{if(noteRequest)noteEditor.current?.fresh();},[noteRequest]);
 useEffect(()=>{if(!createMenu)return;const close=e=>{if(e.type==='keydown'&&e.key!=='Escape')return;if(e.type==='keydown'||!menuWrap.current?.contains(e.target))setCreateMenu(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};},[createMenu]);
 const forVehicle=plate=>tasks.filter(t=>t.plate===plate||(vehicles.find(v=>v.plate===plate)?.implements||[]).includes(t.plate));
 const pending=plate=>forVehicle(plate).filter(t=>!t.done).length;
 // Keep tasks for vehicles removed from the current fleet reachable.
 const allVehicles=[...vehicles,...[...new Set(tasks.map(t=>t.plate))].filter(p=>!vehicles.some(v=>v.plate===p)).map(plate=>({plate,model:'Fora do cadastro atual',category:'caminhao',implements:[],archived:true}))].filter(v=>v.category!=='implemento'&&!vehicles.some(main=>main.implements.includes(v.plate)));
 const matches=(v,q)=>`${v.plate} ${v.model||''}`.toUpperCase().replace(/[^A-Z0-9]/g,'').includes(q.toUpperCase().replace(/[^A-Z0-9]/g,''));
 const inCategory=v=>categories.includes(v.category||'caminhao');
 const visible=allVehicles.filter(v=>inCategory(v)&&matches(v,query)&&(!pendingOnly||pending(v.plate)>0));
 const current=allVehicles.find(v=>v.plate===selected);
 const currentTasks=forVehicle(selected);
 const completed=currentTasks.filter(t=>t.done).length,percent=currentTasks.length?Math.round(completed/currentTasks.length*100):0;
 const choices=allVehicles.filter(v=>!v.archived&&inCategory(v)&&matches(v,taskSearch));
 function begin(){setCreateMenu(false);setBatchId(crypto.randomUUID());setChecked(current&&!current.archived?[current.plate]:[]);setTitle('');setTaskSearch('');setCreating(true);setMessage('');}
 async function create(e){
  e.preventDefault();if(busy.current||user.readOnly)return;
  if(!title.trim()||!checked.length){setError('Escreva a tarefa e selecione pelo menos uma placa.');return;}
  busy.current=true;revision.current++;setSaving(true);setError('');
  try{const data=await window.RB_API.createNoteTask({id:batchId,title:title.trim(),plates:checked});setTasks(old=>[...data.tasks,...old.filter(t=>t.id!==batchId)]);setCreating(false);setMessage(`Tarefa lançada para ${checked.length} veículo(s).`);}
  catch(e){setError(e.message);}finally{busy.current=false;setSaving(false);}
 }
 async function toggle(task){
  if(busy.current||user.readOnly)return;busy.current=true;revision.current++;setSaving(true);setError('');
  try{const data=await window.RB_API.updateNoteTask(task,!task.done);setTasks(old=>old.map(t=>t.id===task.id&&t.plate===task.plate?data.task:t));setMessage(data.task.done?"✓ Tarefa concluída! Mais um passo para deixar o veículo em dia.":"Tarefa reaberta.");}
  catch(e){setError(e.message);if(e.status===409)setTick(t=>t+1);}finally{busy.current=false;setSaving(false);}
 }
 return <section className="bn-page bn-fleet">
  <header className="bn-heading"><div><span>ORGANIZAÇÃO DA FROTA</span><h1>Tarefas e notas<span>.</span></h1><p>Uma placa, suas tarefas e tudo que você precisa lembrar.</p></div><div className="bn-create" ref={menuWrap}><button className="bn-primary" aria-expanded={createMenu} aria-controls="bn-create-options" onClick={()=>setCreateMenu(v=>!v)} disabled={user.readOnly||saving}>＋ Criar <span aria-hidden="true">⌄</span></button>{createMenu&&<div className="bn-create-options" id="bn-create-options"><button onClick={begin} disabled={loading||creating}><strong>✓ Nova tarefa</strong><small>Um objetivo para uma ou várias placas</small></button><button onClick={()=>{setCreateMenu(false);if(!selected)setSelected('all-notes');setNoteRequest(n=>n+1);}}><strong>✎ Nova anotação</strong><small>Guarde um lembrete rápido</small></button></div>}</div></header>
  {error&&<p className="bn-error" role="alert">{error}</p>}{message&&<p className="bn-success" role="status">{message}</p>}
  {creating&&<form className="bn-task-form" onSubmit={create} aria-label="Nova tarefa para a frota">
   <h2>Lançar tarefa para as placas</h2><label className="bn-search">O que precisa ser feito?<input autoFocus maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: trocar o adesivo da empresa" disabled={saving} required/></label>
   <label className="bn-search">Buscar placas para a tarefa<input type="search" value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Placa ou modelo"/></label>
   <div className="bn-task-toolbar"><span>{checked.length} de {allVehicles.filter(v=>!v.archived).length} veículos · seleção por categoria</span><button type="button" disabled={saving} onClick={()=>setChecked(old=>[...new Set([...old,...choices.map(v=>v.plate)])])}>Selecionar visíveis</button><button type="button" disabled={saving} onClick={()=>setChecked([])}>Limpar seleção</button></div>
   <div className="bn-vehicle-checks">{choices.map(v=><label key={v.plate}><input type="checkbox" checked={checked.includes(v.plate)} disabled={saving} onChange={e=>setChecked(old=>e.target.checked?[...old,v.plate]:old.filter(p=>p!==v.plate))}/><span><strong>{v.plate}</strong><small>{v.model}</small></span></label>)}</div>
   {!choices.length&&<p className="bn-help">Nenhuma placa encontrada.</p>}<p className="bn-help">Cada placa selecionada terá sua própria marcação de conclusão.</p>
   <div className="bn-task-toolbar"><button type="button" onClick={()=>setCreating(false)} disabled={saving}>Cancelar</button><button className="bn-primary" disabled={saving||!checked.length||!title.trim()}>{saving?'Salvando…':`Lançar para ${checked.length} placa(s)`}</button></div>
  </form>}
  <div className="bn-layout">
   <aside className="bn-sidebar"><label className="bn-search">Buscar veículo<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Placa ou modelo"/></label>
    <fieldset className="bn-category-filter"><legend>Mostrar veículos</legend>{[['caminhao','Caminhões'],['carreta','Carretas'],['carro','Carros']].map(([value,label])=><label key={value}><input type="checkbox" checked={categories.includes(value)} onChange={e=>{setCategories(old=>e.target.checked?[...old,value]:old.filter(c=>c!==value));}}/>{label}</label>)}</fieldset>
    <label className="bn-check-filter"><input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)}/> Somente com tarefas pendentes</label>
    <div className="bn-list-heading"><span>FROTA · {visible.length}</span><button onClick={()=>setTick(t=>t+1)} disabled={loading||saving}>{loading?'Atualizando…':'Atualizar'}</button></div>
    <div className="bn-list">{visible.map(v=><button key={v.plate} className={`bn-note ${selected===v.plate?'is-selected':''}`} aria-pressed={selected===v.plate} onClick={()=>setSelected(v.plate)}><span className="bn-plate-model"><strong>{v.plate}</strong><span>{v.model}</span></span><p>{pending(v.plate)?`${pending(v.plate)} tarefa(s) pendente(s)`:'Nenhuma tarefa pendente'}{v.archived?' · Fora do cadastro atual':''}</p></button>)}</div>
    {!loading&&!visible.length&&<p className="bn-help">Nenhum veículo encontrado.</p>}
    <button className={`bn-note ${selected==='all-notes'?'is-selected':''}`} onClick={()=>setSelected('all-notes')}>Todas as anotações<small>Inclui suas notas antigas e sem placa</small></button>
    <p className="bn-private">Notas compartilhadas com a equipe autorizada. Tarefas pessoais. Rascunhos ficam neste aparelho até salvar.</p>
   </aside>
   <main className="bn-editor-wrap" ref={detail}>
    {current&&<><div className="bn-vehicle-heading"><div><h2>{current.plate} <span className="bn-model">{current.model}</span></h2></div><span>{currentTasks.filter(t=>t.done).length} de {currentTasks.length} concluídas</span></div>
     <section className="bn-tasks" aria-label={`Tarefas de ${current.plate}`}><div className="bn-mission-head"><div><span className="bn-eyebrow">MISSÕES DO VEÍCULO</span><h3>{percent===100?'🏆 Tudo em dia!':currentTasks.length?'Cada tarefa, um avanço.':'Pronto para a primeira missão?'}</h3></div><div className={`bn-score ${percent===100?'is-complete':''}`}><strong>{percent}%</strong><small>concluído</small></div></div><div className="bn-progress" role="progressbar" aria-label="Progresso das tarefas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div><div className="bn-milestones"><span>✓ {completed} concluídas</span><span>◎ {currentTasks.length-completed} para finalizar</span><span>{percent===100?'Meta alcançada':percent>=50?'Mais da metade!':'Um passo de cada vez'}</span></div>{!currentTasks.length&&<p className="bn-help">Nenhuma tarefa por aqui. Use “Nova tarefa” para começar.</p>}{currentTasks.map(task=><label className={`bn-task ${task.done?'is-done':''}`} key={`${task.id}:${task.plate}`}><input type="checkbox" checked={task.done} disabled={saving||user.readOnly} onChange={()=>toggle(task)}/><span>{task.title}<small>{task.done?'✓ Concluída':'Pendente'}</small></span></label>)}</section>
    </>}
    {selected ? <NoteEditor ref={noteEditor} compact key={selected} user={user} plate={selected==='all-notes'?undefined:selected}/> : <div className="bn-welcome"><span aria-hidden="true">✓</span><h2>Sua frota, organizada por placa.</h2><p>Escolha um veículo para ver tarefas e fazer anotações.<br/>Para uma tarefa em vários veículos, selecione as placas em “Nova tarefa”.</p></div>}
   </main>
  </div>
 </section>;
}
window.BlocoNotas=BlocoNotas;

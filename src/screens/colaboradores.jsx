import './colaboradores.css';
import ColaboradorRegistro, {RECORD_TYPES,recordDescription,RegistroIcon} from './colaborador-registro.jsx';
const TYPES={advertencia_verbal:'Advertência verbal',advertencia_escrita:'Advertência por escrito',avaria:'Avaria',acidente:'Acidente',ferias:'Férias',epi:'EPI',uniforme:'Uniforme',celular:'Celular / IMEI'};
const STATUS={pendente:'Em acompanhamento',concluido:'Concluído',cancelado:'Cancelado'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLabel=value=>value?value.split('-').reverse().join('/'):'—';
const detailLabels={placa:'Placa',valor:'Valor (R$)',ciencia:'Ciência em',inicio:'Início',fim:'Fim',retorno:'Retorno',item:'Item / aparelho',tamanho:'Tamanho',quantidade:'Quantidade',ca:'CA do EPI',troca:'Próxima troca',devolucao:'Devolução',imei:'IMEI',imei2:'IMEI 2',condicao:'Condição',cancelamento:'Motivo do cancelamento'};
const dateFields=new Set(['ciencia','inicio','fim','retorno','troca','devolucao']);
const blank=(user)=>({id:crypto.randomUUID(),version:0,tipo:'advertencia_verbal',data:today(),prazo:null,status:'pendente',descricao:'',responsavel:user?.login||'',detalhes:{},anexos:[]});

function Colaboradores({user}){
 const [situacao,setSituacao]=React.useState('ativos'),[q,setQ]=React.useState(''),[refresh,setRefresh]=React.useState(0);
 const [list,setList]=React.useState(null),[loading,setLoading]=React.useState(true),[error,setError]=React.useState('');
 const [selected,setSelected]=React.useState(null),[detail,setDetail]=React.useState(null),[detailLoading,setDetailLoading]=React.useState(false),[detailError,setDetailError]=React.useState('');
 const [form,setForm]=React.useState(null),[saving,setSaving]=React.useState(false),[saveError,setSaveError]=React.useState(''),[editing,setEditing]=React.useState(false),[notice,setNotice]=React.useState('');
 const [tipoFiltro,setTipoFiltro]=React.useState(''),[pendencias,setPendencias]=React.useState(false),[page,setPage]=React.useState(1);
 const [wizardStart,setWizardStart]=React.useState(0);
 const viewport=React.useRef(null),detailRequest=React.useRef(0);
 React.useEffect(()=>{if(viewport.current)viewport.current.scrollTop=0;},[selected,page]);
 React.useEffect(()=>{
  let active=true;setLoading(true);setError('');
  const timer=setTimeout(()=>window.RB_API.listColaboradores({situacao,q}).then(data=>{if(active)setList(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);}),200);
  return()=>{active=false;clearTimeout(timer);};
 },[situacao,q,refresh]);
 React.useEffect(()=>{setPage(1);},[situacao,q,pendencias]);
 async function loadDetail(codigo){
  const request=++detailRequest.current;setDetailLoading(true);setDetailError('');setDetail(null);
  try{const data=await window.RB_API.getColaborador(codigo);if(request===detailRequest.current)setDetail(data);}catch(e){if(request===detailRequest.current)setDetailError(e.message);}finally{if(request===detailRequest.current)setDetailLoading(false);}
 }
 React.useEffect(()=>{if(selected!==null)loadDetail(selected);return()=>{detailRequest.current++;};},[selected]);

 const items=(list?.itens||[]).filter(p=>!pendencias||p.resumo.pendentes>0);
 const shown=items.slice((page-1)*24,page*24),pages=Math.max(1,Math.ceil(items.length/24));
 const totals=items.reduce((a,p)=>({pendentes:a.pendentes+p.resumo.pendentes,atrasados:a.atrasados+p.resumo.atrasados,ferias:a.ferias+(p.resumo.ferias>0?1:0)}),{pendentes:0,atrasados:0,ferias:0});
 function openNew(tipo){const preset=typeof tipo==='string';setSaveError('');setWizardStart(preset?1:0);setForm({...blank(user),...(preset?{tipo,detalhes:['epi','uniforme'].includes(tipo)?{quantidade:1}:{}}:{})});}
 async function editRecord(record){
  setEditing(true);setDetailError('');
  try{
   const anexos=await Promise.all(record.anexos.map(a=>window.RB_API.getColaboradorAnexo(selected,record.id,a.index)));
   setSaveError('');setWizardStart(1);setForm({id:record.id,version:record.revisao,tipo:record.tipo,data:record.data,prazo:record.prazo,status:record.status,descricao:record.descricao,responsavel:record.responsavel,detalhes:record.detalhes,anexos});
  }catch(e){setDetailError(e.message);}finally{setEditing(false);}
 }
 async function save(event){
  event.preventDefault();if(saving)return;setSaving(true);setSaveError('');
  try{await window.RB_API.saveColaboradorRegistro(selected,{...form,descricao:recordDescription(form)});setForm(null);setNotice('✓ Registro salvo! Histórico atualizado.');setRefresh(v=>v+1);await loadDetail(selected);}catch(e){setSaveError(e.message);}finally{setSaving(false);}
 }
 async function attach(event){
  const files=Array.from(event.target.files);event.target.value='';setSaveError('');
  if(files.length+form.anexos.length>3||files.some(f=>f.size>1048576||!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type))){setSaveError('Selecione até 3 arquivos PDF, PNG, JPG ou WebP, com até 1 MB cada.');return;}
  setSaving(true);
  try{const anexos=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({nome:file.name,data:reader.result});reader.onerror=()=>reject(new Error('Falha ao ler o arquivo.'));reader.readAsDataURL(file);})));setForm(f=>({...f,anexos:[...f.anexos,...anexos]}));}catch(e){setSaveError(e.message);}finally{setSaving(false);}
 }
 async function download(record,attachment){
  try{const a=await window.RB_API.getColaboradorAnexo(selected,record.id,attachment.index);const bytes=Uint8Array.from(atob(a.data.split(',')[1]),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:a.data.split(';')[0].slice(5)}));const link=document.createElement('a');link.href=url;link.download=a.nome;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setDetailError(e.message);}
 }
 const person=detail?.colaborador;
 const records=detail?.registros||[],tracked=records.filter(r=>r.status!=='cancelado'),done=tracked.filter(r=>r.status==='concluido').length;
 const overdue=tracked.filter(r=>r.status==='pendente'&&r.prazo&&r.prazo<today()).length;
 const percent=tracked.length?Math.round(done/tracked.length*100):0;
 return <div className="col-workspace" ref={viewport} tabIndex={0} aria-label="Gestão de colaboradores"><div className="col-page">
  <div className="page-head"><div><span className="col-eyebrow">FROTA / PESSOAS</span><h1>Colaboradores</h1><div className="sub">Pequenas ações. Acompanhamento em dia.</div></div><button className="btn" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>↻ Atualizar ERP</button></div>
  {notice&&<div role="status" className="col-notice">{notice}<button aria-label="Fechar confirmação" onClick={()=>setNotice('')}>×</button></div>}
  {selected===null?<>
   <div className="col-filters card"><label>Buscar colaborador<input placeholder="Nome, código ou cargo" value={q} onChange={e=>setQ(e.target.value)}/></label><label>Situação<select value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="ativos">Ativos</option><option value="todos">Todos</option><option value="inativos">Inativos</option></select></label><label className="col-check"><input type="checkbox" checked={pendencias} onChange={e=>setPendencias(e.target.checked)}/> Apenas com pendências</label></div>
   {error?<div role="alert" className="col-error">{error}<button className="btn" onClick={()=>setRefresh(v=>v+1)}>Tentar novamente</button></div>:loading?<div className="col-empty" role="status">Buscando colaboradores no ERP…</div>:<>
    <div className="col-stats">{[[items.length,'Colaboradores no filtro','◉','blue'],[totals.pendentes,'Em acompanhamento','◷','amber'],[totals.atrasados,'Prazos vencidos','!','coral'],[totals.ferias,'Em férias registradas','☀','green']].map(([n,label,icon,tone])=><div className={`card tone-${tone}`} key={label}><span className="col-stat-icon" aria-hidden="true">{icon}</span><span>{label}</span><strong>{n}</strong></div>)}</div>
    <div className="col-caption"><span>{list?.totalErp||0} cadastros no ERP · {items.length} no filtro</span><span>Ativos: cadastro ativo e sem demissão efetivada.</span></div>
    <div className="col-grid">{shown.map(p=><button className="col-person card" key={p.codigo} onClick={()=>{setSelected(p.codigo);setTipoFiltro('');}}>
     <div className="col-person-top"><span className="col-avatar">{p.nome.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('')}</span><span className={`col-badge ${p.ativo?'good':''}`}>{p.ativo?'Ativo':'Inativo'}</span></div>
     <h2>{p.nome}</h2><p>{p.cargo||'Cargo não informado'}</p><small>Cód. {p.codigo} · Empresa {p.empresa}</small>
     <div className="col-person-progress"><span>{p.resumo.total?`${p.resumo.concluidos} de ${p.resumo.total} registros concluídos`:'Nenhum acompanhamento registrado'}</span><progress max={p.resumo.total||1} value={p.resumo.concluidos} aria-label={`Progresso de ${p.nome}`}/></div>
     <div className="col-person-bottom"><span className={p.resumo.atrasados?'col-late':''}>{p.resumo.atrasados?`${p.resumo.atrasados} prazo(s) vencido(s)`:p.resumo.pendentes?`${p.resumo.pendentes} em acompanhamento`:p.resumo.total?'Tudo em dia':'Começar acompanhamento'}</span><span aria-hidden="true">→</span></div>
    </button>)}</div>
    {!items.length&&<div className="col-empty">Nenhum colaborador encontrado. Ajuste a busca ou selecione “Todos”.</div>}
    {pages>1&&<div className="col-pagination"><button className="btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page} de {pages}</span><button className="btn" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>}
   </>}
  </>:<>
   <button className="btn col-back" disabled={editing} onClick={()=>{setSelected(null);setDetail(null);}}>← Voltar para colaboradores</button>
   {detailError&&<div role="alert" className="col-error">{detailError}<button className="btn" onClick={()=>loadDetail(selected)}>Recarregar ficha</button></div>}
   {detailLoading?<div className="col-empty" role="status">Carregando ficha…</div>:person&&<>
    <div className="col-profile card"><div><span className={`col-badge ${person.ativo?'good':''}`}>{person.ativo?'Ativo':'Inativo'}</span><h2>{person.nome}</h2><p>{person.cargo||'Cargo não informado'} · Código {person.codigo} · Empresa {person.empresa}</p><small>Admissão: {dateLabel(person.admissao)} · Demissão: {dateLabel(person.demissao)} · Cadastro ERP: {person.cadastro_situacao==='S'?'Ativo':person.cadastro_situacao==='N'?'Inativo':'Não informado'}</small></div><button className="btn primary" disabled={user?.readOnly||editing} onClick={openNew}>+ Novo registro</button></div>
    <div className="col-progress-panel"><div className="col-progress-ring" style={{'--progress':`${percent}%`}}><span>{tracked.length?`${percent}%`:'—'}</span></div><div><span className="col-eyebrow">PROGRESSO DOS ACOMPANHAMENTOS</span><h3>{!tracked.length?'Vamos começar?':overdue?'Priorize os prazos vencidos':done===tracked.length?'Tudo em dia!':'Cada conclusão faz a diferença'}</h3><p>{tracked.length?`${done} de ${tracked.length} registros concluídos · ${tracked.length-done} em acompanhamento`:'Escolha abaixo o que deseja registrar para este colaborador.'}</p></div>{overdue>0&&<span className="col-badge late">{overdue} prazo(s) vencido(s)</span>}</div>
    <section className="col-quick-section"><div className="col-section-heading"><h2>Lançamento rápido</h2><span>Escolha o tipo para começar</span></div><div className="col-quick-grid">{Object.entries(RECORD_TYPES).map(([key,type])=><button key={key} className={`col-quick tone-${type.color}`} disabled={user?.readOnly||editing} onClick={()=>openNew(key)}><span className="col-type-icon" aria-hidden="true">{<RegistroIcon tipo={key}/>}</span><strong>{type.label}</strong><span aria-hidden="true">＋</span></button>)}</div></section>
    <div className="col-history-head"><h2>Histórico e acompanhamentos</h2><label>Tipo de registro<select value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TYPES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    <div className="col-timeline">{detail.registros.filter(r=>!tipoFiltro||r.tipo===tipoFiltro).map(r=><article key={r.id} className="card col-record">
     <div className="col-record-head"><div><small>{dateLabel(r.data)}</small><h3>{TYPES[r.tipo]}</h3></div><span className={`col-badge ${r.status==='concluido'?'good':r.status==='pendente'&&r.prazo&&r.prazo<today()?'late':''}`}>{r.status==='pendente'&&r.prazo&&r.prazo<today()?'Prazo vencido':STATUS[r.status]}</span></div>
     <p className="col-description">{r.descricao}</p><dl className="col-details"><div><dt>Responsável</dt><dd>{r.responsavel}</dd></div>{r.prazo&&<div><dt>Prazo</dt><dd>{dateLabel(r.prazo)}</dd></div>}{Object.entries(r.detalhes).filter(([,v])=>v!==null&&v!=='').map(([key,value])=><div key={key}><dt>{detailLabels[key]||key}</dt><dd>{dateFields.has(key)?dateLabel(value):String(value)}</dd></div>)}</dl>
     {!!r.anexos.length&&<div className="col-attachments">{r.anexos.map(a=><button className="btn" key={a.index} onClick={()=>download(r,a)}>↓ {a.nome}</button>)}</div>}
     <footer><small>Registrado por {r.autor||'Usuário'} · Revisão {r.revisao} · Atualizado por {r.atualizado_por_nome||r.autor}</small><button className="btn" disabled={user?.readOnly||editing} onClick={()=>editRecord(r)}>{editing?'Carregando…':'Editar / acompanhar'}</button></footer>
    </article>)}</div>
    {!detail.registros.filter(r=>!tipoFiltro||r.tipo===tipoFiltro).length&&<div className="col-empty">Nenhum registro neste filtro. Use “Novo registro” para começar.</div>}
   </>}
  </>}
  {form&&<ColaboradorRegistro form={form} setForm={setForm} person={person} saving={saving} error={saveError} onSave={save} onAttach={attach} onClose={()=>setForm(null)} startStep={wizardStart}/>}

 </div></div>;
}
window.Colaboradores=Colaboradores;

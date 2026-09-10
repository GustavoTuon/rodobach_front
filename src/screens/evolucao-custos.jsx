import {CostMultiSelect} from './cost-multiselect.jsx';
import {ecCategory,ecMonth,ecDate} from './cost-analysis-model.js';
import {ExecutiveSummary,CostAlerts,CostEvolutionChart,VehicleCostRanking,CostCategoryRanking,SupplierRanking,VehicleCostTable,VehicleCostDrawer,CostTransactionsTable,ServiceActivity} from './cost-analysis-components.jsx';
function EvolucaoCustos() {
  const today=new Date().toLocaleDateString('en-CA');
  const initial=React.useMemo(()=>{
    const fallback={dates:{startDate:`${today.slice(0,4)}-01-01`,endDate:today},owner:'frota',plate:[],category:[],supplier:'',center:'',month:''};
    const saved=readSavedFilters('evolucao-custos',fallback);
    const list=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string').slice(0,500))]:[];
    const d=saved.dates, valid=d && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(d.endDate) && new Date(d.endDate)>=new Date(d.startDate) && (new Date(d.endDate)-new Date(d.startDate))/86400000<=366;
    return {...fallback,dates:valid?d:fallback.dates,owner:['frota','terceiro','todos'].includes(saved.owner)?saved.owner:'frota',plate:list(saved.plate),category:list(saved.category),supplier:typeof saved.supplier==='string'?saved.supplier:'',center:typeof saved.center==='string'?saved.center:'',month:typeof saved.month==='string'&&/^\d{4}-\d{2}$/.test(saved.month)?saved.month:''};
  },[]);
  const [dates,setDates]=React.useState(initial.dates);
  const [payload,setPayload]=React.useState(null), [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [owner,setOwner]=React.useState(initial.owner),[plate,setPlate]=React.useState(initial.plate),[category,setCategory]=React.useState(initial.category),[supplier,setSupplier]=React.useState(initial.supplier),[center,setCenter]=React.useState(initial.center),[month,setMonth]=React.useState(initial.month);
  const [drawer,setDrawer]=React.useState('');
  const closeDrawer=React.useCallback(()=>setDrawer(''),[]);
  const [catalog,setCatalog]=React.useState([]),[vehicleSearch,setVehicleSearch]=React.useState(''),[advanced,setAdvanced]=React.useState(false);
  React.useEffect(()=>{let active=true;window.RB_API.getCustosVeiculosFiltros().then(r=>{if(active)setCatalog(r.veiculos || []);}).catch(()=>{});return()=>{active=false;};},[]);
  const request=React.useRef(0);
  async function load(resetMonth=true) {const id=++request.current;setBusy(true);setError('');try {const result=await window.RB_API.getEvolucaoCustos({...dates,proprietario:'todos'});if(id===request.current){setPayload(result);if(resetMonth)setMonth('');}}catch(e){if(id===request.current)setError(e.message || 'Falha ao carregar custos.');}finally{if(id===request.current)setBusy(false);}}
  React.useEffect(()=>{load(false);return()=>{request.current++;};},[]);

  React.useEffect(()=>{saveFilters('evolucao-custos',{dates:payload?.period||initial.dates,owner,plate,category,supplier,center,month});},[payload?.period,initial.dates,owner,plate,category,supplier,center,month]);
  const all=payload?.launches || [];
  const owned=all.filter(r=>owner==='todos'||r.proprietario===owner);
  const options=(rows,key)=>[...new Set(rows.map(key).filter(Boolean))].sort();
  const vehicleOptions=[...new Set([...owned.map(r=>r.placa),...(owner==='frota'||owner==='todos'?catalog.map(r=>r.placa):[])])].sort().map(placa=>catalog.find(v=>v.placa===placa)||{placa,modelo:owned.find(r=>r.placa===placa)?.veiculoNome||'',categoria:'outros'}).filter(v=>`${v.placa} ${v.modelo}`.toLowerCase().includes(vehicleSearch.toLowerCase())||plate.includes(v.placa));
  function quickPeriod(months) {const end=new Date();const start=new Date(end.getFullYear(),end.getMonth()-months+1,1);const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;setDates({startDate:local(start),endDate:local(end)});}
  const filtered=owned.filter(r=>(!plate.length||plate.includes(r.placa))&&(!category.length||category.includes(ecCategory(r)))&&(!supplier||r.fornecedor===supplier)&&(!center||r.centroCusto===center));
  const current=filtered.filter(r=>r.data>=payload?.period.startDate && r.data<=payload?.period.endDate);
  const rows=current.filter(r=>!month||r.data.startsWith(month));
  const previous=filtered.filter(r=>r.data>=payload?.prior.startDate&&r.data<=payload?.prior.endDate);
  const months=[];
  if(payload) {const d=new Date(`${payload.period.startDate.slice(0,7)}-01T12:00:00Z`);while(d.toISOString().slice(0,7)<=payload.period.endDate.slice(0,7)){const key=d.toISOString().slice(0,7);months.push({key,rows:current.filter(r=>r.data.startsWith(key))});d.setUTCMonth(d.getUTCMonth()+1);}}
  const select=(label,value,change,values)=><label>{label}<select value={value} onChange={e=>change(e.target.value)}><option value="">Todos</option>{values.map(v=><option key={v}>{v}</option>)}</select></label>;
  return <div className="view ec-page" style={{padding:24}}><h1>Análise de custos da frota</h1><p className="muted">Entenda onde sua frota está gastando e identifique desvios.</p>
    <FleetCostFilters {...{owner,setOwner,plate,setPlate,category,setCategory,supplier,setSupplier,center,setCenter,month,setMonth,vehicleSearch,setVehicleSearch,advanced,setAdvanced,dates,setDates,busy,load,quickPeriod,payload,vehicleOptions,select,options,owned}}/>
    {error&&<p role="alert">{error}</p>}{busy&&<div className="ec-skeleton" role="status" aria-label="Carregando custos"><span/><span/><span/></div>}
    {payload&&<div className="ec-dashboard" aria-busy={busy}>
      <p className="ec-period-caption">{ecDate(payload.period.startDate)} a {ecDate(payload.period.endDate)} · Comparativo: {ecDate(payload.prior.startDate)} a {ecDate(payload.prior.endDate)}{month&&` · Mês selecionado: ${ecMonth(month)}`}</p>
      <ExecutiveSummary rows={rows} previous={previous} month={month}/>
      <CostAlerts rows={rows} previous={previous} month={month}/>
      <CostEvolutionChart months={months} selected={month} onSelect={setMonth}/>
      <div className="ec-ranking-grid"><VehicleCostRanking rows={rows} previous={previous} month={month} onSelect={value=>setPlate([value])}/><CostCategoryRanking rows={rows} onSelect={value=>setCategory([value])}/><SupplierRanking rows={rows} onSelect={setSupplier}/></div>
      <VehicleCostTable rows={rows} monthCount={month?1:months.length} onOpen={setDrawer}/>
      <ServiceActivity rows={rows} months={month?months.filter(m=>m.key===month):months}/>
      <CostTransactionsTable rows={rows}/>
      <details className="ec-method"><summary>Como os valores são apresentados</summary><p>Base conciliada de custos do ERP, por data do lançamento de origem. Itens do mesmo documento, empresa, fornecedor e veículo contam uma vez; sem documento, contam como lançamento. A quantidade é estimada, não representa necessariamente serviços físicos. Borracharia é identificada pela descrição (borracharia, vulcanização ou recapagem). R$/km depende de cobertura confiável no mesmo período. Ausência de lançamentos não comprova ausência de custos.</p></details>
      {drawer&&<VehicleCostDrawer plate={drawer} rows={rows} months={month?months.filter(m=>m.key===month):months} onClose={closeDrawer} onFilter={value=>setPlate([value])}/>}
    </div>}
  </div>;
}
window.EvolucaoCustos=EvolucaoCustos;

function FleetCostFilters({owner,setOwner,plate,setPlate,category,setCategory,supplier,setSupplier,center,setCenter,month,setMonth,vehicleSearch,setVehicleSearch,advanced,setAdvanced,dates,setDates,busy,load,quickPeriod,payload,vehicleOptions,select,options,owned}) {
 const [mobileOpen,setMobileOpen]=React.useState(false);
 return <div className={`ec-filter-shell ${mobileOpen?"is-open":""}`}><button className="btn ec-mobile-filter" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(!mobileOpen)}>Filtros {mobileOpen?"×":"☰"}</button>    <section className="card ec-filters">
      <div className="ec-filter-heading"><div><h3>Filtros da análise</h3><p className="muted">Escolha o período e o veículo que deseja acompanhar.</p></div><button className="btn" onClick={()=>{setOwner('frota');setPlate([]);setCategory([]);setSupplier('');setCenter('');setMonth('');setVehicleSearch('');}}>Limpar filtros</button></div>
      <div className="ec-filter-section"><div className="ec-section-label">Período</div><div className="ec-period-grid"><label>Data inicial<input type="date" value={dates.startDate} onChange={e=>setDates({...dates,startDate:e.target.value})}/></label><label>Data final<input type="date" value={dates.endDate} onChange={e=>setDates({...dates,endDate:e.target.value})}/></label><button className="btn primary" onClick={load} disabled={busy||!dates.startDate||!dates.endDate||dates.startDate>dates.endDate}>{busy?'Carregando…':'Aplicar período'}</button><div className="ec-shortcuts">{[[1,'Este mês'],[3,'3 meses'],[6,'6 meses'],[12,'12 meses']].map(([n,label])=><button className="btn" key={n} onClick={()=>quickPeriod(n)}>{label}</button>)}</div></div>{payload&&(dates.startDate!==payload.period.startDate||dates.endDate!==payload.period.endDate)&&<p className="ec-pending">Período alterado. Clique em Aplicar período para atualizar os dados.</p>}</div>
      <div className="ec-filter-section"><div className="ec-section-label">Veículo e custo</div><div className="ec-main-grid"><label>Propriedade<select value={owner} onChange={e=>{setOwner(e.target.value);setPlate([]);setVehicleSearch('');}}><option value="frota">Somente frota</option><option value="terceiro">Terceiros</option><option value="todos">Todos os veículos</option></select></label><label>Buscar veículo<input type="search" placeholder="Digite placa ou modelo" value={vehicleSearch} onChange={e=>setVehicleSearch(e.target.value)}/></label><CostMultiSelect label="Veículo" values={plate} onChange={setPlate} options={vehicleOptions.map(v=>({value:v.placa,label:`${v.placa}${v.modelo?` — ${v.modelo}`:''}`,group:({caminhao:'CAMINHÕES',carro:'CARROS',carreta:'CARRETAS'})[v.categoria]||'OUTROS VEÍCULOS'}))}/><CostMultiSelect label="Categoria de custo" values={category} onChange={setCategory} options={options(owned,ecCategory).map(value=>({value,label:value}))}/></div></div>
      <button className="btn ec-advanced-toggle" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>{advanced?'Menos filtros':'Mais filtros'}{supplier||center?' • filtros ativos':''}</button>
      {advanced&&<div className="ec-advanced-grid">{select('Fornecedor',supplier,setSupplier,options(owned,r=>r.fornecedor))}{select('Centro de custo',center,setCenter,options(owned,r=>r.centroCusto))}</div>}
    </section>
      <div className="ec-chips"><span className="muted">Filtros salvos neste navegador:</span>{[[owner==='frota'?'Somente frota':owner==='terceiro'?'Terceiros':'Todos os veículos',null],...plate.map(value=>[value,()=>setPlate(plate.filter(v=>v!==value))]),...category.map(value=>[value,()=>setCategory(category.filter(v=>v!==value))]),[supplier,()=>setSupplier('')],[center,()=>setCenter('')],[month?ecMonth(month):'',()=>setMonth('')]].filter(([label])=>label).map(([label,clear],i)=>clear?<button className="ec-chip" key={i} onClick={clear} aria-label={`Remover filtro ${label}`}>{label} ×</button>:<span className="ec-chip" key={i}>{label}</span>)}</div>
 </div>;
}

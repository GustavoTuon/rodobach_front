import './cost-workspace.css';
import {CostCommission} from './cost-commission.jsx';
import {CostFocusActions} from './cost-focus-actions.jsx';
import {CostMultiSelect} from './cost-multiselect.jsx';
import {FuelDistance} from './cost-fuel-distance.jsx';
import {CostDeviations} from './cost-deviations.jsx';
import {LargestCosts} from './cost-largest.jsx';
import {CostEfficiency} from './cost-efficiency.jsx';
import {comparisonPeriod,selectedPeriod} from './cost-efficiency-model.js';
import {ecCategory,ecFuelType,ecMonth,ecDate} from './cost-analysis-model.js';
import {ExecutiveSummary,CostAlerts,CostEvolutionChart,VehicleCostRanking,CostCategoryRanking,SupplierRanking,VehicleCostTable,VehicleCostDrawer,CostTransactionsTable,ServiceActivity} from './cost-analysis-components.jsx';
export function EvolucaoCustos({focused=true,onToggleFocus}) {
  const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=localDate(new Date());
  const initial=React.useMemo(()=>{
    const ref=new Date(`${today}T12:00:00`);
    const fallback={dates:{startDate:localDate(new Date(ref.getFullYear(),ref.getMonth()-1,1)),endDate:localDate(new Date(ref.getFullYear(),ref.getMonth(),0))},owner:'frota',plate:[],category:[],fuel:[],supplier:'',center:'',month:''};
    const saved=readSavedFilters('evolucao-custos',fallback);
    const list=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string').slice(0,500))]:[];
    const d=saved.dates, valid=d && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(d.endDate) && new Date(d.endDate)>=new Date(d.startDate) && (new Date(d.endDate)-new Date(d.startDate))/86400000<=366;
    return {...fallback,dates:valid?d:fallback.dates,owner:['frota','terceiro','todos'].includes(saved.owner)?saved.owner:'frota',plate:list(saved.plate),category:list(saved.category),fuel:list(saved.fuel),supplier:typeof saved.supplier==='string'?saved.supplier:'',center:typeof saved.center==='string'?saved.center:'',month:typeof saved.month==='string'&&/^\d{4}-\d{2}$/.test(saved.month)?saved.month:''};
  },[]);
  const [dates,setDates]=React.useState(initial.dates);
  const [payload,setPayload]=React.useState(null), [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
  const [owner,setOwner]=React.useState(initial.owner),[plate,setPlate]=React.useState(initial.plate),[category,setCategory]=React.useState(initial.category),[supplier,setSupplier]=React.useState(initial.supplier),[center,setCenter]=React.useState(initial.center),[month,setMonth]=React.useState(initial.month);
  const [fuel,setFuel]=React.useState(initial.fuel);
  const activePeriod=React.useMemo(()=>payload?selectedPeriod(payload.period,month):null,[payload,month]);
  const activePrior=React.useMemo(()=>activePeriod?comparisonPeriod(activePeriod):null,[activePeriod]);
  const [distance,setDistance]=React.useState(null);
  const [telemetryOpen,setTelemetryOpen]=React.useState(false);
  const distanceRequest=React.useRef(null);
  const [drawer,setDrawer]=React.useState('');
  const [analysisTab,setAnalysisTab]=React.useState('overview');
  const workspaceRef=React.useRef(null);
  const [filtersOpen,setFiltersOpen]=React.useState(false);
  const commissionKind=analysisTab==='commission-fuel'?'fuel':analysisTab==='commission-maintenance'?'maintenance':null;
  const changeView=value=>{setAnalysisTab(value);setDrawer('');workspaceRef.current?.scrollTo?.({top:0,behavior:'auto'});};
  const closeDrawer=React.useCallback(()=>setDrawer(''),[]);
  const [catalog,setCatalog]=React.useState([]),[vehicleSearch,setVehicleSearch]=React.useState(''),[advanced,setAdvanced]=React.useState(false);
  React.useEffect(()=>{let active=true;window.RB_API.getCustosVeiculosFiltros().then(r=>{if(active)setCatalog(r.veiculos || []);}).catch(()=>{});return()=>{active=false;};},[]);
  const request=React.useRef(0);
  async function load(resetMonth=true,range=dates) {const id=++request.current;setBusy(true);setError('');try {const result=await window.RB_API.getEvolucaoCustos({...range,proprietario:'todos',includeDistance:false});if(id===request.current){setPayload(result);if(resetMonth)setMonth('');else setMonth(value=>value&&(value<result.period.startDate.slice(0,7)||value>result.period.endDate.slice(0,7))?'':value);}}catch(e){if(id===request.current)setError(e.message || 'Falha ao carregar custos.');}finally{if(id===request.current)setBusy(false);}}
  React.useEffect(()=>{load(false);return()=>{request.current++;};},[]);

  React.useEffect(()=>{saveFilters('evolucao-custos',{dates:payload?.period||initial.dates,owner,plate,category,fuel,supplier,center,month});},[payload?.period,initial.dates,owner,plate,category,fuel,supplier,center,month]);
  const needsDistance=analysisTab==='deviations'||Boolean(commissionKind)||(analysisTab==='overview'&&telemetryOpen);
  React.useEffect(()=>{setDistance(null);},[payload,activePeriod]);
  React.useEffect(()=>{
    if(!payload||!needsDistance||payload.distance?.available||!window.RB_API.getEvolucaoCustosDistance)return;
    let active=true;
    const placas=[...new Set(payload.launches.map(row=>row.placa))].filter(value=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value));
    const periodKey=JSON.stringify(activePeriod);
    if(distanceRequest.current?.payload!==payload||distanceRequest.current?.periodKey!==periodKey)distanceRequest.current={payload,periodKey,promise:window.RB_API.getEvolucaoCustosDistance({...activePeriod,placas:placas.join(',')})};
    distanceRequest.current.promise.then(result=>{if(active)setDistance(result);}).catch(()=>{if(active)setDistance({available:false,monthly:[]});});
    return()=>{active=false;};
  },[payload,needsDistance,activePeriod]);
  const all=React.useMemo(()=>payload?.launches || [],[payload]);
  const owned=React.useMemo(()=>all.filter(r=>owner==='todos'||r.proprietario===owner),[all,owner]);
  const options=(rows,key)=>[...new Set(rows.map(key).filter(Boolean))].sort();
  const vehicleOptions=React.useMemo(()=>{
    const vehicles=new Map(owned.filter(r=>r.placa).map(r=>[r.placa,{placa:r.placa,modelo:r.veiculoNome||'',categoria:'outros'}]));
    for(const vehicle of catalog)if(vehicle.placa&&(owner==='frota'||owner==='todos'||vehicles.has(vehicle.placa)))vehicles.set(vehicle.placa,vehicle);
    return [...vehicles.values()].sort((a,b)=>a.placa.localeCompare(b.placa)).filter(v=>`${v.placa} ${v.modelo}`.toLowerCase().includes(vehicleSearch.toLowerCase())||plate.includes(v.placa));
  },[owned,catalog,owner,vehicleSearch,plate]);
  function lastClosedMonth(){const now=new Date();const range={startDate:localDate(new Date(now.getFullYear(),now.getMonth()-1,1)),endDate:localDate(new Date(now.getFullYear(),now.getMonth(),0))};setDates(range);load(true,range);}
  function quickPeriod(months) {const end=new Date();const start=new Date(end.getFullYear(),end.getMonth()-months+1,1);const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const range={startDate:local(start),endDate:local(end)};setDates(range);load(true,range);}
  const operationalFinancialRows=React.useMemo(()=>owned.filter(r=>(!plate.length||plate.includes(r.placa))&&(!supplier||r.fornecedor===supplier)&&(!center||r.centroCusto===center)),[owned,plate,supplier,center]);
  const supplierCodes=React.useMemo(()=>supplier?[...new Set(owned.filter(r=>r.fornecedor===supplier).map(r=>String(r.fornecedorCodigo)))]:null,[owned,supplier]);
  const centerCodes=React.useMemo(()=>center?[...new Set(owned.filter(r=>r.centroCusto===center).map(r=>String(r.centroCodigo)))]:null,[owned,center]);
  const scoped=React.useMemo(()=>operationalFinancialRows.filter(r=>!fuel.length||fuel.includes(ecFuelType(r))),[operationalFinancialRows,fuel]);
  const filtered=React.useMemo(()=>scoped.filter(r=>!category.length||category.includes(ecCategory(r))),[scoped,category]);
  const commissionData=React.useMemo(()=>({rows:scoped.filter(r=>r.data>=activePeriod?.startDate&&r.data<=activePeriod?.endDate),previous:scoped.filter(r=>r.data>=activePrior?.startDate&&r.data<=activePrior?.endDate)}),[scoped,activePeriod,activePrior]);
  const {current,previous,months}=React.useMemo(()=>{
    const current=filtered.filter(r=>r.data>=payload?.period.startDate && r.data<=payload?.period.endDate);
    const previous=filtered.filter(r=>r.data>=activePrior?.startDate&&r.data<=activePrior?.endDate);
    const months=[];
    if(payload){
      const grouped=new Map();
      for(const row of current){const key=row.data.slice(0,7);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);}
      const d=new Date(`${payload.period.startDate.slice(0,7)}-01T12:00:00Z`);
      while(d.toISOString().slice(0,7)<=payload.period.endDate.slice(0,7)){const key=d.toISOString().slice(0,7);months.push({key,rows:grouped.get(key)||[]});d.setUTCMonth(d.getUTCMonth()+1);}
    }
    return {current,previous,months};
  },[filtered,payload,activePrior]);
  const rows=React.useMemo(()=>current.filter(r=>!month||r.data.startsWith(month)),[current,month]);
  const financialFuel=rows.filter(row=>row.tipoCusto==='Abastecimento');
  const linkedFuel=financialFuel.filter(row=>row.fuelProducts?.length);
  const select=(label,value,change,values)=><label>{label}<select value={value} onChange={e=>change(e.target.value)}><option value="">Todos</option>{values.map(v=><option key={v}>{v}</option>)}</select></label>;
  const tabs=[['overview','Panorama','Visão rápida do período'],['deviations','Desvios','Entenda o que mudou'],['largest','Maiores gastos','Encontre a origem'],['vehicles','Veículos','Compare a frota'],['documents','Documentos','Confira os lançamentos'],['commission-fuel','Comissão de abastecimento','Metas de combustível'],['commission-maintenance','Comissão de manutenção','Metas de manutenção']];
  const selectedTab=tabs.find(([key])=>key===analysisTab);
  const filterCount=fuel.length+plate.length+(commissionKind?0:category.length)+Number(Boolean(supplier))+Number(Boolean(center))+Number(Boolean(month));
  return <div ref={workspaceRef} className="view ec-page ec-workspace">
    <header className="ec-workspace-header"><div className="ec-workspace-brand"><img src="/brand/norte-03.png" alt="Norte"/><span>INTELIGÊNCIA DE CUSTOS</span></div><button className="ec-exit" onClick={onToggleFocus} disabled={!onToggleFocus}>{focused?'← Voltar ao sistema':'↗ Modo foco'}</button></header>
    <div className="ec-workspace-body">
      <div className="ec-workspace-title"><div><span className="ec-eyebrow">FROTA · ANÁLISE</span><h1>Evolução de custos.</h1><p>Análise de custos da frota · do panorama ao documento, sem perder o contexto.</p></div><span className="ec-data-status" role="status">{busy?'Atualizando dados…':error?'Falha na atualização':payload?'Dados carregados':'Preparando análise…'}</span></div>
      <div className="ec-command-bar"><div><small>PERÍODO EM ANÁLISE</small><strong>{payload?`${ecDate(activePeriod.startDate)} — ${ecDate(activePeriod.endDate)}`:'Carregando período…'}</strong></div><div className="ec-command-actions"><button className="btn" disabled={busy} onClick={lastClosedMonth}>Último mês fechado</button>{[[1,'Este mês'],[3,'3 meses'],[6,'6 meses']].map(([n,label])=><button className="btn" key={n} disabled={busy} onClick={()=>quickPeriod(n)}>{label}</button>)}<button className="btn primary" aria-expanded={filtersOpen} aria-controls="ec-workspace-filters" onClick={()=>setFiltersOpen(value=>!value)}>Filtros{filterCount?` (${filterCount})`:''} {filtersOpen?'−':'+'}</button></div></div>
      <FleetCostFilters {...{owner,setOwner,plate,setPlate,category,setCategory,fuel,setFuel,supplier,setSupplier,center,setCenter,month,setMonth,vehicleSearch,setVehicleSearch,advanced,setAdvanced,dates,setDates,busy,load,quickPeriod,payload,vehicleOptions,select,options,owned,filtersOpen,commissionKind}}/>
      {error&&<div className="ec-workspace-error" role="alert"><span>{error} {payload?'Os dados abaixo são da última consulta concluída.':''}</span><button className="btn" disabled={busy} onClick={()=>load(false)}>Tentar novamente</button></div>}
      <nav className="ec-workspace-nav" aria-label="Visões da análise de custos">{tabs.slice(0,5).map(([value,label,description],index)=><button key={value} aria-pressed={analysisTab===value} onClick={()=>changeView(value)}><span className="ec-nav-number">0{index+1}</span><span><b>{label}</b><small>{description}</small></span></button>)}</nav>

      {busy&&!payload&&<div className="ec-skeleton" role="status" aria-label="Carregando custos"><span/><span/><span/></div>}
      {payload&&<div className="ec-dashboard" aria-busy={busy}>
        <div className="ec-view-heading"><h2>{selectedTab[1]}</h2><p className="ec-period-caption">Comparativo: {ecDate(activePrior.startDate)} a {ecDate(activePrior.endDate)}{month&&` · Mês selecionado: ${ecMonth(month)}`}</p></div>
        {!commissionKind&&!rows.length&&<div className="ec-empty"><b>Nenhum lançamento neste recorte.</b><p>Ajuste os filtros ou escolha outro período. Ausência de lançamentos não comprova ausência de custos.</p><button className="btn" onClick={()=>setFiltersOpen(true)}>Revisar filtros</button></div>}
        {analysisTab==='overview'&&<>
          <CostEfficiency period={activePeriod} owner={owner} plates={plate} fuel={fuel} financialRows={operationalFinancialRows} supplierCodes={supplierCodes} centerCodes={centerCodes} category={category}/>
          <div className="ec-financial-caption"><h2>Custos financeiros</h2><p>Por data de emissão do documento, sem corte por vencimento. Não somar aos abastecimentos ou às OS da visão operacional.</p></div>
          {financialFuel.length>0&&<p className="ec-footnote">Produto identificado por vínculo ERP em {linkedFuel.length} de {financialFuel.length} lançamentos financeiros de abastecimento. Documentos com vários produtos permanecem mistos; os demais exigem conciliação. Nenhum valor é dividido por estimativa.</p>}
          <ExecutiveSummary compact rows={rows} previous={previous} month=""/>
          <CostFocusActions rows={rows} previous={previous} month="" onView={changeView} onOpen={setDrawer} onCategory={value=>{setCategory([value]);changeView('largest');}}/>
          <CostEvolutionChart months={months} selected={month} onSelect={setMonth}/>
          {category.length===1&&category[0]==='Combustível'&&<details className="ec-panel" onToggle={event=>setTelemetryOpen(event.currentTarget.open)}><summary>Conferir quilometragem de calendário (telemetria)</summary>{telemetryOpen&&<FuelDistance months={month?months.filter(m=>m.key===month):months} plates={plate.length&&!supplier&&!center?plate:[...new Set(rows.map(row=>row.placa))]} distance={distance || payload.distance} selected={month}/>}</details>}
        </>}
        {analysisTab==='deviations'&&<><CostAlerts rows={rows} previous={previous} month=""/><CostDeviations rows={rows} previous={previous} months={month?months.filter(m=>m.key===month):months} distance={distance || payload.distance} month="" onOpen={setDrawer}/></>}
        {analysisTab==='largest'&&<LargestCosts key={JSON.stringify([payload.period,owner,plate,category,fuel,supplier,center,month])} rows={rows} monthCount={month?1:months.length} onOpenVehicle={setDrawer}/>}
        {analysisTab==='vehicles'&&<><div className="ec-ranking-grid"><VehicleCostRanking rows={rows} previous={previous} month="" onSelect={value=>setPlate([value])}/><CostCategoryRanking rows={rows} onSelect={value=>setCategory([value])}/><SupplierRanking rows={rows} onSelect={setSupplier}/></div><VehicleCostTable rows={rows} monthCount={month?1:months.length} onOpen={setDrawer}/><ServiceActivity rows={rows} months={month?months.filter(m=>m.key===month):months}/></>}
        {analysisTab==='documents'&&<CostTransactionsTable rows={rows}/>}
        {commissionKind&&<CostCommission key={commissionKind} kind={commissionKind} rows={commissionData.rows} previous={commissionData.previous} period={activePeriod} prior={activePrior} month="" months={month?months.filter(m=>m.key===month):months} distance={distance || payload.distance} plates={plate} scopeKey={JSON.stringify([payload.period,owner,plate,fuel,supplier,center,month])} unavailable={busy||Boolean(error)}/>}
        <details className="ec-method"><summary>Entenda os dados e os critérios da análise</summary><p>Base financeira do ERP por data de emissão. A visão operacional usa a data do abastecimento e a entrada da OS. Documentos mistos mantêm o valor integral em uma categoria própria; não há rateio estimado entre diesel e Arla. Itens do mesmo documento, empresa, fornecedor e veículo contam uma vez; sem documento, contam como lançamento. A quantidade é estimada, não representa necessariamente serviços físicos. Borracharia é identificada pela descrição (borracharia, vulcanização ou recapagem). R$/km depende de cobertura confiável no mesmo período. Ausência de lançamentos não comprova ausência de custos.</p></details>
        {drawer&&<VehicleCostDrawer plate={drawer} rows={rows} months={month?months.filter(m=>m.key===month):months} onClose={closeDrawer} onFilter={value=>setPlate([value])}/>}
      </div>}
      <nav className="ec-commission-nav" aria-label="Simulações de comissão"><span>COMISSIONAMENTO <small>Simulação</small></span>{tabs.slice(5).map(([value,label])=><button className={`btn ${analysisTab===value?'primary':''}`} key={value} aria-pressed={analysisTab===value} onClick={()=>changeView(value)}>{label}</button>)}</nav>
    </div>
  </div>;
}

window.EvolucaoCustos=EvolucaoCustos;

function FleetCostFilters({owner,setOwner,plate,setPlate,category,setCategory,fuel,setFuel,supplier,setSupplier,center,setCenter,month,setMonth,vehicleSearch,setVehicleSearch,advanced,setAdvanced,dates,setDates,busy,load,quickPeriod,payload,vehicleOptions,select,options,owned,filtersOpen,commissionKind}) {
 return <div className="ec-filter-shell is-open"><section id="ec-workspace-filters" hidden={!filtersOpen} className="card ec-filters">
      <div className="ec-filter-heading"><div><h3>Filtros da análise</h3><p className="muted">Escolha o período e o veículo que deseja acompanhar.</p></div><button className="btn" onClick={()=>{setOwner('frota');setPlate([]);setCategory([]);setFuel([]);setSupplier('');setCenter('');setMonth('');setVehicleSearch('');}}>Limpar filtros</button></div>
      <div className="ec-filter-section"><div className="ec-section-label">Período</div><div className="ec-period-grid"><label>Data inicial<input type="date" value={dates.startDate} onChange={e=>setDates({...dates,startDate:e.target.value})}/></label><label>Data final<input type="date" value={dates.endDate} onChange={e=>setDates({...dates,endDate:e.target.value})}/></label><button className="btn primary" onClick={()=>load()} disabled={busy||!dates.startDate||!dates.endDate||dates.startDate>dates.endDate}>{busy?'Carregando…':'Aplicar período'}</button><div className="ec-shortcuts">{[[1,'Este mês'],[3,'3 meses'],[6,'6 meses'],[12,'12 meses']].map(([n,label])=><button className="btn" key={n} disabled={busy} onClick={()=>quickPeriod(n)}>{label}</button>)}</div></div>{payload&&(dates.startDate!==payload.period.startDate||dates.endDate!==payload.period.endDate)&&<p className="ec-pending">Período alterado. Clique em Aplicar período para atualizar os dados.</p>}</div>
      <div className="ec-filter-section"><div className="ec-section-label">Veículo e custo</div><div className="ec-main-grid"><label>Propriedade<select value={owner} onChange={e=>{setOwner(e.target.value);setPlate([]);setVehicleSearch('');}}><option value="frota">Somente frota</option><option value="terceiro">Terceiros</option><option value="todos">Todos os veículos</option></select></label><label>Buscar veículo<input type="search" placeholder="Digite placa ou modelo" value={vehicleSearch} onChange={e=>setVehicleSearch(e.target.value)}/></label><CostMultiSelect label="Veículo" values={plate} onChange={setPlate} options={vehicleOptions.map(v=>({value:v.placa,label:`${v.placa}${v.modelo?` — ${v.modelo}`:''}`,group:({caminhao:'CAMINHÕES',carro:'CARROS',carreta:'CARRETAS'})[v.categoria]||'OUTROS VEÍCULOS'}))}/>{!commissionKind&&<CostMultiSelect label="Categoria de custo" values={category} onChange={setCategory} options={options(owned,ecCategory).map(value=>({value,label:value}))}/>}</div></div>
      <div className="ec-filter-section"><CostMultiSelect label="Tipo de combustível / Arla" values={fuel} onChange={setFuel} options={options(owned,ecFuelType).map(value=>({value,label:value}))}/><p className="muted">Produtos identificados pelo vínculo com o abastecimento no ERP. Documentos mistos e sem vínculo ficam separados, sem ratear valores por estimativa.</p></div>
      <button className="btn ec-advanced-toggle" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>{advanced?'Menos filtros':'Mais filtros'}{supplier||center?' • filtros ativos':''}</button>
      {advanced&&<div className="ec-advanced-grid">{select('Fornecedor',supplier,setSupplier,options(owned,r=>r.fornecedor))}{select('Centro de custo',center,setCenter,options(owned,r=>r.centroCusto))}</div>}
    </section>
      <div className="ec-chips"><span className="muted">Recorte atual:</span>{[[owner==='frota'?'Somente frota':owner==='terceiro'?'Terceiros':'Todos os veículos',null],...plate.map(value=>[value,()=>setPlate(plate.filter(v=>v!==value))]),...(commissionKind?[]:category.map(value=>[value,()=>setCategory(category.filter(v=>v!==value))])),...fuel.map(value=>[value,()=>setFuel(fuel.filter(v=>v!==value))]),[supplier,()=>setSupplier('')],[center,()=>setCenter('')],[month?ecMonth(month):'',()=>setMonth('')]].filter(([label])=>label).map(([label,clear],i)=>clear?<button className="ec-chip" key={i} onClick={clear} aria-label={`Remover filtro ${label}`}>{label} ×</button>:<span className="ec-chip" key={i}>{label}</span>)}</div>
 </div>;
}

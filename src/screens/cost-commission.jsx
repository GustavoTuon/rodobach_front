import React from 'react';
import {ecDate,ecGroups,ecMoney,ecPct,ecSum} from './cost-analysis-model.js';
import {calculateCommission,commissionCategories,commissionDefaults,commissionDistance,commissionRows} from './cost-commission-model.js';
import './cost-commission.css';
import {VehicleCostDrawer} from './cost-analysis-components.jsx';

function storageKey(kind){const user=window.RB_AUTH?.getUser?.();return `rodobach:commission-draft:v1:${user?.id||user?.login||'local'}:${kind}`;}
function readDraft(kind){
  const base=commissionDefaults();
  try{
    const saved=JSON.parse(window.localStorage.getItem(storageKey(kind)));
    if(!saved||typeof saved!=='object')return base;
    for(const key of Object.keys(base))if(typeof saved[key]===typeof base[key])base[key]=typeof saved[key]==='string'?saved[key].slice(0,200):saved[key];
    return base;
  }catch{return base;}
}

export function CostCommission({kind,rows,previous,period,prior,month,months,distance,plates,scopeKey,unavailable=false}){
  const fuel=kind==='fuel';
  const [config,setConfig]=React.useState(()=>readDraft(kind));
  const [storageError,setStorageError]=React.useState(false);
  const [drawer,setDrawer]=React.useState('');
  const closeDrawer=React.useCallback(()=>setDrawer(''),[]);
  React.useEffect(()=>setDrawer(''),[scopeKey,config]);
  const [checked,setChecked]=React.useState(false),[preventive,setPreventive]=React.useState(false);
  const update=(key,value)=>{setConfig(current=>({...current,[key]:value}));setChecked(false);setPreventive(false);};
  React.useEffect(()=>{try{window.localStorage.setItem(storageKey(kind),JSON.stringify(config));setStorageError(false);}catch{setStorageError(true);}},[kind,config]);
  React.useEffect(()=>{setChecked(false);setPreventive(false);},[scopeKey,rows,previous]);
  const eligible=React.useMemo(()=>commissionRows(rows,kind,config),[rows,kind,config]);
  const priorRows=React.useMemo(()=>commissionRows(previous,kind,config),[previous,kind,config]);
  const coverage=commissionDistance(eligible,priorRows,plates,months,distance);
  const result=calculateCommission(eligible,config,coverage.km);
  const priorValid=priorRows.length>0&&priorRows.every(row=>Number.isFinite(row.valor))&&ecSum(priorRows)>0;
  const validated=checked&&(fuel||preventive);
  const amount=value=>result.ready?ecMoney(value):'—';
  const numberField=(key,label,extra={})=><label>{label}<input type="number" min="0" step="0.01" value={config[key]} onChange={event=>update(key,event.target.value)} {...extra}/></label>;
  return <div className="ec-commission">
    <section className="ec-commission-intro"><div><span className="ec-eyebrow">PLANO DO GERENTE DE FROTA</span><h2>{fuel?'Economia no abastecimento':'Economia na manutenção'}</h2><p>Configure a regra, acompanhe a meta e simule a participação do gerente na economia.</p></div><span className="ec-commission-badge">Rascunho · sem pagamento</span></section>
    <div className="ec-commission-scope"><b>Base desta simulação:</b> {commissionCategories(kind,config).join(' + ')}. Usa o período, mês, propriedade, veículos, fornecedor e centro de custo do painel. A categoria é definida nesta subtela.<br/><span>Período: {ecDate(period.startDate)} a {ecDate(period.endDate)}{month?` · apenas ${month.split('-').reverse().join('/')}`:''} · {eligible.length} lançamentos elegíveis · {ecGroups(eligible.filter(r=>r.placa),r=>r.placa).length} placas com custos.</span></div>
    <div className="ec-commission-layout">
      <section className="ec-panel ec-commission-parameters" aria-label="Parâmetros da comissão"><div className="ec-panel-head"><div><h2>1. Defina os parâmetros</h2><p>Regras independentes para cada tipo de custo.</p></div></div>
        <label>Gerente responsável<input value={config.manager} maxLength={120} placeholder="Nome do gerente" onChange={event=>update('manager',event.target.value)}/></label>
        {!fuel&&<fieldset><legend>Custos incluídos</legend><span>Manutenção incluída</span><label className="ec-commission-check"><input type="checkbox" checked={config.tires} onChange={event=>update('tires',event.target.checked)}/>Incluir pneus</label><label className="ec-commission-check"><input type="checkbox" checked={config.tireService} onChange={event=>update('tireService',event.target.checked)}/>Incluir borracharia</label></fieldset>}
        <label>Forma de comparação<select value={config.mode} onChange={event=>{update('mode',event.target.value);setConfig(current=>({...current,reference:''}));}}><option value="total">Custo total do período (R$)</option><option value="km">Custo por quilômetro (R$/km)</option></select></label>
        {numberField('reference',config.mode==='km'?'Referência de custo (R$/km)':'Referência de custo do período (R$)',{step:config.mode==='km'?'0.0001':'0.01',placeholder:config.mode==='km'?'Ex.: 2,50':'Ex.: 100.000,00'})}
        {config.mode==='total'&&<button className="btn" disabled={Boolean(month)||!priorValid||unavailable} onClick={()=>update('reference',String(Math.round(ecSum(priorRows)*100)/100))}>Usar custo anterior como referência</button>}
        <p className="ec-footnote">{config.mode==='total'?`Anterior: ${priorValid?ecMoney(ecSum(priorRows)):'sem base válida'} (${ecDate(prior.startDate)} a ${ecDate(prior.endDate)}). ${month?'Remova o mês para usar o período anterior.':'Confira se atividade e frota são comparáveis antes de usar essa referência.'}`:'Informe a referência acordada em R$/km. Ela será multiplicada pelos quilômetros do recorte atual; não há referência anterior de KM disponível nesta tela.'}</p>
        <div className="ec-commission-fields">{numberField('reduction','Meta de redução (%)',{max:'100',placeholder:'Ex.: 5'})}{numberField('rate','Comissão sobre a economia (%)',{max:'100',placeholder:'Ex.: 10'})}</div>
        <label>Economia que gera comissão<select value={config.basis} onChange={event=>update('basis',event.target.value)}><option value="excess">Somente o que superar a meta</option><option value="all">Toda a economia, após atingir a meta</option></select></label>
        {numberField('cap','Teto de comissão no período (R$)',{placeholder:'Vazio = sem teto; zero = sem comissão'})}
        <p className="ec-commission-storage" role="status">{storageError?'Não foi possível salvar neste navegador. Os parâmetros permanecem apenas nesta tela.':'Parâmetros salvos neste navegador, para seu usuário. Não são compartilhados com o gerente.'}</p>
      </section>
      <div className="ec-commission-results">
        <section className="ec-panel" aria-label="Resultado da simulação"><div className="ec-panel-head"><div><h2>2. Acompanhe a meta</h2><p>{config.manager?`Responsável: ${config.manager}`:'Informe o responsável nos parâmetros.'}</p></div><span className="ec-commission-badge">{unavailable?'Atualização pendente':!result.ready?'Complete a configuração':!validated?'Aguardando conferência':result.reached?'Meta atingida na simulação':'Meta ainda não atingida'}</span></div>
          <div className="ec-commission-metrics"><article><span>Custo registrado</span><strong>{eligible.every(r=>Number.isFinite(r.valor))?ecMoney(result.actual):'Inválido'}</strong><small>{eligible.length} lançamentos no recorte</small></article><article><span>Custo máximo para a meta</span><strong>{amount(result.target)}</strong><small>Referência menos a redução desejada</small></article><article><span>Economia calculada</span><strong>{amount(result.savings)}</strong><small>{result.ready?`${ecPct(result.reductionAchieved)} de redução frente à referência`:'Aguardando parâmetros válidos'}</small></article><article className="ec-commission-total"><span>Comissão simulada</span><strong>{unavailable?'—':amount(result.commission)}</strong><small>{validated?'Conferência manual marcada; ainda é uma simulação.':'Sujeita à conferência dos dados e das condições abaixo.'}</small></article></div>
          {config.mode==='km'&&<p className="ec-footnote">KM do recorte: {coverage.km===null?'cobertura incompleta':`${coverage.km.toLocaleString('pt-BR')} km`} · {coverage.plates.length} placas consideradas. Custo atual por KM: {result.ready&&result.currentPerKm!==null?ecMoney(result.currentPerKm):'—'}. KM corresponde ao deslocamento total das placas, mesmo com fornecedor ou centro filtrado.</p>}
          {result.errors.length>0&&<ul className="ec-commission-pending">{result.errors.map(message=><li key={message}>{message}</li>)}</ul>}
          {result.ready&&<div className="ec-commission-goal"><label htmlFor={`commission-progress-${kind}`}>Redução obtida: {ecPct(result.reductionAchieved)} · meta: {config.reduction}%</label><progress id={`commission-progress-${kind}`} max={100} value={Math.max(0,Math.min(100,result.reductionAchieved))}/><p>{result.reached?'O custo registrado está dentro da meta.':`Faltam ${ecMoney(result.actual-result.target)} de redução para atingir a meta.`}</p></div>}
        </section>
        <section className="ec-panel ec-commission-validation"><h2>3. Confira antes de avaliar a comissão</h2><label className="ec-commission-check"><input type="checkbox" checked={checked} disabled={unavailable||!result.ready} onChange={event=>setChecked(event.target.checked)}/>Conferi os lançamentos, a referência e a comparabilidade da operação; não há custos pendentes fora da análise.</label>{!fuel&&<label className="ec-commission-check"><input type="checkbox" checked={preventive} disabled={unavailable||!result.ready} onChange={event=>setPreventive(event.target.checked)}/>Conferi que as manutenções preventivas estão em dia e que a redução não veio de serviços necessários adiados.</label>}<p className="ec-footnote">{fuel?'Este indicador mede custo, não consumo em km/l. Variações no preço do diesel, nas rotas e na atividade também afetam o resultado.':'Custos de manutenção variam com o ciclo de serviços. Esta tela não verifica automaticamente o cumprimento das preventivas.'} A conferência é manual e é reiniciada quando a base ou os parâmetros mudam.</p></section>
        {result.ready&&<section className="ec-panel ec-commission-memory"><h2>Memória do cálculo</h2><dl><div><dt>Referência {config.mode==='km'?`(${config.reference} R$/km × ${coverage.km.toLocaleString('pt-BR')} km)`:''}</dt><dd>{ecMoney(result.referenceCost)}</dd></div><div><dt>Limite da meta (−{config.reduction}%)</dt><dd>{ecMoney(result.target)}</dd></div><div><dt>Custo registrado</dt><dd>{ecMoney(result.actual)}</dd></div><div><dt>Economia elegível {config.basis==='excess'?'acima da meta':'após atingir a meta'}</dt><dd>{ecMoney(result.eligible)}</dd></div><div><dt>Comissão antes do teto ({config.rate}%)</dt><dd>{ecMoney(result.beforeCap)}</dd></div><div><dt>Teto</dt><dd>{result.cap===null?'Sem teto':ecMoney(result.cap)}</dd></div><div><dt>Comissão simulada</dt><dd>{unavailable?'Atualização pendente':ecMoney(result.commission)}</dd></div></dl><p className="ec-footnote">A comissão é zero se a meta não for atingida. Estornos mantêm seu sinal no custo líquido. Nenhum pagamento ou lançamento financeiro é criado.</p></section>}
      </div>
    </div>
    <section className="ec-panel"><div className="ec-panel-head"><div><h2>Custos que compõem esta simulação</h2><p>Valor líquido por veículo, sem distribuir a comissão entre placas.</p></div></div><div className="ec-table-scroll"><table className="ec-table"><thead><tr><th>Veículo</th><th>Custo no período</th><th>Conferência</th></tr></thead><tbody>{ecGroups(eligible.filter(r=>Number.isFinite(r.valor)),r=>r.placa).map(group=><tr key={group.name}><td>{group.name}</td><td>{ecMoney(group.value)}</td><td>{group.name==='Não identificado'?'Sem placa':<button className="btn" onClick={()=>setDrawer(group.name)}>Ver lançamentos do veículo</button>}</td></tr>)}</tbody></table></div>{!eligible.length&&<p>Nenhum lançamento elegível. Revise o período e os filtros.</p>}</section>
    {drawer&&<VehicleCostDrawer plate={drawer} rows={eligible} months={months.map(m=>({...m,rows:eligible.filter(row=>row.data.startsWith(m.key))}))} onClose={closeDrawer} onFilter={()=>setDrawer('')} hideFilter/>}
  </div>;
}

import {ecCategory,ecDistanceMonths} from './cost-analysis-model.js';

export const commissionDefaults = () => ({manager:'',mode:'total',reference:'',reduction:'',rate:'',cap:'',basis:'excess',tires:false,tireService:false});
export function commissionCategories(kind,config) {
  return kind==='fuel'?['Combustível']:['Manutenção',...(config.tires?['Pneus']:[]),...(config.tireService?['Borracharia']:[])];
}
export const commissionRows=(rows,kind,config)=>rows.filter(row=>commissionCategories(kind,config).includes(ecCategory(row)));
const numeric=value=>value==null||String(value).trim()===''?null:Number(value);
const cents=value=>Math.round((value+Number.EPSILON)*100)/100;

export function commissionDistance(rows,previous,plates,months,distance) {
  // Include selected plates and plates from either period: missing activity must not
  // silently remove a vehicle from the denominator.
  const population=[...new Set([...plates,...rows.map(r=>r.placa),...previous.map(r=>r.placa)].filter(Boolean))];
  const monthly=ecDistanceMonths(months,population,distance);
  const complete=population.length>0 && monthly.length>0 && ![...rows,...previous].some(r=>!r.placa) && monthly.every(m=>Number.isFinite(m.km)&&m.km>=0);
  return {plates:population,km:complete?monthly.reduce((sum,m)=>sum+m.km,0):null,complete};
}

export function calculateCommission(rows,config,km) {
  const errors=[];
  if(!rows.length)errors.push('Não há lançamentos elegíveis no período. Ausência de lançamentos não comprova economia.');
  if(rows.some(row=>typeof row.valor!=='number'||!Number.isFinite(row.valor)))errors.push('Há lançamentos com valor inválido. Confira a base antes de simular.');
  const actual=cents(rows.reduce((sum,row)=>sum+(Number.isFinite(row.valor)?row.valor:0),0));
  if(actual<0)errors.push('O custo líquido está negativo. Revise os estornos antes de simular.');
  const reference=numeric(config.reference),reduction=numeric(config.reduction),rate=numeric(config.rate),cap=numeric(config.cap);
  if(reference===null||!Number.isFinite(reference)||reference<=0)errors.push('Informe uma referência maior que zero.');
  if(reduction===null||!Number.isFinite(reduction)||reduction<0||reduction>100)errors.push('Informe a meta de redução entre 0% e 100%.');
  if(rate===null||!Number.isFinite(rate)||rate<0||rate>100)errors.push('Informe a comissão entre 0% e 100%.');
  if(cap!==null&&(!Number.isFinite(cap)||cap<0))errors.push('O teto deve ser vazio ou um valor maior ou igual a zero.');
  if(!['total','km'].includes(config.mode)||!['all','excess'].includes(config.basis))errors.push('Selecione uma regra de cálculo válida.');
  if(config.mode==='km'&&(!Number.isFinite(km)||km<=0))errors.push('R$/km exige quilometragem positiva e cobertura completa para todas as placas do recorte.');
  if(errors.length)return {actual,errors,ready:false};
  const referenceCost=cents(reference*(config.mode==='km'?km:1));
  if(!Number.isFinite(referenceCost)||referenceCost<=0)return {actual,errors:['A referência total deve corresponder a pelo menos R$ 0,01.'],ready:false};
  const target=cents(referenceCost*(1-reduction/100));
  const savings=cents(referenceCost-actual),reached=actual<=target;
  const eligible=reached?cents(Math.max(0,(config.basis==='all'?referenceCost:target)-actual)):0;
  const beforeCap=cents(eligible*rate/100);
  const commission=cap===null?beforeCap:Math.min(beforeCap,cents(cap));
  if(![referenceCost,target,savings,eligible,beforeCap,commission].every(Number.isFinite))return {actual,errors:['Os parâmetros excedem o limite de cálculo. Revise os valores.'],ready:false};
  return {actual,referenceCost,target,savings,reached,eligible,beforeCap,commission,rate,cap,ready:true,errors:[],reductionAchieved:(referenceCost-actual)/referenceCost*100,currentPerKm:km>0?actual/km:null};
}

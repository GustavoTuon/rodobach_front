import {expect, it, vi} from 'vitest';
import {loadGroupedMultas} from './multas-groups.js';

const fine = i => ({id:`1:${i}`,empresa:1,codigo:i,motoristaCodigo:1,motorista:'João',placa:i%2?'AAA1A11':'BBB2B22',pontos:5,valorFinal:100,controle:{statusIndicacao:'pendente',statusMotorista:'descontado'}});
const filters = {agrupar:'motorista',page:1,pageSize:10};
it('accepts the grouped API without additional requests',async()=>{
  const result={grupos:[],totalMultas:0,indicadoresFiltradosVersao:2};const list=vi.fn().mockResolvedValue(result);
  expect(await loadGroupedMultas(list,filters)).toBe(result);expect(list).toHaveBeenCalledTimes(1);
});
it('groups all 784 legacy fines instead of displaying zero fines and 784 drivers',async()=>{
  const rows=Array.from({length:784},(_,i)=>fine(i));
  const list=vi.fn(async({page,pageSize})=>({multas:rows.slice((page-1)*pageSize,page*pageSize),paginacao:{page,pageSize,total:784,totalPages:Math.ceil(784/pageSize)}}));
  const result=await loadGroupedMultas(list,filters);
  expect(result.totalMultas).toBe(784);expect(result.paginacao.total).toBe(1);expect(result.paginacao.totalPages).toBe(1);
  expect(result.grupos[0].multas).toHaveLength(784);expect(result.grupos[0].pontos).toBe(3920);
  expect(result.grupos[0].multas[0].controle.descontoErp).toBe(true);
  const plates=await loadGroupedMultas(list,{...filters,agrupar:'placa',pageSize:1,page:2});
  expect(plates.paginacao.total).toBe(2);expect(plates.grupos[0].nome).toBe('BBB2B22');expect(plates.grupos[0].pontos).toBe(1960);
});
it('does not render partial totals when a later page fails',async()=>{
  const list=vi.fn(async({page})=>{if(page===2)throw new Error('Sem conexão');return {multas:[fine(1)],paginacao:{total:2,totalPages:2}};});
  await expect(loadGroupedMultas(list,filters)).rejects.toThrow('Sem conexão');
});
it('stops obsolete requests before fetching legacy pages',async()=>{
  const list=vi.fn().mockResolvedValue({multas:[fine(1)]});
  expect(await loadGroupedMultas(list,filters,()=>false)).toBeNull();expect(list).toHaveBeenCalledTimes(1);
});

it('filters the legacy API by infraction date inclusively before grouping',async()=>{
  const rows=['2025-12-31','2026-01-01','2026-02-01','2026-02-02',null].map((date,i)=>({...fine(i),dataInfracao:date}));
  const list=vi.fn().mockResolvedValue({multas:rows,paginacao:{total:5,totalPages:1}});
  const result=await loadGroupedMultas(list,{...filters,infracaoDe:'2026-01-01',infracaoAte:'2026-02-01'});
  expect(result.totalMultas).toBe(2);expect(result.grupos[0].pontos).toBe(10);
  expect(result.opcoesFiltros.motoristas).toEqual(['João']);
  const openEnd=await loadGroupedMultas(list,{...filters,infracaoDe:'2026-01-01'});
  expect(openEnd.totalMultas).toBe(3);
});
it('falls back when a grouped API does not support the date filter yet',async()=>{
  const list=vi.fn().mockResolvedValueOnce({grupos:[],totalMultas:99}).mockResolvedValue({multas:[{...fine(1),dataInfracao:'2025-12-31'}],paginacao:{total:1,totalPages:1}});
  const result=await loadGroupedMultas(list,{...filters,infracaoDe:'2026-01-01'});
  expect(result.totalMultas).toBe(0);expect(list).toHaveBeenCalledTimes(2);
});

it('applies quick filters locally even when the old API ignores them, and scopes totals to the period',async()=>{
  const make=(id,control,extra={})=>({...fine(id),dataInfracao:'2026-02-01',paga:false,controle:control,...extra});
  const rows=[
    make(1,{statusMotorista:'em_aberto',statusIndicacao:'nao_aplicavel'}),
    make(2,{statusMotorista:'descontado',statusIndicacao:'indicada'},{paga:true}),
    make(3,{statusMotorista:'empresa',statusIndicacao:'nao_aplicavel'}),
    make(4,{statusMotorista:'alerta',statusIndicacao:'prazo_perdido'},{paga:true}),
    make(5,{statusMotorista:'em_aberto',statusIndicacao:'pendente'},{dataInfracao:'2025-01-01'}),
    make(6,{statusMotorista:'em_aberto',statusIndicacao:'nao_aplicavel',atualizadoEm:'2026-02-01'}),
  ];
  const list=vi.fn().mockResolvedValue({multas:rows,paginacao:{total:6,totalPages:1},resumo:{total:784}});
  const base={...filters,infracaoDe:'2026-01-01'};
  const pending=await loadGroupedMultas(list,{...base,rapido:'sem_indicacao'});
  expect(pending.totalMultas).toBe(2);expect(pending.resumo.total).toBe(5);expect(pending.resumo.indicacaoPendente).toBe(2);
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({rapido:'todas',indicacao:'todos',statusMotorista:'todos'}));
  const discount=await loadGroupedMultas(list,{...base,rapido:'a_descontar'});
  expect(discount.totalMultas).toBe(3);expect(discount.resumo.aDescontar).toBe(3);expect(discount.resumo.valorADescontar).toBe(300);
  expect(discount.resumo.total).toBe(5);
  const done=await loadGroupedMultas(list,{...base,rapido:'descontadas'});
  expect(done.totalMultas).toBe(1);expect(done.resumo.descontadas).toBe(1);
});

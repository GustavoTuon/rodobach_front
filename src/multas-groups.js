export function normalizeMulta(item) {
  const c=item.controle||{};
  const descontado=Boolean(c.descontadoMotorista || c.descontoErp || c.statusMotorista==='descontado');
  // Older APIs used 'not applicable' as the default for every unsaved record.
  const statusIndicacao=c.statusIndicacao==='nao_aplicavel'&&!c.atualizadoEm&&c.statusMotorista!=='empresa'?'pendente':(c.statusIndicacao||'pendente');
  return {...item,controle:{...c,statusIndicacao,descontadoMotorista:descontado,descontoErp:c.descontoErp??c.statusMotorista==='descontado'}};
}
export const pendingDiscount = item => item.controle.statusMotorista!=='empresa'&&!item.controle.descontadoMotorista;
export const pendingIndication = item => ['pendente','prazo_perdido'].includes(item.controle.statusIndicacao);
export function matchesQuick(item, quick) {
  if(quick==='sem_indicacao')return pendingIndication(item);
  if(quick==='a_descontar')return pendingDiscount(item);
  if(quick==='descontadas')return item.controle.descontadoMotorista;
  if(quick==='abertas')return !item.paga;
  if(quick==='pagas')return item.paga;
  if(quick==='vencidas')return !item.paga&&item.vencida;
  if(quick==='vencendo')return !item.paga&&item.diasParaVencimento!=null&&item.diasParaVencimento>=0&&item.diasParaVencimento<=7;
  if(quick==='empresa')return item.controle.statusMotorista==='empresa';
  if(quick==='motorista')return item.controle.statusMotorista!=='empresa';
  if(quick==='sem_responsavel')return !item.controle.responsavel;
  if(quick==='incompletas')return item.incompleta;
  return true;
}
export function summarizeMultas(items) {
  const count=predicate=>items.filter(predicate).length;
  const sum=predicate=>items.filter(predicate).reduce((total,item)=>total+Number(item.valorFinal||0),0);
  return {total:items.length,valorOriginal:items.reduce((n,i)=>n+Number(i.valor||0),0),abertas:count(i=>!i.paga),valorAberto:sum(i=>!i.paga),pagas:count(i=>i.paga),valorPago:sum(i=>i.paga),
    vencidas:count(i=>!i.paga&&i.vencida),valorVencido:sum(i=>!i.paga&&i.vencida),
    indicacaoPendente:count(pendingIndication),aDescontar:count(pendingDiscount),valorADescontar:sum(pendingDiscount),descontadas:count(i=>i.controle.descontadoMotorista),
    responsabilidadeEmpresa:count(i=>i.controle.statusMotorista==='empresa'),valorResponsabilidadeEmpresa:sum(i=>i.controle.statusMotorista==='empresa'),
    responsabilidadeMotorista:count(i=>i.controle.statusMotorista!=='empresa'),valorResponsabilidadeMotorista:sum(i=>i.controle.statusMotorista!=='empresa'),
    semVencimento:count(i=>!i.paga&&!i.vencimento)};
}

// Compatibility with API versions that still paginate individual fines.
export function groupMultas(items, mode) {
  const groups = new Map();
  for (const original of items) {
    const control = original.controle || {};
    const item = {...original, controle: {...control,
      descontadoMotorista: control.descontadoMotorista ?? control.statusMotorista === 'descontado',
      descontoErp: control.descontoErp ?? control.statusMotorista === 'descontado',
    }};
    const key = mode === 'placa' ? (item.placa || 'sem-placa') : item.motoristaCodigo != null
      ? `${item.empresa}:${item.motoristaCodigo}` : (item.motorista || 'sem-motorista');
    if (!groups.has(key)) groups.set(key, {id:key, nome:mode === 'placa' ? (item.placa || 'Sem placa') : (item.motorista || 'Sem motorista'), multas:[], pontos:0, semPontos:0, valorTotal:0, valorAberto:0, etapas:0, concluidas:0});
    const group = groups.get(key);
    group.multas.push(item);
    group.pontos += Number(item.pontos || 0);
    if (item.pontos == null) group.semPontos++;
    group.valorTotal += Number(item.valorFinal || 0);
    if (!item.paga) group.valorAberto += Number(item.valorFinal || 0);
    group.etapas++;
    if (item.paga) group.concluidas++;
    if (control.statusIndicacao !== 'nao_aplicavel') {
      group.etapas++;
      if (['indicada','confirmada'].includes(control.statusIndicacao)) group.concluidas++;
    }
    if (control.statusMotorista !== 'empresa') {
      group.etapas++;
      if (item.controle.descontadoMotorista) group.concluidas++;
    }
  }
  return [...groups.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{numeric:true}))
    .map(group=>({...group,progresso:Math.round(group.concluidas/group.etapas*100)}));
}

export async function loadGroupedMultas(list, filters, isCurrent = () => true) {
  const result = await list(filters);
  if (!isCurrent()) return null;
  if (Array.isArray(result.grupos) && result.indicadoresFiltradosVersao===2) return result;
  if (!Array.isArray(result.multas) && !Array.isArray(result.grupos)) throw new Error('Não foi possível ler a lista de multas. Atualize e tente novamente.');

  // Retrieve the complete filtered set before grouping: otherwise drivers and
  // their point totals would be split between legacy record pages.
  const legacyFilters = {...filters, agrupar:undefined, rapido:"todas", indicacao:"todos", statusMotorista:"todos", page:1, pageSize:100};
  const first = await list(legacyFilters);
  if (!isCurrent()) return null;
  if (!Array.isArray(first.multas)) throw new Error('Não foi possível carregar as multas.');
  const rows = [...first.multas];
  const pages = Number(first.paginacao?.totalPages || 1);
  for (let start = 2; start <= pages; start += 4) {
    const batch = await Promise.all(Array.from({length:Math.min(4,pages-start+1)},(_,i)=>
      list({...legacyFilters,page:start+i})));
    if (!isCurrent()) return null;
    for (const page of batch) {
      if (!Array.isArray(page.multas)) throw new Error('Não foi possível carregar todas as multas. Tente novamente.');
      rows.push(...page.multas);
    }
  }
  const unique = [...new Map(rows.map(item=>[item.id || `${item.empresa}:${item.codigo}`,item])).values()];
  if (first.paginacao?.total != null && unique.length !== Number(first.paginacao.total)) {
    throw new Error('A lista de multas mudou durante o carregamento. Atualize para conferir os totais.');
  }
  const filtered = unique.map(normalizeMulta).filter(item => {
    const date=String(item.dataInfracao || "").slice(0,10);
    return (!filters.indicacao || filters.indicacao==='todos' || item.controle.statusIndicacao===filters.indicacao)
      && (!filters.statusMotorista || filters.statusMotorista==='todos' || item.controle.statusMotorista===filters.statusMotorista)
      && (!filters.infracaoDe || (date && date >= filters.infracaoDe)) && (!filters.infracaoAte || (date && date <= filters.infracaoAte));
  });
  const opcoesFiltros={motoristas:[...new Set(unique.map(item=>item.motorista).filter(Boolean))].sort(),placas:[...new Set(unique.map(item=>item.placa).filter(Boolean))].sort()};
  const visible=filtered.filter(item=>matchesQuick(item,filters.rapido));
  const groups = groupMultas(visible,filters.agrupar);
  const pageSize = Number(filters.pageSize) || 10;
  const totalPages = Math.max(1,Math.ceil(groups.length/pageSize));
  const page = Math.min(Math.max(Number(filters.page)||1,1),totalPages);
  return {...first, grupos:groups.slice((page-1)*pageSize,page*pageSize),totalMultas:visible.length,opcoesFiltros,resumo:summarizeMultas(filtered),
    paginacao:{page,pageSize,total:groups.length,totalPages}};
}

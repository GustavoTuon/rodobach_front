export function tvAtBase(item, now) {
  const presence = item.base?.presenca;
  const age = new Date(now).getTime() - new Date(presence?.observadoEm).getTime();
  return presence?.naBase === true && Number.isFinite(age) && age >= 0 && age <= 30 * 60000;
}
export function tvExpireManual(item, now) {
  if (!item.confirmacaoManual || new Date(item.confirmacaoManual.expiraEm) > now) return item;
  return {...item, confirmacaoManual: null, carga: {codigo: 'conferir', label: 'Confirmação expirada', horasVazio: null, fonte: 'Atualize o painel para consultar a situação automática.'}};
}

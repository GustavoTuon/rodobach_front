export function tvAtBase(item, now) {
  const presence = item.base?.presenca;
  const age = new Date(now).getTime() - new Date(presence?.observadoEm).getTime();
  return presence?.naBase === true && Number.isFinite(age) && age >= 0 && age <= 30 * 60000;
}
export function tvExpireManual(item, now) {
  if (!item.confirmacaoManual || item.confirmacaoManual.expiraEm == null || new Date(item.confirmacaoManual.expiraEm) > now) return item;
  return {...item, confirmacaoManual: null, carga: {...item.carga, horasVazio: null, confirmacaoPendente: true, fonte: 'Confirmação pendente · Última situação manual; confirmação expirada. Atualize o painel.'}};
}

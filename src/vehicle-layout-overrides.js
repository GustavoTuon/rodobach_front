// Configuração de layout confirmada pelo proprietário da frota.
// Compartilhada entre pneus e manutenção, sem alterar o cadastro do ERP.
const BITRUCK_PLATES = new Set(['RAA8G58', 'RAA8G18']);

export function confirmedVehicleLayout(vehicle) {
  const plate = String(vehicle?.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return BITRUCK_PLATES.has(plate) ? 'BITRUCK' : null;
}

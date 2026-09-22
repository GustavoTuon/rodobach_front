// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {mensagemPreview} from './manutencao.jsx';

afterEach(() => vi.useRealTimers());
const item = {placa: 'RXO6C18', titulo: 'Filtro', tipo_controle: 'km', km_atual: 617731, km_proximo_envio: 610902, mensagem: 'O veículo atingiu o marco programado.'};

it('identifies fuel mileage as a dated reference in the preview', () => {
  const message = mensagemPreview({...item, km_fonte: 'abastecimento', km_data: '2026-09-19', telemetria_descartada: true});
  expect(message).toContain('Último KM registrado');
  expect(message).toContain('Abastecimento — 19/09/2026');
  expect(message).toContain('não inclui o percurso posterior');
  expect(message).toContain('Telemetria divergente desconsiderada');
  expect(message).not.toContain('KM atual');
});

it('shows the overdue distance and only calls a nearby service upcoming', () => {
  expect(mensagemPreview(item)).toContain('6.829 km');
  const upcoming = mensagemPreview({...item, km_proximo_envio: 618000});
  expect(upcoming).toContain('MANUTENÇÃO PRÓXIMA');
  expect(upcoming).toContain('está próximo do marco');
  const scheduled = mensagemPreview({...item, km_proximo_envio: 785000});
  expect(scheduled).toContain('MANUTENÇÃO PROGRAMADA');
  expect(scheduled).not.toContain('atingiu o marco');
});

it('does not call a valid certificate near expiry or include an unrelated oil service', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-21T15:00:00Z'));
  const message = mensagemPreview({...item, tipo_controle: 'data', data_ultimo_servico: '2025-12-03', data_proximo_envio: '2027-10-21', mensagem: 'O certificado está próximo do vencimento.', ultimaManutencao: {data: '2026-09-08', km: 605829, descricao: 'RESPIRO DO DIFERENCIAL'}});
  expect(message).toContain('MANUTENÇÃO PROGRAMADA');
  expect(message).toContain('21/10/2027');
  expect(message).not.toContain('próximo do vencimento');
  expect(message).not.toContain('DIFERENCIAL');
});

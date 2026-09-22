// @vitest-environment jsdom
import React from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import MaintenanceAudit from './maintenance-audit.jsx';
afterEach(() => cleanup());
const result = {rows: [
  {id: 1, ocorrido_em: '2026-09-17T12:00:00Z', evento: 'alteracao', origem: 'automacao_mensagem_manutencao', placa: 'TEST123', titulo: 'Revisão', usuario_login: 'operador', dados_anteriores: {km_atual: 260000, km_proximo_envio: 300000}, dados_novos: {km_atual: 303292, km_proximo_envio: 340000}},
  {id: 2, ocorrido_em: '2026-09-17T12:00:00Z', evento: 'envio', placa: 'TEST123', titulo: 'Revisão', status: 'aceito', numero: '5500000000000', mensagem: 'Hora da revisão', provedor_id: 'abc-123'},
  {id: 3, ocorrido_em: '2026-09-17T12:00:00Z', evento: 'envio', status: 'falha', numero: '5500000000001', mensagem: 'Hora da revisão', erro: 'Serviço de mensagens respondeu HTTP 401.'},
], temMais: true, ultimaExecucao: null, agendadorNestaApi: false, whatsappConfigurado: true};

it('shows previous/new mileage, author and send evidence without claiming delivery', async () => {
  const api = {listManutencaoAuditoria: vi.fn().mockResolvedValue(result)};
  render(<MaintenanceAudit api={api} />);
  await screen.findByText('Plano alterado');
  expect(screen.getByText('operador')).toBeTruthy();
  expect(screen.getByText('303.292 km', {selector: 'strong'})).toBeTruthy();
  expect(screen.getByText(/260.000 km →/)).toBeTruthy();
  expect(screen.getByText('Aceito pelo serviço')).toBeTruthy();
  expect(screen.getByText('Falha no envio')).toBeTruthy();
  expect(screen.getByText(/não a entrega ou leitura/)).toBeTruthy();
  expect(screen.getByText('Protocolo: abc-123')).toBeTruthy();
  expect(screen.getByText(/Sem execução recente/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Tipo de evento'), {target: {value: 'envios'}});
  await waitFor(() => expect(api.listManutencaoAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({tipo: 'envios', pagina: 1})));
  fireEvent.click(screen.getByRole('button', {name: 'Próxima'}));
  await waitFor(() => expect(api.listManutencaoAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({pagina: 2})));
});

it('keeps failed loading distinct from empty history and supports retry', async () => {
  const api = {listManutencaoAuditoria: vi.fn().mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValue({...result, rows: []})};
  render(<MaintenanceAudit api={api} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText(/Nenhum registro encontrado/)).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Atualizar histórico'}));
  expect(await screen.findByText(/Nenhum registro encontrado/)).toBeTruthy();
});

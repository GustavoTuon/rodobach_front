// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
afterEach(cleanup);

it('exibe número reservado sem edição e o envia ao salvar', async () => {
  window.React = React;
  const { Cv2ViagemForm } = await import('./cargas-viagens-v2.jsx');
  window.RB_API = {
    reservarNumeroViagemV2: vi.fn(async () => ({ numero: 'V-2026-1234', reservaNumero: 'reserva' })),
    createViagemV2: vi.fn(async value => value),
  };
  render(<Cv2ViagemForm cargas={[]} onClose={() => {}} onSaved={() => {}} />);
  await waitFor(() => expect(screen.getByLabelText('Identificador da viagem').value).toBe('V-2026-1234'));
  expect(screen.getByLabelText('Identificador da viagem').readOnly).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Criar viagem' }));
  await waitFor(() => expect(window.RB_API.createViagemV2).toHaveBeenCalledWith(expect.objectContaining({ reservaNumero: 'reserva' })));
});

it('preserva o número existente sem pedir uma nova reserva', async () => {
  window.React = React;
  const { Cv2ViagemForm } = await import('./cargas-viagens-v2.jsx');
  window.RB_API = { reservarNumeroViagemV2: vi.fn() };
  render(<Cv2ViagemForm initial={{ id: 1, numero: 'VIAGEM-ANTIGA', cargas: [] }} cargas={[]} onClose={() => {}} />);
  expect(screen.getByLabelText('Identificador da viagem').value).toBe('VIAGEM-ANTIGA');
  expect(screen.getByLabelText('Identificador da viagem').readOnly).toBe(true);
  expect(window.RB_API.reservarNumeroViagemV2).not.toHaveBeenCalled();
});

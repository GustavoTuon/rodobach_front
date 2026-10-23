// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { GlobalLoading } from './global-loading.jsx';
import { beginLoadingActivity, getLoadingActivity, trackLoadingActivity } from './loading-activity.js';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

it('mantém o indicador até todas as consultas paralelas terminarem, inclusive após remontar', async () => {
  vi.useFakeTimers();
  const first = beginLoadingActivity(), second = beginLoadingActivity();
  const view = render(<GlobalLoading />);
  await act(async () => vi.advanceTimersByTime(200));
  expect(screen.getByRole('status').textContent).toContain('Carregando informações');
  act(first);
  expect(screen.getByRole('status')).toBeTruthy();
  view.unmount();
  render(<GlobalLoading />);
  await act(async () => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toBeTruthy();
  act(second);
  expect(screen.queryByRole('status')).toBeNull();
  second();
  expect(getLoadingActivity().pending).toBe(0);
});

it('avisa quando está demorando e não deixa aviso preso após erro ou cancelamento', async () => {
  vi.useFakeTimers();
  const finish = beginLoadingActivity();
  render(<GlobalLoading />);
  await act(async () => vi.advanceTimersByTime(8100));
  expect(screen.getByRole('status').textContent).toContain('Ainda carregando');
  act(finish);
  for (const error of [new Error('Servidor indisponível'), new DOMException('Cancelado', 'AbortError'), new DOMException('Tempo esgotado', 'TimeoutError')]) {
    await act(async () => {
      await expect(trackLoadingActivity(() => Promise.reject(error))).rejects.toBe(error);
    });
    expect(getLoadingActivity().pending).toBe(0);
  }
  expect(screen.queryByRole('status')).toBeNull();
});

it('não pisca para consultas instantâneas', async () => {
  vi.useFakeTimers(); render(<GlobalLoading />);
  await act(async () => trackLoadingActivity(async () => 'ok'));
  await act(async () => vi.advanceTimersByTime(200));
  expect(screen.queryByRole('status')).toBeNull();
});

it('API continua ocupada durante leitura do JSON e libera em respostas 204, 401 e 503', async () => {
  const body = deferred();
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => body.promise });
  vi.stubGlobal('fetch', fetch);
  await import('./api.js');
  const request = window.RB_API.listUsuarios();
  await Promise.resolve();
  expect(getLoadingActivity().pending).toBe(1);
  body.resolve({ rows: [] }); await request;
  expect(getLoadingActivity().pending).toBe(0);
  fetch.mockResolvedValueOnce({ ok: true, status: 204 });
  await window.RB_API.listUsuarios();
  for (const status of [401, 503]) {
    fetch.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'Falha' }) });
    await expect(window.RB_API.listUsuarios()).rejects.toThrow();
    expect(getLoadingActivity().pending).toBe(0);
  }
});

it('inclui portal de compras e download até a conclusão do corpo da resposta', async () => {
  const body = deferred();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => body.promise, blob: () => body.promise }));
  const { purchasesApi } = await import('./purchases-api.js');
  await import('./api.js');
  const requests = [purchasesApi('/pedidos'), window.RB_API.downloadOportunidadesModelo()];
  expect(getLoadingActivity().pending).toBe(2);
  body.resolve({}); await Promise.all(requests);
  expect(getLoadingActivity().pending).toBe(0);
});

it('acompanha importação de telas e encerra também quando o módulo falha', async () => {
  const { createScreenLoader } = await import('./screen-loader.js');
  const module = deferred();
  const load = createScreenLoader({ './screens/diretoria.jsx': () => module.promise });
  const pending = load('diretoria');
  expect(getLoadingActivity().pending).toBe(1);
  module.resolve({}); await pending;
  expect(getLoadingActivity().pending).toBe(0);
  const failure = createScreenLoader({ './screens/diretoria.jsx': async () => { throw new Error('Offline'); } });
  await expect(failure('diretoria')).rejects.toThrow('Offline');
  expect(getLoadingActivity().pending).toBe(0);
});

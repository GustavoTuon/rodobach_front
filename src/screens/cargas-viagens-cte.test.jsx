// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(cleanup);
it('permite desvincular o único CT-e, revisar e desfazer antes de salvar', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const original = { tipo: 'CT-e', numero: '4574' };
  const saved = vi.fn();
  window.RB_API = { saveCargaDocumentosV2: vi.fn(async () => ({id: 1, documentos: []})) };
  render(<Cv2CteModal carga={{id:1,codigo:'C-1',documentos:[original]}} onClose={() => {}} onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  expect(screen.getByRole('status').textContent).toContain('CT-e 4574');
  expect(window.RB_API.saveCargaDocumentosV2).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Desfazer remoções'));
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  fireEvent.click(screen.getByRole('button', {name:'Salvar alterações'}));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledWith(1, []);
});

it('mantém o outro CT-e e as NF-es ao desvincular somente o documento escolhido', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const docs = [{tipo:'CT-e',numero:'4574'},{tipo:'CT-e',numero:'4575'},{tipo:'NF-e',numero:'50'}];
  window.RB_API = {saveCargaDocumentosV2: vi.fn(async () => ({}))};
  render(<Cv2CteModal carga={{id:2,documentos:docs}} onClose={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByRole('button', {name:'Desvincular CT-e 4574'}));
  fireEvent.click(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(window.RB_API.saveCargaDocumentosV2).toHaveBeenCalledWith(2, docs.slice(1)));
});
it('preserva CT-e anterior, adiciona dois novos e evita duplicar CT-es e NF-es', async () => {
  window.React = React;
  const { Cv2CteModal } = await import('./cargas-viagens-v2.jsx');
  const original = { tipo: 'CT-e', numero: '100', chave: 'chave100' };
  const saved = vi.fn();
  window.RB_API = {
    searchViagemDocumentos: vi.fn(async numero => [{ numero, chave: `chave${numero}`, notasDocumentos: [{ numero: '50', chave: 'nf50' }] }]),
    saveCargaDocumentosV2: vi.fn(async (_id, documentos) => ({ id: 1, documentos })),
  };
  render(<Cv2CteModal carga={{ id: 1, codigo: 'C-1', documentos: [original] }} onClose={() => {}} onSaved={saved} />);
  for (const numero of ['200', '300', '200']) {
    fireEvent.change(screen.getByPlaceholderText('Ex.: 4030'), { target: { value: numero } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^CT-e ${numero}`) }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Vincular documentos' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const docs = window.RB_API.saveCargaDocumentosV2.mock.calls[0][1];
  expect(docs.filter(doc => doc.tipo === 'CT-e').map(doc => doc.numero)).toEqual(['100', '200', '300']);
  expect(docs.filter(doc => doc.tipo === 'NF-e')).toHaveLength(1);
  expect(docs[0]).toEqual(original);
});

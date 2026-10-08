// @vitest-environment jsdom
import { expect, it } from 'vitest';
import './data.js';
it('não mantém coeficientes financeiros manuais no navegador', () => {
  expect(window.NT_DATA.ANTT_TABELA).toBeUndefined();
});

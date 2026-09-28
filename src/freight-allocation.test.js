import { expect, it } from 'vitest';
import { allocateFreight, parseFreight } from './freight-allocation.js';

it.each(['5600', '5.600', '5.600,00', '5600.00', 'R$ 5.600,00'])('reads %s as 5600 reais', value => {
  expect(parseFreight(value)).toBe(5600);
});
it.each(['-100', 'abc', '5,60,00', '1.23.45', 'Infinity', '999999999999999999999'])('rejects invalid freight %s', value => {
  expect(parseFreight(value)).toBeNull();
});
it('allocates exact nonnegative cents only to notes with weight in XML and ERP', () => {
  for (let count = 1; count <= 25; count++) {
    for (const total of [0, .01, .03, .11, 5600, 12345.67]) {
      const notes = Array.from({length:count}, (_,i) => ({pesoNota:(i+1)*.113}));
      notes.push({pesoNota:0});
      const results = allocateFreight(notes, total, 'pesoNota');
      expect(results.reduce((sum, row) => sum + Math.round(row.freteRateado * 100), 0)).toBe(Math.round(total * 100));
      expect(results.every(row => row.freteRateado >= 0)).toBe(true);
      expect(results.at(-1)).toMatchObject({freteRateado:0, fretePorKg:null, percentualPeso:0});
    }
  }
});

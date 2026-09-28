// Monetary input accepts Brazilian grouping and decimal separators, and ungrouped decimal dots.
export function parseFreight(value) {
  const text = String(value ?? '').trim().replace(/^R\$\s*/, '');
  if (!text) return 0;
  let normalized;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+([,.]\d{1,2})?$/.test(text)) {
    normalized = text.replace(',', '.');
  } else return null;
  const number = Number(normalized);
  return Number.isSafeInteger(Math.round(number * 100)) ? number : null;
}

export function allocateFreight(notes, freight, weightKey = 'pesoConsiderado') {
  const weights = notes.map(note => {
    const weight = Number(note[weightKey]);
    return Number.isFinite(weight) && weight > 0 ? weight : 0;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const totalCents = Math.round(Number(freight) * 100);
  const valid = Number.isSafeInteger(totalCents) && totalCents >= 0;
  const shares = weights.map(weight => valid && totalWeight > 0 ? totalCents * (weight / totalWeight) : 0);
  const cents = shares.map(Math.floor);
  // Distribute residual cents to the largest fractional shares, never to weightless notes.
  const order = weights.map((weight, index) => ({weight, index, fraction: shares[index] - cents[index]}))
    .filter(item => item.weight > 0)
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  let remaining = valid && totalWeight > 0 ? totalCents - cents.reduce((sum, n) => sum + n, 0) : 0;
  for (const item of order) {
    if (remaining <= 0) break;
    cents[item.index]++;
    remaining--;
  }
  return notes.map((note, index) => ({
    ...note,
    percentualPeso: totalWeight > 0 ? weights[index] / totalWeight * 100 : 0,
    freteRateado: cents[index] / 100,
    fretePorKg: weights[index] > 0 ? cents[index] / 100 / weights[index] : null,
  }));
}

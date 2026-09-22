import {ecCategory, ecDistanceMonths} from './cost-analysis-model.js';

export function costDeviations(current, previous, {months = [], distance} = {}) {
  const groups = new Map();
  let invalid = 0;
  function collect(rows, side) {
    for (const row of rows) {
      if (typeof row.valor !== 'number' || !Number.isFinite(row.valor)) { invalid++; continue; }
      const plate = row.placa || 'Sem placa';
      const category = ecCategory(row) || 'Não classificado';
      const key = JSON.stringify([plate, category]);
      if (!groups.has(key)) groups.set(key, {plate, category, current: 0, previous: 0, currentCount: 0, previousCount: 0});
      const item = groups.get(key);
      item[side] += row.valor;
      item[`${side}Count`]++;
    }
  }
  collect(current, 'current'); collect(previous, 'previous');
  const kmByPlate = new Map();
  const items = [...groups.values()].map(item => {
    if (!kmByPlate.has(item.plate)) {
      const coverage = ecDistanceMonths(months, [item.plate], distance);
      const complete = coverage.length > 0 && coverage.every(row => row.km !== null && row.km >= 0);
      kmByPlate.set(item.plate, complete ? coverage.reduce((sum, row) => sum + row.km, 0) : null);
    }
    const km = kmByPlate.get(item.plate);
    const comparable = item.previousCount > 0 && item.currentCount > 0;
    const delta = item.current - item.previous;
    return {...item, delta, comparable,
      percent: comparable && item.previous > 0 ? delta / item.previous * 100 : null,
      costKm: item.currentCount > 0 && km > 0 ? item.current / km : null,
      status: !item.previousCount ? 'Sem lançamentos anteriores' : !item.currentCount ? 'Sem lançamentos atuais' : 'Comparável',
    };
  }).sort((a, b) => b.delta - a.delta || a.plate.localeCompare(b.plate));
  return {items, invalid,
    increase: items.reduce((sum, item) => sum + Math.max(0, item.delta), 0),
    decrease: items.reduce((sum, item) => sum + Math.min(0, item.delta), 0),
    delta: items.reduce((sum, item) => sum + item.delta, 0),
  };
}

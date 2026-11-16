import { ecFuelType } from "./cost-analysis-model.js";

const iso = (date) => date.toISOString().slice(0, 10);
const date = (value) => new Date(`${value}T12:00:00Z`);
const sum = (rows, key) =>
  rows.reduce(
    (total, row) =>
      total + (Number.isFinite(Number(row[key])) ? Number(row[key]) : 0),
    0,
  );
export const change = (now, before) =>
  before > 0 ? (now / before - 1) * 100 : null;
export const inPeriod = (row, period) =>
  row.data >= period.startDate && row.data <= period.endDate;
export function comparisonPeriod(period) {
  const start = date(period.startDate),
    end = date(period.endDate),
    next = new Date(+end + 86400000);
  if (start.getUTCDate() === 1 && next.getUTCDate() === 1) {
    const months =
      (next.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      next.getUTCMonth() -
      start.getUTCMonth();
    const before = new Date(start);
    before.setUTCMonth(before.getUTCMonth() - months);
    return {
      startDate: iso(before),
      endDate: iso(new Date(+start - 86400000)),
    };
  }
  return {
    startDate: iso(new Date(+start - (+end - +start + 86400000))),
    endDate: iso(new Date(+start - 86400000)),
  };
}
export function selectedPeriod(period, month) {
  if (!month) return period;
  const startDate = [period.startDate, `${month}-01`].sort().at(-1);
  const d = date(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  const endDate = [period.endDate, iso(d)].sort()[0];
  return startDate <= endDate ? { startDate, endDate } : period;
}
export function operationalScope(
  rows,
  { plates = [], supplierCodes = null, centerCodes = null } = {},
) {
  return rows.filter(
    (row) =>
      (!plates.length || plates.includes(row.placa)) &&
      (supplierCodes === null ||
        supplierCodes.includes(String(row.supplierCode ?? row.posto))) &&
      (centerCodes === null ||
        centerCodes.includes(String(row.centerCode ?? row.centro))),
  );
}
export const operationalFuelType = (row) =>
  ecFuelType({ tipoCusto: "Abastecimento", descricao: row.combustivel });
function family(row) {
  const name = operationalFuelType(row);
  return name.startsWith("Diesel") ? "Diesel" : name;
}
function totals(rows) {
  const liters = sum(rows, "litros"),
    value = sum(rows, "total");
  return {
    liters,
    value,
    count: rows.length,
    price: liters > 0 ? value / liters : null,
    vehicles: new Set(rows.map((r) => r.placa)).size,
  };
}
function vehicle(rows, restricted) {
  const families = new Set(rows.map(family));
  const invalid = rows.find(
    (r) =>
      r.kmValido === false || !(r.km > 0) || !(r.litros > 0) || !(r.total >= 0),
  );
  const validFamily =
    families.size === 1 &&
    ["Diesel", "Gasolina", "Etanol"].includes([...families][0]);
  const reason = restricted
    ? "Filtro de fornecedor/centro pode excluir abastecimentos da placa."
    : !rows.length
      ? "Sem abastecimentos no período."
      : rows.length < 2
        ? "Menos de dois abastecimentos."
        : invalid
          ? invalid.kmMotivo || "KM, litros ou valor inválidos."
          : !validFamily
            ? "Produto sem consumo comparável ou mistura de combustíveis."
            : null;
  const total = totals(rows),
    km = sum(rows, "km");
  return {
    ...total,
    km: reason ? null : km,
    rate: reason ? null : total.liters / km,
    reason,
    family: [...families][0],
  };
}
export function fuelEfficiency(
  rows,
  period,
  prior,
  { types = [], restricted = false } = {},
) {
  const scope = rows.filter((row) =>
    !types.length ? true : types.includes(operationalFuelType(row)),
  );
  const current = scope.filter((r) => inPeriod(r, period)),
    previous = scope.filter((r) => inPeriod(r, prior));
  const now = totals(current),
    before = totals(previous);
  // Decompose each exact product separately. Unmatched products remain unexplained.
  let volumeEffect = 0,
    priceEffect = 0;
  const products = [
    ...new Set([...current, ...previous].map((r) => r.combustivel)),
  ];
  const productRows = products.map((product) => {
    const a = totals(current.filter((r) => r.combustivel === product)),
      b = totals(previous.filter((r) => r.combustivel === product));
    const valid =
      a.count > 0 &&
      b.count > 0 &&
      a.liters > 0 &&
      b.liters > 0 &&
      a.value >= 0 &&
      b.value >= 0;
    if (valid) {
      volumeEffect += (a.liters - b.liters) * b.price;
      priceEffect += a.liters * (a.price - b.price);
    }
    return { product, now: a, before: b, valid };
  });
  const plates = [...new Set([...current, ...previous].map((r) => r.placa))];
  const ranking = plates
    .map((placa) => {
      const a = vehicle(
          current.filter((r) => r.placa === placa),
          restricted,
        ),
        b = vehicle(
          previous.filter((r) => r.placa === placa),
          restricted,
        );
      const same = a.family === b.family;
      const valid = !a.reason && !b.reason && same && a.km > 0 && b.km > 0;
      return {
        placa,
        now: a,
        before: b,
        valid,
        reason: valid
          ? null
          : !same
            ? "Produto diferente entre períodos."
            : a.reason || b.reason,
        consumptionChange: valid ? change(a.rate, b.rate) : null,
        estimatedLiters: valid ? a.km * b.rate - a.liters : null,
        estimatedSavings: valid ? (a.km * b.rate - a.liters) * a.price : null,
      };
    })
    .sort(
      (a, b) =>
        (b.consumptionChange ?? -Infinity) - (a.consumptionChange ?? -Infinity),
    );
  const comparable = ranking.filter((r) => r.valid);
  const comparableCurrent = comparable.reduce(
    (a, r) => ({
      km: a.km + r.now.km,
      liters: a.liters + r.now.liters,
      value: a.value + r.now.value,
    }),
    { km: 0, liters: 0, value: 0 },
  );
  const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  volumeEffect = cents(volumeEffect);
  priceEffect = cents(priceEffect);
  return {
    now,
    before,
    productRows,
    volumeEffect,
    priceEffect,
    unexplained: cents(now.value - before.value - volumeEffect - priceEffect),
    ranking,
    comparable,
    comparableCurrent,
    estimatedSavings: sum(comparable, "estimatedSavings"),
    latest: current
      .map((r) => r.data)
      .sort()
      .at(-1),
    mixedUnits: current.some((r) => family(r) === "GNV"),
    valueCoverage:
      now.value > 0 ? (comparableCurrent.value / now.value) * 100 : 0,
  };
}
export function maintenanceEvolution(rows, period, prior) {
  const current = rows.filter((r) => inPeriod(r, period)),
    previous = rows.filter((r) => inPeriod(r, prior));
  const summary = (items) => ({
    count: items.length,
    value: sum(items, "valor"),
    vehicles: new Set(items.map((r) => r.placa)).size,
    withKm: items.filter((r) => r.km > 0).length,
    withTimes: items.filter((r) => r.hasTimes).length,
    withServices: items.filter((r) => r.services).length,
  });
  const plates = [...new Set([...current, ...previous].map((r) => r.placa))];
  const ranking = plates
    .map((placa) => {
      const now = summary(current.filter((r) => r.placa === placa)),
        before = summary(previous.filter((r) => r.placa === placa));
      return { placa, now, before, delta: now.value - before.value };
    })
    .sort((a, b) => b.delta - a.delta);
  return {
    now: summary(current),
    before: summary(previous),
    ranking,
    latest: current
      .map((r) => r.data)
      .sort()
      .at(-1),
  };
}

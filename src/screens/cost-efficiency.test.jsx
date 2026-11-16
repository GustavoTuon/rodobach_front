// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CostEfficiency } from "./cost-efficiency.jsx";
import {
  comparisonPeriod,
  selectedPeriod,
  fuelEfficiency,
  maintenanceEvolution,
  operationalScope,
} from "./cost-efficiency-model.js";
import { ecFuelType } from "./cost-analysis-model.js";

const period = { startDate: "2026-09-01", endDate: "2026-09-30" },
  prior = { startDate: "2026-08-01", endDate: "2026-08-31" };
const fuel = (data, placa, litros, total, km, extra = {}) => ({
  data,
  placa,
  litros,
  total,
  km,
  kmValido: true,
  combustivel: "DIESEL S10",
  ...extra,
});
const rows = [
  fuel("2026-08-05", "ABC1D23", 100, 600, 300),
  fuel("2026-08-20", "ABC1D23", 100, 600, 300),
  fuel("2026-09-05", "ABC1D23", 80, 560, 300),
  fuel("2026-09-20", "ABC1D23", 80, 560, 300),
];
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("compara meses calendários, ano bissexto e intervalos parciais sem ultrapassar a seleção", () => {
  expect(comparisonPeriod(period)).toEqual(prior);
  expect(
    comparisonPeriod({ startDate: "2024-03-01", endDate: "2024-03-31" }),
  ).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
  expect(
    comparisonPeriod({ startDate: "2026-01-01", endDate: "2026-01-31" }),
  ).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
  expect(
    selectedPeriod(
      { startDate: "2026-07-10", endDate: "2026-09-12" },
      "2026-09",
    ),
  ).toEqual({ startDate: "2026-09-01", endDate: "2026-09-12" });
  expect(
    comparisonPeriod({ startDate: "2026-09-01", endDate: "2026-09-12" }),
  ).toEqual({ startDate: "2026-08-20", endDate: "2026-08-31" });
});

it("reconcilia efeitos de preço e volume e estima consumo por placa com KM atual", () => {
  const m = fuelEfficiency(rows, period, prior);
  expect(m.volumeEffect).toBe(-240);
  expect(m.priceEffect).toBe(160);
  expect(m.unexplained).toBe(0);
  expect(m.now.value - m.before.value).toBe(-80);
  expect(m.comparable).toHaveLength(1);
  expect(m.estimatedSavings).toBeCloseTo(280);
  expect(m.comparable[0].consumptionChange).toBeCloseTo(-20);
});

it("não inventa melhora ao mudar a frota, misturar Arla ou filtrar abastecimentos por posto", () => {
  const extra = [
    fuel("2026-09-05", "DEF4G56", 100, 500, 1000),
    fuel("2026-09-20", "DEF4G56", 100, 500, 1000),
    fuel("2026-09-20", "ABC1D23", 20, 70, 0, { combustivel: "ARLA" }),
  ];
  const m = fuelEfficiency([...rows, ...extra], period, prior, {
    types: ["Diesel S10"],
  });
  expect(m.comparable).toHaveLength(1);
  expect(m.ranking).toHaveLength(2);
  expect(m.estimatedSavings).toBeCloseTo(280);
  expect(
    fuelEfficiency(rows, period, prior, { restricted: true }).comparable,
  ).toHaveLength(0);
  expect(
    fuelEfficiency([...rows, ...extra], period, prior).comparable,
  ).toHaveLength(0);
  const bad = rows.map((r, i) =>
    i === 3 ? { ...r, kmValido: false, kmMotivo: "Hodômetro regrediu" } : r,
  );
  expect(fuelEfficiency(bad, period, prior).ranking[0].reason).toBe(
    "Hodômetro regrediu",
  );
});

it("trata produto novo como variação sem base e nunca usa descrição genérica quando há vínculo ERP", () => {
  const m = fuelEfficiency(
    [fuel("2026-09-05", "ABC1D23", 20, 70, 0, { combustivel: "ARLA" })],
    period,
    prior,
  );
  expect(m.unexplained).toBe(70);
  expect(m.comparable).toHaveLength(0);
  expect(ecFuelType({ fuelProducts: ["ARLA", "DIESEL S10"] })).toBe(
    "Misto (documento com vários produtos)",
  );
  expect(
    ecFuelType({
      fuelProducts: [],
      descricao: "Diesel",
      tipoCusto: "Abastecimento",
    }),
  ).toBe("Não identificado");
  expect(ecFuelType({ fuelProducts: ["DIESEL S10"] })).toBe("Diesel S10");
});

it("respeita interseção dos filtros e apresenta qualidade das OS sem somar hodômetros", () => {
  const orders = [
    {
      data: "2026-09-10",
      placa: "ABC1D23",
      valor: 400,
      km: 900000,
      hasTimes: false,
      supplierCode: "1",
      centerCode: "2",
    },
    {
      data: "2026-08-10",
      placa: "ABC1D23",
      valor: 600,
      km: 800000,
      hasTimes: true,
      supplierCode: "1",
      centerCode: "2",
    },
  ];
  expect(operationalScope(orders, { supplierCodes: [] })).toHaveLength(0);
  const scoped = operationalScope(orders, {
    plates: ["ABC1D23"],
    supplierCodes: ["1"],
    centerCodes: ["2"],
  });
  const m = maintenanceEvolution(scoped, period, prior);
  expect(m.now).toMatchObject({
    value: 400,
    count: 1,
    withKm: 1,
    withTimes: 0,
  });
  expect(m.ranking[0].delta).toBe(-200);
});

it("mostra a amostra e alterna manutenção sem nova consulta operacional", async () => {
  window.RB_API = {
    getCostOperations: vi
      .fn()
      .mockResolvedValue({
        generatedAt: "2026-11-16T12:00:00Z",
        fuel: { available: true, rows },
        maintenance: { available: true, rows: [] },
        plans: { available: true, rows: [] },
      }),
  };
  render(
    <CostEfficiency
      period={period}
      owner="frota"
      plates={[]}
      fuel={[]}
      financialRows={[]}
      supplierCodes={null}
      centerCodes={null}
      category={[]}
    />,
  );
  await screen.findByText("1 de 1 veículos");
  expect(
    screen.getByText("O gasto caiu. Isso, sozinho, não comprova economia."),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Manutenção", exact: true }),
  );
  expect(
    screen.getByText("Financeiro e serviços são bases distintas"),
  ).toBeTruthy();
  expect(window.RB_API.getCostOperations).toHaveBeenCalledOnce();
});

it("não apresenta falha da fonte como ausência de custos", async () => {
  window.RB_API = {
    getCostOperations: vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        generatedAt: "2026-11-16T12:00:00Z",
        fuel: { available: true, rows },
        maintenance: { available: false, rows: [], message: "OS indisponível" },
        plans: { available: false, rows: [] },
      }),
  };
  render(
    <CostEfficiency
      period={period}
      owner="frota"
      plates={[]}
      fuel={[]}
      financialRows={[]}
      supplierCodes={null}
      centerCodes={null}
      category={[]}
    />,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("Valor abastecido")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Atualizar análise operacional" }),
  );
  await screen.findByText("1 de 1 veículos");
  fireEvent.click(
    screen.getByRole("button", { name: "Manutenção", exact: true }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("OS indisponível"),
  );
});

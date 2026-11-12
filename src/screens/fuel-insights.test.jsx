// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FuelInsights } from "./fuel-insights.jsx";
afterEach(cleanup);
it("prioritizes increases, filters pending data, and opens the selected plate", () => {
  const history = vi.fn(),
    review = vi.fn();
  const data = {
    summary: {},
    ranking: [
      {
        placa: "AAA1234",
        media: 2,
        cobertura: { diasValidos: 30, diasEsperados: 30 },
      },
      { placa: "BBB5678", cobertura: { diasValidos: 10, diasEsperados: 30 } },
    ],
    comparison: {
      period: { startDate: "2026-09-01", endDate: "2026-09-30" },
      vehicles: [
        { placa: "AAA1234", variacao: 25, anterior: 2.5, status: "alerta" },
        { placa: "BBB5678", variacao: null, status: "pendente" },
      ],
    },
  };
  render(<FuelInsights data={data} onHistory={history} onReview={review} />);
  expect(screen.getByText("+25%")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Ver abastecimentos/ }));
  expect(review).toHaveBeenCalledWith("AAA1234");
  fireEvent.click(screen.getByRole("button", { name: /Completar leituras/ }));
  expect(screen.queryByText("AAA1234")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Conferir leituras/ }));
  expect(history).toHaveBeenCalledWith("BBB5678");
});
it("shows ERP record coverage and opens records instead of telemetry", () => {
  const history = vi.fn();
  const data = {
    fonteKm: "abastecimento",
    combustivelLabel: "Gasolina",
    summary: {},
    ranking: [
      {
        placa: "ABC1234",
        media: null,
        cobertura: { registrosValidos: 1, registrosTotal: 2 },
        motivo: "KM inválido",
      },
    ],
  };
  render(<FuelInsights data={data} onHistory={history} onReview={vi.fn()} />);
  expect(screen.getByText(/Gasolina/)).toBeTruthy();
  expect(screen.getByText("1/2 registros")).toBeTruthy();
  expect(screen.getByText("KM inválido")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Conferir KM/ }));
  expect(history).toHaveBeenCalledWith("ABC1234");
});

// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import "./analise-frota.jsx";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("applies vehicle and fuel together and keeps them when changing period", async () => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("Icon", () => null);
  const get = vi
    .fn()
    .mockResolvedValue({
      abastecimento: {
        fonteKm: "abastecimento",
        summary: {},
        ranking: [],
        lancamentos: [],
        filterOptions: {
          placas: ["ABC1234"],
          combustiveis: [{ codigo: "67", nome: "GASOLINA COMUM" }],
        },
      },
    });
  window.RB_API = { getAnaliseAbastecimentos: get };
  const Screen = window.AnaliseFrota;
  render(<Screen modoAbastecimento />);
  await screen.findByRole("option", { name: "GASOLINA COMUM" });
  fireEvent.change(screen.getByLabelText("Combustível"), {
    target: { value: "67" },
  });
  fireEvent.change(screen.getByLabelText("Veículo"), {
    target: { value: "ABC1234" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  await waitFor(() =>
    expect(get).toHaveBeenLastCalledWith(
      expect.objectContaining({ combustivel: "67", placa: "ABC1234" }),
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Últimos 3 meses fechados" }),
  );
  await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
  expect(get.mock.calls[2][0]).toEqual(
    expect.objectContaining({ combustivel: "67", placa: "ABC1234" }),
  );
});

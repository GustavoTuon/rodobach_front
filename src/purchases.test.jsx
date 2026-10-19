// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { rankedOffers } from "./purchases-api.js";
import { SupplierResponse } from "./screens/compras.jsx";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("comparação de compras", () => {
  it("prioriza atendimento completo e preserva empates e frete separado", () => {
    const invitations = [
      ["Parcial", 1, 1],
      ["Completo B", 10, 5],
      ["Completo A", 9, 5],
      ["Empate", 9, 8],
    ].map(([nome, valor, quantidade]) => ({
      nome,
      resposta: {
        frete: 50,
        itens: [{ id: "p", disponivel: true, valor, quantidade }],
      },
    }));
    const rows = rankedOffers({ id: "p", quantidade: 5 }, invitations);
    expect(rows.map((r) => r.fornecedor)).toEqual([
      "Completo A",
      "Empate",
      "Completo B",
      "Parcial",
    ]);
    expect(rows[0].valor).toBe(9);
    expect(rows[0].frete).toBe(50);
  });
  it("fornecedor responde somente os produtos do link e recebe confirmação", async () => {
    window.location.hash = "token";
    window.RB_API_BASE_URL = "/api";
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          titulo: "Filtros",
          fornecedor: "Oficina",
          prazo: "2099-01-01",
          itens: [
            { id: "p", nome: "Filtro óleo", quantidade: 2, unidade: "UN" },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    render(<SupplierResponse />);
    await screen.findByText("Filtro óleo");
    fireEvent.change(screen.getByLabelText("Marca"), {
      target: { value: "Marca A" },
    });
    fireEvent.change(screen.getByLabelText("Valor por UN (R$)"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Prazo de entrega"), {
      target: { value: "2 dias" },
    });
    fireEvent.change(screen.getByLabelText("Condição de pagamento"), {
      target: { value: "À vista" },
    });
    fireEvent.submit(screen.getByText("Enviar proposta").closest("form"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("recebida"),
    );
    expect(JSON.parse(fetch.mock.calls[1][1].body).itens[0]).toMatchObject({
      id: "p",
      marca: "Marca A",
      valor: 20,
    });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });
});

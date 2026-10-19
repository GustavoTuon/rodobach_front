// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import {
  ProductChoice,
  PurchaseSummary,
  purchaseSummaryText,
} from "./purchases-selection.jsx";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it.each(["changed", "cancelled", "offline", "fresh"])(
  "confere resumo antes de copiar: %s",
  async (scenario) => {
    const quote = {
      id: "q",
      titulo: "Compra",
      status: "aberta",
      planoCompra: {
        completa: true,
        pendentes: 0,
        revisar: 0,
        total: 20,
        subtotal: 20,
        frete: 0,
        desconto: 0,
        fornecedores: [
          {
            conviteId: "a",
            fornecedor: "A",
            itens: [],
            subtotal: 20,
            total: 20,
          },
        ],
      },
    };
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const fresh = structuredClone(quote);
    if (scenario === "changed") fresh.planoCompra.total = 30;
    if (scenario === "cancelled") fresh.status = "cancelada";
    const refresh =
      scenario === "offline"
        ? vi.fn().mockRejectedValue(new Error("offline"))
        : vi.fn().mockResolvedValue(fresh);
    render(<PurchaseSummary quote={quote} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar resumo" }));
    await screen.findByRole("status");
    expect(refresh).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledTimes(scenario === "fresh" ? 1 : 0);
  },
);
it("pede motivo para escolher oferta mais cara e envia versão conferida", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetch);
  const refresh = vi.fn();
  render(
    <ProductChoice
      quote={{ id: "q" }}
      product={{ id: "p", nome: "Produto", quantidade: 2, unidade: "UN" }}
      offers={[
        {
          id: "a",
          inviteId: "a",
          available: true,
          price: 10,
          quantity: 2,
          supplier: "A",
          unit: "UN",
          proposalVersion: "v1",
        },
        {
          id: "b",
          inviteId: "b",
          available: true,
          price: 12,
          quantity: 2,
          supplier: "B",
          unit: "UN",
          proposalVersion: "v2",
        },
      ]}
      onRefresh={refresh}
    />,
  );
  fireEvent.change(screen.getByLabelText("Fornecedor vencedor de Produto"), {
    target: { value: "b" },
  });
  expect(
    screen.getByLabelText("Motivo da escolha (obrigatório)").required,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Motivo da escolha (obrigatório)"), {
    target: { value: "Entrega urgente" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar escolha" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    produtoId: "p",
    conviteId: "b",
    versaoProposta: "v2",
    motivo: "Entrega urgente",
  });
});
it("mostra pendências e identifica resumo parcial na cópia", () => {
  const quote = {
    titulo: "Compra",
    planoCompra: {
      completa: false,
      pendentes: 1,
      revisar: 1,
      subtotal: 0,
      frete: 0,
      desconto: 0,
      total: 0,
      fornecedores: [],
    },
  };
  render(<PurchaseSummary quote={quote} />);
  expect(
    screen.getByText("1 produtos sem escolha · 1 escolhas precisam de revisão"),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copiar resumo" }).disabled).toBe(
    true,
  );
  expect(purchaseSummaryText(quote)).toContain("Resumo parcial");
});

// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { responseSummary, SupplierInvitations } from "./supplier-workspace.jsx";
afterEach(cleanup);
it("calcula total com frete excluindo indisponíveis e identifica preenchimento", () => {
  expect(
    responseSummary({
      frete: 10,
      itens: [
        { disponivel: true, quantidade: 2, valor: 25, marca: "A" },
        { disponivel: false, quantidade: 100, valor: 50, marca: "" },
        { disponivel: true, quantidade: 1, valor: 0, marca: "" },
      ],
    }),
  ).toEqual({ complete: 2, available: 2, subtotal: 50, total: 60 });
});
it("filtra convites por pendência e busca", () => {
  const open = vi.fn();
  render(
    <SupplierInvitations
      quotes={[
        {
          token: "a",
          titulo: "Peças",
          status: "aberta",
          prazo: "2099-01-01",
          produtos: 2,
        },
        {
          token: "b",
          titulo: "Pneus",
          status: "aberta",
          prazo: "2099-01-01",
          respondido_em: "2026-01-01",
          produtos: 1,
        },
      ]}
      onOpen={open}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /A responder/ }));
  expect(screen.queryByText("Pneus")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Responder cotação/ }));
  expect(open).toHaveBeenCalledWith("a");
  fireEvent.change(screen.getByLabelText("Buscar cotação"), {
    target: { value: "outro" },
  });
  expect(screen.getByText("Nenhuma cotação neste filtro")).toBeTruthy();
});

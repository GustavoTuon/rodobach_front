// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { quoteProgress } from "./purchases-status.js";
import QuoteActions from "./purchases-quote-actions.jsx";
afterEach(cleanup);
const quote = {
  id: "quote",
  titulo: "Teste",
  status: "aberta",
  prazo: "2099-01-01",
  fornecedores: 2,
  respostas: 0,
};
it("distingue pendências, respostas completas e estados finais", () => {
  expect(quoteProgress(quote).label).toBe("Aguardando respostas");
  expect(quoteProgress({ ...quote, respostas: 1 }).label).toBe(
    "Respostas parciais",
  );
  expect(quoteProgress({ ...quote, respostas: 2 }).label).toBe(
    "Pronta para análise",
  );
  expect(
    quoteProgress({ ...quote, status: "cancelada", respostas: 2 }).label,
  ).toBe("Cancelada");
  expect(quoteProgress({ ...quote, prazo: "2000-01-01" }).label).toBe(
    "Prazo encerrado",
  );
});
it("exibe exclusão com confirmação quando não há resposta", () => {
  render(<QuoteActions quote={quote} onChanged={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Excluir cotação" }));
  expect(
    screen.getByRole("button", { name: "Confirmar exclusão" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cancelar cotação" })).toBeNull();
});
it("oferece cancelamento para preservar respostas", () => {
  render(
    <QuoteActions quote={{ ...quote, respostas: 1 }} onChanged={vi.fn()} />,
  );
  expect(screen.getByRole("button", { name: "Cancelar cotação" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Excluir cotação" })).toBeNull();
});

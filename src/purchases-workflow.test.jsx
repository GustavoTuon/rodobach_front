// @vitest-environment jsdom
import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import QuoteQuest, { quoteChecklist } from "./purchases-quest.jsx";
import PurchaseAnalysis, {
  analysisRows,
  sortAnalysis,
} from "./purchases-analysis.jsx";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
test("checklist não conclui prazo vencido, quantidade inválida ou produto sem fornecedor", () => {
  expect(
    quoteChecklist({
      titulo: "ABC",
      prazo: "2000-01-01",
      items: [{ quantidade: 0, unidade: "UN", fornecedores: [] }],
    }),
  ).toEqual([false, false, false]);
});
test("percurso guiado valida, revisa e cria somente ao concluir", async () => {
  const save = vi.fn().mockResolvedValue({});
  const Catalog = ({ onSelect }) => (
    <button
      type="button"
      onClick={() => onSelect({ empresa: "1", codigo: "2", nome: "Filtro" })}
    >
      Adicionar filtro
    </button>
  );
  render(
    <QuoteQuest
      suppliers={[{ id: "s", nome: "Oficina" }]}
      onSave={save}
      Catalog={Catalog}
    />,
  );
  fireEvent.click(screen.getByText("Continuar →"));
  expect(screen.getByRole("alert").textContent).toContain("prazo futuro");
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Título da cotação"), {
    target: { value: "Compra de filtros" },
  });
  fireEvent.click(screen.getByText("Em 3 dias"));
  fireEvent.click(screen.getByText("Continuar →"));
  fireEvent.click(screen.getByText("Adicionar filtro"));
  fireEvent.click(screen.getByText("Continuar →"));
  fireEvent.click(screen.getByLabelText("Oficina"));
  fireEvent.click(screen.getByText("Continuar →"));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText("Concluir e gerar links")).toBeTruthy();
  fireEvent.click(screen.getByText("Concluir e gerar links"));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].itens[0].fornecedores).toEqual(["s"]);
});
const quote = {
  itens: [{ id: "p", nome: "Filtro", quantidade: 4, unidade: "UN" }],
  convites: [
    {
      id: "a",
      fornecedor_id: "s1",
      nome: "Fornecedor A",
      resposta: {
        frete: 50,
        itens: [
          { id: "p", disponivel: true, quantidade: 1, valor: 5, marca: "A" },
        ],
      },
    },
    {
      id: "b",
      fornecedor_id: "s2",
      nome: "Fornecedor B",
      resposta: {
        frete: 10,
        itens: [
          { id: "p", disponivel: true, quantidade: 4, valor: 8, marca: "B" },
        ],
      },
    },
  ],
};
test("análise separa frete do preço e filtra ofertas parciais", () => {
  const rows = analysisRows(quote);
  expect(sortAnalysis(rows, "price")[0].price).toBe(5);
  expect(rows[0].total).toBe(5);
  expect(rows[0].freight).toBe(50);
  render(<PurchaseAnalysis quote={quote} />);
  fireEvent.click(
    screen.getByLabelText("Somente ofertas que atendem toda a quantidade"),
  );
  expect(screen.queryByRole("heading", { name: "Fornecedor A" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Fornecedor B" })).toBeTruthy();
  fireEvent.click(screen.getByText("Tabela comparativa"));
  expect(screen.getByRole("table")).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem("rodobach:purchase-analysis:local")).view,
  ).toBe("table");
});
test("histórico sem total não fabrica preço zero", () => {
  const result = analysisRows({
    origem_dados: {
      ofertas: [
        {
          codigocot: 1,
          produtocot: 2,
          quantidadecotadacot: "3",
          valortotalcot: null,
        },
      ],
    },
    itens: [{ id: "p", codigo: "2", quantidade: null }],
  });
  expect(result[0].price).toBeNull();
  expect(result[0].freight).toBeNull();
});

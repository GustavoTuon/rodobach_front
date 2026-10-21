import { it, expect } from "vitest";
import { analysisRows } from "./purchases-analysis.jsx";
import { bestProductOffers } from "./purchases-decision.jsx";
it("reordena a melhor compra com desconto sem alterar o valor original", () => {
  const quote = {
    itens: [{ id: "p", nome: "Produto", quantidade: 5, unidade: "UN" }],
    convites: [
      {
        id: "a",
        fornecedor_id: "a",
        nome: "A",
        resposta: {
          frete: 10,
          itens: [
            { id: "p", disponivel: true, quantidade: 5, valor: 20, marca: "A" },
          ],
        },
        descontos: { p: { original: 20, valor: 15 } },
      },
      {
        id: "b",
        fornecedor_id: "b",
        nome: "B",
        resposta: {
          itens: [
            { id: "p", disponivel: true, quantidade: 5, valor: 18, marca: "B" },
          ],
        },
      },
      {
        id: "c",
        fornecedor_id: "c",
        nome: "C",
        resposta: {
          itens: [
            { id: "p", disponivel: true, quantidade: 2, valor: 1, marca: "C" },
          ],
        },
      },
    ],
  };
  const rows = analysisRows(quote);
  expect(bestProductOffers(rows, "p")[0].supplier).toBe("A");
  expect(rows[0].originalPrice).toBe(20);
  expect(rows[0].total).toBe(75);
  expect(quote.convites[0].resposta.itens[0].valor).toBe(20);
  quote.convites[0].descontos.p.original = 19;
  expect(analysisRows(quote)[0].price).toBe(20);
});
it("sinaliza empate e não recomenda quantidade insuficiente", () => {
  const row = {
    productId: "p",
    available: true,
    price: 10,
    requested: 5,
    quantity: 5,
  };
  expect(bestProductOffers([row, { ...row, supplier: "B" }], "p")).toHaveLength(
    2,
  );
  expect(bestProductOffers([{ ...row, quantity: 2 }], "p")).toHaveLength(0);
});

import { priceDifference, historyDate } from "./purchases-item-history.jsx";
it("compara somente unidades conhecidas iguais e respeita a data brasileira", () => {
  expect(
    priceDifference(90, { valor_unitario: 100, unidade: "UN" }, "UN"),
  ).toBeCloseTo(-10);
  expect(
    priceDifference(90, { valor_unitario: 100, unidade: "CX" }, "UN"),
  ).toBeNull();
  expect(priceDifference(90, { valor_unitario: 100 }, "UN")).toBeNull();
  expect(historyDate({ criado_em: "2026-07-16T01:00:00Z" })).toBe("2026-07-15");
});

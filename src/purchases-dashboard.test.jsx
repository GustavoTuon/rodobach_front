// @vitest-environment jsdom
import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  PurchaseDashboard,
  ImportedQuote,
  comparableErpOffers,
  SupplierPicker,
} from "./purchases-dashboard.jsx";
afterEach(cleanup);
const quotes = [
  {
    id: "1",
    titulo: "Solicitação 10 · Empresa 1",
    origem_chave: "erp:1",
    respostas: 5,
    fornecedores: 2,
    produtos: 3,
    criado_em: "2026-01-01",
  },
  {
    id: "2",
    titulo: "Compra de pneus",
    prazo: "2099-01-01",
    status: "aberta",
    fornecedores: 2,
    respostas: 1,
    produtos: 1,
  },
];
test("busca, filtros e abertura usam registros reais da lista", () => {
  const open = vi.fn();
  render(<PurchaseDashboard quotes={quotes} onOpen={open} />);
  fireEvent.change(screen.getByLabelText("Buscar cotação"), {
    target: { value: "pneus" },
  });
  expect(screen.queryByText("Solicitação 10 · Empresa 1")).toBeNull();
  fireEvent.click(screen.getByText("Compra de pneus"));
  expect(open).toHaveBeenCalledWith("2");
  fireEvent.change(screen.getByLabelText("Buscar cotação"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText('Filtrar por situação'),{target:{value:'historico'}});
  expect(screen.queryByText("Compra de pneus")).toBeNull();
});
test("preço líquido respeita o total de origem e não cria frete ou marca", () => {
  const rows = comparableErpOffers([
    { quantidadecotadacot: 2, valortotalcot: 30, valorunitariocot: 20 },
    { quantidadecotadacot: 0, valortotalcot: 0 },
  ]);
  expect(rows[0].precoLiquido).toBe(15);
  expect(rows[1].precoLiquido).toBeNull();
});
test("seleção de fornecedores permanece visível ao filtrar a lista", () => {
  const update = vi.fn();
  render(
    <SupplierPicker
      suppliers={[
        { id: "a", nome: "Oficina A" },
        { id: "b", nome: "Peças B" },
      ]}
      selected={["a"]}
      onChange={update}
    />,
  );
  fireEvent.change(
    screen.getByLabelText("Buscar na sua rede de fornecedores"),
    { target: { value: "Peças" } },
  );
  expect(
    screen.getByRole("button", { name: "Remover Oficina A" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Peças B"));
  expect(update).toHaveBeenCalledWith(["a", "b"]);
});
test("histórico conserva aprovação sem oferecer envio de link", () => {
  const quote = {
    titulo: "Histórico",
    itens: [
      { id: "p", codigo: "1", nome: "Filtro", quantidade: 2, unidade: "UN" },
    ],
    origem_dados: {
      fornecedores: 1,
      ultima_data: "2026-01-01",
      ofertas: [
        {
          produtocot: 1,
          codigocot: 10,
          fornecedor: "Oficina",
          quantidadecotadacot: 2,
          valortotalcot: 30,
          valorunitariocot: 20,
          aprovadacot: true,
          data: "2026-01-01",
        },
      ],
    },
  };
  render(<ImportedQuote quote={quote} />);
  fireEvent.click(screen.getByRole('button',{name:/Comparar ofertas/}));
  expect(
    screen.getByRole("cell", { name: "Aprovada no sistema", exact: true }),
  ).toBeTruthy();
  expect(screen.queryByText("Copiar link")).toBeNull();
  expect(screen.getByText(/marca não estão informados/)).toBeTruthy();
});

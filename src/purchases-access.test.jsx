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
import { SupplierPicker } from "./purchases-dashboard.jsx";
import SupplierPortal from "./supplier-portal.jsx";
import AddSuppliers from "./purchases-add-suppliers.jsx";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
it("adiciona novos parceiros por grupo sem reenviar vínculos existentes", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetch);
  const onSaved = vi.fn();
  render(
    <AddSuppliers
      quote={{
        id: "q",
        status: "aberta",
        prazo: "2099-01-01",
        itens: [{ id: "p", nome: "Produto", fornecedores: ["a"] }],
        convites: [{ fornecedor_id: "a", itens: ["p"] }],
      }}
      suppliers={[
        { id: "a", nome: "Existente" },
        { id: "b", nome: "Novo" },
      ]}
      groups={[{ id: "g", nome: "Elétrica", fornecedores: ["a", "b"] }]}
      onSaved={onSaved}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "+ Adicionar fornecedores" }),
  );
  fireEvent.change(screen.getByLabelText("Adicionar um grupo"), {
    target: { value: "g" },
  });
  expect(screen.getByRole("checkbox", { name: "Novo" }).checked).toBe(true);
  expect(screen.queryByRole("checkbox", { name: "Existente" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar selecionados" }),
  );
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    itens: [{ id: "p", fornecedores: ["b"] }],
  });
});
it("adiciona grupo sem duplicar fornecedores selecionados", () => {
  const change = vi.fn();
  render(
    <SupplierPicker
      suppliers={[
        { id: "a", nome: "A" },
        { id: "b", nome: "B" },
      ]}
      groups={[{ id: "g", nome: "Elétrica", fornecedores: ["a", "b"] }]}
      selected={["a"]}
      onChange={change}
    />,
  );
  fireEvent.change(screen.getByLabelText("Adicionar um grupo"), {
    target: { value: "g" },
  });
  expect(change).toHaveBeenCalledWith(["a", "b"]);
});
it("exige troca antes de buscar cotações e confirma a nova senha", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "initial", trocaObrigatoria: true }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "changed", trocaObrigatoria: false }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => [] });
  vi.stubGlobal("fetch", fetch);
  render(<SupplierPortal />);
  fireEvent.change(screen.getByLabelText("CNPJ"), {
    target: { value: "11444777000161" },
  });
  fireEvent.change(screen.getByLabelText("Senha", { exact: true }), {
    target: { value: "Senha@123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByText("Crie sua senha pessoal");
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Senha atual"), {
    target: { value: "Senha@123" },
  });
  fireEvent.change(screen.getByLabelText("Nova senha", { exact: true }), {
    target: { value: "SenhaNova@123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
    target: { value: "diferente" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar senha e continuar" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("não conferem");
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
    target: { value: "SenhaNova@123" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar senha e continuar" }),
  );
  await screen.findByText("Minhas cotações");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer changed");
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  expect(sessionStorage.getItem("RB_SUPPLIER_SESSION")).toBeNull();
});

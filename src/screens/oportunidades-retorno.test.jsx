// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function setup(fonte = "planilha") {
  vi.stubGlobal("React", React);
  vi.stubGlobal("Icon", () => null);
  const base = { cidade: "Joinville", uf: "SC", distanciaKm: 10, fonte, placas: ["ABC1234"] };
  const clients = [
    { ...base, id: "1", nome: "Empresa exemplo", contato: "Maria", telefone: "48999991234", tipoCarga: fonte === "planilha" ? "Máquinas" : "", materiais: fonte === "sistema" ? ["Máquinas", "Ferro"] : [] },
    { ...base, id: "2", nome: "Transportadora exemplo", contato: "João", telefone: "48999995678", tipoCarga: "Leite" },
    { ...base, id: "3", nome: "Sem material", contato: "", telefone: "", tipoCarga: "" },
  ];
  window.RB_API = {
    getOportunidadesRetorno: vi.fn().mockResolvedValue({ clientes: clients, sms: [{ id: 1, placa: "ABC1234", destino: "Joinville/SC" }], configuracao: { envioHabilitado: true, n8nConfigurado: true } }),
    analyzeOportunidadesRetorno: vi.fn().mockResolvedValue({ fonte, sm: { placa: "ABC1234" }, destino: { descricao: "Joinville/SC" }, raioKm: 200, potenciais: clients }),
    sendOportunidadesSelecionados: vi.fn(),
    sendOportunidadeCliente: vi.fn(),
  };
  await import("./oportunidades-retorno.jsx");
  const Component = window.OportunidadesRetorno;
  render(<Component/>);
  fireEvent.click(screen.getByRole("button", { name: "Contatos da planilha" }));
  await screen.findByText(/3 contatos cadastrados/);
  if (fonte === "sistema") fireEvent.click(screen.getByRole("button", { name: "Fretes do sistema" }));
  fireEvent.click(screen.getByRole("button", { name: "Selecione um veículo" }));
  fireEvent.click(screen.getByRole("button", { name: /ABC1234/ }));
  fireEvent.click(screen.getByRole("button", { name: "Analisar oportunidades" }));
  await screen.findByRole("table");
}

it("filtra material, mostra os contatos em tabela e permite revisar sem enviar", async () => {
  await setup();
  expect(window.RB_API.analyzeOportunidadesRetorno).toHaveBeenCalledWith({ smId: "sm:1", raioKm: 200, fonte: "planilha" });
  const table = within(screen.getByRole("table"));
  for (const name of ["Nome / empresa", "Contato", "Localização", "Material carregado"]) expect(table.getByRole("columnheader", { name })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("2. Filtrar por material carregado"), { target: { value: "MÁQ" } });
  expect(table.getByText("Empresa exemplo")).toBeTruthy();
  expect(table.getByText("Maria")).toBeTruthy();
  expect(table.queryByText("Transportadora exemplo")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar Empresa exemplo" }));
  fireEvent.change(screen.getByLabelText("Tipo de veículo"), { target: { value: "truck" } });
  fireEvent.change(screen.getByLabelText("Modelo da mensagem"), { target: { value: "Olá! Tenho um {tipoVeiculo} em {localizacao}. Teria carga?" } });
  expect(screen.getByText("Olá! Tenho um truck em Joinville/SC. Teria carga?")).toBeTruthy();
  const send = screen.getByRole("button", { name: "Enviar para 1 selecionado(s)" });
  expect(send.disabled).toBe(true);
  fireEvent.click(send);
  expect(window.RB_API.sendOportunidadesSelecionados).not.toHaveBeenCalled();
  expect(window.RB_API.sendOportunidadeCliente).not.toHaveBeenCalled();
});

it("limpa destinatários ao mudar material e ao trocar origem", async () => {
  await setup();
  fireEvent.click(screen.getByRole("button", { name: "Selecionar contatos filtrados" }));
  expect(screen.getByRole("button", { name: "Enviar para 3 selecionado(s)" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("2. Filtrar por material carregado"), { target: { value: "leite" } });
  expect(screen.queryByRole("button", { name: /Enviar para/ })).toBeNull();
  expect(screen.getByText("Selecione os contatos para preparar sua mensagem")).toBeTruthy();
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  expect(screen.getByRole("checkbox").checked).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Fretes do sistema" }));
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByLabelText("Modelo da mensagem")).toBeNull();
});

it("permite consultar o cadastro quando não há contatos no raio", async () => {
  await setup();
  window.RB_API.analyzeOportunidadesRetorno.mockResolvedValueOnce({ fonte: "planilha", sm: { placa: "ABC1234" }, destino: { descricao: "Mossoró/RN" }, raioKm: 200, potenciais: [] });
  fireEvent.click(screen.getByRole("button", { name: "Analisar oportunidades" }));
  await screen.findByText("Nenhum contato em até 200 km");
  expect(screen.getByText(/Você tem 3 contatos cadastrados/)).toBeTruthy();
  expect(screen.queryByLabelText("Modelo da mensagem")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ver todos os contatos", exact: true }));
  const table = await screen.findByRole("table");
  expect(within(table).getByText("Empresa exemplo")).toBeTruthy();
  expect(within(table).getAllByRole("checkbox").every((checkbox) => checkbox.disabled)).toBe(true);
  expect(screen.getByText("Todos os contatos importados · sem filtro de distância")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Enviar para/ })).toBeNull();
});

it("filtra materiais do histórico do sistema e preserva contatos sem material", async () => {
  await setup("sistema");
  fireEvent.change(screen.getByLabelText("2. Filtrar por material carregado"), { target: { value: "ferro" } });
  expect(within(screen.getByRole("table")).getByText("Empresa exemplo")).toBeTruthy();
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("2. Filtrar por material carregado"), { target: { value: "__missing__" } });
  expect(within(screen.getByRole("table")).getByText("Sem material")).toBeTruthy();
  expect(within(screen.getByRole("table")).getByText("Telefone não informado")).toBeTruthy();
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
});

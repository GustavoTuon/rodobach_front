// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import ControleViagens, {
  newTrip,
  tripProgress,
  controlTotals,
} from "./controle-viagens.jsx";
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute("open", "");
  });
  window.RB_AUTH = { getUser: () => ({}) };
  window.RB_API = {
    listControleViagens: vi.fn().mockResolvedValue({ itens: [], total: 0 }),
    getControleParametrosDiarias: vi.fn().mockResolvedValue({
      refeicoes: [
        { nome: "Café da manhã", horario: "08:00", valor: 19.27, horas: null },
        { nome: "Almoço", horario: "12:00", valor: 38.54, horas: null },
        { nome: "Jantar", horario: "21:00", valor: 28.9, horas: 11 },
      ],
      revisao: 1,
    }),
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("mostra uma entrada simples e salva a nova viagem no servidor", async () => {
  window.RB_API.saveControleViagem = vi
    .fn()
    .mockImplementation(async (t) => ({ ...t, id: "1", revisao: 1 }));
  render(<ControleViagens />);
  await screen.findByText("Seu próximo percurso começa aqui");
  fireEvent.click(screen.getByRole("button", { name: "＋ Nova viagem" }));
  fireEvent.change(await screen.findByLabelText("Placa *"), {
    target: { value: "abc1d23" },
  });
  fireEvent.change(screen.getByLabelText("Motorista *"), {
    target: { value: "Motorista" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar controle" }));
  await screen.findByText("✓ Controle salvo com sucesso.");
  expect(window.RB_API.saveControleViagem).toHaveBeenCalledWith(
    expect.objectContaining({ placa: "ABC1D23", motorista: "Motorista" }),
  );
});
it("permite calcular, excluir uma refeição e aplicar sem duplicar lançamentos", async () => {
  const t = {
    ...newTrip(),
    id: "1",
    revisao: 1,
    placa: "ABC1D23",
    motorista: "Teste",
    saida: "2026-11-01",
    horaSaida: "07:00",
    chegada: "2026-11-01",
    horaChegada: "19:00",
  };
  window.RB_API.listControleViagens.mockResolvedValue({ itens: [t], total: 1 });
  window.RB_API.getControleViagem = vi.fn().mockResolvedValue(t);
  window.RB_API.calculateControleDiarias = vi.fn().mockResolvedValue({
    items: [
      {
        data: t.saida,
        refeicao: "Café da manhã",
        horario: "07:00",
        valor: 15,
        incluir: true,
      },
      {
        data: t.saida,
        refeicao: "Almoço",
        horario: "12:00",
        valor: 30,
        incluir: true,
      },
    ],
    total: 45,
  });
  render(<ControleViagens />);
  fireEvent.click(await screen.findByRole("button", { name: /ABC1D23/ }));
  await screen.findByRole("button", { name: "Motorista" });
  fireEvent.click(screen.getByRole("button", { name: "Motorista" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Calcular diárias do período" }),
  );
  await screen.findByText(/Confira antes de lançar/);
  fireEvent.click(screen.getByLabelText(/01\/11\/2026 · Café da manhã/));
  fireEvent.click(screen.getByRole("button", { name: "Aplicar diárias" }));
  expect(screen.getByText("1 refeições incluídas")).toBeTruthy();
  expect(screen.queryByText(/Confira antes de lançar/)).toBeNull();
  expect(window.RB_API.calculateControleDiarias).toHaveBeenCalledWith(
    expect.objectContaining({ saida: t.saida, horaSaida: t.horaSaida }),
  );
});
it("preserva o formulário e explica conflitos de edição", async () => {
  window.RB_API.saveControleViagem = vi
    .fn()
    .mockRejectedValue(new Error("Esta viagem foi alterada por outra pessoa."));
  render(<ControleViagens />);
  await screen.findByText("Seu próximo percurso começa aqui");
  fireEvent.click(screen.getByRole("button", { name: "＋ Nova viagem" }));
  fireEvent.change(await screen.findByLabelText("Placa *"), {
    target: { value: "ABC1D23" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar controle" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Esta viagem foi alterada por outra pessoa.",
  );
  expect(screen.getByLabelText("Placa *").value).toBe("ABC1D23");
});
it("não confunde nenhuma despesa com etapa já conferida e não duplica reembolso no resultado", () => {
  const t = newTrip();
  expect(tripProgress(t).count).toBe(0);
  t.fretes = [{ valor: 1000 }];
  t.despesas = [{ valor: 100, motoristaPagou: true }];
  expect(controlTotals(t).resultado).toBe(900);
  expect(controlTotals(t).saldoMotorista).toBe(100);
});
it("importa viagem por empresa/número sem simular uma gravação no ERP", async () => {
  window.RB_API.listConsultaViagens = vi.fn().mockResolvedValue({
    itens: [
      {
        empresa: 1,
        numero: 887,
        placa: "SXR8D09",
        motorista: "Teste",
        saida: "2026-11-01",
      },
    ],
    total: 1,
  });
  window.RB_API.importControleViagem = vi.fn().mockResolvedValue({
    ...newTrip(),
    id: "2",
    revisao: 1,
    erpNumero: 887,
    placa: "SXR8D09",
    motorista: "Teste",
  });
  render(<ControleViagens />);
  fireEvent.click(screen.getByRole("button", { name: "↗ Trazer do ERP" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Buscar no ERP", hidden: true }),
  );
  const button = await screen.findByRole("button", {
    name: "Importar e abrir →",
    hidden: true,
  });
  fireEvent.click(button);
  await waitFor(() =>
    expect(window.RB_API.importControleViagem).toHaveBeenCalledWith({
      empresa: 1,
      numero: 887,
    }),
  );
  await screen.findByText(/Viagem do ERP disponível/);
  expect(
    within(
      screen.getByRole("navigation", { name: "Etapas da viagem" }),
    ).getAllByRole("button"),
  ).toHaveLength(7);
});
it("edita valor, horário e regra por horas no padrão persistido", async () => {
  window.RB_API.saveControleParametrosDiarias = vi
    .fn()
    .mockImplementation(async (data) => ({ ...data, revisao: 2 }));
  render(<ControleViagens />);
  await screen.findByText("Seu próximo percurso começa aqui");
  fireEvent.click(
    screen.getByRole("button", { name: "⚙ Parâmetros de diárias" }),
  );
  const value = await screen.findByLabelText("Jantar: valor (R$)");
  expect(value.value).toBe("28.9");
  fireEvent.change(value, { target: { value: "32.50" } });
  fireEvent.change(screen.getByLabelText("Jantar: horário"), {
    target: { value: "20:30" },
  });
  fireEvent.change(screen.getByLabelText(/Jantar: ou após horas no dia/), {
    target: { value: "10.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar parâmetros" }));
  await screen.findByText(/Parâmetros padrão salvos/);
  expect(window.RB_API.saveControleParametrosDiarias).toHaveBeenCalledWith(
    expect.objectContaining({
      revisao: 1,
      refeicoes: expect.arrayContaining([
        { nome: "Jantar", horario: "20:30", valor: 32.5, horas: 10.5 },
      ]),
    }),
  );
});
it("nova viagem usa padrão salvo, mas aplicar padrão em viagem existente não altera as diárias lançadas", async () => {
  const t = {
    ...newTrip(),
    id: "1",
    revisao: 1,
    placa: "ABC1D23",
    motorista: "Teste",
    diarias: [
      {
        data: "2026-11-01",
        refeicao: "Jantar",
        horario: "19:00",
        valor: 25,
        incluir: true,
      },
    ],
  };
  window.RB_API.listControleViagens.mockResolvedValue({ itens: [t], total: 1 });
  window.RB_API.getControleViagem = vi.fn().mockResolvedValue(t);
  render(<ControleViagens />);
  fireEvent.click(await screen.findByRole("button", { name: /ABC1D23/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Motorista", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Aplicar padrão atual" }));
  await screen.findByText(/Padrão aplicado aos parâmetros/);
  expect(screen.getByLabelText("Valor do jantar (R$)").value).toBe("28.9");
  expect(screen.getByLabelText("Horário do jantar").value).toBe("21:00");
  expect(screen.getAllByText(/R\$\s*25,00/)).toHaveLength(2);
  expect(window.RB_API.saveControleViagem).toBeUndefined();
});

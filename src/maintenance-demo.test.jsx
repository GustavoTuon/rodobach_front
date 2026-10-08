// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import MaintenanceDemo, { sanitizeAmount } from "./maintenance-demo.jsx";
const KEY = "rodobach-maintenance-demo-v2";
it("filtra o histórico sem usar a placa do formulário", async () => {
  await ready();
  await submit("ABC1234");
  await submit("DEF4G56");
  expect(screen.getAllByRole("article")).toHaveLength(2);
  fireEvent.click(screen.getByText("Filtrar lançamentos"));
  fireEvent.change(screen.getByPlaceholderText("Todas as placas"), {
    target: { value: "ABC" },
  });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
});
it("não mostra conferência para usuário que só pode lançar e bloqueia acesso direto", async () => {
  window.RB_AUTH.me.mockResolvedValue({
    user: {
      id: 42,
      login: "maria",
      permissions: { "manutencao-plantao": true },
    },
  });
  await ready();
  expect(screen.queryByRole("button", { name: "Conferência" })).toBeNull();
  expect(window.RB_API.listPlantao).toHaveBeenCalledWith(false);
  expect(window.RB_API.listPlantao).not.toHaveBeenCalledWith(true);
  cleanup();
  window.RB_API.listPlantao.mockClear();
  render(<MaintenanceDemo initialView="manager" />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "não possui liberação",
  );
  expect(window.RB_API.listPlantao).not.toHaveBeenCalled();
});
it("permite somente conferência sem liberar novos lançamentos", async () => {
  window.RB_AUTH.me.mockResolvedValue({
    user: {
      id: 42,
      login: "maria",
      permissions: { "conferencia-manutencao": true },
    },
  });
  render(<MaintenanceDemo />);
  await screen.findByText("Conferência simplificada");
  expect(screen.queryByRole("button", { name: "Motorista" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Nova manutenção" })).toBeNull();
  expect(window.RB_API.listPlantao).toHaveBeenCalledWith(true);
});
it("seleciona fornecedor do sistema e salva nome, código e empresa no histórico", async () => {
  await ready();
  await details();
  fireEvent.change(screen.getByLabelText("Fornecedor"), {
    target: { value: "Oficina" },
  });
  fireEvent.click(
    await screen.findByRole("option", { name: /Oficina Central/ }),
  );
  await submit();
  expect(JSON.parse(localStorage.getItem(KEY))[0]).toMatchObject({
    supplier: "Oficina Central",
    supplierCode: 10,
    supplierCompany: 1,
  });
  expect(screen.getByText("Oficina Central")).toBeTruthy();
});
it("permite fornecedor digitado quando a consulta falha e remove vínculo ao editar", async () => {
  await ready();
  await details();
  fireEvent.change(screen.getByLabelText("Fornecedor"), {
    target: { value: "Oficina" },
  });
  fireEvent.click(
    await screen.findByRole("option", { name: /Oficina Central/ }),
  );
  window.RB_API.searchFornecedoresManutencao.mockRejectedValue(
    new Error("offline"),
  );
  fireEvent.change(screen.getByLabelText("Fornecedor"), {
    target: { value: "Borracharia da estrada" },
  });
  await screen.findByText(
    "Não foi possível consultar. Você pode digitar o nome.",
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Usar.*Borracharia da estrada/ }),
  );
  await submit();
  expect(JSON.parse(localStorage.getItem(KEY))[0]).toMatchObject({
    supplier: "Borracharia da estrada",
    supplierCode: null,
    supplierCompany: null,
  });
});
it("limita o valor a números e duas casas decimais", () => {
  expect(sanitizeAmount("abc!@#")).toBe("");
  expect(sanitizeAmount("R$ 1.250,90")).toBe("1250,90");
  expect(sanitizeAmount("12,3456")).toBe("12,34");
  expect(sanitizeAmount("12.50")).toBe("12,50");
});
it("preserva o progresso ao fechar e retomar, e permite voltar antes de registrar", async () => {
  await ready();
  await details();
  fireEvent.change(screen.getByLabelText("Fornecedor"), {
    target: { value: "Oficina da estrada" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Fechar lançamento" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await openForm();
  expect(
    screen.getByRole("heading", { name: "O que foi feito?" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Fornecedor").value).toBe("Oficina da estrada");
  fireEvent.click(
    screen.getByRole("button", { name: "Continuar", exact: true }),
  );
  expect(
    screen.getByRole("heading", { name: "Tudo pronto para registrar?" }),
  ).toBeTruthy();
  expect(window.RB_API.createPlantao).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Voltar", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar", exact: true }));
  expect(screen.getByLabelText("Valor pago").value).toBe("1250,90");
  await finish();
  expect(window.RB_API.createPlantao).toHaveBeenCalledTimes(1);
});
it("bloqueia data futura na primeira etapa e mantém o modal aberto", async () => {
  await ready();
  fireEvent.change(screen.getByLabelText("Placa do veículo"), {
    target: { value: "ABC1234" },
  });
  fireEvent.change(screen.getByLabelText("Valor pago"), {
    target: { value: "200" },
  });
  fireEvent.change(screen.getByLabelText("Data da despesa"), {
    target: { value: "2099-01-01" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continuar", exact: true }),
  );
  expect(screen.getByRole("alert").textContent).toContain("sem data futura");
  expect(
    screen.getByRole("heading", { name: "Vamos começar pelo básico" }),
  ).toBeTruthy();
  expect(window.RB_API.createPlantao).not.toHaveBeenCalled();
});
it("seleciona placas pelo teclado, fecha com Escape e mostra busca vazia", async () => {
  await ready();
  const input = screen.getByRole("combobox", { name: /Placa/ });
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input.value).toBe("ABC1234");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  fireEvent.change(input, { target: { value: "ZZZ" } });
  expect(screen.getByText("Nenhuma placa encontrada.")).toBeTruthy();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
});
it("remove letras no campo de valor e formata ao sair", async () => {
  await ready();
  const input = screen.getByLabelText("Valor pago");
  fireEvent.change(input, { target: { value: "abc180xyz,509" } });
  expect(input.value).toBe("180,50");
  fireEvent.change(input, { target: { value: "180" } });
  fireEvent.blur(input);
  expect(input.value).toBe("180,00");
});
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  localStorage.clear();
  window.RB_AUTH = {
    getToken: vi.fn(() => "test-token"),
    me: vi.fn().mockResolvedValue({
      user: {
        id: 42,
        login: "maria",
        permissions: {
          "manutencao-plantao": true,
          "conferencia-manutencao": true,
        },
      },
    }),
  };
  window.RB_API = {
    listPlantao: vi.fn(async () => ({
      records: JSON.parse(localStorage.getItem(KEY) || "[]"),
    })),
    createPlantao: vi.fn(async (body) => {
      const record = {
        ...body,
        id: crypto.randomUUID(),
        author: "maria",
        authorId: 42,
        date: new Date().toISOString(),
        checked: false,
        version: 1,
      };
      localStorage.setItem(
        KEY,
        JSON.stringify([
          record,
          ...JSON.parse(localStorage.getItem(KEY) || "[]"),
        ]),
      );
      return { record };
    }),
    checkPlantao: vi.fn(async (id) => {
      const records = JSON.parse(localStorage.getItem(KEY) || "[]");
      const record = { ...records.find((r) => r.id === id), checked: true };
      localStorage.setItem(
        KEY,
        JSON.stringify(records.map((r) => (r.id === id ? record : r))),
      );
      return { record };
    }),
    searchFornecedoresManutencao: vi.fn().mockResolvedValue({
      fornecedores: [{ codigo: 10, empresa: 1, nome: "Oficina Central" }],
    }),
    listVeiculosPlantao: vi.fn().mockResolvedValue({
      veiculos: [
        { placa: "ABC-1234" },
        { placa: "DEF4G56" },
        { placa: "ABC1234" },
      ],
    }),
  };
  window.LoginScreen = () => <div>Entrar no sistema</div>;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete window.RB_AUTH;
  delete window.RB_API;
  delete window.LoginScreen;
});
async function openForm() {
  if (!screen.queryByRole("dialog"))
    fireEvent.click(
      screen.getAllByRole("button", {
        name: /Nova manutenção|Continuar lançamento|Continuar edição/,
      })[0],
    );
  await waitFor(() =>
    expect(screen.getByLabelText("Placa do veículo").disabled).toBe(false),
  );
}
async function ready() {
  render(<MaintenanceDemo />);
  await screen.findByRole("heading", { name: "Precisou de manutenção?" });
  await openForm();
}
async function details() {
  fireEvent.change(screen.getByLabelText("Placa do veículo"), {
    target: { value: "ABC1234" },
  });
  fireEvent.change(screen.getByLabelText("Valor pago"), {
    target: { value: "1250,90" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continuar", exact: true }),
  );
}
async function finish() {
  for (
    let i = 0;
    i < 2 && screen.queryByRole("button", { name: "Continuar", exact: true });
    i++
  ) {
    fireEvent.click(
      screen.getByRole("button", { name: "Continuar", exact: true }),
    );
    if (screen.queryByRole("alert")) return;
  }
  fireEvent.click(
    screen.getByRole("button", {
      name: /Registrar manutenção|Salvar alterações/,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Salvando…" })).toBeNull(),
  );
  if (screen.queryByRole("button", { name: "Ver lançamentos" }))
    fireEvent.click(screen.getByRole("button", { name: "Ver lançamentos" }));
}
async function submit(plate = "ABC1234", amount = "1.250,90") {
  await openForm();
  for (
    let i = 0;
    i < 2 && screen.queryByRole("button", { name: "Voltar", exact: true });
    i++
  )
    fireEvent.click(
      screen.getByRole("button", { name: "Voltar", exact: true }),
    );
  fireEvent.change(screen.getByLabelText("Placa do veículo"), {
    target: { value: plate },
  });
  fireEvent.change(screen.getByLabelText("Valor pago"), {
    target: { value: amount },
  });
  await finish();
}
it("carrega e filtra a frota, registra o usuário autenticado e mantém o histórico", async () => {
  await ready();
  expect(screen.getByLabelText("Quem está lançando?").value).toBe("maria");
  expect(screen.getByLabelText("Quem está lançando?").readOnly).toBe(true);
  fireEvent.focus(screen.getByRole("combobox", { name: /Placa/ }));
  expect(screen.getAllByRole("option")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Placa do veículo"), {
    target: { value: "abc" },
  });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  await submit();
  expect(JSON.parse(localStorage.getItem(KEY))[0]).toMatchObject({
    plate: "ABC1234",
    amount: 1250.9,
    author: "maria",
    authorId: 42,
    checked: false,
  });
  cleanup();
  await ready();
  fireEvent.change(screen.getByLabelText("Placa do veículo"), {
    target: { value: "DEF4G56" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Fechar lançamento" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
});
it("bloqueia placas fora da frota, valor inválido e falhas ao salvar", async () => {
  await ready();
  await submit("XYZ1234");
  expect(screen.getByRole("alert").textContent).toContain(
    "cadastrada na frota",
  );
  expect(localStorage.getItem(KEY)).toBeNull();
  await submit("ABC1234", "0");
  expect(screen.getByRole("alert").textContent).toContain("Informe um valor");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Nao foi possivel salvar");
  });
  await submit();
  expect(screen.getByRole("alert").textContent).toContain(
    "Nao foi possivel salvar",
  );
});
it("permite conferir registros pendentes", async () => {
  await ready();
  await submit();
  fireEvent.click(screen.getAllByRole("button", { name: "Conferência" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Pendentes" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Conferir", exact: true }),
  );
  await waitFor(() => expect(screen.queryByRole("article")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Conferidos" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
});
it("pede login sem sessão e não consulta a frota", async () => {
  window.RB_AUTH.getToken.mockReturnValue(null);
  render(<MaintenanceDemo />);
  expect(await screen.findByText("Entrar no sistema")).toBeTruthy();
  expect(window.RB_API.listVeiculosPlantao).not.toHaveBeenCalled();
});
it("exibe erro de frota e permite tentar novamente", async () => {
  window.RB_API.listVeiculosPlantao.mockRejectedValueOnce(
    new Error("Sem acesso à frota"),
  );
  render(<MaintenanceDemo />);
  fireEvent.click(
    (await screen.findAllByRole("button", { name: "Nova manutenção" }))[0],
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Continuar", exact: true }).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Placa do veículo").disabled).toBe(false),
  );
});
it("não usa identidade em cache quando a sessão não pode ser validada", async () => {
  window.RB_AUTH.me.mockRejectedValue(new Error("Sessão indisponível"));
  render(<MaintenanceDemo />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Sessão indisponível",
  );
  expect(window.RB_API.listVeiculosPlantao).not.toHaveBeenCalled();
});

it("mostra placa, data e comprovante e salva edição com controle de versão", async () => {
  await ready();
  fireEvent.change(screen.getByLabelText("Data da despesa"), {
    target: { value: "2026-09-30" },
  });
  fireEvent.change(screen.getByLabelText(/Nota \/ comprovante/), {
    target: { value: "NF-321" },
  });
  await submit();
  expect(screen.getByRole("article").textContent).toContain("ABC1234");
  expect(screen.getByText("30/09/2026")).toBeTruthy();
  expect(screen.getByText("NF-321")).toBeTruthy();
  const record = JSON.parse(localStorage.getItem(KEY))[0];
  window.RB_API.updatePlantao = vi.fn(async (_id, body) => ({
    record: { ...record, ...body, version: 2 },
  }));
  fireEvent.click(screen.getByRole("button", { name: "Editar", exact: true }));
  expect(screen.getByLabelText("Data da despesa").value).toBe("2026-09-30");
  fireEvent.change(screen.getByLabelText("Valor pago"), {
    target: { value: "250,00" },
  });
  await finish();
  await screen.findByText(
    "Lançamento atualizado. A alteração ficou registrada no histórico.",
  );
  expect(window.RB_API.updatePlantao).toHaveBeenCalledWith(
    record.id,
    expect.objectContaining({ amount: 250, version: 1, document: "NF-321" }),
    false,
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
});
it("exclusão exige motivo, permite cancelar e preserva registro em caso de falha", async () => {
  await ready();
  await submit();
  window.RB_API.deletePlantao = vi
    .fn()
    .mockRejectedValueOnce(new Error("Falha ao excluir"))
    .mockResolvedValue({ ok: true });
  fireEvent.click(screen.getByRole("button", { name: "Excluir", exact: true }));
  expect(
    screen.getByRole("button", { name: "Confirmar exclusão" }).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Cancelar", exact: true }),
  );
  expect(window.RB_API.deletePlantao).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Excluir", exact: true }));
  fireEvent.change(screen.getByLabelText("Motivo da exclusão"), {
    target: { value: "Lançamento duplicado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await screen.findByText("Falha ao excluir");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await waitFor(() => expect(screen.queryByRole("article")).toBeNull());
});
it("conferente pode editar sem permissão de cadastro e conferidos ficam protegidos", async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify([
      {
        id: "test",
        authorId: 42,
        author: "maria",
        plate: "ABC1234",
        amount: 200,
        service: "Borracharia",
        date: "2026-09-30T12:00:00Z",
        expenseDate: "2026-09-30",
        version: 1,
      },
    ]),
  );
  window.RB_AUTH.me.mockResolvedValue({
    user: {
      id: 43,
      login: "financeiro",
      permissions: { "conferencia-manutencao": true },
    },
  });
  window.RB_API.updatePlantao = vi.fn(async (_id, body) => ({
    record: {
      ...JSON.parse(localStorage.getItem(KEY))[0],
      ...body,
      checked: true,
      checkedBy: "financeiro",
    },
  }));
  render(<MaintenanceDemo />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Editar", exact: true }),
  );
  await finish();
  await waitFor(() =>
    expect(window.RB_API.updatePlantao).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ version: 1 }),
      true,
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Excluir", exact: true }),
    ).toBeNull(),
  );
  expect(
    screen.queryByRole("button", { name: "Editar", exact: true }),
  ).toBeNull();
});
it("filtra por data e comprovante e mantém o formulário se duplicidade for rejeitada", async () => {
  await ready();
  fireEvent.change(screen.getByLabelText("Data da despesa"), {
    target: { value: "2026-09-30" },
  });
  await submit();
  fireEvent.click(screen.getByText("Filtrar lançamentos"));
  fireEvent.change(screen.getByLabelText("De"), {
    target: { value: "2026-10-01" },
  });
  expect(screen.queryByRole("article")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  window.RB_API.createPlantao.mockRejectedValueOnce(
    new Error("Possível duplicidade"),
  );
  await submit();
  expect(screen.getByRole("alert").textContent).toContain(
    "Possível duplicidade",
  );
  expect(
    within(screen.getByRole("dialog")).getByLabelText("Valor pago").value,
  ).not.toBe("");
  expect(screen.getAllByRole("article")).toHaveLength(1);
});

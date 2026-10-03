// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

globalThis.React = React;
globalThis.Icon = ({ name }) => <span data-icon={name} />;
globalThis.RB_API = {
  listComponentesPosicao: vi.fn().mockResolvedValue({ registros: [] }),
  getOpcoesComponentesPosicao: vi.fn().mockResolvedValue({
    marcas: [],
    fornecedores: [],
    intervalos: [],
  }),
  createComponentesPosicaoLote: vi.fn().mockResolvedValue({}),
};

const { ManutencaoPosicoes } = await import("./manutencao-posicoes.jsx");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("abre a posição em modal e permite pular os detalhes opcionais", async () => {
  render(
    <ManutencaoPosicoes
      embedded
      vehicles={[
        {
          placa: "RAA8G18",
          modelo: "Veículo de teste",
          eixos: 4,
          km_atual: 373912,
          implementos: [],
        },
      ]}
    />,
  );

  await waitFor(() => expect(RB_API.listComponentesPosicao).toHaveBeenCalled());
  fireEvent.click(screen.getAllByTitle("Esquerdo · Sem histórico")[0]);

  const dialog = screen.getByRole("dialog", {
    name: /Direcional 1 · lado esquerdo/i,
  });
  expect(dialog).toBeTruthy();
  expect(screen.getByText(/8 componentes monitorados/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Novo registro/i }));
  expect(screen.getByText("O que foi realizado?")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
  expect(screen.getByText("Quais componentes?")).toBeTruthy();
  expect(document.querySelector(".mp-selection-feedback")?.textContent).toMatch(
    /1\s*componente selecionado/,
  );

  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
  expect(screen.getByText("Quer adicionar mais detalhes?")).toBeTruthy();
  expect(screen.getByText("Nenhum campo é obrigatório")).toBeTruthy();
  expect(screen.getByLabelText(/Marca/i)).toBeTruthy();

  fireEvent.click(
    screen.getByRole("button", { name: /Continuar sem preencher/i }),
  );
  expect(screen.getByText("Revise e confirme")).toBeTruthy();
  expect(
    screen.getByText("Lona de freio", { selector: "strong" }),
  ).toBeTruthy();
});

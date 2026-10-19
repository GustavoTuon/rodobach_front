// @vitest-environment jsdom
import React from "react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";

beforeEach(async () => {
  vi.stubGlobal("React",React);
  vi.stubGlobal("Icon",()=>null);
  vi.stubGlobal("RB_API",{
    listUsuarios:vi.fn().mockResolvedValue({usuarios:[]}),
    listMotoristasTelemetria:vi.fn().mockResolvedValue({motoristas:[{id:"987",nome:"Motorista teste",plate:"ABC1234",status:"ready"}]}),
    createUsuario:vi.fn().mockResolvedValue({usuario:{id:1}}),
    updateUsuario:vi.fn().mockResolvedValue({usuario:{id:2}}),
  });
  await import("./usuarios.jsx");
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("preserva Multas ao editar e salvar o usuário", async () => {
  RB_API.listUsuarios.mockResolvedValue({usuarios:[{id:2,login:"teste",ativo:true,perm_multas_frota:true}]});
  render(React.createElement(window.GerenciarUsuarios));
  fireEvent.click(await screen.findByRole("button",{name:"Editar"}));
  expect(screen.getByRole("switch",{name:"Multas"}).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("button",{name:"Salvar",exact:true}));
  await waitFor(()=>expect(RB_API.updateUsuario).toHaveBeenCalledWith(2,expect.objectContaining({perm_multas_frota:true})));
});
it("mostra acessos de administrador sem alterar as concessões explícitas", async () => {
  render(React.createElement(window.GerenciarUsuarios));
  fireEvent.click(screen.getByRole("button",{name:/Novo usuário/}));
  fireEvent.click(screen.getByRole("switch",{name:/Administrador/}));
  const multas = screen.getByRole("switch",{name:"Multas"});
  expect(multas.disabled).toBe(true);
  expect(multas.getAttribute("aria-checked")).toBe("true");
  const folgas = screen.getByRole("switch",{name:"Folgas"});
  expect(folgas.disabled).toBe(false);
  expect(folgas.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(screen.getByRole("switch",{name:/Administrador/}));
  expect(multas.getAttribute("aria-checked")).toBe("false");
});
it("busca pelas telas compartilhadas sem perder permissões ocultas pelo filtro", async () => {
  render(React.createElement(window.GerenciarUsuarios));
  fireEvent.click(screen.getByRole("button",{name:/Novo usuário/}));
  fireEvent.click(screen.getByRole("switch",{name:"Multas"}));
  fireEvent.change(screen.getByRole("searchbox"),{target:{value:"fluxo"}});
  expect(screen.getByRole("switch",{name:/DRE, Fluxo/})).toBeTruthy();
  expect(screen.queryByRole("switch",{name:"Multas"})).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"),{target:{value:""}});
  expect(screen.getByRole("switch",{name:"Multas"}).getAttribute("aria-checked")).toBe("true");
});
it("cadastro vincula motorista por ID e desabilita poderes de conferência", async()=>{
  render(React.createElement(window.GerenciarUsuarios));
  fireEvent.click(screen.getByRole("button",{name:/Novo usuário/}));
  fireEvent.change(screen.getByLabelText("Perfil de despesas"),{target:{value:"motorista"}});
  await screen.findByRole("option",{name:/Motorista teste/});
  fireEvent.change(screen.getByLabelText("Motorista na telemetria"),{target:{value:"987"}});
  expect(screen.getByRole("switch",{name:/Administrador/}).disabled).toBe(true);
  expect(screen.getByRole("switch",{name:/conferir/}).disabled).toBe(true);
  fireEvent.change(screen.getByPlaceholderText("ex: joao.silva"),{target:{value:"motorista.teste"}});
  fireEvent.change(screen.getByPlaceholderText("Senha inicial"),{target:{value:"test-password-123"}});
  fireEvent.click(screen.getByRole("button",{name:"Salvar",exact:true}));
  await waitFor(()=>expect(RB_API.createUsuario).toHaveBeenCalledWith(expect.objectContaining({perfil_despesas:"motorista",telemetria_motorista_id:"987",admin:false,perm_manutencao_plantao:true,perm_conferencia_manutencao:false})));
});

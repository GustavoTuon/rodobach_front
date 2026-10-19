import { describe, expect, it } from "vitest";
import { getNavForUser, getCurrentScreen } from "./permissions.js";

const nav = [{ id: "viagens" }, { id: "pneus" }, { id: "usuarios", adminOnly: true }];
describe("retorno dos portais ao sistema", () => {
  const baseNav = [
    { id: "manutencao-plantao", href: "/manutencao-plantao" },
    { id: "diretoria" },
    { id: "viagens" },
  ];
  const visible = getNavForUser(baseNav, { permissions: {
    "manutencao-plantao": true, diretoria: false, viagens: true,
  } });
  it("retorna a uma tela interna permitida quando a tela inicial não está liberada", () => {
    expect(getCurrentScreen(visible, "diretoria")).toBe("viagens");
    expect(getCurrentScreen(visible, "inexistente")).toBe("viagens");
  });
  it("preserva a navegação explícita para o plantão", () => {
    expect(getCurrentScreen(visible, "manutencao-plantao")).toBe("manutencao-plantao");
  });
  it("preserva contas com acesso exclusivo ao portal e contas sem telas", () => {
    expect(getCurrentScreen([baseNav[0]], "diretoria")).toBe("manutencao-plantao");
    expect(getCurrentScreen([], "diretoria")).toBeUndefined();
  });
});
describe("getNavForUser", () => {
  it("oculta telas restritas inclusive de administradores sem a concessão", () => {
    const restricted = ["folgas-motoristas", "status-carga", "automacoes-n8n"].map(id => ({ id }));
    expect(getNavForUser(restricted, { admin: true, permissions: {} })).toEqual([]);
    expect(getNavForUser(restricted, { admin: true, permissions: Object.fromEntries(restricted.map(item => [item.id, true])) })).toEqual(restricted);
  });
  it("mostra apenas permissoes explicitamente concedidas", () => {
    expect(getNavForUser(nav, { permissions: { viagens: true, pneus: false } })).toEqual([{ id: "viagens" }]);
  });
  it("permite todos os modulos ao administrador", () => {
    expect(getNavForUser(nav, { admin: true, permissions: {} })).toEqual(nav);
  });
});

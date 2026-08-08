import { describe, expect, it } from "vitest";
import { getNavForUser } from "./permissions.js";

const nav = [{ id: "viagens" }, { id: "pneus" }, { id: "usuarios", adminOnly: true }];
describe("getNavForUser", () => {
  it("mostra apenas permissoes explicitamente concedidas", () => {
    expect(getNavForUser(nav, { permissions: { viagens: true, pneus: false } })).toEqual([{ id: "viagens" }]);
  });
  it("permite todos os modulos ao administrador", () => {
    expect(getNavForUser(nav, { admin: true, permissions: {} })).toEqual(nav);
  });
});

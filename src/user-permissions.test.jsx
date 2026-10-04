// @vitest-environment jsdom
import React from "react";
import {it,expect,vi,afterEach} from "vitest";
import {render,screen,fireEvent,cleanup,waitFor} from "@testing-library/react";
import {getNavForUser} from "./permissions.js";
globalThis.React=React;
await import("./screens/usuarios.jsx");
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("permite salvar separadamente lançamento, conferência e Painel TV",async()=>{
 vi.stubGlobal("Icon",()=>null);
 const user={id:42,login:"fixture",ativo:true,admin:false,perm_manutencao_plantao:true,perm_conferencia_manutencao:false,perm_painel_tv:true};
 const updateUsuario=vi.fn().mockResolvedValue({usuario:user});
 vi.stubGlobal("RB_API",{listUsuarios:vi.fn().mockResolvedValue({usuarios:[user]}),updateUsuario});
 render(<window.GerenciarUsuarios/>);
 fireEvent.click(await screen.findByRole("button",{name:"Editar",exact:true}));
 expect(screen.getByRole("switch",{name:/plantão — lançar/}).getAttribute("aria-checked")).toBe("true");
 fireEvent.click(screen.getByRole("switch",{name:/plantão — conferir/}));
 fireEvent.click(screen.getByRole("switch",{name:"Painel TV"}));
 fireEvent.click(screen.getByRole("button",{name:"Salvar",exact:true}));
 await waitFor(()=>expect(updateUsuario).toHaveBeenCalledWith(42,expect.objectContaining({perm_manutencao_plantao:true,perm_conferencia_manutencao:true,perm_painel_tv:false})));
});
it("não herda acesso ao Painel TV do Status Carga",()=>{
 const nav=[{id:"painel-tv"},{id:"manutencao-plantao"},{id:"conferencia-manutencao"}];
 expect(getNavForUser(nav,{permissions:{"status-carga":true,"manutencao-plantao":true}})).toEqual([{id:"manutencao-plantao"}]);
});

// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,renderHook} from "@testing-library/react";
import {useExpenseDraft,readExpenseDraft,clearExpenseDraft} from "./expense-draft.js";
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
it("recupera campos e nota no mesmo usuário, sem misturar contas ou revisões",()=>{
  const user={id:42},record={id:"expense",version:1};
  const data={plate:"ABC1234",amount:"500,00",photos:{invoice:"data:image/png;base64,test"}};
  const hook=renderHook(()=>useExpenseDraft(user,"expense",record,data,true));
  hook.unmount();
  expect(readExpenseDraft(user,"expense",record)).toEqual(data);
  expect(readExpenseDraft({id:43},"expense",record)).toBeNull();
  expect(readExpenseDraft(user,"expense",{...record,version:2})).toBeNull();
  clearExpenseDraft(user,"expense",record);
  expect(readExpenseDraft(user,"expense",record)).toBeNull();
});
it("avisa quando o armazenamento falha e não recria rascunho após envio",()=>{
  vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});
  const hook=renderHook(()=>useExpenseDraft({id:42},"maintenance",null,{plate:"ABC1234"},true));
  expect(hook.result.current).toContain("Mantenha a tela aberta");
  hook.unmount();vi.restoreAllMocks();
  renderHook(()=>useExpenseDraft({id:42},"maintenance",null,{plate:"ABC1234"},false));
  expect(readExpenseDraft({id:42},"maintenance")).toBeNull();
});

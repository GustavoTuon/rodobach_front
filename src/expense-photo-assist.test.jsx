// @vitest-environment jsdom
import React from "react";
import {it,expect,vi,afterEach} from "vitest";
import {render,screen,fireEvent,cleanup,waitFor} from "@testing-library/react";
import Assist from "./expense-photo-assist.jsx";
vi.mock("./expense-ocr.js",()=>({createLocalOcrJob:()=>({cancel:vi.fn(),promise:Promise.resolve({suggestions:[{field:"supplier",label:"Fornecedor",value:"POSTO EXEMPLO"},{field:"location",label:"Cidade / local da nota",value:"CRICIUMA / SC"},{field:"amount",label:"Valor total",value:999}],warnings:[],text:"POSTO EXEMPLO"})})}));
afterEach(cleanup);
it("lê a foto ao anexar e preenche em lote sem sobrescrever campos existentes",async()=>{
 const apply=vi.fn(), onPhoto=vi.fn(), onBusy=vi.fn();
 render(<Assist photos={{}} knownPhotos={{}} photoKinds={["invoice"]} autoRead preparePhoto={vi.fn().mockResolvedValue("data:image/png;base64,new")} onPhoto={onPhoto} onBusy={onBusy} onApply={apply} values={{supplier:"Fornecedor manual"}}/>);
 fireEvent.change(screen.getByLabelText("Foto da nota ou comprovante — opcional"),{target:{files:[new File(["photo"],"nota.png",{type:"image/png"})]}});
 await screen.findByRole("button",{name:"Preencher campos vazios"});
 expect(onPhoto).toHaveBeenCalledWith("invoice","data:image/png;base64,new");
 expect(apply).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Preencher campos vazios"}));
 expect(apply.mock.calls).toEqual([["location","CRICIUMA / SC"],["amount",999]]);
 await waitFor(()=>expect(onBusy).toHaveBeenLastCalledWith(false));
});
it("na etapa de posto aplica somente sugestões escolhidas, sem substituir valores da despesa",async()=>{
 const apply=vi.fn();render(<Assist photos={{invoice:"data:image/png;base64,test"}} knownPhotos={{}} fuel photoKinds={["invoice"]} suggestionFields={["supplier","location"]} onApply={apply} values={{supplier:"Posto digitado",location:"Local manual"}}/>);
 fireEvent.click(screen.getByRole("button",{name:"Ler foto de Nota / comprovante"}));
 await screen.findByRole("button",{name:"Usar Fornecedor"});expect(apply).not.toHaveBeenCalled();
 expect(screen.queryByRole("button",{name:"Usar Valor total"})).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Usar Fornecedor"}));expect(apply).toHaveBeenLastCalledWith("supplier","POSTO EXEMPLO");
 fireEvent.click(screen.getByRole("button",{name:"Usar Cidade / local da nota"}));expect(apply).toHaveBeenLastCalledWith("location","CRICIUMA / SC");
});

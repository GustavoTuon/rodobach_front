// @vitest-environment jsdom
import React from "react";
import {it,expect,vi,afterEach} from "vitest";
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import Wizard from "./driver-expense-wizard.jsx";
import {sanitizeAmount} from "./maintenance-demo.jsx";
afterEach(()=>{cleanup();localStorage.clear();});
const fleet=["ABC1234","DEF4G56"];
const Dialog=({children})=><div>{children}</div>;
const FleetSelect=({value,onChange})=><label>Placa<input value={value} onChange={e=>onChange(e.target.value)}/></label>;
function mount(api,locationApi){localStorage.setItem("rodobach:expense-draft:v1:teste:expense:new",JSON.stringify({version:null,data:{plate:"ABC1234",expenseTrip:{trip:{company:"1",number:"880"}}}}));window.RB_API={getPlantaoOdometer:api,getPlantaoLocation:locationApi,listPlantaoUnloadingTrips:vi.fn(async()=>({trips:[{company:"1",number:"881"}]}))};render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);fireEvent.click(screen.getByRole("button",{name:/Abastecimento/}));fireEvent.change(screen.getByLabelText("Horário da nota"),{target:{value:"00:00:00"}});next();fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"ABC1234"}});}
function next(){fireEvent.click(screen.getByRole("button",{name:"Próximo passo"}));}
it("Outros pula KM e volta à placa sem exigir telemetria",()=>{
 const telemetry=vi.fn();window.RB_API={getPlantaoOdometer:telemetry};
 render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);
 fireEvent.click(screen.getByRole("button",{name:/Outros/}));next();
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"ABC1234"}});next();
 expect(screen.getByLabelText("Valor total da despesa (R$)")).toBeTruthy();
 expect(screen.queryByLabelText(/Hodômetro/)).toBeNull();
 expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("6");
 expect(telemetry).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));expect(screen.getByLabelText("Placa").value).toBe("ABC1234");
});
it("atalho de etapa permite corrigir a placa sem perder os valores",()=>{
 window.RB_API={};
 render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);
 fireEvent.click(screen.getByRole("button",{name:/Outros/}));next();
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"ABC1234"}});next();
 fireEvent.change(screen.getByLabelText("Valor total da despesa (R$)"),{target:{value:"123,45"}});next();
 fireEvent.click(screen.getByRole("button",{name:"Voltar para Veículo"}));
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});next();
 expect(screen.getByLabelText("Valor total da despesa (R$)").value).toBe("123,45");
});
it("abre a correção de horário quando o abastecimento não tem hora reconhecida",()=>{
 window.RB_API={};render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);
 fireEvent.click(screen.getByRole("button",{name:/Abastecimento/}));next();
 expect(screen.getByText("Ajustar horário da nota").closest("details").open).toBe(true);
 expect(screen.getByRole("alert").textContent).toContain("horário");
});
it("oferece leitura aberta na primeira etapa e mantém a nota ao seguir para manutenção",()=>{
 const onMaintenance=vi.fn();
 localStorage.setItem("rodobach:expense-draft:v1:teste:expense:new",JSON.stringify({version:null,data:{photos:{invoice:"data:image/png;base64,test"},amount:"150,00",supplier:"Posto teste"}}));
 window.RB_API={};
 render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount} onMaintenance={onMaintenance}/>);
 expect(screen.getByText("Começar pela nota fiscal").closest("details").open).toBe(true);
 fireEvent.click(screen.getByRole("button",{name:/Manutenção/}));next();
 expect(onMaintenance).toHaveBeenCalledWith(expect.objectContaining({photos:{invoice:"data:image/png;base64,test"},amount:"150,00",supplier:"Posto teste"}));
});
it("usa somente telemetria e remove as fotos de painel e bomba",async()=>{
 const api=vi.fn().mockResolvedValueOnce({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}).mockResolvedValueOnce({odometer:250000,source:"abastecimento",date:new Date().toISOString()});
 mount(api);expect(screen.queryByLabelText("Horário da nota")).toBeNull();expect(screen.queryByText("Ler data e horário da nota")).toBeNull();next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));
 expect(screen.getByLabelText("Hodômetro (km)").readOnly).toBe(true);
 expect(screen.queryByText("Foto do painel")).toBeNull();
 next();expect(screen.queryByText("Foto da bomba")).toBeNull();expect(screen.queryByText("Ler nota do abastecimento")).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));fireEvent.click(screen.getByRole("button",{name:"Voltar"}));
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});fireEvent.click(screen.getByRole("button",{name:/Selecionar viagem/}));fireEvent.click(await screen.findByRole("button",{name:/Viagem 881/}));next();
 await screen.findByText(/Sem leitura de telemetria/);
 expect(screen.getByLabelText("Hodômetro (km)").value).toBe("");next();expect(screen.getByRole("alert").textContent).toContain("telemetria");
});
it("consulta o dia da despesa e descarta resposta atrasada de outra placa",async()=>{
 let resolve;
 const api=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue({odometer:222222,source:"telemetria",date:"2025-01-02T12:00:00Z"});
 mount(api);
 fireEvent.change(screen.getByLabelText("Data da despesa"),{target:{value:"2025-01-02"}});
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});fireEvent.click(screen.getByRole("button",{name:/Selecionar viagem/}));fireEvent.click(await screen.findByRole("button",{name:/Viagem 881/}));next();
 await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("222222"));
 expect(api).toHaveBeenLastCalledWith("DEF4G56","2025-01-02","00:00:00");
 resolve({odometer:111111,source:"telemetria",date:new Date().toISOString()});
 await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("222222"));
});
it("falha na telemetria permite tentar novamente sem digitar km",async()=>{
 const api=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({odometer:197611.7,source:"telemetria",date:new Date().toISOString()});
 mount(api);next();await screen.findByText(/consultar a telemetria/);next();expect(screen.getByRole("alert").textContent).toContain("telemetria");
 fireEvent.click(screen.getByRole("button",{name:"Buscar km novamente"}));await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));
});

function toLocation(){next();fireEvent.change(screen.getByLabelText("Litros abastecidos"),{target:{value:"100"}});fireEvent.change(screen.getByLabelText("Valor total da despesa (R$)"),{target:{value:"650"}});next();}
it("exige nota ou justificativa antes da revisão",async()=>{
 mount(vi.fn().mockResolvedValue({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}));next();
 await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();fireEvent.change(screen.getByLabelText("Posto / fornecedor — obrigatório"),{target:{value:"Posto Teste"}});next();fireEvent.click(screen.getByLabelText("Sem documento fiscal",{exact:true}));next();
 expect(screen.getByRole("alert").textContent).toContain("justifique");
 fireEvent.change(screen.getByLabelText("Justificativa sem nota"),{target:{value:"Fornecedor nao emitiu a nota."}});next();
 expect(screen.getByRole("button",{name:"Enviar para conferência"})).toBeTruthy();
});
it("preserva KM salvo ao editar valores e consulta de novo se o horário mudar",async()=>{
 const api=vi.fn().mockResolvedValue({odometer:200000,source:"telemetria",date:"2026-09-30T15:00:00Z"});window.RB_API={getPlantaoOdometer:api};
 render(<Wizard record={{trip:{company:"1",number:"880"},id:"edit",version:1,service:"Abastecimento",plate:"ABC1234",expenseDate:"2026-09-30",expenseTime:"10:30:00",amount:500,liters:100,odometer:197611.7}} user={{id:42}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);
 next();next();expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7");expect(api).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));fireEvent.click(screen.getByRole("button",{name:"Voltar"}));fireEvent.change(screen.getByLabelText("Horário da nota"),{target:{value:"12:00:00"}});next();next();
 await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("200000"));
 expect(api).toHaveBeenLastCalledWith("ABC1234","2026-09-30","12:00:00");
});
it("preenche localização, preserva correção e usa nova posição ao trocar de placa",async()=>{
 const position=vi.fn().mockResolvedValueOnce({location:"Criciúma / SC — BR-101",city:"Criciúma / SC",address:"BR-101",date:new Date().toISOString()}).mockResolvedValueOnce({location:"Curitiba / PR",city:"Curitiba / PR",date:new Date().toISOString()});
 mount(vi.fn().mockResolvedValue({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}),position);next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 await waitFor(()=>expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Criciúma / SC — BR-101"));
 fireEvent.change(screen.getByLabelText("Cidade / local — opcional"),{target:{value:"Posto na rodovia"}});
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));next();expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Posto na rodovia");
 for(let i=0;i<3;i++)fireEvent.click(screen.getByRole("button",{name:"Voltar"}));
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});fireEvent.click(screen.getByRole("button",{name:/Selecionar viagem/}));fireEvent.click(await screen.findByRole("button",{name:/Viagem 881/}));next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 await waitFor(()=>expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Curitiba / PR"));
});
it("localização tardia não sobrescreve digitação manual",async()=>{
 let resolve;mount(vi.fn().mockResolvedValue({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}),vi.fn(()=>new Promise(r=>{resolve=r;})));next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 fireEvent.change(screen.getByLabelText("Cidade / local — opcional"),{target:{value:"Local informado"}});
 resolve({location:"Criciúma / SC",city:"Criciúma / SC",date:new Date().toISOString()});await screen.findByText("Criciúma / SC");expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Local informado");
});
it("despesa antiga mantém local manual e apresenta somente a referência",async()=>{
 mount(vi.fn().mockResolvedValue({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}),vi.fn().mockResolvedValue({location:"Criciúma / SC",city:"Criciúma / SC",date:new Date().toISOString()}));
 fireEvent.change(screen.getByLabelText("Data da despesa"),{target:{value:"2025-01-02"}});next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 await screen.findByText(/Esta posição pode ser posterior/);expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("");
});

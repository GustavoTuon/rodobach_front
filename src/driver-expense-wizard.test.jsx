// @vitest-environment jsdom
import React from "react";
import {it,expect,vi,afterEach} from "vitest";
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import Wizard from "./driver-expense-wizard.jsx";
import {sanitizeAmount} from "./maintenance-demo.jsx";
afterEach(cleanup);
const fleet=["ABC1234","DEF4G56"];
const Dialog=({children})=><div>{children}</div>;
const FleetSelect=({value,onChange})=><label>Placa<input value={value} onChange={e=>onChange(e.target.value)}/></label>;
function mount(api,locationApi){window.RB_API={getPlantaoOdometer:api,getPlantaoLocation:locationApi};render(<Wizard user={{login:"teste"}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);fireEvent.click(screen.getByRole("button",{name:/Abastecimento/}));next();fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"ABC1234"}});}
function next(){fireEvent.click(screen.getByRole("button",{name:"Próximo passo"}));}
it("preenche km, permite corrigir e troca a referência ao mudar de placa",async()=>{
 const api=vi.fn().mockResolvedValueOnce({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}).mockResolvedValueOnce({odometer:250000,source:"abastecimento",date:new Date().toISOString()});
 mount(api);next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));
 fireEvent.change(screen.getByLabelText("Hodômetro (km)"),{target:{value:"197620,1"}});
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});next();
 await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("250000"));
});
it("resposta atrasada não apaga o km digitado pelo motorista",async()=>{
 let resolve;mount(vi.fn(()=>new Promise(r=>{resolve=r;})));next();
 fireEvent.change(screen.getByLabelText("Hodômetro (km)"),{target:{value:"123456,7"}});
 resolve({odometer:197611.7,source:"telemetria",date:new Date().toISOString()});
 await screen.findByText(/Último km disponível/);
 expect(screen.getByLabelText("Hodômetro (km)").value).toBe("123456,7");
});
it("despesa antiga não recebe automaticamente km atual",async()=>{
 mount(vi.fn().mockResolvedValue({odometer:197611.7,source:"telemetria",date:new Date().toISOString()}));
 fireEvent.change(screen.getByLabelText("Data da despesa"),{target:{value:"2025-01-02"}});next();
 await screen.findByText(/Esta referência pode ser posterior/);
 expect(screen.getByLabelText("Hodômetro (km)").value).toBe("");
});

function toLocation(){next();fireEvent.change(screen.getByLabelText("Litros abastecidos"),{target:{value:"100"}});fireEvent.change(screen.getByLabelText("Valor total da despesa (R$)"),{target:{value:"650"}});next();}
it("preenche localização, preserva correção e usa nova posição ao trocar de placa",async()=>{
 const position=vi.fn().mockResolvedValueOnce({location:"Criciúma / SC — BR-101",city:"Criciúma / SC",address:"BR-101",date:new Date().toISOString()}).mockResolvedValueOnce({location:"Curitiba / PR",city:"Curitiba / PR",date:new Date().toISOString()});
 mount(vi.fn().mockResolvedValue({odometer:197611.7}),position);next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 await waitFor(()=>expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Criciúma / SC — BR-101"));
 fireEvent.change(screen.getByLabelText("Cidade / local — opcional"),{target:{value:"Posto na rodovia"}});
 fireEvent.click(screen.getByRole("button",{name:"Voltar"}));next();expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Posto na rodovia");
 for(let i=0;i<3;i++)fireEvent.click(screen.getByRole("button",{name:"Voltar"}));
 fireEvent.change(screen.getByLabelText("Placa"),{target:{value:"DEF4G56"}});next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 await waitFor(()=>expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Curitiba / PR"));
});
it("localização tardia não sobrescreve digitação manual",async()=>{
 let resolve;mount(vi.fn().mockResolvedValue({odometer:197611.7}),vi.fn(()=>new Promise(r=>{resolve=r;})));next();await waitFor(()=>expect(screen.getByLabelText("Hodômetro (km)").value).toBe("197611,7"));toLocation();
 fireEvent.change(screen.getByLabelText("Cidade / local — opcional"),{target:{value:"Local informado"}});
 resolve({location:"Criciúma / SC",city:"Criciúma / SC",date:new Date().toISOString()});await screen.findByText("Criciúma / SC");expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("Local informado");
});
it("despesa antiga mantém local manual e apresenta somente a referência",async()=>{
 mount(vi.fn().mockResolvedValue({odometer:197611.7}),vi.fn().mockResolvedValue({location:"Criciúma / SC",city:"Criciúma / SC",date:new Date().toISOString()}));
 fireEvent.change(screen.getByLabelText("Data da despesa"),{target:{value:"2025-01-02"}});next();fireEvent.change(screen.getByLabelText("Hodômetro (km)"),{target:{value:"123456"}});toLocation();
 await screen.findByText(/Esta posição pode ser posterior/);expect(screen.getByLabelText("Cidade / local — opcional").value).toBe("");
});

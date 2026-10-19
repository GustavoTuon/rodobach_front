// @vitest-environment jsdom
import React from "react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import ExpenseHistory,{expenseTotals} from "./expense-history.jsx";
import MaintenanceDemo from "./maintenance-demo.jsx";

const records=[
  {id:"a",plate:"ABC1234",service:"Abastecimento",amount:100.10,checked:false,expenseDate:"2026-10-10",date:"2026-10-10T12:00:00Z"},
  {id:"b",plate:"ABC1234",service:"Borracharia",amount:50.20,checked:true,expenseDate:"2026-10-09",date:"2026-10-09T12:00:00Z"},
  {id:"c",plate:"DEF4G56",service:"Outros",amount:20,checked:false,expenseDate:"2026-09-01",date:"2026-09-01T12:00:00Z"},
];
beforeEach(()=>{vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));});
afterEach(()=>{cleanup();vi.useRealTimers();delete window.RB_AUTH;delete window.RB_API;});
it("agrupa por placa com detalhes recolhidos e totais sem erro decimal",()=>{
  const {container}=render(<ExpenseHistory records={records} renderRecord={r=><p>Detalhe {r.id}</p>}/>);
  const groups=container.querySelectorAll(".mp-plate-group");
  expect(groups).toHaveLength(2);
  expect(groups[0].open).toBe(false);
  expect(groups[0].querySelector("summary").textContent).toContain("2 despesas");
  fireEvent.click(groups[0].querySelector("summary"));
  expect(groups[0].open).toBe(true);
  const detail=groups[0].querySelector(".mp-expense-detail");
  expect(detail.open).toBe(false);
  fireEvent.click(detail.querySelector("summary"));
  expect(detail.open).toBe(true);
  expect(expenseTotals(records)).toEqual({total:170.3,pending:120.1,checked:50.2,fuel:100.1,maintenance:50.2,other:20});
});
it("motorista vê o mês da placa atual e guarda as placas antigas no histórico",()=>{
  const {container,rerender}=render(<ExpenseHistory records={records} isDriver currentPlate="ABC1234" renderRecord={()=>null}/>);
  expect(screen.getByText("Sua placa atual · ABC1234")).toBeTruthy();
  expect(screen.getByText("outubro de 2026")).toBeTruthy();
  expect(container.querySelector(".mp-previous-plates").open).toBe(false);
  expect(container.querySelector(".mp-previous-plates summary").textContent).toContain("1 despesa(s)");
  rerender(<ExpenseHistory records={records} isDriver currentPlate="DEF4G56" renderRecord={()=>null}/>);
  expect(screen.getByText("Sua placa atual · DEF4G56")).toBeTruthy();
  expect(container.querySelector(".mp-previous-plates summary").textContent).toContain("2 despesa(s)");
});
it("tela começa no mês atual e resumo acompanha período, placa e situação",async()=>{
  window.RB_AUTH={getToken:()=>"test",me:vi.fn().mockResolvedValue({user:{id:42,login:"teste",permissions:{"manutencao-plantao":true}}})};
  window.RB_API={listVeiculosPlantao:vi.fn().mockResolvedValue({veiculos:[{placa:"ABC1234"}]}),listPlantao:vi.fn().mockResolvedValue({records})};
  const {container}=render(<MaintenanceDemo/>);
  await screen.findByRole("region",{name:"Resumo do período"});
  const summary=()=>within(screen.getByRole("region",{name:"Resumo do período"}));
  expect(screen.getByLabelText("De").value).toBe("2026-10-01");
  expect(screen.getByLabelText("Até").value).toBe("2026-10-18");
  expect(summary().getByText("R$ 150,30")).toBeTruthy();
  expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button",{name:"Todo o período"}));
  expect(summary().getByText("R$ 170,30")).toBeTruthy();
  expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(2);
  fireEvent.change(screen.getByPlaceholderText("Todas as placas"),{target:{value:"DEF"}});
  expect(summary().getByText(/1 despesa/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Conferidos",exact:true}));
  await waitFor(()=>expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(0));
  expect(summary().getByText(/0 despesa/)).toBeTruthy();
});

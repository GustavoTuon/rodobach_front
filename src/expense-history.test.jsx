// @vitest-environment jsdom
import React from "react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import ExpenseHistory,{expenseTotals} from "./expense-history.jsx";
import MaintenanceDemo from "./maintenance-demo.jsx";

const records=[
  {id:"a",plate:"ABC1234",service:"Abastecimento",amount:100.10,checked:false,expenseDate:"2026-10-10",date:"2026-10-10T12:00:00Z"},
  {id:"b",plate:"ABC1234",service:"Borracharia",amount:50.20,checked:true,posted:true,expenseDate:"2026-10-09",date:"2026-10-09T12:00:00Z"},
  {id:"c",plate:"DEF4G56",service:"Outros",amount:20,checked:false,posted:true,expenseDate:"2026-09-01",date:"2026-09-01T12:00:00Z"},
];
beforeEach(()=>{vi.useFakeTimers({toFake:["Date"]});vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));});
afterEach(()=>{cleanup();vi.useRealTimers();delete window.RB_AUTH;delete window.RB_API;});
it('conferência fica acessível sem abrir detalhes e respeita somente leitura',()=>{
  const review=vi.fn();
  const paid={...records[0],paid:true};
  const {rerender}=render(<ExpenseHistory records={[paid]} expandGroups onReview={review} renderRecord={()=>null}/>);
  expect(screen.getByText('Pago · conferência pendente')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Marcar como conferido'}));
  expect(review).toHaveBeenCalledWith(paid);
  rerender(<ExpenseHistory records={[paid]} expandGroups onReview={review} reviewDisabled renderRecord={()=>null}/>);
  expect(screen.getByRole('button',{name:'Marcar como conferido'}).disabled).toBe(true);
  rerender(<ExpenseHistory records={[{...paid,checked:true,checkedBy:'conferente'}]} expandGroups onReview={review} renderRecord={()=>null}/>);
  expect(screen.queryByRole('button',{name:'Marcar como conferido'})).toBeNull();
  expect(screen.getByText('Conferido por conferente')).toBeTruthy();
});
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
  expect(expenseTotals(records)).toEqual({total:170.3,pending:120.1,checked:50.2,fuel:100.1,maintenance:50.2,other:20,unloading:0});
  expect(expenseTotals([{service:'Descarga',amount:150,checked:false}])).toEqual({total:150,pending:150,checked:0,fuel:0,maintenance:0,other:0,unloading:150});
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
it("histórico pessoal começa completo e resumo acompanha período, placa e situação",async()=>{
  window.RB_AUTH={getToken:()=>"test",me:vi.fn().mockResolvedValue({user:{id:42,login:"teste",permissions:{"manutencao-plantao":true}}})};
  window.RB_API={listVeiculosPlantao:vi.fn().mockResolvedValue({veiculos:[{placa:"ABC1234"}]}),listPlantao:vi.fn().mockResolvedValue({records})};
  const {container}=render(<MaintenanceDemo/>);
  await screen.findByRole("region",{name:"Resumo do período"});
  const summary=()=>within(screen.getByRole("region",{name:"Resumo do período"}));
  expect(screen.getByLabelText("De").value).toBe("");
  expect(screen.getByLabelText("Até").value).toBe("");
  expect(summary().getByText("R$ 170,30")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Mês atual"}));
  expect(screen.getByLabelText("De").value).toBe("2026-10-01");
  expect(screen.getByLabelText("Até").value).toBe("2026-10-18");
  expect(summary().getByText("R$ 150,30")).toBeTruthy();
  expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button",{name:"Todo o período"}));
  expect(summary().getByText("R$ 170,30")).toBeTruthy();
  expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(2);
  fireEvent.change(screen.getByPlaceholderText("Todas as placas"),{target:{value:"DEF"}});
  expect(summary().getByText(/1 despesa/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Aguardando lançamento",exact:true}));
  await waitFor(()=>expect(container.querySelectorAll(".mp-plate-group")).toHaveLength(0));
  expect(summary().getByText(/0 despesa/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Mostrar todo o histórico"}));
  expect(container.querySelectorAll(".mp-expense-row")).toHaveLength(3);
});
it("filtros de pagamento distinguem despesas conferidas sem pagamento",async()=>{
  const paid={...records[0],paid:true,checked:false};
  window.RB_AUTH={getToken:()=>"test",me:vi.fn().mockResolvedValue({user:{id:42,login:"teste",permissions:{"manutencao-plantao":true}}})};
  window.RB_API={listVeiculosPlantao:vi.fn().mockResolvedValue({veiculos:[{placa:"ABC1234"}]}),listPlantao:vi.fn().mockResolvedValue({records:[paid,records[1]]})};
  const {container}=render(<MaintenanceDemo/>);
  await screen.findByRole("region",{name:"Resumo do período"});
  expect(expenseTotals([paid,records[1]])).toMatchObject({pending:100.1,checked:50.2});
  expect(screen.getByRole('button',{name:'Aguardando pagamento',exact:true}).textContent).toBe('Aguardando pagamento1');
  fireEvent.click(screen.getByRole('button',{name:'Aguardando pagamento',exact:true}));
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Aguardando lançamento',exact:true}));
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(1);
  expect(container.textContent).not.toContain('Pago, aguardando conferência');
});
it("filtra viagens por empresa e numero, incluindo descarga e registros sem vinculo",async()=>{
  const tripRecords=[{...records[0],trip:{company:'1',number:'871'}},{...records[1],unloading:{trip:{company:'2',number:'871'},cte:{company:'2',series:'O',code:'1300',customerName:'Cliente'},reimbursement:true}},records[2]];
  window.RB_AUTH={getToken:()=>"test",me:vi.fn().mockResolvedValue({user:{id:42,login:"teste",permissions:{"manutencao-plantao":true}}})};
  window.RB_API={listVeiculosPlantao:vi.fn().mockResolvedValue({veiculos:[{placa:"ABC1234"}]}),listPlantao:vi.fn().mockResolvedValue({records:tripRecords})};
  const {container}=render(<MaintenanceDemo/>);
  await screen.findByRole("region",{name:"Resumo do período"});
  const choose=label=>{fireEvent.click(screen.getByText('Todas as viagens',{selector:'summary'}));fireEvent.click(screen.getByRole('button',{name:label,exact:true}));};
  choose('Viagem 871 · Empresa 1');
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(1);
  expect(container.querySelector('.mp-expense-row').textContent).toContain('Abastecimento');
  fireEvent.click(container.querySelector('.mp-trip-filter summary'));
  fireEvent.click(screen.getByRole('button',{name:'Viagem 871 · Empresa 2',exact:true}));
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(1);
  expect(container.querySelector('.mp-expense-row').textContent).toContain('Borracharia');
  fireEvent.click(container.querySelector('.mp-trip-filter summary'));
  fireEvent.click(screen.getByRole('button',{name:'Sem viagem vinculada',exact:true}));
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(1);
  expect(container.querySelector('.mp-expense-row').textContent).toContain('Outros');
  fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));
  expect(container.querySelectorAll('.mp-expense-row')).toHaveLength(3);
});

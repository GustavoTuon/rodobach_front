// @vitest-environment jsdom
import React from "react";
import {it,expect,vi,afterEach} from "vitest";
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import ConsultaViagens, {tripStatus,CteAudit,TripIndicators} from "./consulta-viagens.jsx";
it('carrega indicadores sob demanda e alterna viagem e veículo',async()=>{
 window.RB_API={getConsultaViagemIndicadores:vi.fn().mockResolvedValue({
  viagem:{disponivel:true,receita:1000,custo:300,lucro:700,margem:70,componentes:[]},
  veiculo:{disponivel:true,receita:1000,custo:1200,lucro:-200,margem:-20,fixos:900,financiamentos:600,itens:[{data:'2026-09-10',conta:'Financiamento',valorOriginal:-3000,valor:-600,fixo:true,dias:6,diasMes:30}]},
 })};
 render(<TripIndicators trip={{empresa:1,numero:22,placa:'ABC1234',saida:'2026-09-25',chegada:'2026-09-30'}}/>);
 expect(window.RB_API.getConsultaViagemIndicadores).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Ver indicadores'}));
 await screen.findByText('Lucro / prejuízo');expect(window.RB_API.getConsultaViagemIndicadores).toHaveBeenCalledWith(1,22);
 fireEvent.click(screen.getByRole('tab',{name:'Veículo no período'}));
 expect(screen.getByText('A receita não cobriu os custos considerados.')).toBeTruthy();expect(screen.getByText('6/30 dias')).toBeTruthy();
});
it("prioriza pendências e permite consultar os vínculos conferidos",()=>{
 const audit={disponivel:true,inicio:'2026-09-01',fim:'2026-09-03',emitidos:2,vinculados:1,semVinculo:1,divergencias:0,pendencias:1,documentos:[
  {empresa:1,serie:1,codigo:1,numero:123,emissao:'2026-09-01',placa:'ABC1234',situacao:'sem_vinculo',vinculos:[]},
  {empresa:1,serie:1,codigo:2,numero:456,emissao:'2026-09-03',placa:'ABC1234',situacao:'vinculado',vinculos:[{empresa:1,numero:22}]},
 ]};
 render(<CteAudit audit={audit}/>);
 expect(screen.getByText('Possível faltante')).toBeTruthy();expect(screen.queryByText('456 / 1')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Ver todos os CT-es'}));expect(screen.getByText('456 / 1')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Ver só pendências'}));expect(screen.queryByText('456 / 1')).toBeNull();
});
it("falha de conferência não aparece como ausência de pendências",()=>{
 const retry=vi.fn();render(<CteAudit audit={{disponivel:false,mensagem:'Falha ao conferir'}} onRetry={retry}/>);
 expect(screen.getByRole('status').textContent).toBe('Falha ao conferir');expect(screen.queryByText('Sem divergências')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Conferir novamente'}));expect(retry).toHaveBeenCalledOnce();
});
it("exibe Finalizada com datas diferentes e preserva status quando faltam datas ou são iguais",()=>{
 expect(tripStatus({saida:"2026-09-30",chegada:"2026-10-01",status:"ABERTA"})).toBe("Finalizada");
 expect(tripStatus({saida:"2026-09-30",chegada:"2026-09-30",status:"ABERTA"})).toBe("ABERTA");
 expect(tripStatus({saida:"2026-09-30",chegada:null,status:"ABERTA"})).toBe("ABERTA");
 expect(tripStatus({saida:null,chegada:"2026-09-30",status:"ABERTA"})).toBe("ABERTA");
 expect(tripStatus({saida:"2026-09-30T10:00:00",chegada:"2026-09-30T18:00:00",status:"ABERTA"})).toBe("ABERTA");
});
afterEach(()=>{cleanup();delete window.RB_API;});
it("busca viagens, mostra detalhe e limpa os filtros",async()=>{
 const viagem={empresa:2,numero:868,placa:"ABC1234",motorista:"Motorista teste",saida:"2026-10-01",status:"ABERTA",fretes:100,despesas:null};
 window.RB_API={listConsultaViagens:vi.fn().mockResolvedValue({itens:[viagem],total:1,page:1,pageSize:30}),getConsultaViagem:vi.fn().mockResolvedValue({viagem,fretes:[{documento:123,cliente:"Cliente teste",valor:100}],despesas:[],abastecimentos:[]})};
 render(<ConsultaViagens/>);
 await screen.findByText("Cliente teste");
 expect(window.RB_API.getConsultaViagem).toHaveBeenCalledWith(2,868);
 fireEvent.click(screen.getByRole("tab",{name:/Despesas/}));
 expect(screen.getByText("Nenhuma despesa vinculada a esta viagem.")).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Número da viagem"),{target:{value:"868"}});
 fireEvent.change(screen.getByLabelText("Motorista"),{target:{value:"Juliana"}});
 fireEvent.click(screen.getByRole("button",{name:"Buscar viagens"}));
 await waitFor(()=>expect(window.RB_API.listConsultaViagens).toHaveBeenLastCalledWith(expect.objectContaining({numero:"868",motorista:"Juliana",page:1})));
 fireEvent.click(screen.getByRole("button",{name:"Limpar filtros"}));
 await waitFor(()=>expect(window.RB_API.listConsultaViagens).toHaveBeenLastCalledWith({numero:"",placa:"",motorista:"",inicio:"",fim:"",page:1}));
});
it("informa falhas e permite tentar novamente",async()=>{
 window.RB_API={listConsultaViagens:vi.fn().mockRejectedValueOnce(new Error("Falha na consulta")).mockResolvedValue({itens:[],total:0,page:1,pageSize:30})};
 render(<ConsultaViagens/>);await screen.findByRole("alert");fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
 expect(await screen.findByText("Nenhuma viagem encontrada. Ajuste os filtros.")).toBeTruthy();
});

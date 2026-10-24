// @vitest-environment jsdom
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import Insights,{productComparison,trendSegments} from "./purchases-insights.jsx";
import {purchasesApi} from "./purchases-api.js";
vi.mock("./purchases-api.js",()=>({purchasesApi:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const product={id:"p",nome:"Rolamento",codigo:"1864",empresa:"1",unidade:"UN",quantidade:20};
const row={id:"a",productId:"p",supplier:"Fornecedor A",price:8,quantity:20,unit:"UN",available:true};
const quote={id:"q",criado_em:"2026-10-01T12:00:00Z",titulo:"Compra teste",itens:[product,{...product,id:"p2",nome:"Filtro",codigo:"200"}],convites:[{id:"c",nome:"Fornecedor A",resposta:{itens:[{id:"p",valor:8,quantidade:20,disponivel:true}]}}]};
const series=[{month:"2026-09",minimum:8,maximum:12,purchase:10}];
const mockApi=()=>purchasesApi.mockImplementation(path=>Promise.resolve(path.endsWith('/historico')?[{produto_id:"p",fornecedor:"Compra anterior",data:"2026-09-01",valor_unitario:10,unidade:"UN"}]:path.includes('/tendencia')?{series}:quote));
it("separa preços válidos, parciais, recusados e unidades distintas",()=>{
 const result=productComparison(product,[row,{...row,id:"partial",price:7,quantity:5},{...row,id:"rejected",available:false,price:1},{...row,id:"box",unit:"CX",price:2},{...row,id:"zero",price:0}]);
 expect(result.minimum).toBe(7);
 expect(result.offers[0]).toMatchObject({id:"partial",partial:true,difference:0});
 expect(result.offers.find(r=>r.id==="a").difference).toBeCloseTo(14.2857,3);
 expect(result.offers.filter(r=>!r.comparable).every(r=>r.difference===null)).toBe(true);
 expect(productComparison(product,[]).minimum).toBeNull();
});
it("não conecta meses sem dados nem converte ausência em zero",()=>{
 expect(trendSegments([{minimum:2},{minimum:null},{minimum:4},{minimum:5}],"minimum",(v,i)=>[v,i])).toEqual([[[2,0]],[[4,2],[5,3]]]);
});
it("exibe propostas, última compra, variação e valores reais do gráfico",async()=>{
 mockApi();const open=vi.fn();render(<Insights quotes={[quote]} onOpen={open}/>);
 await screen.findAllByText("Compra anterior");
 expect(screen.getByText("-20%")).toBeTruthy();
 expect(within(screen.getByRole("region",{name:"Comparativo de fornecedores"})).getByText("Fornecedor A")).toBeTruthy();
 expect(screen.getByText("Preços desta cotação")).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Histórico ERP"}));
 expect(screen.getByText("Este produto já foi comprado nesta empresa.")).toBeTruthy();
 expect(screen.getByRole("region",{name:"Histórico de Rolamento"})).toBeTruthy();
 expect(screen.getByRole("img",{name:/Evolução mensal/})).toBeTruthy();
 fireEvent.click(screen.getByText("Abrir cotação →"));expect(open).toHaveBeenCalledWith("q");
 expect(purchasesApi).toHaveBeenCalledWith('/cotacoes/q/tendencia?produtoId=p');
});
it("troca de produto não reaproveita tendência atrasada do produto anterior",async()=>{
 let first;
 purchasesApi.mockImplementation(path=>path.endsWith('/historico')?Promise.resolve([]):path.includes('produtoId=p2')?Promise.resolve({series:[]}):path.includes('/tendencia')?new Promise(resolve=>{first=resolve;}):Promise.resolve(quote));
 render(<Insights quotes={[quote]} onOpen={vi.fn()}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Filtro/}));
 fireEvent.click(screen.getByRole("button",{name:"Histórico ERP"}));
 await screen.findByText(/Sem preços comparáveis/);
 await act(async()=>{first({series});});
 expect(screen.queryByRole("img",{name:/Evolução mensal/})).toBeNull();
 expect(screen.getByText(/Sem preços comparáveis/)).toBeTruthy();
});
it("consulta notas posteriores sem confundir total fiscal com unitário ou custo de estoque",async()=>{
 purchasesApi.mockImplementation(path=>Promise.resolve(path.includes('/historico') ? (path.includes('referencia=atual') ? [{produto_id:"p",documento:177581,serie:1,data:"2026-10-20",quantidade:2,valor_unitario:31.95,total_nota:65.83,total:80,desconto:0,frete:1.93,unidade:null}] : []) : path.includes('/tendencia') ? {series:[]} : quote));
 render(<Insights quotes={[quote]} onOpen={vi.fn()}/>);
 fireEvent.change(await screen.findByLabelText("Consultar compras e preços"),{target:{value:"atual"}});
 fireEvent.click(await screen.findByText("Ver detalhes +"));
 const invoice=await screen.findByRole("region",{name:"Nota fiscal da última compra"});
 expect(within(invoice).getByText(/65,83/)).toBeTruthy();
 expect(within(invoice).getByText(/31,95/)).toBeTruthy();
 expect(within(invoice).queryByText(/80,00/)).toBeNull();
 expect(within(invoice).getByText(/unidade não está identificada/)).toBeTruthy();
 expect(purchasesApi).toHaveBeenCalledWith('/cotacoes/q/tendencia?produtoId=p&referencia=atual');
});
it("mostra erro com nova tentativa sem apresentar preço histórico antigo",async()=>{
 mockApi();purchasesApi.mockImplementationOnce(()=>Promise.reject(new Error("Sem conexão")));
 render(<Insights quotes={[quote]} onOpen={vi.fn()}/>);
 await screen.findByRole("alert");fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
 await waitFor(()=>expect(screen.getAllByText("Compra anterior")).toBeTruthy());
});
it("mostra unitários e totais das compras em PC mesmo sem pontos comparáveis em UN",async()=>{
 const purchases=[{produto_id:"p",documento:3974,data:"2026-03-24",quantidade:1,valor_unitario:7.63,total_nota:7.63,unidade:"PC"},{produto_id:"p",documento:4235,data:"2026-06-24",quantidade:5,valor_unitario:7.854,total_nota:39.27,unidade:"PC"}];
 purchasesApi.mockImplementation(path=>Promise.resolve(path.includes('/historico') ? purchases : path.includes('/tendencia') ? {series:[]} : quote));
 render(<Insights quotes={[quote]} onOpen={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Histórico ERP'}));
 const recent=await screen.findByRole('region',{name:'Valores das últimas compras'});
 expect(within(recent).getByText(/39,27/)).toBeTruthy();
 expect(within(recent).getByText(/7,85/)).toBeTruthy();
 expect(recent.querySelector('article').textContent).toContain('4235');
 expect(screen.queryByText(/Sem preços comparáveis no ERP/)).toBeNull();
 expect(screen.getByText(/Sem pontos comparáveis/)).toBeTruthy();
});

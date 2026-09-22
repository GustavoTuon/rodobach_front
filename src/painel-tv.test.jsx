// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
globalThis.React=React;
await import('./screens/painel-tv.jsx');
beforeEach(()=>vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();delete window.RB_API;});
it('mostra correção somente para administrador fora do modo consulta',async()=>{
 window.RB_API={getPainelTv:vi.fn().mockResolvedValue({dia:'2026-09-16',atualizadoEm:new Date().toISOString(),confirmacoesDisponiveis:true,itens:[]})};
 const {rerender}=await act(async()=>render(React.createElement(window.PainelTv,{user:{admin:true,readOnly:false}})));
 expect(screen.getByRole('button',{name:'Corrigir carga'})).toBeTruthy();
 rerender(React.createElement(window.PainelTv,{user:{admin:true,readOnly:true}}));
 expect(screen.queryByRole('button',{name:'Corrigir carga'})).toBeNull();
 rerender(React.createElement(window.PainelTv,{user:{admin:false,readOnly:false}}));
 expect(screen.queryByRole('button',{name:'Corrigir carga'})).toBeNull();
});
it('diferencia visualmente veículo na base e mantém aviso de carregado sem SM',async()=>{
 const now=new Date();
 window.RB_API={getPainelTv:vi.fn().mockResolvedValue({dia:now.toISOString().slice(0,10),atualizadoEm:now.toISOString(),itens:[{placa:'RYU2G97',carga:{codigo:'carregado',label:'Carregado'},base:{situacao:'retornou',presenca:{naBase:true,observadoEm:now.toISOString()}},sm:{disponivel:true,id:null},kmHoje:{km:0}}]})};
 await act(async()=>render(React.createElement(window.PainelTv)));
 const card=screen.getByRole('article');
 expect(card.classList.contains('tv-at-base')).toBe(true);
 expect(card.classList.contains('tv-missing-sm')).toBe(true);
 expect(screen.getByText('Na base')).toBeTruthy();
});
it('mostra cartões, distingue km zero e falta de dados, pagina e atualiza sozinho',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-14T15:00:00Z'));
 const getPainelTv=vi.fn().mockResolvedValue({dia:'2026-09-14',atualizadoEm:'2026-09-14T15:00:00Z',itens:Array.from({length:10},(_,i)=>({placa:`ABC${i}`,carga:{codigo:'conferir',label:'Conferir carga',fonte:'Sem confirmação'},base:{situacao:'fora',horasFora:25},sm:{disponivel:true,id:null},kmHoje:{km:i===0?0:null},localizacao:'Cidade'}))});
 window.RB_API={getPainelTv};
 await act(async()=>render(React.createElement(window.PainelTv)));
 expect(screen.getAllByRole('article')).toHaveLength(9);
 expect(screen.getByText('0 km')).toBeTruthy();
 expect(screen.getByText('Página 1 de 2 · troca a cada 20s')).toBeTruthy();
 await act(async()=>{await vi.advanceTimersByTimeAsync(20000);});
 expect(screen.getByRole('article',{name:'Veículo ABC9'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Pausar troca de páginas'}));
 await act(async()=>{await vi.advanceTimersByTimeAsync(40000);});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Iniciar na TV'}));});
 expect(screen.getAllByRole('article')).toHaveLength(4);
 expect(screen.getByText(/4 veículos para caber na tela/)).toBeTruthy();
 fireEvent.keyDown(document,{key:'Escape'});
 expect(getPainelTv).toHaveBeenCalledTimes(2);
 expect(screen.getByRole('article',{name:'Veículo ABC9'})).toBeTruthy();
});

it('prioriza maior tempo vazio conhecido e permite voltar à ordem por placa',async()=>{
 const item=(placa,hours)=>({placa,carga:{codigo:'vazio',horasVazio:hours},base:{},sm:{},kmHoje:{},rota:{destino:'Santos / SP',previsaoFim:'2026-09-15T21:00:00Z'}});
 window.RB_API={getPainelTv:vi.fn().mockResolvedValue({dia:'2026-09-14',atualizadoEm:new Date().toISOString(),itens:[item('AAA1',null),item('BBB2',10),item('CCC3',50)]})};
 await act(async()=>render(React.createElement(window.PainelTv)));
 expect(screen.getAllByRole('article')[0].getAttribute('aria-label')).toBe('Veículo CCC3');
 expect(screen.getByText('Maior tempo vazio da frota ·')).toBeTruthy();
 expect(screen.getAllByText('Santos / SP')).toHaveLength(3);
 expect(screen.getAllByText('Fim previsto (SM):')).toHaveLength(3);
 fireEvent.change(screen.getByLabelText('Ordem dos veículos'),{target:{value:'placa'}});
 expect(screen.getAllByRole('article')[0].getAttribute('aria-label')).toBe('Veículo AAA1');
});

it('alerta carregado sem SM, ignora consulta indisponível e remove alerta ao receber SM',async()=>{
 const item=(placa,codigo,disponivel,id)=>({placa,carga:{codigo},base:{},sm:{disponivel,id},kmHoje:{}});
 const data={dia:'2026-09-14',atualizadoEm:new Date().toISOString(),itens:[item('AAA1','carregado',true,null),item('BBB2','carregado',false,null),item('CCC3','carregado',true,123),item('DDD4','vazio',true,null)]};
 const getPainelTv=vi.fn().mockResolvedValue(data);window.RB_API={getPainelTv};
 await act(async()=>render(React.createElement(window.PainelTv)));
 expect(screen.getAllByText('⚠ ATENÇÃO: CARREGADO SEM SM')).toHaveLength(1);
 expect(screen.getByRole('status').textContent).toContain('1 carregado sem SM');
 expect(screen.getByRole('article',{name:'Veículo AAA1'}).className).toContain('tv-missing-sm');
 expect(screen.getByRole('article',{name:'Veículo BBB2'}).className).not.toContain('tv-missing-sm');
 getPainelTv.mockResolvedValue({...data,itens:data.itens.map(i=>i.placa==='AAA1'?{...i,sm:{disponivel:true,id:456}}:i)});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Atualizar agora'}));});
 expect(screen.queryByText('⚠ ATENÇÃO: CARREGADO SEM SM')).toBeNull();
 expect(screen.queryByRole('status')).toBeNull();
});

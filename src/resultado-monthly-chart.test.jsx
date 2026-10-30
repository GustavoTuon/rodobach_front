// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import Chart,{monthRange,monthlySeries} from './resultado-monthly-chart.jsx';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const range={startDate:'2026-01-15',endDate:'2026-03-24'};
const rows=[{mes:'2026-01',receita:100,custo:40},{mes:'2026-03',receita:200,custo:250}];
it('preserva os limites do período e inclui meses sem movimento',()=>{
 expect(monthRange('2026-01',range)).toEqual({startDate:'2026-01-15',endDate:'2026-01-31'});
 expect(monthRange('2026-03',range)).toEqual({startDate:'2026-03-01',endDate:'2026-03-24'});
 expect(monthlySeries(rows,range).map(r=>[r.mes,r.receita])).toEqual([['2026-01',100],['2026-02',0],['2026-03',200]]);
});
it('mostra valores por foco e permite selecionar e limpar mês',()=>{
 const select=vi.fn(),clear=vi.fn();
 render(<Chart rows={rows} range={range} selected="2026-03" onSelect={select} onClear={clear}/>);
 const button=screen.getByRole('button',{name:/mar.*Filtrar mês/});
 fireEvent.focus(button);
 expect(screen.getByRole('tooltip').textContent).toMatch(/250,00/);
 expect(screen.getByRole('tooltip').textContent).toMatch(/-.*50,00/);
 fireEvent.click(button);expect(select).toHaveBeenCalledWith('2026-03');
 fireEvent.click(screen.getByText('Limpar mês selecionado'));expect(clear).toHaveBeenCalled();
});
it('filtra a API pelo mês e restaura o período sem perder os meses do gráfico',async()=>{
 window.React=React;window.Icon=()=>null;window.readSavedFilters=()=>({...range,placa:'all',period:'custom'});window.saveFilters=vi.fn();
 const fetch=vi.fn(async()=>({custos:{monthly:rows,profit:{summary:{},vehicles:[]}}}));
 window.RB_API={getCustosVeiculosFiltros:async()=>({veiculos:[]}),getResultadoVeiculos:fetch};
 await import('./screens/resultado-veiculos.jsx');
 render(React.createElement(window.ResultadoVeiculos));
 fireEvent.click(await screen.findByRole('button',{name:/mar.*Filtrar mês/}));
 await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({startDate:'2026-03-01',endDate:'2026-03-24'})));
 const clear=await screen.findByText('Limpar mês selecionado');
 expect(screen.getByRole('button',{name:/jan.*Filtrar mês/})).toBeTruthy();
 fireEvent.click(clear);
 await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining(range)));
});

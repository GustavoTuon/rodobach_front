// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {formatOutsideDuration,planDriverRest} from './screens/folgas-model.js';
globalThis.React=React;
await import('./screens/folgas-motoristas.jsx');
afterEach(()=>{cleanup();delete globalThis.RB_API;});
it('planeja 11 ou 35 horas sem multiplicar dias fora e preserva fuso e virada de mês',()=>{
 expect(planDriverRest('2026-09-30T18:00','daily').end).toBe('2026-10-01T08:00:00.000Z');
 expect(planDriverRest('2026-09-30T18:00','weekly').end).toBe('2026-10-02T08:00:00.000Z');
 expect(planDriverRest('2026-02-30T18:00','weekly')).toBeNull();
 expect(planDriverRest('','weekly')).toBeNull();
 expect(formatOutsideDuration(null)).toBe('Sem dados');
 expect(formatOutsideDuration(49.5)).toBe('2d 1h 30min');
});

it('prioriza maior tempo fora e mostra uma única ação por motorista antes dos detalhes',async()=>{
 globalThis.RB_API={listMotoristasFolgas:vi.fn().mockResolvedValue({total:2,resumo:{fora:2},itens:[{empresa:1,codigo:1,nome:'Ana',placa:'ABC1D23',status:'fora',horasFora:2,ciclos:[]},{empresa:1,codigo:2,nome:'Bruno',placa:'DEF4G56',status:'fora',horasFora:1344,ciclos:[]}]})};
 render(React.createElement(window.FolgasMotoristas));
 await screen.findByRole('button',{name:'Ver detalhes de Bruno'});
 expect(screen.getAllByRole('article').map(a=>a.getAttribute('aria-label'))).toEqual(['Bruno','Ana']);
 expect(screen.getByText('56 dias')).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Registrar uma folga já tirada'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Ver detalhes de Bruno'}));
 expect(screen.getByRole('button',{name:'Registrar uma folga já tirada'})).toBeTruthy();
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('dialog')).toBeNull();
});
it('remove macros e saldo presumido e exige fim de jornada informado no planejador',async()=>{
 const getJornadaMacros=vi.fn();
 globalThis.RB_API={getJornadaMacros,listMotoristasFolgas:vi.fn().mockResolvedValue({total:1,resumo:{fora:1},itens:[{empresa:1,codigo:1,nome:'Motorista exemplo',placa:'ABC1D23',status:'fora',horasFora:721.5,jornada:{saidaEm:'2026-08-01T12:00:00Z',telemetriaAte:'2026-08-31T13:30:00Z'},retroativo:{horasForaTotal:721.5,folgasUtilizadas:2},ciclos:[]}]})};
 render(React.createElement(window.FolgasMotoristas));
 fireEvent.click(await screen.findByRole('button',{name:'Ver detalhes de Motorista exemplo'}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Calcular horário de fim do descanso'}));
 expect(screen.queryByText('Tempo trabalhado pelas macros')).toBeNull();
 expect(getJornadaMacros).not.toHaveBeenCalled();
 expect(screen.queryByText('Saldo legal a apurar')).toBeNull();
 expect(screen.getByLabelText('Fim efetivo da jornada (Brasília)').value).toBe('');
 fireEvent.change(screen.getByLabelText('Fim efetivo da jornada (Brasília)'),{target:{value:'2026-09-14T18:00'}});
 expect(screen.getByText('Intervalo planejado: 35 horas contínuas')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Intervalo a planejar'),{target:{value:'daily'}});
 expect(screen.getByText('Intervalo planejado: 11 horas contínuas')).toBeTruthy();
});

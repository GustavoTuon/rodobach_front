// @vitest-environment jsdom
import React from 'react';
import {afterEach, beforeAll, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
beforeAll(async()=>{globalThis.React=React;globalThis.Icon=()=>null;await import('./multas-frota.jsx');});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const fine={dataInfracao:'2026-01-01',id:'1:2',empresa:1,codigo:2,auto:'AUTO123',placa:'ABC1D23',motorista:'João',infracaoDescricao:'Infração do sistema',gravidadeDescricao:'Grave',pontos:5,valorFinal:100,controle:{statusIndicacao:'pendente',statusMotorista:'em_aberto',descontadoMotorista:false}};
it('renders fines from the legacy API response',async()=>{
  window.RB_API={listMultasFrota:vi.fn().mockResolvedValue({multas:[fine],paginacao:{page:1,pageSize:10,total:1,totalPages:1}})};
  render(React.createElement(window.MultasFrota));
  fireEvent.click(await screen.findByRole('button',{name:/João/}));
  expect(screen.getByText('Infração do sistema')).toBeTruthy();
  expect(screen.getByText('1 multas · 1 motoristas')).toBeTruthy();
  expect(screen.queryByText('Nenhuma multa encontrada.')).toBeNull();
});
function mount(item=fine){window.RB_API={listMultasFrota:vi.fn().mockResolvedValue({filtroPeriodoSuportado:true,indicadoresFiltradosVersao:2,opcoesFiltros:{motoristas:["João"],placas:["ABC1D23"]},grupos:[{id:"driver-1",nome:"João",multas:[item],pontos:5,valorTotal:100,valorAberto:100,etapas:3,concluidas:0,progresso:0}],totalMultas:1,paginacao:{page:1,pageSize:40,total:1,totalPages:1}}),saveControleMultaFrota:vi.fn().mockResolvedValue({})};render(React.createElement(window.MultasFrota));}
it('shows ERP severity and points, and saves indication directly without a fine status option',async()=>{
  mount();fireEvent.click(await screen.findByRole('button',{name:/João/}));await screen.findByText('Grave');expect(screen.getByText('5 pontos')).toBeTruthy();expect(screen.queryByText('Status multa')).toBeNull();
  fireEvent.click(screen.getByLabelText('Indicação AUTO123'));expect(screen.getByRole('dialog')).toBeTruthy();fireEvent.change(screen.getByLabelText('Data da indicação'),{target:{value:'2026-11-06'}});fireEvent.click(screen.getByRole('button',{name:'Salvar indicação'}));
  await waitFor(()=>expect(window.RB_API.saveControleMultaFrota).toHaveBeenCalledWith(1,2,expect.objectContaining({statusIndicacao:'indicada',indicadoEm:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)})));
});
it('records driver deduction with date and locks ERP deductions',async()=>{
  mount();fireEvent.click(await screen.findByRole('button',{name:/João/}));const input=await screen.findByLabelText('Desconto do motorista AUTO123');fireEvent.click(input);
  await waitFor(()=>expect(window.RB_API.saveControleMultaFrota).toHaveBeenCalledWith(1,2,expect.objectContaining({descontadoMotorista:true,descontadoEm:expect.any(String)})));
  cleanup();mount({...fine,controle:{...fine.controle,descontoErp:true,descontadoMotorista:true}});
  fireEvent.click(await screen.findByRole('button',{name:/João/}));expect((await screen.findByLabelText('Desconto do motorista AUTO123')).disabled).toBe(true);
});

it('starts collapsed, changes grouping and sends group pagination',async()=>{
  mount();await screen.findByRole('button',{name:/João/});expect(screen.queryByText('Infração do sistema')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Por placa'}));
  await waitFor(()=>expect(window.RB_API.listMultasFrota).toHaveBeenLastCalledWith(expect.objectContaining({agrupar:'placa',page:1,pageSize:10})));
});
it('retains the indication modal and its date when saving fails',async()=>{
  mount();fireEvent.click(await screen.findByRole('button',{name:/João/}));
  window.RB_API.saveControleMultaFrota.mockRejectedValueOnce(new Error('Falha ao salvar'));
  fireEvent.click(screen.getByLabelText('Indicação AUTO123'));
  fireEvent.change(screen.getByLabelText('Data da indicação'),{target:{value:'2026-11-05'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar indicação'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Falha ao salvar');
  expect(screen.getByLabelText('Data da indicação').value).toBe('2026-11-05');
});

it('keeps autocomplete and infraction dates visible with the 2026 default',async()=>{
  mount();await screen.findByRole('button',{name:/João/});
  expect(screen.getByLabelText('Motorista').closest('details')).toBeNull();
  expect(screen.getByRole('combobox',{name:'Placa'})).toBeTruthy();
  fireEvent.focus(screen.getByLabelText('Motorista'));expect(screen.getByRole('option',{name:'João'})).toBeTruthy();fireEvent.keyDown(screen.getByLabelText('Motorista'),{key:'Escape'});
  fireEvent.focus(screen.getByLabelText('Placa'));expect(screen.getByRole('option',{name:'ABC1D23'})).toBeTruthy();fireEvent.keyDown(screen.getByLabelText('Placa'),{key:'Escape'});
  expect(screen.getByLabelText('Data da infração — de').value).toBe('2026-01-01');
  expect(screen.getByLabelText('Data da infração — até').value).toBe('');
  expect(window.RB_API.listMultasFrota).toHaveBeenCalledWith(expect.objectContaining({infracaoDe:'2026-01-01',infracaoAte:''}));
  fireEvent.change(screen.getByLabelText('Data da infração — até'),{target:{value:'2026-02-01'}});
  await waitFor(()=>expect(window.RB_API.listMultasFrota).toHaveBeenLastCalledWith(expect.objectContaining({infracaoAte:'2026-02-01'})));
});

it('shows authority, location and three independent completion indicators',async()=>{
  mount({...fine,local:'BR 101, KM 152',cidade:'Itapema',paga:true,dataPagamento:'2026-02-01',controle:{...fine.controle,orgaoAutuador:'PRF',statusIndicacao:'indicada',indicadoEm:'2026-01-20',descontadoMotorista:true,descontadoEm:'2026-02-02'}});
  fireEvent.click(await screen.findByRole('button',{name:/João/}));
  expect(screen.getByText('PRF')).toBeTruthy();expect(screen.getByText('BR 101, KM 152 · Itapema')).toBeTruthy();
  expect(screen.getByText('Já indicada')).toBeTruthy();expect(screen.getByText('Já paga')).toBeTruthy();expect(screen.getByText('Já descontada')).toBeTruthy();
});
it('does not mistake payment for indication or deduction and displays missing authority',async()=>{
  mount({...fine,paga:true});fireEvent.click(await screen.findByRole('button',{name:/João/}));
  expect(screen.getByText('Órgão não informado')).toBeTruthy();expect(screen.getByText('Local não informado')).toBeTruthy();
  expect(screen.getByText('Já paga')).toBeTruthy();expect(screen.queryByText('Já indicada')).toBeNull();expect(screen.queryByText('Já descontada')).toBeNull();
});

it('selects autocomplete suggestions using the mouse and keyboard',async()=>{
  mount();await screen.findByRole('button',{name:/João/});
  const driver=screen.getByLabelText('Motorista');fireEvent.focus(driver);
  fireEvent.change(driver,{target:{value:'joao'}});fireEvent.click(screen.getByRole('option',{name:'João'}));
  expect(driver.value).toBe('João');expect(driver.getAttribute('aria-expanded')).toBe('false');
  const plate=screen.getByLabelText('Placa');fireEvent.focus(plate);fireEvent.change(plate,{target:{value:'abc'}});
  expect(plate.value).toBe('ABC');fireEvent.keyDown(plate,{key:'ArrowDown'});fireEvent.keyDown(plate,{key:'Enter'});
  expect(plate.value).toBe('ABC1D23');expect(screen.queryByRole('listbox')).toBeNull();
  await waitFor(()=>expect(window.RB_API.listMultasFrota).toHaveBeenLastCalledWith(expect.objectContaining({motorista:'João',placa:'ABC1D23'})));
});

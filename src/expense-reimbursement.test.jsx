// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import ExpenseReimbursement from './expense-reimbursement.jsx';
import {downloadExpenseReport} from './expense-report.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

it('exige referência e data antes de registrar recebimento e salva somente o reembolso',async()=>{
  const save=vi.fn(async()=>true);
  render(<ExpenseReimbursement record={{unloading:{reimbursement:true,cte:{customerName:'Cliente ERP'}}}} onSave={save}/>);
  fireEvent.click(screen.getByRole('radio',{name:'Reembolso recebido'}));
  fireEvent.click(screen.getByRole('button',{name:'Salvar reembolso'}));
  expect(screen.getByRole('alert').textContent).toContain('documento');expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('CT-e / documento de cobrança'),{target:{value:'CT-e 1/1/123'}});
  fireEvent.change(screen.getByLabelText('Data do recebimento'),{target:{value:'2026-09-30'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar reembolso'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith({status:'recebido',customer:'Cliente ERP',document:'CT-e 1/1/123',receivedDate:'2026-09-30',note:''}));
});

it('busca documentos da viagem e preenche documento e cliente pelo teclado',async()=>{
  window.RB_API={listPlantaoUnloadingTrips:vi.fn(async()=>({ctes:[{company:'2',series:'1',code:'4762',customerName:'Cliente do ERP'}]}))};
  const save=vi.fn();
  render(<ExpenseReimbursement record={{id:'a',plate:'ABC1234',unloading:{reimbursement:true,trip:{company:'1',number:'883'}}}} onSave={save}/>);
  const input=screen.getByRole('combobox',{name:'CT-e / documento de cobrança'});
  fireEvent.focus(input);
  await screen.findByRole('option');
  expect(window.RB_API.listPlantaoUnloadingTrips).toHaveBeenCalledWith('ABC1234',{company:'1',number:'883'});
  fireEvent.change(input,{target:{value:'4762'}});
  fireEvent.keyDown(input,{key:'ArrowDown'});
  fireEvent.keyDown(input,{key:'Enter'});
  expect(input.value).toBe('CT-e 4762 · Série 1 · Empresa 2');
  expect(screen.getByLabelText('Cliente do reembolso').value).toBe('Cliente do ERP');
  expect(input.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(screen.getByRole('button',{name:'Salvar reembolso'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({document:'CT-e 4762 · Série 1 · Empresa 2',customer:'Cliente do ERP'})));
});

it('permite repetir a consulta ao ERP após falha',async()=>{
  window.RB_API={listPlantaoUnloadingTrips:vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ctes:[]})};
  render(<ExpenseReimbursement record={{id:'b',plate:'ABC1234',unloading:{reimbursement:true,trip:{company:'1',number:'883'}}}} onSave={vi.fn()}/>);
  fireEvent.focus(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('button',{name:'Tentar novamente'}));
  await screen.findByText('Nenhum documento encontrado. Você pode digitar outro documento de cobrança.');
  expect(window.RB_API.listPlantaoUnloadingTrips).toHaveBeenCalledTimes(2);
});

it('mostra falha no formulário e preserva os dados para tentar novamente',async()=>{
  const save=vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('Conexão indisponível')).mockResolvedValueOnce(true);
  render(<ExpenseReimbursement record={{id:'retry',reimbursement:{status:'a_cobrar',customer:'Cliente',document:'CT-e 7',note:'Teste',receivedDate:null}}} onSave={save}/>);
  const button=screen.getByRole('button',{name:'Salvar reembolso'});
  fireEvent.click(button);
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível salvar');
  fireEvent.click(button);
  expect((await screen.findByRole('alert')).textContent).toContain('Conexão indisponível');
  expect(screen.getByLabelText('CT-e / documento de cobrança').value).toBe('CT-e 7');
  fireEvent.click(button);
  await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
  expect(save).toHaveBeenCalledTimes(3);
});

it('prepara o download CSV e libera a URL após o clique',()=>{
  vi.useFakeTimers();
  const create=vi.fn(()=> 'blob:report'),revoke=vi.fn();
  vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:revoke});
  let filename;
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){filename=this.download;});
  downloadExpenseReport([{id:'1',amount:20,plate:'ABC1234'}]);
  expect(filename).toBe('despesas-filtradas.csv');
  expect(create.mock.calls[0][0].type).toBe('text/csv;charset=utf-8;');
  expect(document.querySelector('a')).toBeNull();
  vi.runAllTimers();expect(revoke).toHaveBeenCalledWith('blob:report');
});

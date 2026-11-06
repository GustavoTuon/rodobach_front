// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import ExpensePosting from './expense-posting.jsx';
afterEach(cleanup);
it('busca o documento financeiro e salva sem alterar pagamento ou conferência',async()=>{
  window.RB_API={searchPlantaoErpDocuments:vi.fn().mockResolvedValue({documents:[{number:'123',company:'1',series:'A',installment:'1',supplier:'Oficina',amount:100}]})};
  const save=vi.fn().mockResolvedValue(true),close=vi.fn();
  const record={id:'expense',version:2,plate:'ABC1234',amount:100,document:'NF-9',paid:true,checked:false};
  render(<ExpensePosting record={record} onSave={save} onClose={close}/>);
  fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
  fireEvent.click(await screen.findByRole('button',{name:/Documento 123/}));
  expect(screen.getByLabelText('Número do documento no financeiro').value).toBe('123');
  fireEvent.click(screen.getByLabelText('Lançamento confirmado no ERP'));
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  await waitFor(()=>expect(close).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith(record,'posted',true,{erpDocument:'123'});
});
it('preserva número manual e mantém diálogo aberto quando salvar falha',async()=>{
  const close=vi.fn();
  render(<ExpensePosting record={{amount:10,erpDocument:'456'}} onSave={vi.fn().mockResolvedValue(false)} onClose={close}/>);
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Número do documento no financeiro').value).toBe('456');
  expect(close).not.toHaveBeenCalled();
});

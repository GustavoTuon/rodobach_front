// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import ExpensePosting from './expense-posting.jsx';
afterEach(cleanup);
it('adiciona diesel e Arla em buscas distintas, soma, impede duplicação e permite remover',async()=>{
 const diesel={number:'100',company:'2',series:'1',installment:'1',supplierCode:'7',amount:2400};
 const arla={...diesel,number:'101',amount:254.59};
 window.RB_API={searchPlantaoErpDocuments:vi.fn().mockResolvedValueOnce({documents:[diesel]}).mockResolvedValue({documents:[arla]})};
 const save=vi.fn().mockResolvedValue(true);
 render(<ExpensePosting record={{plate:'RAA8G18',amount:2654.59}} onSave={save} onClose={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
 fireEvent.click(await screen.findByRole('button',{name:/Documento 100/}));
 expect(screen.getByRole('button',{name:/Documento 100/}).disabled).toBe(true);
 expect(screen.getByText(/Valores diferentes/).textContent).toContain('254,59');
 fireEvent.change(screen.getByLabelText('Buscar no financeiro'),{target:{value:'101'}});
 fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
 fireEvent.click(await screen.findByRole('button',{name:/Documento 101/}));
 expect(screen.getByText('Total confere com a despesa.')).toBeTruthy();
 expect(screen.getByLabelText('Documentos no financeiro').value).toBe('100, 101');
 fireEvent.click(screen.getByRole('button',{name:/Remover documento 101/}));
 expect(screen.getByText(/Valores diferentes/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Documento 101/}));
 fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.anything(),'posted',true,{erpDocuments:[
  {company:'2',series:'1',number:'100',installment:'1',supplierCode:'7'},
  {company:'2',series:'1',number:'101',installment:'1',supplierCode:'7'},
 ]}));
});
it('preserva referências antigas sem inventar valor ou identidade e reabre múltiplos vínculos',async()=>{
 const save=vi.fn().mockResolvedValue(true);
 const documents=[{legacy:true,number:'OLD'},{number:'100',company:'2',series:'1',installment:'1',supplierCode:'7',amount:100}];
 render(<ExpensePosting record={{amount:200,erpDocuments:documents}} onSave={save} onClose={vi.fn()}/>);
 expect(screen.getByText(/Há referência antiga sem valor/)).toBeTruthy();
 expect(screen.getByLabelText('Documentos no financeiro').value).toBe('OLD, 100');
 fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.anything(),'posted',false,{erpDocuments:[{legacy:true,number:'OLD'},{number:'100',company:'2',series:'1',installment:'1',supplierCode:'7'}]}));
});
it('informa a origem da placa e alerta divergências nos resultados',async()=>{
  window.RB_API={searchPlantaoErpDocuments:vi.fn().mockResolvedValue({documents:[
    {number:'527864',plate:'RAA8G18',amount:2654.59,plateSource:'invoice'},
    {number:'527865',plate:'RAA8G18',amount:100,plateSource:'financial',plateConflict:true,financialPlate:'RAA8G18',invoicePlate:'BBB1C23'},
  ]})};
  render(<ExpensePosting record={{plate:'RAA8G18',amount:2654.59}} onSave={vi.fn()} onClose={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
  expect(await screen.findByText('Placa identificada na nota de entrada')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Financeiro: RAA8G18; nota de entrada: BBB1C23');
  fireEvent.click(screen.getByRole('button',{name:/Documento 527864/}));
  expect(screen.getByLabelText('Documentos no financeiro').value).toBe('527864');
});
it('busca o documento financeiro e salva sem alterar pagamento ou conferência',async()=>{
  window.RB_API={searchPlantaoErpDocuments:vi.fn().mockResolvedValue({documents:[{number:'123',company:'1',series:'A',installment:'1',supplierCode:'7',supplier:'Oficina',amount:100}]})};
  const save=vi.fn().mockResolvedValue(true),close=vi.fn();
  const record={id:'expense',version:2,plate:'ABC1234',amount:100,document:'NF-9',paid:true,checked:false};
  render(<ExpensePosting record={record} onSave={save} onClose={close}/>);
  fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
  fireEvent.click(await screen.findByRole('button',{name:/Documento 123/}));
  expect(screen.getByLabelText('Documentos no financeiro').value).toBe('123');
  expect(screen.getByLabelText('Lançamento confirmado no ERP').checked).toBe(true);
  expect(screen.getByLabelText('Documentos no financeiro').readOnly).toBe(true);
  expect(window.RB_API.searchPlantaoErpDocuments).toHaveBeenCalledWith({q:'NF-9',plate:'ABC1234',series:''});
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  await waitFor(()=>expect(close).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith(record,'posted',true,{erpDocuments:[{number:'123',company:'1',series:'A',installment:'1',supplierCode:'7'}]});
});
it('preserva vínculo existente e mantém diálogo aberto quando salvar falha',async()=>{
  const close=vi.fn();
  render(<ExpensePosting record={{amount:10,erpDocument:'456'}} onSave={vi.fn().mockResolvedValue(false)} onClose={close}/>);
  fireEvent.click(screen.getByRole('button',{name:'Salvar lançamento'}));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Documentos no financeiro').value).toBe('456');
  expect(close).not.toHaveBeenCalled();
});

it('busca somente pela placa com serie opcional e descarta resposta de filtros antigos',async()=>{
 let resolve;
 window.RB_API={searchPlantaoErpDocuments:vi.fn().mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValue({documents:[]})};
 render(<ExpensePosting record={{plate:'ABC1234',amount:10}} onSave={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
 expect(window.RB_API.searchPlantaoErpDocuments).toHaveBeenCalledWith({q:'',plate:'ABC1234',series:''});
 fireEvent.change(screen.getByLabelText('Série — opcional'),{target:{value:'A'}});
 resolve({documents:[{number:'ANTIGO'}]});
 fireEvent.click(screen.getByRole('button',{name:'Buscar documentos'}));
 await screen.findByText(/Nenhum documento encontrado para esta placa/);
 expect(screen.queryByRole('button',{name:/Documento ANTIGO/})).toBeNull();
 expect(window.RB_API.searchPlantaoErpDocuments).toHaveBeenLastCalledWith({q:'',plate:'ABC1234',series:'A'});
});

// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import SupplierSelect from './expense-supplier-select.jsx';
import {supplierLabel} from './expense-supplier-origin.js';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
function Form(){const [value,setValue]=React.useState({nome:''});return <><SupplierSelect value={value} onChange={setValue}/><output data-testid="selection">{JSON.stringify(value)}</output></>;}
it('reutiliza fornecedor Norte sem transformar nome ou código ao selecionar e editar',async()=>{
  window.RB_API={searchFornecedoresManutencao:vi.fn().mockResolvedValue({fornecedores:[{nome:'Bolivar Chapa MG',codigo:null,empresa:null,origem:'norte'}]})};
  render(<Form/>);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'Bolivar Chapa MG'}});
  fireEvent.click(await screen.findByRole('option',{name:/Bolivar Chapa MG.*Cadastrado pela Norte/}));
  expect(screen.getByRole('combobox').value).toBe('Bolivar Chapa MG');
  expect(JSON.parse(screen.getByTestId('selection').textContent)).toMatchObject({codigo:null,empresa:null,nome:'Bolivar Chapa MG'});
  expect(screen.getByText(/O nome ficará disponível/)).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'Outro fornecedor'}});
  expect(JSON.parse(screen.getByTestId('selection').textContent)).toEqual({nome:'Outro fornecedor'});
});
it('distingue fornecedores homônimos e conserva o vínculo ERP',async()=>{
  window.RB_API={searchFornecedoresManutencao:vi.fn().mockResolvedValue({fornecedores:[{nome:'Bolivar Chapa MG',codigo:10,empresa:1,origem:'erp'},{nome:'Bolivar Chapa MG',codigo:null,empresa:null,origem:'norte'}]})};
  render(<Form/>);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'Bolivar'}});
  const erp=await screen.findByRole('option',{name:/Cadastrado pelo ERP/});
  expect(screen.getByRole('option',{name:/Cadastrado pela Norte/})).toBeTruthy();
  fireEvent.click(erp);
  expect(JSON.parse(screen.getByTestId('selection').textContent)).toMatchObject({codigo:10,empresa:1});
  expect(supplierLabel({supplier:'Bolivar Chapa MG',supplierCode:10,supplierCompany:1})).toBe('Bolivar Chapa MG (Cadastrado pelo ERP)');
  expect(supplierLabel({supplier:'Bolivar Chapa MG'})).toBe('Bolivar Chapa MG (Cadastrado pela Norte)');
});

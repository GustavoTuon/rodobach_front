// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PaymentMethodPicker from './payment-method-picker.jsx';
afterEach(cleanup);
const methods=[{company:'1',code:'1',name:'DEPÓSITO - INTER'},{company:'2',code:'1',name:'DEPÓSITO - INTER'},{company:'1',code:'2',name:'BOLETO - BANCO'}];
function mount(){const onChange=vi.fn();render(<><PaymentMethodPicker methods={methods} value="" onChange={onChange}/><button>Outra ação</button></>);fireEvent.click(screen.getByRole('button',{name:/Forma de pagamento Selecione/}));return onChange;}
it('keeps options open when the scrollbar takes focus without a related target',()=>{
 const change=mount();fireEvent.blur(screen.getByRole('combobox'),{relatedTarget:null});
 expect(screen.getByRole('listbox')).toBeTruthy();
 fireEvent.pointerDown(screen.getByRole('listbox'));
 fireEvent.blur(screen.getByRole('combobox'),{relatedTarget:screen.getByRole('button',{name:'Outra a\u00e7\u00e3o'})});
 expect(screen.getByRole('listbox')).toBeTruthy();fireEvent.pointerUp(document);
 fireEvent.click(screen.getByRole('option',{name:/BOLETO/}));
 expect(change).toHaveBeenCalledWith('1:2');expect(screen.queryByRole('listbox')).toBeNull();
});
it('matches partial words without accents and preserves company identity with keyboard selection',()=>{
 const change=mount();const search=screen.getByRole('combobox');
 fireEvent.change(search,{target:{value:'  inter dep 2 '}});
 expect(screen.getAllByRole('option')).toHaveLength(1);fireEvent.keyDown(search,{key:'Enter'});
 expect(change).toHaveBeenCalledWith('2:1');
});
it('closes on outside click, keyboard departure and Escape',()=>{
 mount();fireEvent.pointerDown(screen.getByRole('button',{name:'Outra ação'}));expect(screen.queryByRole('listbox')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Forma de pagamento Selecione/}));
 fireEvent.blur(screen.getByRole('combobox'),{relatedTarget:screen.getByRole('button',{name:'Outra ação'})});expect(screen.queryByRole('listbox')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Forma de pagamento Selecione/}));fireEvent.keyDown(screen.getByRole('combobox'),{key:'Escape'});expect(screen.queryByRole('listbox')).toBeNull();
});
it('does not select anything when search has no results',()=>{
 const change=mount();fireEvent.change(screen.getByRole('combobox'),{target:{value:'missing'}});fireEvent.keyDown(screen.getByRole('combobox'),{key:'Enter'});expect(change).not.toHaveBeenCalled();
});
it('finds Sicoob RB with spaces, hyphens or joined words',()=>{
 render(<PaymentMethodPicker methods={[{company:'1',code:'33',name:'DEPÓSITO - SICOOB-RB'},{company:'1',code:'32',name:'BOLETO BANCÁRIO - SICOOB RB'},{company:'1',code:'1',name:'DEPÓSITO - SICOOB'}]} value="" onChange={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/Forma de pagamento Selecione/}));
 for(const value of ['sicoob rb','sicoob-rb','sicoobrb','RB SICOOB','sicoob – rb']){
  fireEvent.change(screen.getByRole('combobox'),{target:{value}});expect(screen.getAllByRole('option')).toHaveLength(2);
 }
});
it('keeps the selector open while dragging the payment body scrollbar',()=>{
 render(<div className="mp-payment-entry-body" data-testid="body"><PaymentMethodPicker methods={methods} value="" onChange={()=>{}}/></div>);
 fireEvent.click(screen.getByRole('button',{name:/Forma de pagamento Selecione/}));
 fireEvent.pointerDown(screen.getByTestId('body'));
 fireEvent.blur(screen.getByRole('combobox'),{relatedTarget:document.body});
 fireEvent.pointerUp(document);
 expect(screen.getByRole('listbox')).toBeTruthy();
});

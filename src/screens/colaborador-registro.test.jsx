// @vitest-environment jsdom
import React from 'react';
import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import ColaboradorRegistro,{RECORD_TYPES,recordDescription} from './colaborador-registro.jsx';
beforeAll(()=>{globalThis.React=React;HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(cleanup);
const initial={id:'55926d25-6e7d-4c22-a36d-747c0402c18a',version:0,tipo:'advertencia_verbal',data:'2026-11-11',prazo:null,status:'pendente',descricao:'',responsavel:'Gestor',detalhes:{},anexos:[]};
function mount(override={},startStep=0){
 const save=vi.fn();
 function Harness(){const [form,setForm]=React.useState({...initial,...override});return <ColaboradorRegistro form={form} setForm={setForm} person={{nome:'Pessoa de teste'}} saving={false} error="" onSave={event=>{event.preventDefault();save({...form,descricao:recordDescription(form)});}} onClose={()=>{}} onAttach={()=>{}} startStep={startStep}/>;}
 render(<Harness/>);return save;
}
it.each(Object.entries(RECORD_TYPES))('shows only relevant fields after selecting %s', (key,config)=>{
 mount();fireEvent.click(screen.getByRole('button',{name:name=>name.includes(config.label)}));
 for(const [,label] of config.fields)expect(screen.getByLabelText(name=>name.startsWith(label))).toBeTruthy();
 if(key!=='celular')expect(screen.queryByLabelText(/IMEI \(15/)).toBeNull();
 if(!['acidente','avaria'].includes(key))expect(screen.queryByLabelText(/Valor estimado/)).toBeNull();
 if(key!=='ferias')expect(screen.queryByLabelText(/Início das férias/)).toBeNull();
 expect(screen.queryByLabelText(/Responsável/)).toBeNull();
 expect(screen.queryByLabelText(/Prazo para acompanhar/)).toBeNull();
});
it('requires occurrence description before advancing and retains it when going back',()=>{
 const save=mount();fireEvent.click(screen.getByRole('button',{name:/Acidente/}));
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));expect(screen.queryByRole('button',{name:'✓ Salvar registro'})).toBeNull();
 fireEvent.change(screen.getByLabelText('O que aconteceu?'),{target:{value:'Descrição do ocorrido'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));expect(screen.getByText('Descrição do ocorrido')).toBeTruthy();expect(save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Corrigir dados'}));expect(screen.getByLabelText('O que aconteceu?').value).toBe('Descrição do ocorrido');
});
it('saves vacation dates without requiring redundant description and blocks inverted return',()=>{
 const save=mount();fireEvent.click(screen.getByRole('button',{name:/Férias/}));
 fireEvent.change(screen.getByLabelText(/Início das férias/),{target:{value:'2026-12-01'}});
 fireEvent.change(screen.getByLabelText(/Último dia de férias/),{target:{value:'2026-12-30'}});
 fireEvent.change(screen.getByLabelText(/Retorno ao trabalho/),{target:{value:'2026-12-29'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));expect(screen.getByRole('alert').textContent).toContain('retorno');
 fireEvent.change(screen.getByLabelText(/Retorno ao trabalho/),{target:{value:'2026-12-31'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));fireEvent.click(screen.getByRole('button',{name:'✓ Salvar registro'}));
 expect(save).toHaveBeenCalledWith(expect.objectContaining({tipo:'ferias',descricao:'Férias de 01/12/2026 a 30/12/2026. Retorno em 31/12/2026.'}));
});
it('starts quick entry on the data step and keeps completion an explicit choice',()=>{
 const save=mount({tipo:'uniforme',detalhes:{quantidade:1}},1);
 fireEvent.change(screen.getByLabelText(/Peça entregue/),{target:{value:'Camisa'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));
 expect(screen.getByRole('button',{name:/Acompanhar Ainda/}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:/Concluído As ações/}));
 expect(screen.queryByLabelText(/Prazo para acompanhar/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'✓ Salvar registro'}));
 expect(save).toHaveBeenCalledWith(expect.objectContaining({status:'concluido',descricao:'Entrega de 1 × Camisa.'}));
});
it('changing category clears incompatible fields and edits preserve attachments',()=>{
 mount({tipo:'celular',version:2,descricao:'Entrega',detalhes:{item:'Aparelho',imei:'123456789012345'},anexos:[{nome:'recibo.pdf',data:'data:application/pdf;base64,JVBERi0='}]},1);
 expect(screen.getByLabelText(/IMEI \(15/).value).toBe('123456789012345');
 fireEvent.click(screen.getByRole('button',{name:'← Voltar'}));fireEvent.click(screen.getByRole('button',{name:/Uniforme/}));
 expect(screen.queryByLabelText(/IMEI \(15/)).toBeNull();expect(screen.getByLabelText(/Peça entregue/).value).toBe('');
 expect(within(screen.getByRole('dialog')).getByText('recibo.pdf')).toBeTruthy();
});

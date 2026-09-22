// @vitest-environment jsdom
import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {PainelCargaForm} from './screens/painel-carga-form.jsx';
afterEach(()=>{cleanup();delete window.RB_API;});
const items=[{placa:'AAA1B23',carga:{codigo:'carregado',label:'Carregado'},contextoCarga:'b'.repeat(64)},{placa:'RXO6C18',carga:{codigo:'conferir',label:'Conferir carga'},contextoCarga:'a'.repeat(64)}];
it('prioritizes uncertain vehicles, saves the operation context and refreshes the panel',async()=>{
 window.RB_API={getPainelCargaHistorico:vi.fn().mockResolvedValue({registros:[]}),savePainelCarga:vi.fn().mockResolvedValue({})};
 const onClose=vi.fn(),onSaved=vi.fn().mockResolvedValue();
 render(<PainelCargaForm items={items} onClose={onClose} onSaved={onSaved}/>);
 expect(screen.getByLabelText('Veículo').value).toBe('RXO6C18');
 fireEvent.change(screen.getByLabelText('Situação confirmada'),{target:{value:'vazio'}});
 fireEvent.change(screen.getByLabelText('Motivo / observação'),{target:{value:'Descarga confirmada pelo motorista'}});
 fireEvent.submit(screen.getByRole('button',{name:'Salvar confirmação'}).closest('form'));
 await waitFor(()=>expect(onClose).toHaveBeenCalled());
 expect(window.RB_API.savePainelCarga).toHaveBeenCalledWith(expect.objectContaining({placa:'RXO6C18',situacao:'vazio',contexto:'a'.repeat(64)}));
 expect(onSaved).toHaveBeenCalled();
});
it('keeps the form open with the error when the operation changed',async()=>{
 window.RB_API={getPainelCargaHistorico:vi.fn().mockResolvedValue({registros:[]}),savePainelCarga:vi.fn().mockRejectedValue(new Error('A operação mudou.'))};
 const onClose=vi.fn();render(<PainelCargaForm items={items} onClose={onClose} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Situação confirmada'),{target:{value:'carregado'}});
 fireEvent.submit(screen.getByRole('button',{name:'Salvar confirmação'}).closest('form'));
 expect(await screen.findByRole('alert')).toBeTruthy();expect(onClose).not.toHaveBeenCalled();
});

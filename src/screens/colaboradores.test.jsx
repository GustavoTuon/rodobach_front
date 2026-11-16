// @vitest-environment jsdom
import React from 'react';
import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
beforeAll(async()=>{globalThis.React=React;HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};await import('./colaboradores.jsx');});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const person={codigo:1,nome:'João Silva',empresa:1,cargo:'Motorista',ativo:true,cadastro_situacao:'S',resumo:{total:0,concluidos:0,pendentes:0,atrasados:0,ferias:0}};
function mount(user={login:'Gestor'}){window.RB_API={listColaboradores:vi.fn().mockResolvedValue({itens:[person],totalErp:2}),getColaborador:vi.fn().mockResolvedValue({colaborador:person,registros:[]}),saveColaboradorRegistro:vi.fn().mockResolvedValue({version:1})};render(<window.Colaboradores user={user}/>);}
it('starts with active employees and lets user select all',async()=>{
 mount();await screen.findByRole('button',{name:/João Silva/});expect(window.RB_API.listColaboradores).toHaveBeenCalledWith({situacao:'ativos',q:''});
 fireEvent.change(screen.getByLabelText('Situação'),{target:{value:'todos'}});await waitFor(()=>expect(window.RB_API.listColaboradores).toHaveBeenLastCalledWith({situacao:'todos',q:''}));
});
it('preserves draft on save failure, saves to selected employee, reloads history',async()=>{
 mount();fireEvent.click(await screen.findByRole('button',{name:/João Silva/}));fireEvent.click(await screen.findByRole('button',{name:'+ Novo registro'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:/Advertência verbal/}));
 fireEvent.change(screen.getByLabelText('Motivo da orientação'),{target:{value:'Entrega confirmada'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));
 window.RB_API.saveColaboradorRegistro.mockRejectedValueOnce(new Error('Falha ao salvar'));
 fireEvent.click(screen.getByRole('button',{name:'✓ Salvar registro'}));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByText('Entrega confirmada')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Corrigir dados'}));expect(screen.getByLabelText('Motivo da orientação').value).toBe('Entrega confirmada');
 fireEvent.click(screen.getByRole('button',{name:'Revisar registro →'}));
 fireEvent.click(screen.getByRole('button',{name:'✓ Salvar registro'}));await waitFor(()=>expect(window.RB_API.saveColaboradorRegistro).toHaveBeenLastCalledWith(1,expect.objectContaining({descricao:'Entrega confirmada',version:0})));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(window.RB_API.getColaborador).toHaveBeenCalledTimes(2);
});
it('read-only users cannot create records',async()=>{
 mount({readOnly:true});fireEvent.click(await screen.findByRole('button',{name:/João Silva/}));expect((await screen.findByRole('button',{name:'+ Novo registro'})).disabled).toBe(true);
});
it('shows empty and error states without fabricated progress',async()=>{
 mount();window.RB_API.listColaboradores.mockRejectedValueOnce(new Error('ERP indisponível'));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('ERP indisponível'));
 window.RB_API.listColaboradores.mockResolvedValueOnce({itens:[],totalErp:0});fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(await screen.findByText(/Nenhum colaborador encontrado/)).toBeTruthy();
});

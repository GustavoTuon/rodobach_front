// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within,waitFor} from '@testing-library/react';
import Fleet from './screens/bloco-notas.jsx';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
it('keeps saved tasks usable when the ERP is unreachable and recovers on refresh',async()=>{
 api();let rejectFleet;
 window.RB_API.noteFleet.mockReturnValueOnce(new Promise((resolve,reject)=>{rejectFleet=reject;}));
 window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:42,canEdit:true}]});
 render(<Fleet user={{id:42}}/>);
 // Saved tasks appear without waiting for the ERP connection timeout.
 fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 expect(screen.getByRole('button',{name:'Editar tarefa: Adesivo'})).toBeTruthy();
 rejectFleet(new Error('EHOSTUNREACH'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('consultar a frota no ERP'));
 expect(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
 expect(screen.getByRole('button',{name:/ABC1234/}).textContent).toContain('VOLVO FH');
});

it('loads the fleet even when tasks fail to refresh',async()=>{
 api();window.RB_API.noteTasks.mockRejectedValue(new Error('Falha nas tarefas'));
 render(<Fleet user={{id:42}}/>);
 expect(await screen.findByRole('button',{name:/ABC1234/})).toBeTruthy();
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('atualizar as tarefas'));
});
function api(){window.RB_API={
 noteFleet:vi.fn().mockResolvedValue({vehicles:[{plate:'ABC1234',model:'VOLVO FH',category:'carreta',implements:['DEF5678']},{plate:'GHI9012',model:'VW 24.280',category:'caminhao',implements:[]},{plate:'CAR1234',model:'VW Golf',category:'carro',implements:[]},{plate:'DEF5678',model:'RANDON',category:'implemento',implements:[]}]}),
 noteTasks:vi.fn().mockResolvedValue({tasks:[]}),listNotes:vi.fn().mockResolvedValue({notes:[]}),notePlates:vi.fn().mockResolvedValue({plates:[]}),
 createNoteTask:vi.fn(async b=>({tasks:b.plates.map(plate=>({id:b.id,title:b.title,plate,done:false,version:1,authorId:42,canEdit:true}))})),
 updateNoteTask:vi.fn(async(t,changes)=>({task:{...t,...changes,version:t.version+1}}))
};}
it('lança para várias placas e conclui cada uma separadamente',async()=>{
 api();render(<Fleet user={{id:42}}/>);
 await screen.findByRole('button',{name:/ABC1234/});
 fireEvent.click(screen.getByRole('button',{name:/Criar/}));fireEvent.click(screen.getByRole('button',{name:/Nova tarefa/}));
 fireEvent.change(screen.getByLabelText('O que precisa ser feito?'),{target:{value:'Trocar adesivo'}});
 fireEvent.click(screen.getByRole('button',{name:'Selecionar visíveis'}));
 fireEvent.click(screen.getByRole('button',{name:'Lançar para 2 placa(s)'}));
 await screen.findByText('Tarefa lançada para 2 veículo(s).');
 expect(window.RB_API.createNoteTask).toHaveBeenCalledWith(expect.objectContaining({plates:['ABC1234','GHI9012']}));
 fireEvent.click(screen.getByRole('button',{name:/ABC1234/}));
 let region=screen.getByRole('region',{name:'Tarefas de ABC1234'});
 fireEvent.click(within(region).getByRole('checkbox'));
 await waitFor(()=>expect(within(region).getByRole('checkbox').checked).toBe(true));
 fireEvent.click(screen.getByRole('button',{name:/GHI9012/}));
 region=screen.getByRole('region',{name:'Tarefas de GHI9012'});
 expect(within(region).getByRole('checkbox').checked).toBe(false);
 await waitFor(()=>expect(window.RB_API.listNotes).toHaveBeenCalledWith('','GHI9012'));
});
it('busca pelo modelo e preserva rascunhos ao trocar de veículo',async()=>{
 api();render(<Fleet user={{id:42}}/>);await screen.findByRole('button',{name:/ABC1234/});
 fireEvent.change(screen.getByLabelText('Buscar veículo'),{target:{value:'VOLVO'}});
 expect(screen.queryByRole('button',{name:/GHI9012/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/ABC1234/}));
 fireEvent.click(screen.getByRole('button',{name:/Criar/}));fireEvent.click(screen.getByRole('button',{name:/Nova anotação/}));
 fireEvent.change(screen.getByLabelText('Anotação'),{target:{value:'Conferir pneu'}});
 fireEvent.click(screen.getByRole('button',{name:/Todas as anotações/}));
 fireEvent.click(screen.getByRole('button',{name:/ABC1234/}));
 expect(screen.getByLabelText('Anotação').value).toBe('Conferir pneu');
 expect(screen.getByLabelText('Placa (opcional)').value).toBe('ABC1234');
});
it('falha ao concluir mantém a tarefa pendente e acesso de consulta bloqueia criação',async()=>{
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:42,canEdit:true}]});
 window.RB_API.updateNoteTask.mockRejectedValue(new Error('Sem conexão'));
 const view=render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 const region=screen.getByRole('region',{name:'Tarefas de ABC1234'});fireEvent.click(within(region).getByRole('checkbox'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Sem conexão');expect(within(region).getByRole('checkbox').checked).toBe(false);
 view.unmount();render(<Fleet user={{id:42,readOnly:true}}/>);await screen.findByRole('button',{name:/ABC1234/});
 expect(screen.getByRole('button',{name:/Criar/}).disabled).toBe(true);
});

it('oculta carros e implementos por padrão, permite filtrar e mostra modelo e progresso',async()=>{
 api();render(<Fleet user={{id:42}}/>);await screen.findByRole('button',{name:/ABC1234/});
 expect(screen.queryByRole('button',{name:/CAR1234/})).toBeNull();expect(screen.queryByRole('button',{name:/DEF5678/})).toBeNull();
 expect(screen.getByRole('checkbox',{name:'Caminhões'}).checked).toBe(true);expect(screen.getByRole('checkbox',{name:'Carretas'}).checked).toBe(true);
 fireEvent.click(screen.getByRole('checkbox',{name:'Carros'}));expect(screen.getByRole('button',{name:/CAR1234/}).textContent).toContain('VW Golf');
 fireEvent.click(screen.getByRole('button',{name:/ABC1234/}));expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
});
it('tarefas antigas de implementos aparecem no cavalo',async()=>{
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'old',plate:'DEF5678',title:'Revisar lona',done:false,version:1,authorId:42,canEdit:true}]});
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 expect(within(screen.getByRole('region',{name:'Tarefas de ABC1234'})).getByText('Revisar lona')).toBeTruthy();
 expect(screen.queryByRole('button',{name:/DEF5678/})).toBeNull();
});

it('edita a descrição só na placa escolhida e permite cancelar',async()=>{
 api();const task={id:'t',plate:'ABC1234',title:'Adesivo',done:true,version:1,authorId:42,canEdit:true};
 window.RB_API.noteTasks.mockResolvedValue({tasks:[task,{...task,plate:'GHI9012'}]});
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 fireEvent.click(screen.getByRole('button',{name:'Editar tarefa: Adesivo'}));
 fireEvent.change(screen.getByLabelText('Descrição da tarefa'),{target:{value:'Revisar freios'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
 await screen.findByText('Tarefa atualizada.');
 expect(window.RB_API.updateNoteTask).toHaveBeenCalledWith(task,{title:'Revisar freios'});
 expect(within(screen.getByRole('region',{name:'Tarefas de ABC1234'})).getByRole('checkbox').checked).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:/GHI9012/}));
 fireEvent.click(screen.getByRole('button',{name:'Editar tarefa: Adesivo'}));
 fireEvent.change(screen.getByLabelText('Descrição da tarefa'),{target:{value:'Outro texto'}});
 fireEvent.click(within(screen.getByRole('form',{name:'Editar tarefa'})).getByRole('button',{name:'Cancelar'}));
 expect(screen.getByRole('button',{name:'Editar tarefa: Adesivo'})).toBeTruthy();
 expect(window.RB_API.updateNoteTask).toHaveBeenCalledTimes(1);
});
it('mostra tarefas compartilhadas sem permitir alteração por outro autor',async()=>{
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:77,canEdit:false}]});
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 const region=screen.getByRole('region',{name:'Tarefas de ABC1234'});
 expect(within(region).getByText('Adesivo')).toBeTruthy();expect(within(region).getByRole('checkbox').disabled).toBe(true);
 expect(screen.queryByRole('button',{name:'Editar tarefa: Adesivo'})).toBeNull();
});
it('preserva texto digitado quando a edição falha',async()=>{
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:42,canEdit:true}]});
 window.RB_API.updateNoteTask.mockRejectedValue(new Error('Sem conex?o'));
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 fireEvent.click(screen.getByRole('button',{name:'Editar tarefa: Adesivo'}));
 fireEvent.change(screen.getByLabelText('Descrição da tarefa'),{target:{value:'Revisar freios'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
 await screen.findByText('Sem conex?o');expect(screen.getByLabelText('Descrição da tarefa').value).toBe('Revisar freios');
});

it('confirms deletion, removes only selected plate and allows cancel',async()=>{
 api();const task={id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:42,canEdit:true};
 window.RB_API.noteTasks.mockResolvedValue({tasks:[task,{...task,plate:'GHI9012'}]});
 window.RB_API.deleteNoteTask=vi.fn().mockResolvedValue({ok:true});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 fireEvent.click(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'}));expect(window.RB_API.deleteNoteTask).not.toHaveBeenCalled();
 confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeNull());
 expect(window.RB_API.deleteNoteTask).toHaveBeenCalledWith(task);expect(confirm).toHaveBeenCalledWith(expect.stringContaining('ABC1234'));
 fireEvent.click(screen.getByRole('button',{name:/GHI9012/}));expect(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeTruthy();
});
it('failed deletion keeps task and read-only users cannot delete',async()=>{
 api();const task={id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1,authorId:42,canEdit:true};
 window.RB_API.noteTasks.mockResolvedValue({tasks:[task]});window.RB_API.deleteNoteTask=vi.fn().mockRejectedValue(new Error('Sem conexao'));
 vi.spyOn(window,'confirm').mockReturnValue(true);
 const view=render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 fireEvent.click(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'}));await screen.findByText('Sem conexao');
 expect(screen.getByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeTruthy();
 view.rerender(<Fleet user={{id:42,readOnly:true}}/>);expect(screen.queryByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeNull();
 view.rerender(<Fleet user={{id:77}}/>);
 window.RB_API.noteTasks.mockResolvedValue({tasks:[{...task,canEdit:false}]});
 fireEvent.click(screen.getByRole('button',{name:'Atualizar'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Excluir tarefa: Adesivo'})).toBeNull());
});

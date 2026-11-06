// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within,waitFor} from '@testing-library/react';
import Fleet from './screens/bloco-notas.jsx';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
function api(){window.RB_API={
 noteFleet:vi.fn().mockResolvedValue({vehicles:[{plate:'ABC1234',model:'VOLVO FH',category:'carreta',implements:['DEF5678']},{plate:'GHI9012',model:'VW 24.280',category:'caminhao',implements:[]},{plate:'CAR1234',model:'VW Golf',category:'carro',implements:[]},{plate:'DEF5678',model:'RANDON',category:'implemento',implements:[]}]}),
 noteTasks:vi.fn().mockResolvedValue({tasks:[]}),listNotes:vi.fn().mockResolvedValue({notes:[]}),notePlates:vi.fn().mockResolvedValue({plates:[]}),
 createNoteTask:vi.fn(async b=>({tasks:b.plates.map(plate=>({id:b.id,title:b.title,plate,done:false,version:1}))})),
 updateNoteTask:vi.fn(async(t,done)=>({task:{...t,done,version:t.version+1}}))
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
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'t',plate:'ABC1234',title:'Adesivo',done:false,version:1}]});
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
 api();window.RB_API.noteTasks.mockResolvedValue({tasks:[{id:'old',plate:'DEF5678',title:'Revisar lona',done:false,version:1}]});
 render(<Fleet user={{id:42}}/>);fireEvent.click(await screen.findByRole('button',{name:/ABC1234/}));
 expect(within(screen.getByRole('region',{name:'Tarefas de ABC1234'})).getByText('Revisar lona')).toBeTruthy();
 expect(screen.queryByRole('button',{name:/DEF5678/})).toBeNull();
});

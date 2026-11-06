// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import Notes,{readNoteDraft} from './screens/note-editor.jsx';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
const user={id:42};
function api(){window.RB_API={listNotes:vi.fn().mockResolvedValue({notes:[],hasMore:false}),notePlates:vi.fn().mockResolvedValue({plates:['ABC1234']}),saveNote:vi.fn(async note=>({note:{...note,version:1,updatedAt:'2026-11-05T15:00:00Z'}}))};}
it('salva título ou placa com texto e confirma sincronização apenas após resposta',async()=>{
 api();render(<Notes user={user}/>);fireEvent.click(screen.getByRole('button',{name:/Nova anotação/}));
 fireEvent.change(screen.getByLabelText('Placa (opcional)'),{target:{value:'abc1234'}});
 fireEvent.change(screen.getByLabelText('Anotação'),{target:{value:'Verificar os pneus'}});
 expect(readNoteDraft('rodobach:notes:draft:42').text).toBe('Verificar os pneus');
 fireEvent.click(screen.getByRole('button',{name:'Salvar anotação'}));
 expect(await screen.findByText(/Salvo no sistema/)).toBeTruthy();
 expect(window.RB_API.saveNote).toHaveBeenCalledWith(expect.objectContaining({plate:'ABC1234',text:'Verificar os pneus',version:0}));
 expect(localStorage.getItem('rodobach:notes:draft:42')).toBeNull();
});
it('falha de rede mantém o texto e recupera rascunho somente do mesmo usuário',async()=>{
 api();window.RB_API.saveNote.mockRejectedValue(new Error('Sem conexão'));
 const rendered=render(<Notes user={user}/>);fireEvent.click(screen.getByRole('button',{name:/Nova anotação/}));
 fireEvent.change(screen.getByLabelText('Título'),{target:{value:'Lembrete'}});fireEvent.change(screen.getByLabelText('Anotação'),{target:{value:'Ligar para oficina'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar anotação'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Sem conexão');
 rendered.unmount();render(<Notes user={user}/>);expect(screen.getByLabelText('Anotação').value).toBe('Ligar para oficina');
 expect(readNoteDraft('rodobach:notes:draft:77')).toBeNull();
});
it('conflito oferece cópia sem perder a anotação local',async()=>{
 api();window.RB_API.saveNote.mockRejectedValue(Object.assign(new Error('Alterada em outro aparelho'),{status:409}));
 localStorage.setItem('rodobach:notes:draft:42',JSON.stringify({id:'old',title:'Minha nota',plate:'',text:'Texto local',version:1}));
 render(<Notes user={user}/>);fireEvent.click(screen.getByRole('button',{name:'Salvar anotação'}));
 fireEvent.click(await screen.findByRole('button',{name:'Manter texto como nova nota'}));
 expect(screen.getByLabelText('Anotação').value).toBe('Texto local');
 await waitFor(()=>expect(readNoteDraft('rodobach:notes:draft:42').version).toBe(0));
});

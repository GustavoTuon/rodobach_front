// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import ExpenseTirePicker from './expense-tire-picker.jsx';
afterEach(cleanup);
const tire={code:'123',company:'1',plate:'ABC1234',positionName:'Dianteiro direito',brand:'Marca',size:'295/80'};
it('busca e seleciona pneu da placa pela identidade, exibindo confirmação',async()=>{
 window.RB_API={listPlantaoTires:vi.fn().mockResolvedValue({tires:[tire]})};
 const change=vi.fn();
 const {rerender}=render(<ExpenseTirePicker plate="ABC1234" value={null} number="" onChange={change}/>);
 fireEvent.change(await screen.findByLabelText('Encontrar pneu'),{target:{value:'direito'}});
 fireEvent.click(screen.getByRole('button',{name:/123/}));
 expect(change).toHaveBeenCalledWith(tire,'123');
 expect(window.RB_API.listPlantaoTires).toHaveBeenCalledWith('ABC1234');
 rerender(<ExpenseTirePicker plate="ABC1234" value={tire} number="123" onChange={change}/>);
 expect(screen.getByRole('status').textContent).toContain('Pneu 123 vinculado');
 fireEvent.click(screen.getByRole('button',{name:'Remover vínculo'}));
 expect(change).toHaveBeenLastCalledWith(null,'');
});
it('falha de consulta permite tentar novamente e digitar número sem inventar vínculo',async()=>{
 window.RB_API={listPlantaoTires:vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({tires:[]})};
 const change=vi.fn();render(<ExpenseTirePicker plate="ABC1234" value={null} number="" onChange={change}/>);
 await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Tentar carregar pneus novamente'}));
 await screen.findByText(/Nenhum pneu cadastrado/);
 fireEvent.click(screen.getByRole('button',{name:'Não encontrei o pneu / informar número'}));
 fireEvent.change(screen.getByLabelText('Número de fogo do pneu — opcional'),{target:{value:'456'}});
 expect(change).toHaveBeenCalledWith(null,'456');
});
it('resposta atrasada da placa anterior não substitui os pneus da nova placa',async()=>{
 let first;window.RB_API={listPlantaoTires:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{first=resolve;})).mockResolvedValue({tires:[{...tire,code:'789',plate:'DEF4G56'}]})};
 const props={value:null,number:'',onChange:vi.fn()};
 const {rerender}=render(<ExpenseTirePicker {...props} plate="ABC1234"/>);
 rerender(<ExpenseTirePicker {...props} plate="DEF4G56"/>);
 await screen.findByRole('button',{name:/789/});first({tires:[tire]});
 await waitFor(()=>expect(screen.queryByRole('button',{name:/123/})).toBeNull());
});

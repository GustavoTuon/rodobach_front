// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {useExpenseDuplicateWarning} from './expense-duplicate-warning.jsx';
afterEach(cleanup);
const match={id:'old',plate:'ABC1234',amount:100,supplier:'Oficina',service:'Mecânica',document:'NF-1',createdAt:'2026-11-16T12:00:00Z'};
function Form({save}){const notice=useExpenseDuplicateWarning();return <><button onClick={async()=>{const body={plate:'ABC1234',amount:100,supplier:'Oficina'};if(await notice.check(body,'editing-id'))save(body);}}>Salvar</button>{notice.warning}</>;}
it('avisa antes de salvar, permite revisar e libera gravação após continuar',async()=>{
  const save=vi.fn();window.RB_API={checkPlantaoDuplicates:vi.fn().mockResolvedValue({matches:[match]})};
  render(<Form save={save}/>);fireEvent.click(screen.getByText('Salvar'));
  await screen.findByRole('alert');expect(save).not.toHaveBeenCalled();
  expect(screen.getByText(/NF-1/)).toBeTruthy();fireEvent.click(screen.getByText('Voltar e revisar'));
  expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Salvar'));
  await screen.findByRole('alert');fireEvent.click(screen.getByText('Lançar mesmo assim'));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({acknowledgeRecentDuplicate:true})));
  expect(window.RB_API.checkPlantaoDuplicates).toHaveBeenCalledWith({plate:'ABC1234',amount:100,supplier:'Oficina',excludeId:'editing-id'});
});
it('consulta sem coincidência segue normalmente e falha de consulta permite continuar',async()=>{
  const save=vi.fn();window.RB_API={checkPlantaoDuplicates:vi.fn().mockResolvedValueOnce({matches:[]}).mockRejectedValueOnce(new Error('offline'))};
  render(<Form save={save}/>);fireEvent.click(screen.getByText('Salvar'));await waitFor(()=>expect(save).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText('Salvar'));await screen.findByText('Não foi possível verificar despesas recentes');
  fireEvent.click(screen.getByText('Lançar mesmo assim'));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
});

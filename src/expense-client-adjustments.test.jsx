// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import ExpenseUnloading from './expense-unloading.jsx';
import Wizard from './driver-expense-wizard.jsx';
import {sanitizeAmount} from './maintenance-demo.jsx';
afterEach(()=>{cleanup();localStorage.clear();});
it('vínculo opcional seleciona e remove viagem sem CT-e ou reembolso',async()=>{
 const trip={company:'1',number:'880',plate:'ABC1234'};
 window.RB_API={listPlantaoUnloadingTrips:vi.fn(async()=>({trips:[trip],ctes:[]}))};
 const onChange=vi.fn();const {rerender}=render(<ExpenseUnloading plate="ABC1234" value={null} onChange={onChange} tripOnly/>);
 fireEvent.click(screen.getByRole('button',{name:/Selecionar viagem/}));fireEvent.click(await screen.findByRole('button',{name:/Viagem 880/}));
 expect(onChange).toHaveBeenCalledWith(expect.objectContaining({trip}));
 rerender(<ExpenseUnloading plate="ABC1234" value={{trip}} onChange={onChange} tripOnly/>);
 await waitFor(()=>expect(window.RB_API.listPlantaoUnloadingTrips).toHaveBeenLastCalledWith('ABC1234',{company:'1',number:'880',tripOnly:true}));
 expect(screen.queryByText('CT-e E CLIENTE')).toBeNull();expect(screen.queryByText('Haverá reembolso da descarga?')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Remover vínculo da viagem'}));expect(onChange).toHaveBeenLastCalledWith(null);
});
it('sem viagem exige fornecedor e número da NFS antes de enviar',async()=>{
 window.RB_API={listPlantaoUnloadingTrips:vi.fn().mockResolvedValue({trips:[]}),createPlantao:vi.fn(async body=>({record:body}))};
 const fleet=['ABC1234'];const saved=vi.fn();
 render(<Wizard user={{id:1}} fleet={fleet} Dialog={({children})=><div>{children}</div>} FleetSelect={({value,onChange})=><label>Placa<input value={value} onChange={e=>onChange(e.target.value)}/></label>} sanitizeAmount={sanitizeAmount} onSaved={saved}/>);
 const next=()=>fireEvent.click(screen.getByRole('button',{name:'Próximo passo'}));
 fireEvent.click(screen.getByRole('button',{name:/Outros/}));next();fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});next();
 fireEvent.change(screen.getByLabelText('Valor total da despesa (R$)'),{target:{value:'100'}});next();next();
 expect(screen.getByRole('alert').textContent).toContain('fornecedor');
 fireEvent.change(screen.getByLabelText('Fornecedor — obrigatório'),{target:{value:'Prestador manual'}});next();
 fireEvent.click(screen.getByLabelText("Nota fiscal de serviço",{exact:true}));
 fireEvent.change(screen.getByLabelText('Justificativa sem nota'),{target:{value:'Nota guardada no arquivo físico.'}});
 fireEvent.change(screen.getByLabelText('Descreva a despesa'),{target:{value:'Serviço eventual'}});next();
 expect(screen.getByRole('alert').textContent).toContain('número da nota');expect(window.RB_API.createPlantao).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText(/Número da nota/),{target:{value:'123'}});next();fireEvent.click(screen.getByRole('button',{name:'Enviar para conferência'}));
 await waitFor(()=>expect(saved).toHaveBeenCalled());expect(window.RB_API.createPlantao).toHaveBeenCalledWith(expect.objectContaining({supplier:'Prestador manual',documentType:'nf_servico',document:'123',trip:null}));
});

// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import Wizard from './driver-expense-wizard.jsx';
import {sanitizeAmount} from './maintenance-demo.jsx';
const trip={company:'1',number:'880',plate:'ABC1234',departure:'2026-10-25'};
const cte={company:'2',series:'1',code:'4736',number:'4736',customerName:'Cliente ERP'};
const Dialog=({children})=><div>{children}</div>;
const FleetSelect=({value,onChange})=><label>Placa<input value={value} onChange={e=>onChange(e.target.value)}/></label>;
const fleet=['ABC1234','DEF4G56'];
const next=()=>fireEvent.click(screen.getByRole('button',{name:'Próximo passo'}));
afterEach(()=>{cleanup();localStorage.clear();});
function setup(record) {
  const onSaved=vi.fn();
  window.RB_API={
    listPlantaoUnloadingTrips:vi.fn(async (_plate,params)=>params.company ? {trip,ctes:[cte]} : {trips:[trip]}),
    createPlantao:vi.fn(async body=>({record:{id:'saved',...body}})),
  };
  render(<Wizard record={record} user={{id:1,login:'teste'}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount} onSaved={onSaved}/>);
  if(!record) fireEvent.click(screen.getByRole('button',{name:/Descarga/}));
  next();
  return onSaved;
}
async function link() {
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});
  fireEvent.click(screen.getByRole('button',{name:/Selecionar viagem/}));
  fireEvent.click(await screen.findByRole('button',{name:/Viagem 880/}));
  fireEvent.click(await screen.findByRole('button',{name:/4736.*Cliente ERP/}));
}
it('envia descarga com viagem e CT-e do ERP e reembolso explicitamente não',async()=>{
  const saved=setup();
  await link();
  next();expect(screen.getByRole('alert').textContent).toContain('reembolso');
  fireEvent.click(screen.getByRole('button',{name:/Não haverá reembolso/}));
  next();
  expect(screen.queryByLabelText('Hodômetro (km)')).toBeNull();
  fireEvent.change(screen.getByLabelText('Valor total da despesa (R$)'),{target:{value:'150,00'}});
  next();expect(screen.getByText('Cliente ERP')).toBeTruthy();next();
  fireEvent.change(screen.getByLabelText('Justificativa sem nota'),{target:{value:'Serviço de chapa sem emissão de nota.'}});
  fireEvent.change(screen.getByLabelText('Descreva os custos da descarga'),{target:{value:'Chapa para descarga'}});
  next();expect(screen.getByText('Reembolso da descarga')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Enviar para conferência'}));
  await waitFor(()=>expect(saved).toHaveBeenCalled());
  expect(window.RB_API.createPlantao).toHaveBeenCalledWith(expect.objectContaining({service:'Descarga',amount:150,
    unloading:{trip:{company:'1',number:'880'},cte:{company:'2',series:'1',code:'4736'},reimbursement:false}}));
});
it('trocar placa limpa viagem, CT-e e reembolso; trocar viagem limpa CT-e',async()=>{
  setup();await link();
  fireEvent.click(screen.getByRole('button',{name:'Trocar viagem'}));
  expect(screen.queryByText('Cliente ERP')).toBeNull();
  await screen.findByRole('button',{name:/Viagem 880/});
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'DEF4G56'}});
  expect(screen.getByRole('button',{name:/Selecionar CT-e/}).disabled).toBe(true);
  expect(screen.getByRole('button',{name:/Não haverá reembolso/}).getAttribute('aria-pressed')).toBe('false');
  next();expect(screen.getByRole('alert').textContent).toContain('Selecione a viagem');
});
it('recupera os vínculos e reembolso não ao editar uma descarga',async()=>{
  setup({id:'existing',version:1,service:'Descarga',plate:'ABC1234',expenseDate:'2026-10-25',amount:150,unloading:{trip,cte,reimbursement:false}});
  expect(screen.getByText(/CT-e 4736/)).toBeTruthy();
  expect(screen.getByRole('button',{name:/Não haverá reembolso/}).getAttribute('aria-pressed')).toBe('true');
  next();expect(screen.getByLabelText('Valor total da despesa (R$)').value).toBe('150,00');
});
it('falha do ERP oferece nova tentativa sem inventar opções',async()=>{
  setup();window.RB_API.listPlantaoUnloadingTrips.mockRejectedValueOnce(new Error('offline'));
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});
  await screen.findByText(/Não foi possível consultar o ERP/);
  fireEvent.click(screen.getByRole('button',{name:/Selecionar viagem/}));
  expect(screen.queryByRole('button',{name:/Viagem 880/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  await screen.findByRole('button',{name:/Viagem 880/});
});

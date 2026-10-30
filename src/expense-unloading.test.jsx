// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import Wizard from './driver-expense-wizard.jsx';
import ExpenseUnloading from './expense-unloading.jsx';
import {sanitizeAmount} from './maintenance-demo.jsx';
const trip={company:'1',number:'880',plate:'ABC1234',departure:'2026-10-25'};
const cte={company:'2',series:'1',code:'4736',number:'4736',customerName:'Cliente ERP'};
const Dialog=({children})=><div>{children}</div>;
const FleetSelect=({value,onChange})=><label>Placa<input value={value} onChange={e=>onChange(e.target.value)}/></label>;
const fleet=['ABC1234','DEF4G56'];
const next=()=>fireEvent.click(screen.getByRole('button',{name:'Próximo passo'}));

it('viagem obrigatoria permite trocar mas nao remover o vinculo',()=>{
 window.RB_API={listPlantaoUnloadingTrips:vi.fn(async()=>({trips:[trip]}))};
 render(<ExpenseUnloading plate="ABC1234" value={{trip}} onChange={vi.fn()} tripOnly required/>);
 expect(screen.getByText('Viagem da despesa — obrigatória')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Trocar viagem'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Remover vínculo da viagem'})).toBeNull();
});

it('abastecimento bloqueia proxima etapa sem viagem',()=>{
 window.RB_API={};
 render(<Wizard user={{id:1}} fleet={fleet} Dialog={Dialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}/>);
 fireEvent.click(screen.getByRole('button',{name:/Abastecimento/}));
 fireEvent.change(screen.getByLabelText('Horário da nota'),{target:{value:'00:00:00'}});next();
 fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});next();
 expect(screen.getByRole('alert').textContent).toContain('Vincule uma viagem');
});
afterEach(()=>{cleanup();localStorage.clear();});
function setup(record,documents=[cte]) {
  const onSaved=vi.fn();
  window.RB_API={
    listPlantaoUnloadingTrips:vi.fn(async (_plate,params)=>params.company ? {trip,ctes:documents} : {trips:[trip]}),
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
  next();expect(screen.queryByText('Cliente ERP')).toBeNull();fireEvent.change(screen.getByLabelText('Fornecedor — obrigatório'),{target:{value:'Chapa Teste'}});next();fireEvent.click(screen.getByLabelText("Sem documento fiscal",{exact:true}));
  fireEvent.change(screen.getByLabelText('Justificativa sem nota'),{target:{value:'Serviço de chapa sem emissão de nota.'}});
  fireEvent.change(screen.getByLabelText('Descreva os custos da descarga'),{target:{value:'Chapa para descarga'}});
  next();expect(screen.getByText('Reembolso da descarga')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Informar dados para pagamento via PIX'));
  fireEvent.click(screen.getByRole('button',{name:'Enviar para conferência'}));
  expect(screen.getByRole('alert').textContent).toContain('titular');
  expect(window.RB_API.createPlantao).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Nome do titular da conta'),{target:{value:' Titular Teste '}});
  fireEvent.change(screen.getByLabelText('Chave PIX'),{target:{value:' teste@example.com '}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar para conferência'}));
  await waitFor(()=>expect(saved).toHaveBeenCalled());
  expect(window.RB_API.createPlantao).toHaveBeenCalledWith(expect.objectContaining({service:'Descarga',amount:150,supplier:'Chapa Teste',paymentDetails:{holderName:'Titular Teste',pixKey:'teste@example.com'},
    unloading:{trip:{company:'1',number:'880'},cte:{company:'2',series:'1',code:'4736'},reimbursement:false}}));
});
it('distingue orçamento de CT-e com mesmo número e busca pelo itinerário',async()=>{
  const budget={...cte,series:'O',type:'Orçamento',originCity:'Morro da Fumaça',originState:'SC',destinationCity:'São Paulo',destinationState:'SP'};
  setup(undefined,[cte,budget]);
  fireEvent.change(screen.getByLabelText('Placa'),{target:{value:'ABC1234'}});
  fireEvent.click(screen.getByRole('button',{name:/Selecionar viagem/}));
  fireEvent.click(await screen.findByRole('button',{name:/Viagem 880/}));
  expect(await screen.findByRole('button',{name:/CT-e 4736/})).toBeTruthy();
  expect(screen.getByRole('button',{name:/Orçamento 4736.*Morro da Fumaça - SC → São Paulo - SP/})).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Buscar documento, cliente ou itinerário'),{target:{value:'morro da fumaca'}});
  expect(screen.queryByRole('button',{name:/CT-e 4736/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Orçamento 4736/}));
  expect(screen.getByText('Orçamento 4736 · Série O · Empresa 2')).toBeTruthy();
  expect(screen.getByText('Morro da Fumaça - SC → São Paulo - SP')).toBeTruthy();
  expect(screen.queryByText(/CT-e 4736/)).toBeNull();
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

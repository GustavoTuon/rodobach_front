// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {buildItinerary,itineraryHtml,volumesSummary} from '../carga-itinerary.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('sugere cadastro existente, soma itens repetidos e preserva o formulário em falha',async()=>{
  window.React=React;window.Icon=()=>null;
  const item={id:'42',description:'Máquina de cartão'};
  const save=vi.fn(async()=>item);
  window.RB_API={listItineraryExtras:vi.fn(async()=>[item]),saveItineraryExtra:save,getViagemV2:vi.fn(async()=>({id:1,cargas:[{id:1}]})),getCargaV2:vi.fn(async()=>load)};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByText('Entrega · Entrega final');
  for(let index=0;index<2;index++){
    fireEvent.click(screen.getByText('Adicionar volume extra'));
    fireEvent.change(screen.getByLabelText('Descrição do volume extra'),{target:{value:' MAQUINA   de cartao '}});
    expect(screen.getByText('✓ Item já cadastrado. Vamos reutilizar este nome.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Máquina de cartão'}));
    fireEvent.click(screen.getByText('Incluir extra'));
    await waitFor(()=>expect(screen.queryByText('Incluir extra')).toBeNull());
  }
  expect(screen.getAllByLabelText('Remover extra Máquina de cartão')).toHaveLength(1);
  expect(screen.getByText('Extra: Máquina de cartão · 2 volume(s)')).toBeTruthy();
  save.mockRejectedValueOnce(new Error('Sem conexão'));
  fireEvent.click(screen.getByText('Adicionar volume extra'));
  fireEvent.change(screen.getByLabelText('Descrição do volume extra'),{target:{value:'Envelope'}});
  fireEvent.click(screen.getByText('Incluir extra'));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Descrição do volume extra').value).toBe('Envelope');
  expect(screen.queryByText('Extra: Envelope · 1 volume(s)')).toBeNull();
});
it('abre fora do rodapé da viagem e fecha sem fechar os detalhes',async()=>{
  window.React=React;window.Icon=()=>null;
  const trip={id:1,numero:'V-1',cargas:[{id:1,documentos:[]}]};
  window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),getViagemV2:vi.fn(async()=>trip),getCargaV2:vi.fn(async()=>({id:1,paradas:[]}))};
  const closeTrip=vi.fn();
  const {Cv2TripDetails}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2TripDetails viagem={trip} onClose={closeTrip} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  const dialog=screen.getByText('Itinerário de conferência').closest('[role="dialog"]');
  expect(dialog.parentElement.parentElement).toBe(document.body);
  expect(dialog.closest('.cv2-modal-actions')).toBeNull();
  fireEvent.mouseDown(dialog.parentElement);
  expect(screen.queryByText('Itinerário de conferência')).toBeNull();
  expect(screen.getByText('Viagem V-1')).toBeTruthy();
  expect(closeTrip).not.toHaveBeenCalled();
});
const load={id:1,codigo:'C-1',cliente:'Coleta',clienteFinal:'Entrega final',origem:'Origem',destino:'Destino',volumes:23,valorCliente:9999,material:'Caixas',observacoes:'Frete R$ 9999',paradas:[{tipo:'entrega',cliente:'Entrega parcial',volumes:10,endereco:'Rua A',nf:'123'}]};
it('duplica volumes da carga e permite editar volumes da entrega antes de salvar',async()=>{
  window.React=React;window.Icon=()=>null;
  const save=vi.fn(async()=>({id:2}));
  window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),createCargaV2:save};
  const {Cv2CargaForm}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2CargaForm duplicateFrom={load} onClose={()=>{}} onSaved={()=>{}} />);
  expect(screen.getByLabelText('Quantidade de volumes').value).toBe('23');
  expect(screen.getByLabelText('Volumes da parada 1').value).toBe('10');
  fireEvent.change(screen.getByLabelText('Quantidade de volumes'),{target:{value:'30'}});
  fireEvent.change(screen.getByLabelText('Volumes da parada 1'),{target:{value:'12'}});
  await screen.findByRole('option',{name:'Responsavel ERP'}); fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:'1:1'}});
  fireEvent.click(screen.getByText('Cadastrar carga'));
  await waitFor(()=>expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({volumes:'30',paradas:[{volumes:'12'}]});
});
it('distribui total nas entregas sem duplicar; preserva pendências e não expõe valores financeiros',()=>{
  const stops=buildItinerary([load]);
  expect(stops.map(stop=>stop.volumes)).toEqual([23,10,13]);
  const html=itineraryHtml({numero:'V-1',valorMotorista:500,chavePix:'pix-secreto'},[load],stops);
  expect(html).toContain('Rua A');expect(html).toContain('13');
  expect(html).not.toContain('9999');expect(html).not.toContain('pix-secreto');expect(html).not.toContain('R$');
  const unknown=buildItinerary([{...load,volumes:null}]);
  expect(unknown[0].volumes).toBeNull();expect(unknown.at(-1).volumes).toBeNull();
  expect(volumesSummary([load,{volumes:null}])).toMatchObject({total:23,missing:1});
  expect(buildItinerary([{...load,paradas:[{tipo:'entrega',volumes:null}]}]).at(-1).volumes).toBeNull();
  expect(buildItinerary([{...load,volumes:0,paradas:[]}]).at(-1).volumes).toBe(0);
});
it('permite revisar ordem e imprimir dados completos das cargas',async()=>{
  window.React=React;window.Icon=()=>null;
  window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),getViagemV2:vi.fn(async()=>({id:1,numero:'V-1',cargas:[{id:1}]})),listItineraryExtras:vi.fn(async()=>[]),saveItineraryExtra:vi.fn(async description=>({id:'1',description})),getCargaV2:vi.fn(async()=>load)};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  const popup={document:{write:vi.fn(),close:vi.fn(),getElementById:()=>null}};
  vi.spyOn(window,'open').mockReturnValue(popup);
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByText('Entrega · Entrega parcial');
  fireEvent.click(screen.getByLabelText('Descer parada 2'));
  fireEvent.click(screen.getByText('Imprimir itinerário'));
  const html=popup.document.write.mock.calls[0][0];
  expect(html.indexOf('Entrega final')).toBeLessThan(html.indexOf('Entrega parcial'));
  expect(window.RB_API.getCargaV2).toHaveBeenCalledWith(1);
});
it('não libera impressão parcial quando uma carga falha',async()=>{
  window.React=React;window.RB_API={listCargaResponsaveis:vi.fn(async()=>[{codigo:"1",empresa:"1",nome:"Responsavel ERP"}]),getViagemV2:vi.fn(async()=>({id:1,cargas:[{id:1}]})),getCargaV2:vi.fn(async()=>{throw new Error('Falha ao consultar carga');})};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByRole('alert');
  expect(screen.getByText('Imprimir itinerário').disabled).toBe(true);
});

it('move diretamente entre extremos, valida posições e imprime a nova sequência',async()=>{
  window.React=React;window.Icon=()=>null;
  const many={...load,paradas:Array.from({length:13},(_,i)=>({tipo:'entrega',cliente:`Cliente ${i+1}`,volumes:1}))};
  window.RB_API={getViagemV2:vi.fn(async()=>({id:1,numero:'V-1',cargas:[{id:1}]})),getCargaV2:vi.fn(async()=>many)};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  const popup={document:{write:vi.fn(),close:vi.fn(),getElementById:()=>null}};
  vi.spyOn(window,'open').mockReturnValue(popup);
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByText('Entrega · Entrega final');
  const rows=()=>[...document.querySelectorAll('.cv2-itinerary-list li')].map(row=>row.querySelector('b').textContent);
  const original=rows();
  const change=(position,value,key)=>{
    const input=screen.getByLabelText(`Posição da parada ${position}`);
    fireEvent.change(input,{target:{value}});
    if(key){input.focus();fireEvent.keyDown(input,{key});}else fireEvent.blur(input);
  };
  change(15,'1','Enter');
  expect(rows()).toEqual([original[14],...original.slice(0,14)]);
  expect(screen.getByLabelText('Posição da parada 1').value).toBe('1');
  for(const value of ['','0','16','1.5'])change(1,value);
  change(1,'4','Escape');
  expect(rows()).toEqual([original[14],...original.slice(0,14)]);
  fireEvent.click(screen.getByText('Imprimir itinerário'));
  const html=popup.document.write.mock.calls[0][0];
  expect(html.indexOf('Entrega final')).toBeLessThan(html.indexOf('Cliente 1'));
  change(1,'15');
  expect(rows()).toEqual(original);
});

it('imprime muitas paradas em lista compacta, com caixa e volumes por linha',()=>{
  const fixture={...load,clienteFinal:'<Cliente & final>',paradas:Array.from({length:20},(_,i)=>({tipo:'entrega',cliente:`Cliente ${i+1}`,cidade:'Cidade',uf:'SC',endereco:'Rua de entrega, 123',nf:`NF-${i+1}`,volumes:i===0?null:0}))};
  const stops=buildItinerary([fixture]).reverse();
  const html=itineraryHtml({numero:'V-20',placa:'ABC1D23'},[fixture],stops);
  const doc=new DOMParser().parseFromString(html,'text/html');
  const rows=[...doc.querySelectorAll('[data-stop-type=entrega] tbody tr')];
  expect(rows).toHaveLength(21);
  expect(doc.querySelectorAll('.box')).toHaveLength(22);
  expect(rows[0].textContent).toContain('<Cliente & final>');
  expect(rows[1].textContent).toContain('NF-20');
  expect(rows[1].textContent).toContain('Rua de entrega, 123');
  expect(rows[1].cells[5].textContent).toBe('0');
  expect(rows[20].cells[5].textContent).toBe('A definir');
  expect(doc.querySelectorAll('table')).toHaveLength(2);
  expect([...doc.querySelectorAll('caption')].map(el=>el.textContent)).toEqual(['Coletas','Entregas']);
  expect(doc.querySelectorAll('[data-stop-type=coleta] tbody tr')).toHaveLength(1);
  expect(rows[0].cells[1].textContent).toBe('1');
  expect(doc.querySelector('.notes')).toBeNull();
  expect(doc.body.textContent).not.toMatch(/observações/i);
  expect(doc.querySelectorAll('section.stop')).toHaveLength(0);
  expect(html).toContain('display:table-header-group');
  expect(html).toContain('page-break-inside:avoid');
});

it('preserva a ordem em cada grupo e omite grupos vazios',()=>{
  const stops=buildItinerary([load,{...load,id:2,codigo:'C-2'}]).reverse();
  for(const selected of [stops,stops.filter(stop=>stop.tipo==='entrega'),[]]){
    const doc=new DOMParser().parseFromString(itineraryHtml({numero:'V-1'},[load],selected),'text/html');
    for(const type of ['coleta','entrega']){
      const expected=selected.filter(stop=>stop.tipo===type);
      const table=doc.querySelector(`[data-stop-type=${type}]`);
      if(!expected.length){expect(table).toBeNull();continue;}
      expect([...table.querySelectorAll('tbody tr')].map(row=>row.cells[2].querySelector('small').textContent)).toEqual(expected.map(stop=>stop.carga));
      expect([...table.querySelectorAll('tbody tr')].map(row=>row.cells[1].textContent)).toEqual(selected.flatMap((stop,index)=>stop.tipo===type?[String(index+1)]:[]));
    }
  }
});
it('mantém extras na parada ao reordenar, imprime com segurança e remove',async()=>{
  window.React=React;window.Icon=()=>null;
  window.RB_API={getViagemV2:vi.fn(async()=>({id:1,numero:'V-1',cargas:[{id:1}]})),listItineraryExtras:vi.fn(async()=>[]),saveItineraryExtra:vi.fn(async description=>({id:'1',description})),getCargaV2:vi.fn(async()=>load)};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  const popup={document:{write:vi.fn(),close:vi.fn(),getElementById:()=>null}};
  vi.spyOn(window,'open').mockReturnValue(popup);
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByText('Entrega · Entrega final');
  fireEvent.click(screen.getByText('Adicionar volume extra'));
  expect(screen.getByText('Imprimir itinerário').disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Descrição do volume extra'),{target:{value:'Máquina <cartão>'}});
  fireEvent.change(screen.getByLabelText('Quantidade extra'),{target:{value:'2'}});
  fireEvent.change(screen.getByLabelText('Parada do volume extra'),{target:{value:'1-entrega'}});
  fireEvent.click(screen.getByText('Incluir extra'));
  await screen.findByLabelText('Remover extra Máquina <cartão>');
  fireEvent.click(screen.getByLabelText('Subir parada 3'));
  expect(screen.getByText('Extra: Máquina <cartão> · 2 volume(s)').closest('li').textContent).toContain('Entrega final');
  fireEvent.click(screen.getByText('Imprimir itinerário'));
  const html=popup.document.write.mock.calls[0][0];
  const doc=new DOMParser().parseFromString(html,'text/html');
  const row=doc.querySelector('[data-extra-volumes] tbody tr');
  expect(row.cells[1].textContent).toContain('2. Entrega · Entrega final');
  expect(row.cells[2].textContent).toBe('Máquina <cartão>');
  expect(row.cells[3].textContent).toBe('2');
  expect(html).toContain('Máquina &lt;cartão&gt;');
  expect(load.volumes).toBe(23);
  fireEvent.click(screen.getByLabelText('Remover extra Máquina <cartão>'));
  fireEvent.click(screen.getByText('Imprimir itinerário'));
  expect(popup.document.write.mock.calls[1][0]).not.toContain('data-extra-volumes');
  fireEvent.click(screen.getByText('Adicionar volume extra'));
  fireEvent.click(screen.getByText('Cancelar'));
  expect(screen.getByText('Imprimir itinerário').disabled).toBe(false);
});
it('acompanha revisão opcional e reinicia ao alterar a sequência',async()=>{
  window.React=React;window.Icon=()=>null;
  window.RB_API={getViagemV2:vi.fn(async()=>({id:1,numero:'V-1',cargas:[{id:1}]})),listItineraryExtras:vi.fn(async()=>[]),saveItineraryExtra:vi.fn(async description=>({id:'1',description})),getCargaV2:vi.fn(async()=>load)};
  const {Cv2ItineraryButton}=await import('./cargas-viagens-v2.jsx');
  render(<Cv2ItineraryButton viagemId={1} />);
  fireEvent.click(screen.getByText('Itinerário / conferência'));
  await screen.findByText('Entrega · Entrega final');
  const progress=()=>screen.getByRole('progressbar').getAttribute('aria-valuenow');
  expect(progress()).toBe('0');
  expect(screen.getByText('Imprimir itinerário').disabled).toBe(false);
  for(let i=1;i<=3;i++)fireEvent.click(screen.getByLabelText(`Revisar parada ${i}`));
  expect(progress()).toBe('3');
  expect(screen.getByText('Rota revisada. Próxima etapa: imprimir!')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Revisar parada 2'));
  expect(progress()).toBe('2');
  fireEvent.click(screen.getByLabelText('Descer parada 1'));
  expect(progress()).toBe('0');
});

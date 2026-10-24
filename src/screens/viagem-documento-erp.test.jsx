// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const doc={tipo:'viagem_frota',numero:'12345',empresa:'2',serie:'',placa:'ABC1234'};
const trip={id:1,numero:'V-2026-1741',placa:'ABC1234',tipoPropriedade:'FROTA',cargas:[]};
async function setup(api={}){window.React=React;window.Icon=()=>null;window.RB_API=api;return import('./cargas-viagens-v2.jsx');}
it('consulta, seleciona e salva documento; atualiza o cabeçalho impresso',async()=>{
  const save=vi.fn(async()=>({documentoErp:doc}));
  const {Cv2TripDetails}=await setup({searchViagemDocumentosErp:vi.fn(async()=>({items:[doc],page:1,hasMore:false})),saveViagemDocumentoErp:save});
  const popup={document:{write:vi.fn(),close:vi.fn(),getElementById:()=>null}};
  vi.spyOn(window,'open').mockReturnValue(popup);
  render(<Cv2TripDetails viagem={trip} onClose={()=>{}} />);
  fireEvent.click(screen.getByText('Vincular viagem / carta frete'));
  fireEvent.click(screen.getByText('Pesquisar'));
  fireEvent.click(await screen.findByRole('radio'));
  fireEvent.click(screen.getByText('Salvar vínculo'));
  await screen.findByText('Gerenciar vínculo');
  expect(save).toHaveBeenCalledWith(1,doc);
  fireEvent.click(screen.getByText('Imprimir folha da viagem'));
  const html=new DOMParser().parseFromString(popup.document.write.mock.calls[0][0],'text/html');
  expect(html.querySelector('.document b').textContent).toBe('V-12345');
  expect(html.querySelector('.document small')).toBeNull();
  expect(html.querySelector('.code b').textContent).toBe(trip.numero);
});
it('preserva seleção após falha e permite remover somente o vínculo',async()=>{
  const saved=vi.fn();
  const save=vi.fn().mockRejectedValueOnce(new Error('Falha ao salvar')).mockResolvedValueOnce({documentoErp:null});
  const {Cv2ErpDocumentModal}=await setup({saveViagemDocumentoErp:save});
  render(<Cv2ErpDocumentModal viagem={{...trip,documentoErp:doc}} onSaved={saved} onClose={()=>{}} />);
  fireEvent.click(screen.getByText('Salvar vínculo'));
  await screen.findByText('Falha ao salvar');
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Remover vínculo'));
  fireEvent.click(screen.getByText('Salvar vínculo'));
  await waitFor(()=>expect(saved).toHaveBeenCalledWith(null));
  expect(save).toHaveBeenLastCalledWith(1,null);
});
it('imprime carta frete na carga usando o documento da viagem',async()=>{
  const {Cv2PrintLoadsButton}=await setup({getCargaV2:vi.fn(async()=>({id:1,codigo:'C-1',documentoErp:{...doc,tipo:'carta_frete'},paradas:[],documentos:[]}))});
  const popup={document:{write:vi.fn(),close:vi.fn(),open:vi.fn(),getElementById:()=>null}};
  vi.spyOn(window,'open').mockReturnValue(popup);
  render(<Cv2PrintLoadsButton ids={[1]} />);
  fireEvent.click(screen.getByText('Imprimir cargas'));
  await waitFor(()=>expect(popup.document.write).toHaveBeenCalledTimes(2));
  const html=new DOMParser().parseFromString(popup.document.write.mock.calls[1][0],'text/html');
  expect(html.querySelector('.document b').textContent).toBe('C-12345');
  expect(html.querySelector('.document small')).toBeNull();
});

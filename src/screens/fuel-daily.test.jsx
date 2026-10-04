// @vitest-environment jsdom
import React from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {FuelDailyHistory} from './analise-frota.jsx';
globalThis.React=React;
afterEach(cleanup);
it('separa zero rodado de quilometragem pendente e filtra pendências por placa',()=>{
 render(<FuelDailyHistory rows={[
  {placa:'ABC1234',dia:'2026-09-01',status:'valido',km:0,odometro_inicial:1000,odometro_final:1000},
  {placa:'DEF5678',dia:'2026-09-01',status:'pendente',km:null,motivo:'Hodômetro regrediu'},
 ]}/>);
 expect(screen.getByText('0')).toBeTruthy();expect(screen.getByText('A conferir')).toBeTruthy();
 fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.queryByText('ABC1234',{selector:'strong'})).toBeNull();expect(screen.getByText('Hodômetro regrediu')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Veículo do histórico'),{target:{value:'ABC1234'}});
 expect(screen.getByText('Nenhuma leitura diária encontrada neste filtro.')).toBeTruthy();
});

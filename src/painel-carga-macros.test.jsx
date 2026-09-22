// @vitest-environment jsdom
import React from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {PainelCargaMacros} from './screens/painel-carga-macros.jsx';
afterEach(cleanup);
it('shows macro time in Brasilia, location and whether it predates this operation',()=>{
 const event={id:'1',descricao:'FIM DE VIAGEM',dataHora:'2026-09-21T20:30:38Z',local:'BELÉM / PA',operacaoAtual:false};
 render(<PainelCargaMacros macros={{disponivel:true,ultima:event,historico:[event]}}/>);
 expect(screen.getByText(/Última macro/).textContent).toContain('17:30');
 expect(screen.getByText(/Anterior à operação atual/)).toBeTruthy();
 expect(screen.getByText(/BELÉM/)).toBeTruthy();
 expect(screen.getByText(/não comprovam a última descarga/)).toBeTruthy();
});
it('distinguishes unavailable telemetry from an empty history',()=>{
 const {rerender}=render(<PainelCargaMacros macros={{disponivel:false}}/>);
 expect(screen.getByText(/indisponíveis/)).toBeTruthy();
 rerender(<PainelCargaMacros macros={{disponivel:true}}/>);
 expect(screen.getByText(/Sem macros recebidas/)).toBeTruthy();
});

// @vitest-environment jsdom
import React from 'react';
import {it, expect, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
globalThis.React=React;
await import('./screens/embarques-clientes.jsx');
afterEach(cleanup);
it('mostra documentos e permite conferir CT-es e orçamentos por período',async()=>{
 const periods=[9,8,7].map(m=>({startDate:`2026-0${m}-01`,endDate:`2026-0${m}-30`}));
 window.RB_API={getEmbarquesClientes:vi.fn().mockResolvedValue({periodo:{periodos:periods},rows:[],resumo:{embarquesAtual:2},conciliacao:periods.map((periodo,i)=>({periodo,ctes:i?0:1,orcamentos:i?0:1,documentos:i?[]:[{id:'1',empresa:2,serie:'1',codigo:4451,categoria:'CT-e',cliente:'Cliente exemplo',data:'2026-09-04'},{id:'2',empresa:2,serie:'O',codigo:1246,categoria:'Orçamento',cliente:'Cliente orçamento',data:'2026-09-11'}]}))})};
 render(React.createElement(window.EmbarquesClientes));
 fireEvent.click(await screen.findByText('Conferir documentos contabilizados'));
 expect(screen.getByText('1 CT-es + 1 orçamentos = 2 documentos')).toBeTruthy();
 expect(screen.getByText('2/1/4451')).toBeTruthy();
 expect(screen.queryByText('Simular uma viagem')).toBeNull();
 fireEvent.change(screen.getByLabelText('Buscar documentos'),{target:{value:'1246'}});
 expect(screen.queryByText('2/1/4451')).toBeNull();
 expect(screen.getByText('2/O/1246')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Período da conferência'),{target:{value:'1'}});
 expect(screen.getByText('Nenhum documento encontrado.')).toBeTruthy();
});

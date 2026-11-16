// @vitest-environment jsdom
import React from 'react';
import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import Adiantamentos,{filterAdvances} from './adiantamentos.jsx';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const rows=[{id:'1',driver:'João Silva',plate:'ABC1234',status:'overdue',due:'2026-11-10',open:20,amount:100,type:'advance',document:'10',series:'AD'},{id:'2',driver:'José',status:'settled',due:'2026-11-11',open:0,amount:10,type:'other',document:'11'},{id:'3',driver:'Pedro',status:'undated',due:null,open:10,amount:10,type:'other'}];
it('filtra saldo parcial, vencidos, nome sem acento e vencimento ausente',()=>{
 expect(filterAdvances(rows,{}).map(r=>r.id)).toEqual(['1','3']);
 expect(filterAdvances(rows,{status:'overdue',query:'joao'}).map(r=>r.id)).toEqual(['1']);
 expect(filterAdvances(rows,{status:'all',from:'2026-11-11'}).map(r=>r.id)).toEqual(['2']);
});
it('consulta dados reais sem oferecer mutacoes e permite ver baixados',async()=>{
 window.RB_API={listDriverAdvances:vi.fn().mockResolvedValue({records:rows,today:'2026-11-16',updatedAt:'2026-11-16T12:00:00Z'})};
 render(<Adiantamentos/>);
 await screen.findByText('João Silva');
 expect(screen.queryByRole('button',{name:/movimentação|simulação/i})).toBeNull();
 expect(screen.queryByText('José')).toBeNull();
 fireEvent.change(screen.getByLabelText('Situação'),{target:{value:'settled'}});
 expect(screen.getByText('José')).toBeTruthy();
 expect(screen.queryByText('João Silva')).toBeNull();
});
it('mostra falha e permite repetir consulta sem apresentar exemplos ficticios',async()=>{
 window.RB_API={listDriverAdvances:vi.fn().mockRejectedValueOnce(new Error('ERP indisponível')).mockResolvedValueOnce({records:[],today:'2026-11-16',updatedAt:'2026-11-16T12:00:00Z'})};
 render(<Adiantamentos/>);
 await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
 await screen.findByText('Nenhum título encontrado com esses filtros.');
});

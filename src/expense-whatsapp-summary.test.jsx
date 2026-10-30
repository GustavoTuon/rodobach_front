// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Summary,{formatExpenseWhatsapp} from './expense-whatsapp-summary.jsx';
afterEach(cleanup);
const record={service:'Descarga',plate:'ABC1234',expenseDate:'2026-10-28',amount:200,supplier:'Fornecedor livre',paymentDetails:{holderName:'Titular Teste',pixKey:'teste@example.com'}};
it('formata dados salvos e copia o resumo completo',async()=>{
 const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<Summary record={record}/>);
 fireEvent.click(screen.getByRole('button',{name:'Copiar resumo para WhatsApp'}));
 await screen.findByText(/Resumo copiado/);
 expect(writeText).toHaveBeenCalledWith(formatExpenseWhatsapp(record));
 expect(formatExpenseWhatsapp(record)).toContain('28/10/2026');
 expect(formatExpenseWhatsapp(record)).toContain('\n\n*Dados para pagamento via PIX*');
 expect(formatExpenseWhatsapp(record)).toContain('Fornecedor: Fornecedor livre');
});
it('oferece cópia manual se a área de transferência falhar e omite PIX não informado',async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
 render(<Summary record={{...record,paymentDetails:null,paid:true}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Copiar resumo para WhatsApp'}));
 await screen.findByText(/Selecione o texto/);
 expect(screen.getByRole('textbox').value).toContain('Pagamento: Pago');
 expect(screen.getByRole('textbox').value).not.toContain('Chave PIX');
});

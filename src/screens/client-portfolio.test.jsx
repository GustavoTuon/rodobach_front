// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {ClientPortfolio,filterPortfolio} from './client-portfolio.jsx';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
const client={identidade:'cnpj:12345678',nome:'Cliente Alfa',titulos:1,total:100,aVencer:0,vencido:100,ate15:0,de16a30:0,de31a60:0,acima60:100,semVencimento:0,filiais:[{empresa:1,codigo:10,nome:'Filial Alfa',documento:'12.345.678/0001-01'}]};
const payload={dataReferencia:'2026-09-16',atualizadoEm:'2026-09-16T15:00:00Z',clientes:[client],metodologia:'Todas as emissões.',detalhe:{cliente:client,ultimoRecebimento:null,quantidade:1,saldo:100,porPagina:50,pagina:1,titulos:[{empresa:1,serie:'A',numero:123,parcela:1,nome:'Filial Alfa',emissao:'2022-02-15',vencimento:'2022-03-01',original:150,saldo:100,diasAtraso:1660,faixa:'acima60'}]}};

it('busca também filiais e documentos sem pontuação',()=>{
  expect(filterPortfolio([client],'12345678')).toHaveLength(1);
  expect(filterPortfolio([client],'Filial Alfa')).toHaveLength(1);
  expect(filterPortfolio([client],'Outro')).toHaveLength(0);
});

it('abre títulos antigos sem filtro de emissão e permite selecionar a faixa',async()=>{
  window.RB_API={getClienteCarteira:vi.fn().mockResolvedValue(payload)};
  render(<ClientPortfolio/>);
  fireEvent.click(await screen.findByRole('button',{name:'Cliente Alfa',exact:true}));
  const detail=screen.getByRole('region',{name:'Títulos do cliente'});
  expect(await within(detail).findByText('15/02/2022')).toBeTruthy();
  expect(within(detail).getByText('Nenhuma baixa positiva encontrada')).toBeTruthy();
  fireEvent.click(within(detail).getByRole('button',{name:'Mais de 60 dias'}));
  await waitFor(()=>expect(window.RB_API.getClienteCarteira).toHaveBeenLastCalledWith({empresa:'todas',cliente:client.identidade,faixa:'acima60',pagina:1}));
});

it('falha não vira carteira zerada e permite nova tentativa',async()=>{
  window.RB_API={getClienteCarteira:vi.fn().mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValue(payload)};
  render(<ClientPortfolio/>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Saldo total em aberto')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
  expect(await screen.findByRole('button',{name:'Cliente Alfa',exact:true})).toBeTruthy();
});

it('trocar empresa descarta detalhes da empresa anterior',async()=>{
  window.RB_API={getClienteCarteira:vi.fn().mockResolvedValue(payload)};
  render(<ClientPortfolio/>);
  fireEvent.click(await screen.findByRole('button',{name:'Cliente Alfa',exact:true}));
  await screen.findByText('15/02/2022');
  fireEvent.change(screen.getByLabelText('Empresa'),{target:{value:'2'}});
  await waitFor(()=>expect(window.RB_API.getClienteCarteira).toHaveBeenLastCalledWith({empresa:'2'}));
  expect(screen.queryByRole('region',{name:'Títulos do cliente'})).toBeNull();
});

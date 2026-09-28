// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import './consulta-cte.jsx';

beforeEach(() => { window.React = React; window.Icon = () => null; });
afterEach(cleanup);
// Numeric values from the reported batch; personal and commercial identities omitted.
const batch = [
  [298770, 31563, 9514.26], [298771, 1188.5, 342.452],
  [298772, 5194.48, 1461.907], [298773, 770, 221.636],
  [298774, 3885.95, 1147.816], [298775, 662.9, 191.353],
  [298776, 11.13, 3.022], [298777, 1144, 332.265],
  [298778, 1150.97, 332.35], [298779, 1712.02, 493.808],
  [298780, 5612.22, 1647.627], [298781, 2056, 604.25],
  [298782, 364.22, 97.136],
];
const file = ([id, amount, weight]) => ({name: `${id}.xml`, text: async () => `<nfeProc><NFe><infNFe Id="NFe${id}"><ide><nNF>${id}</nNF><serie>1</serie></ide><emit><xNome>Emitente teste</xNome></emit><det><prod><NCM>10063011</NCM><vProd>${amount}</vProd></prod></det><total><ICMSTot><vNF>${amount}</vNF></ICMSTot></total><transp><modFrete>0</modFrete><vol><pesoB>${weight}</pesoB></vol></transp></infNFe></NFe></nfeProc>`});
const money = value => value.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}).replace(/\s/g, ' ');
const normalized = element => element.textContent.replace(/\s/g, ' ');
async function importNotes(notes) {
  render(<window.ConsultaCte/>);
  fireEvent.click(screen.getByRole('button', {name: 'Importar XMLs'}));
  fireEvent.change(screen.getByLabelText(/Escolher XMLs/), {target:{files:notes.map(file)}});
  await screen.findByText(`NF ${notes[0][0]}`);
}
const toggle = () => fireEvent.click(screen.getByRole('checkbox'));
const setFreight = value => fireEvent.change(screen.getByLabelText('Valor total do frete (R$)'), {target:{value}});

it('uses allocated freight per kg for the 13-note batch, updates it and restores merchandise value when disabled', async () => {
  await importNotes(batch);
  const row = () => screen.getByText('NF 298770').closest('tr');
  expect(normalized(row())).toContain(`${money(3.32)} / kg`);
  toggle(); setFreight('5.600,00');
  expect(screen.getByRole('columnheader', {name:'Frete por kg'})).toBeTruthy();
  expect(normalized(row())).toContain(money(3250.78));
  expect(normalized(row())).toContain(`${money(.34)} / kg`);
  const rows = batch.map(([id]) => screen.getByText(`NF ${id}`).closest('tr'));
  const cents = rows.reduce((sum, r) => {
    const cells = within(r).getAllByRole('cell');
    expect(normalized(cells[8])).toBe(`${money(.34)} / kg`);
    return sum + Math.round(Number(cells[7].textContent.replace(/[^\d,]/g,'').replace(',','.')) * 100);
  }, 0);
  expect(cents).toBe(560000);
  expect(normalized(screen.getByText('Frete por kg', {selector:'span'}).parentElement)).toContain(`${money(.34)} / kg`);
  setFreight('11.200,00');
  expect(normalized(row())).toContain(`${money(.68)} / kg`);
  setFreight('0'); expect(normalized(row())).toContain(`${money(0)} / kg`);
  toggle();
  expect(screen.getByRole('columnheader', {name:'Valor da nota por kg'})).toBeTruthy();
  expect(normalized(row())).toContain(`${money(3.32)} / kg`);
});

it('shows no unit price when a note has no weight', async () => {
  await importNotes([[1,100,0]]); toggle(); setFreight('100');
  const cells = within(screen.getByText('NF 1').closest('tr')).getAllByRole('cell');
  expect(cells[8].textContent).toBe('—');
  expect(screen.getByText('Sem peso')).toBeTruthy();
});

it('interprets the Brazilian thousands separator as reais', async () => {
  await importNotes([[1,100,10]]); toggle(); setFreight('5.600');
  const cells = within(screen.getByText('NF 1').closest('tr')).getAllByRole('cell');
  expect(normalized(cells[7])).toBe(money(5600));
});

it('never allocates negative cents when many notes share a small freight', async () => {
  await importNotes([[1,100,1],[2,100,1],[3,100,1],[4,100,1],[5,100,1],[6,100,1]]);
  toggle(); setFreight('0,03');
  for(let id=1;id<=6;id++) expect(normalized(within(screen.getByText(`NF ${id}`).closest('tr')).getAllByRole('cell')[7])).not.toContain('-');
});

it('clears the previous freight when starting a new analysis', async () => {
  await importNotes([[1,100,10]]); toggle(); setFreight('5600');
  fireEvent.click(screen.getByRole('button', {name:'Limpar análise'}));
  fireEvent.change(screen.getByLabelText(/Escolher XMLs/), {target:{files:[file([2,200,20])]}});
  await screen.findByText('NF 2');
  expect(screen.getByRole('checkbox').checked).toBe(false);
  expect(screen.getByLabelText('Valor total do frete (R$)').value).toBe('');
});

it('deduplicates imports, opens details and keeps valid files when one XML is broken', async () => {
  await importNotes([[1,100,10]]);
  fireEvent.change(screen.getByLabelText(/Escolher XMLs/), {target:{files:[file([1,100,10]),file([2,200,20]),{name:'invalid.xml',text:async()=>'<broken>'}]}});
  await screen.findByText('NF 2');
  expect(screen.getAllByText('NF 1')).toHaveLength(1);
  expect(screen.getByText('1 arquivo(s) não processado(s)')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', {name:'Ver mais'})[0]);
  expect(screen.getByText('Chave de acesso')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name:'Ver menos'}));
  expect(screen.queryByText('Chave de acesso')).toBeNull();
});

it('does not reuse IBRAP results as NF rateio results after switching search type', async () => {
  window.RB_API = {consultarNfeIbrap:vi.fn().mockResolvedValue({resultados:[{numeroNota:'42',chaveNfe:'123',serieNota:'1'}]})};
  render(<window.ConsultaCte/>);
  fireEvent.change(screen.getByLabelText('Número da NF'), {target:{value:'42'}});
  fireEvent.click(screen.getByRole('button', {name:'Consultar', exact:true}));
  await screen.findByText('NF-e 42');
  fireEvent.click(screen.getByRole('button', {name:'Buscar por nota fiscal'}));
  expect(screen.queryByText('NF 42')).toBeNull();
});

it('discards an in-flight response after changing the search type', async () => {
  let resolve;
  window.RB_API = {consultarNfeIbrap:vi.fn().mockImplementation(() => new Promise(r => {resolve=r;}))};
  render(<window.ConsultaCte/>);
  fireEvent.change(screen.getByLabelText('Número da NF'), {target:{value:'42'}});
  fireEvent.click(screen.getByRole('button', {name:'Consultar', exact:true}));
  fireEvent.click(screen.getByRole('button', {name:'Buscar por CT-e'}));
  await act(async () => resolve({resultados:[{numeroNota:'42',chaveNfe:'123'}]}));
  expect(screen.queryByText('NF 42')).toBeNull();
  expect(screen.getByRole('button', {name:'Consultar', exact:true}).disabled).toBe(false);
});

it('reports invalid freight instead of showing a negative or zero result', async () => {
  await importNotes([[1,100,10]]); toggle(); setFreight('-100');
  expect(screen.getByRole('alert').textContent).toContain('frete válido');
  const cells = within(screen.getByText('NF 1').closest('tr')).getAllByRole('cell');
  expect(cells[7].textContent).toBe('—'); expect(cells[8].textContent).toBe('—');
});

it('handles failed and empty ERP requests and recovers on a new query', async () => {
  window.RB_API = {consultarNcmRateio:vi.fn().mockRejectedValueOnce(new Error('ERP indisponível')).mockResolvedValueOnce({resultados:[]}).mockResolvedValueOnce({resultados:[{numeroNota:'1',pesoNota:1},{numeroNota:'2',pesoNota:1},{numeroNota:'3',pesoNota:1},{numeroNota:'4',pesoNota:0}]})};
  render(<window.ConsultaCte/>);
  fireEvent.click(screen.getByRole('button', {name:'Buscar por CT-e'}));
  fireEvent.change(screen.getByLabelText('Número do CT-e'), {target:{value:'123'}});
  fireEvent.change(screen.getByLabelText('Frete total (R$)'), {target:{value:'0,02'}});
  const submit = () => fireEvent.click(screen.getByRole('button', {name:'Consultar', exact:true}));
  submit(); await screen.findByText('ERP indisponível');
  submit(); await screen.findByText('Nenhuma nota encontrada com os dados informados.');
  submit(); await screen.findByText('NF 4');
  expect(normalized(within(screen.getByText('NF 4').closest('tr')).getAllByRole('cell')[9])).toBe(money(0));
});

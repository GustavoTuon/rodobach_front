// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import "./simulador.jsx";

const response = (driver = 8700) => ({
  entrada: { tipoVeiculo: "Carreta" },
  tabela: {
    valorMotoristaTabela: driver,
    kmValor: 5.13,
    cargaDescarga: 523.33,
  },
  encargos: { seguroCarga: 64.43, seguroRC: 35.19 },
  resultado: { valorMotorista: driver, valorCliente: 15000 },
});
beforeEach(() => {
  window.React = React;
  window.Icon = () => null;
  localStorage.clear();
  window.NT_DATA = {
    ANTT_TABELA: [
      { eixos: 6, tipoVeiculo: "Carreta" },
      { eixos: 3, tipoVeiculo: "Truck" },
    ],
  };
  window.RB_API = {
    listAntt: vi.fn().mockResolvedValue([]),
    calcularFrete: vi.fn().mockResolvedValue(response()),
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const choose = (name) =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
const change = (name, value) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });

it("preserves quote inputs and calculated scenarios across all layouts, including original", async () => {
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  choose("Planilha Rodobach");
  change("Quilometragem", "1600");
  change("Valor NF-e", "150000");
  change("Valor do motorista", "9000");
  change("Valor do cliente", "18000");
  await screen.findByText("Cotação atualizada · valores em reais");
  expect(window.RB_API.calcularFrete.mock.lastCall[0]).toMatchObject({
    km: 1600,
    valorNota: 150000,
  });
  const result = screen.getAllByText(/6\.740,38/);
  expect(result.length).toBeGreaterThan(0);
  choose("Comparativo");
  expect(screen.getByLabelText("Quilometragem").value).toBe("1600");
  expect(screen.getAllByText(/6\.740,38/).length).toBeGreaterThan(0);
  choose("Cotação");
  choose("Continuar");
  expect(screen.getByLabelText("Valor NF-e").value).toBe("150000");
  choose("Continuar");
  expect(screen.getByLabelText("Valor do cliente").value).toBe("18000");
  choose("Original");
  expect(screen.getByLabelText("Valor NF-e").value).toBe("150000");
  choose("Planilha Rodobach");
  expect(screen.getByLabelText("Valor do motorista").value).toBe("9000");
  expect(window.RB_API.calcularFrete).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("rodobach_quote_layout")).toBe("sheet");
});

it("disables quote actions on failure and recovers when the input changes", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  window.RB_API.calcularFrete.mockRejectedValueOnce(new Error("offline"));
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  choose("Planilha Rodobach");
  change("Quilometragem", "1600");
  await screen.findByText(/Não foi possível calcular/);
  expect(
    screen.getByRole("button", { name: "Usar negociação na viagem" }).disabled,
  ).toBe(true);
  change("Quilometragem", "1700");
  await screen.findByText("Cotação atualizada · valores em reais");
  expect(
    screen.getByRole("button", { name: "Copiar negociação" }).disabled,
  ).toBe(false);
});

it("ignores a late API result for a previous distance", async () => {
  let resolveOld;
  window.RB_API.calcularFrete.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  render(<window.SimuladorFrete onNavigate={vi.fn()} />);
  choose("Planilha Rodobach");
  change("Quilometragem", "1600");
  await waitFor(() => expect(resolveOld).toBeTruthy());
  change("Quilometragem", "1700");
  await screen.findByText("Cotação atualizada · valores em reais");
  await act(async () => resolveOld(response(99999)));
  expect(screen.queryByText(/99\.999,00/)).toBeNull();
  expect(screen.getAllByText(/8\.700,00/).length).toBeGreaterThan(0);
});

it('keeps the standard quote independent and shares only the negotiated driver', async () => {
  render(<window.SimuladorFrete onNavigate={vi.fn()}/>);
  choose('Planilha Rodobach'); change('Quilometragem', '1600');
  await screen.findByText('Cotação atualizada · valores em reais');
  const standard = screen.getByRole('article', {name:'Cotação padrão'});
  const baseline = standard.textContent;
  expect(within(standard).queryAllByRole('textbox')).toHaveLength(0);
  change('Valor do motorista', '9000'); change('Valor do cliente', '18000');
  const deal = screen.getByRole('article', {name:'Motorista + cliente'});
  expect(deal.textContent).toContain('9.000,00');
  expect(deal.textContent).toContain('6.740,38');
  const second = screen.getByRole('article', {name:'Alterar motorista'});
  expect(second.textContent).toContain('15.689,00');
  change('Margem desejada', '25');
  expect(second.textContent).toContain('14.443,84');
  expect(deal.textContent).toContain('6.740,38');
  expect(standard.textContent).toBe(baseline);
  expect(window.RB_API.calcularFrete).toHaveBeenCalledTimes(1);
});

it('keeps zero distinct from automatic values when blurring and switching layouts', async () => {
  render(<window.SimuladorFrete onNavigate={vi.fn()}/>);
  choose('Planilha Rodobach'); change('Quilometragem', '1600');
  await screen.findByText('Cotação atualizada · valores em reais');
  change('Valor do motorista', '0');
  fireEvent.blur(screen.getByLabelText('Valor do motorista'));
  expect(screen.getByLabelText('Valor do motorista').value).toBe('0,00');
  expect(screen.getByRole('article', {name:'Motorista + cliente'}).textContent).toContain('R$ 0,00');
  choose('Original');
  fireEvent.blur(screen.getByLabelText('Valor pago ao motorista'));
  choose('Planilha Rodobach');
  expect(screen.getByLabelText('Valor do motorista').value).toBe('0,00');
  change('Valor do motorista', '');
  expect(screen.getByRole('article', {name:'Alterar motorista'}).textContent).toContain('Automático: R$ 8.700,00');
});

it('preserves insurance mode, vehicle, contract and ANTT selection across layouts', async () => {
  render(<window.SimuladorFrete onNavigate={vi.fn()}/>);
  choose('Planilha Rodobach'); change('Quilometragem', '1600');
  change('Seguro terceiros', '0');
  fireEvent.blur(screen.getByLabelText('Seguro terceiros'));
  fireEvent.change(screen.getByLabelText('Contratação'), {target:{value:'tac'}});
  fireEvent.change(screen.getByLabelText('Preço ANTT'), {target:{value:'alto_desempenho'}});
  fireEvent.change(screen.getByLabelText('Veículo'), {target:{value:'3'}});
  await screen.findByText('Cotação atualizada · valores em reais');
  expect(window.RB_API.calcularFrete.mock.lastCall[0]).toMatchObject({eixos:3, operacao:'tac', tipoCarga:'alto_desempenho', seguroRCManual:0, margem:30});
  expect(screen.getByText('Manual')).toBeTruthy();
  expect(screen.getAllByText('↳ INSS patronal')).toHaveLength(3);
  choose('Comparativo'); choose('Cotação guiada'); choose('Continuar');
  expect(screen.getByLabelText('Seguro terceiros').value).toBe('0,00');
  choose('Planilha Rodobach');
  change('Seguro terceiros', '');
  await screen.findByText('Cotação atualizada · valores em reais');
  expect(window.RB_API.calcularFrete.mock.lastCall[0].seguroRCManual).toBe('');
  expect(screen.getByText('Automático')).toBeTruthy();
});

it('copies and sends the negotiated scenario to trips', async () => {
  const onNavigate=vi.fn();
  const writeText=vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', {...navigator, clipboard:{writeText}});
  render(<window.SimuladorFrete onNavigate={onNavigate}/>);
  choose('Planilha Rodobach'); change('Quilometragem', '1600');
  change('Pedágio','50'); change('Valor do motorista','9000'); change('Valor do cliente','18000');
  await screen.findByText('Cotação atualizada · valores em reais');
  choose('Copiar negociação');
  await screen.findByText('Copiado!');
  expect(writeText.mock.calls[0][0]).toContain('Valor motorista simulado: R$ 9.000,00');
  expect(writeText.mock.calls[0][0]).toContain('Valor cliente simulado: R$ 18.000,00');
  expect(writeText.mock.calls[0][0]).toContain('Lucro real: R$ 6.690,38');
  choose('Usar negociação na viagem');
  expect(onNavigate).toHaveBeenCalledWith('viagens');
  expect(window.NT_SIM).toMatchObject({km:1600,pedagio:50,valorMotorista:9000,valorCliente:18000,eixos:6});
  vi.unstubAllGlobals();
});

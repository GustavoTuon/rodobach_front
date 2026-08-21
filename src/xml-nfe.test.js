import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { consolidateNfes, parseNfeXml } from "./xml-nfe.js";

const Parser = new JSDOM().window.DOMParser;
const xml = `<?xml version="1.0"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe123">
  <ide><nNF>42</nNF><serie>1</serie><dhEmi>2026-08-20T10:00:00-03:00</dhEmi></ide>
  <emit><xNome>Fornecedor Teste</xNome></emit>
  <dest><CNPJ>12345678000190</CNPJ><xNome>Cliente Teste</xNome></dest>
  <det nItem="1"><prod><NCM>11111111</NCM><xProd>A</xProd><qCom>2</qCom><vProd>100.00</vProd></prod></det>
  <det nItem="2"><prod><NCM>22222222</NCM><xProd>B</xProd><qCom>1</qCom><vProd>300.00</vProd></prod></det>
  <total><ICMSTot><vProd>400.00</vProd><vNF>440.00</vNF></ICMSTot></total>
  <transp><modFrete>0</modFrete><vol><pesoL>8.000</pesoL><pesoB>10.000</pesoB></vol></transp>
</infNFe></NFe></nfeProc>`;

describe("XML de NF-e", () => {
  it("extrai nota, produtos, NCM e peso com namespace", () => {
    const note = parseNfeXml(xml, "nota.xml", Parser);
    expect(note).toMatchObject({ numero: "42", serie: "1", valorNota: 440, pesoConsiderado: 10, cliente: "Cliente Teste", clienteDocumento: "12345678000190", modalidadeFrete: "0", tomadorCte: "Fornecedor Teste" });
    expect(note.produtos).toHaveLength(2);
  });

  it("usa o destinatário como provável tomador quando o frete é por conta dele", () => {
    const note = parseNfeXml(xml.replace("<modFrete>0</modFrete>", "<modFrete>1</modFrete>"), "nota.xml", Parser);
    expect(note).toMatchObject({ tomadorCte: "Cliente Teste", tomadorCteDocumento: "12345678000190", tomadorConhecido: true });
  });

  it("calcula o NCM predominante por valor e o valor por kg", () => {
    const note = parseNfeXml(xml, "nota.xml", Parser);
    const result = consolidateNfes([note, { ...note, chave: "456" }]);
    expect(result.ncmPredominante).toBe("22222222");
    expect(result.valorTotal).toBe(880);
    expect(result.pesoTotal).toBe(20);
    expect(result.valorPorKg).toBe(44);
  });

  it("recusa XML que não é NF-e", () => {
    expect(() => parseNfeXml("<evento />", "evento.xml", Parser)).toThrow(/não contém uma NF-e/);
  });
});

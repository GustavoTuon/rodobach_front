import { expect, it } from "vitest";
import { sameCargaDocumento } from "./carga-documentos.js";

it("distinguishes series and companies even when numbers match", () => {
  const doc = { tipo: "CT-e", numero: "123", empresa: "1", serie: "1" };
  expect(sameCargaDocumento(doc, { ...doc, serie: "C" })).toBe(false);
  expect(sameCargaDocumento(doc, { ...doc, empresa: "2" })).toBe(false);
  expect(sameCargaDocumento(doc, { ...doc, numero: "000123" })).toBe(true);
  expect(sameCargaDocumento(doc, { tipo: "CT-e", numero: "123" })).toBe(false);
});

it("deduplicates the same key and keeps NF-e distinct from CT-e", () => {
  const doc = { tipo: "CT-e", numero: "123", chave: "key" };
  expect(sameCargaDocumento(doc, { ...doc, empresa: "1", serie: "1" })).toBe(true);
  expect(sameCargaDocumento(doc, { ...doc, chave: "other" })).toBe(false);
  expect(sameCargaDocumento(doc, { ...doc, tipo: "NF-e" })).toBe(false);
});

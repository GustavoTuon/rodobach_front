import {describe,it,expect,vi} from "vitest";
import {extractExpenseFields,readDecimal,createLocalOcrJob,extractNumericField,readableText} from "./expense-ocr.js";
describe("sugestões de OCR",()=>{
 it("preserva decimal do hodômetro e não confunde com velocidade ou data",()=>{
  expect(extractExpenseFields("000 Km/h 03/10/26 12:28\n0197611.7Km","odometer").suggestions).toEqual([{field:"odometer",label:"Hodômetro (km)",value:197611.7}]);
  expect(extractExpenseFields("000 km/h 03/10/26 12:28","odometer").suggestions).toEqual([]);
 });
 it("separa valor do combustível e litros da bomba",()=>{
  const fields=Object.fromEntries(extractExpenseFields("R$ 3.809,55\nLITROS 545,000","pump").suggestions.map(s=>[s.field,s.value]));
  expect(fields).toEqual({fuelAmount:3809.55,amount:3809.55,liters:545});
 });
 it("não usa total da nota como valor do diesel nem soma ARLA aos litros",()=>{
  const result=extractExpenseFields("VALOR TOTAL DA NOTA 3.966,83\nDATA EMISSAO 03/10/2026\nARLA 41,5 L\nN. 000017351","invoice");
  expect(result.suggestions).toContainEqual({field:"amount",label:"Valor total da nota (R$)",value:3966.83});
  expect(result.suggestions.some(s=>s.field==='liters'||s.field==='fuelAmount')).toBe(false);
  expect(result.warnings.join(' ')).toContain('ARLA');
 });
 it("deixa valores ambíguos ou ilegíveis para preenchimento manual",()=>{
  expect(extractExpenseFields("197611.7 KM 297611.7 KM","odometer").suggestions).toEqual([]);
  expect(extractExpenseFields("R$ 3809.55","pump",20).suggestions).toEqual([]);
  expect(extractExpenseFields("CNPJ 04.224.679/0012-06 99/99/2026 3809.55","invoice").suggestions).toEqual([]);
  expect(extractExpenseFields("DATA EMISSAO 99/99/2026","invoice").suggestions).toEqual([]);
  expect(readDecimal('197.611,7')).toBe(197611.7);
 });
});

vi.mock("./expense-photo-image.js",()=>({prepareOcrImage:vi.fn(async image=>image)}));
vi.mock("tesseract.js",()=>({createWorker:vi.fn()}));
it("cancelar encerra o worker e libera o preenchimento manual",async()=>{
 const {createWorker}=await import("tesseract.js");
 const worker={setParameters:vi.fn().mockResolvedValue(),recognize:vi.fn(()=>new Promise(()=>{})),terminate:vi.fn().mockResolvedValue()};
 createWorker.mockResolvedValue(worker);
 const job=createLocalOcrJob("data:image/png;base64,test","pump");
 await vi.waitFor(()=>expect(worker.recognize).toHaveBeenCalled());
 const rejected=expect(job.promise).rejects.toThrow("Leitura cancelada");
 job.cancel();await rejected;expect(worker.terminate).toHaveBeenCalled();
});
it("falha ao carregar o motor não produz sugestões inventadas",async()=>{
 const {createWorker}=await import("tesseract.js");
 createWorker.mockRejectedValueOnce(new Error("Motor indisponível"));
 await expect(createLocalOcrJob("image","invoice").promise).rejects.toThrow("Motor indisponível");
});

it("ignora ruído e números de documento sem identificação ou conflitantes",()=>{
 expect(readableText("SS.\nTen,\n2»)\nà)")).toBe("");
 expect(extractExpenseFields("IN 10060\nCNPJ 12345678901234","invoice").suggestions).toEqual([]);
 expect(extractExpenseFields("N.º: 000017351\nN.º: 000017381","invoice").suggestions).toEqual([]);
 expect(extractExpenseFields("N.º: 000017351","invoice").suggestions[0].value).toBe("000017351");
});
it("recorte numérico não adivinha separador nem confunde litros decimais com milhares",()=>{
 expect(extractNumericField("545.000","liters",90).suggestions[0].value).toBe(545);
 expect(extractNumericField("380955","fuelAmount",90).suggestions).toEqual([]);
 expect(extractNumericField("3809.55","fuelAmount",20).suggestions).toEqual([]);
 expect(extractNumericField("0197611.7","odometer",90).suggestions[0].value).toBe(197611.7);
});
it("descarta sugestões quando tratamentos da mesma foto discordam",async()=>{
 const {createWorker}=await import("tesseract.js");
 const worker={setParameters:vi.fn().mockResolvedValue(),recognize:vi.fn().mockResolvedValueOnce({data:{text:"R$ 3809.55",confidence:90}}).mockResolvedValueOnce({data:{text:"R$ 3808.55",confidence:90}}),terminate:vi.fn().mockResolvedValue()};
 createWorker.mockResolvedValue(worker);
 const result=await createLocalOcrJob("image","pump").promise;
 expect(result.suggestions).toEqual([]);
 expect(worker.terminate).toHaveBeenCalled();
});

it("sugere cidade do emitente e não usa endereço ou fornecedor do destinatário",()=>{
 const result=extractExpenseFields("EMITENTE: POSTO EXEMPLO LTDA\nCIDADE: CRICIUMA / SC\nDESTINATARIO\nRAZAO SOCIAL: TRANSPORTADORA LTDA\nCIDADE: CURITIBA / PR","invoice");
 expect(result.suggestions).toContainEqual({field:"supplier",label:"Fornecedor",value:"POSTO EXEMPLO LTDA"});
 expect(result.suggestions).toContainEqual({field:"location",label:"Cidade / local da nota",value:"CRICIUMA / SC"});
 const recipientOnly=extractExpenseFields("DESTINATARIO\nRAZAO SOCIAL: TRANSPORTADORA LTDA\nCIDADE: CURITIBA / PR","invoice");
 expect(recipientOnly.suggestions.some(s=>s.field==="supplier" || s.field==="location")).toBe(false);
});

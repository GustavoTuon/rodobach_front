import {prepareOcrImage} from "./expense-photo-image.js";
// Conservative extraction: ambiguous fields remain manual; no automatic saving.
export function readDecimal(raw) {
  let value = String(raw).replace(/\s/g, "");
  if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  return /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
}
export function extractExpenseFields(text, kind, confidence = 100) {
  const suggestions = [];
  const warnings = [];
  const clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const add = (field, label, raw, max) => {
    const value = readDecimal(raw);
    if (value != null && value > 0 && value <= max) suggestions.push({field,label,value});
  };
  if (confidence < 55) return {suggestions, warnings:["A foto não ficou legível o suficiente. Preencha os dados manualmente ou tente outra foto."]};
  if (kind === "odometer") {
    const hits = [...clean.matchAll(/(\d[\d.,]{4,12})\s*KM(?!\s*[:/]?\s*H)/g)];
    const values = [...new Set(hits.map(m=>readDecimal(m[1])).filter(n=>n > 0 && n <= 9999999.9))];
    if (values.length === 1) suggestions.push({field:"odometer",label:"Hodômetro (km)",value:Math.round(values[0]*10)/10});
  }
  if (kind === "pump") {
    const money = clean.match(/(?:R\$|TOTAL(?: A PAGAR)?|VALOR)\s*[:=]?\s*(\d[\d.,]*)/);
    const liters = clean.match(/(?:LITROS|VOLUME)\s*[:=]?\s*(\d[\d.,]*)/);
    if (money) {add("fuelAmount","Valor do combustível (R$)",money[1],999999.99);add("amount","Total da despesa — valor da bomba (R$)",money[1],999999.99);}
    if (liters) add("liters","Litros abastecidos",liters[1],9999);
    warnings.push("A bomba mostra somente o combustível. Se a nota tiver ARLA ou outros itens, revise o total da despesa.");
  }
  if (kind === "invoice") {
    const date = clean.match(/(?:DATA (?:DE )?EMISSAO|EMISSAO)\s*[:=]?\s*(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (date) {
      const iso=`${date[3]}-${date[2]}-${date[1]}`;
      if (!Number.isNaN(Date.parse(iso+"T12:00:00Z")) && new Date(iso+"T12:00:00Z").toISOString().slice(0,10) === iso) suggestions.push({field:"date",label:"Data da despesa",value:iso});
    }
    const total = clean.match(/(?:VALOR TOTAL DA NOTA|TOTAL A PAGAR|VALOR A PAGAR)\s*[:=]?\s*(?:R\$\s*)?(\d[\d.,]*)/);
    if (total) add("amount","Valor total da nota (R$)",total[1],999999.99);
    const documents=[...clean.matchAll(/(?:^|\n)\s*(?:N[.°º: ]{1,5}|NUMERO\s*[:.]?\s*)(\d{3,12})(?!\d)/g)].map(m=>m[1]);
    if (documents.length && new Set(documents).size===1) suggestions.push({field:"documentNumber",label:"Número da nota",value:documents[0]});
    const header=clean.split(/DESTINATARIO|REMETENTE/)[0];
    const supplier = header.match(/(?:RAZAO SOCIAL|EMITENTE)\s*[:=]\s*([^\n]{4,120})/);
    if (supplier) suggestions.push({field:"supplier",label:"Fornecedor",value:supplier[1].trim()});
    if (!supplier) {
      const companies=header.split(/\n/).map(line=>line.trim()).filter(line=>/^[A-Z][A-Z &.]{6,110}\s(?:LTDA|S[./]A)\.?$/.test(line));
      if(new Set(companies).size===1) suggestions.push({field:"supplier",label:"Fornecedor",value:companies[0]});
    }
    const city=header.match(/(?:MUNICIPIO|CIDADE)\s*[:=]\s*([A-Z][A-Z .'-]{2,70})(?:\s*[/-]\s*([A-Z]{2}))?(?=\n|$)/);
    if(city) {
      const uf=city[2] || header.match(/(?:^|\n)UF\s*[:=]\s*([A-Z]{2})(?=\s|$)/)?.[1];
      suggestions.push({field:"location",label:"Cidade / local da nota",value:city[1].trim()+(uf ? ` / ${uf}` : "")});
    }
    if (/ARLA/.test(clean)) warnings.push("A nota menciona ARLA. Não some seus litros aos litros do diesel; confira o valor do combustível separado do total.");
  }
  if (!suggestions.length) warnings.push("Nenhum campo foi identificado com segurança. Você pode consultar o texto lido e preencher manualmente.");
  return {suggestions,warnings};
}

export function createLocalOcrJob(image, kind, onProgress = () => {}, options = {}) {
  let worker, cancelled = false, deadline, passIndex = 0;
  let rejectAbort;
  const abort = new Promise((_,reject) => {rejectAbort=reject;});
  const cancel = (message="Leitura cancelada. Você pode preencher manualmente.") => {
    if (cancelled) return;
    cancelled=true; clearTimeout(deadline); rejectAbort(new Error(message));
    if (worker) void worker.terminate().catch(()=>{});
  };
  const work = (async () => {
    const {createWorker} = await import("tesseract.js");
    if (cancelled) return;
    worker = await createWorker("por",1,{
      workerPath:"/ocr/worker.min.js",corePath:"/ocr",langPath:"/ocr",workerBlobURL:false,
      logger:m => {if (!cancelled) onProgress({status:m.status,progress:(passIndex + (m.status === "recognizing text" ? m.progress || 0 : 0))/2});},
    });
    if (cancelled) {await worker.terminate();return;}
    const candidates=[];
    const passes=2;
    for(let pass=0;pass<passes;pass++) {
      if(cancelled) return;
      passIndex=pass;
      onProgress({status:"preparing",progress:pass/passes});
      const prepared=await prepareOcrImage(image,{...options,threshold:pass === 1});
      if(cancelled) return;
      await worker.setParameters({tessedit_pageseg_mode:options.target ? "7" : "11",preserve_interword_spaces:"1",tessedit_char_whitelist:options.target ? "0123456789., " : ""});
      const {data}=await worker.recognize(prepared,{rotateAuto:!options.target},{text:true,blocks:true});
      const lines=data.blocks?.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines)) || [];
      const reliable=lines.filter(line=>line.confidence>=65).map(line=>line.text).join("\n");
      const extracted=options.target ? extractNumericField(data.text,options.target,data.confidence) : extractExpenseFields(reliable || data.text,kind,reliable ? 65 : data.confidence);
      candidates.push({...extracted,text:readableText(reliable),confidence:data.confidence});
    }
    // Never combine conflicting readings into a seemingly certain value.
    const best=candidates.sort((a,b)=>b.suggestions.length-a.suggestions.length || b.confidence-a.confidence)[0];
    best.suggestions=best.suggestions.filter(item=>!candidates.some(other=>other.suggestions.some(s=>s.field===item.field && s.value!==item.value)));
    if(!best.suggestions.length) best.warnings=["Não conseguimos confirmar os dados desta foto. Ajuste a área de leitura ou preencha manualmente."];
    return best;
  })();
  deadline=setTimeout(()=>cancel("A leitura demorou mais que o esperado. Continue manualmente ou tente uma foto mais nítida."),60000);
  return {cancel,promise:Promise.race([work,abort]).finally(()=>{clearTimeout(deadline);if(worker && !cancelled) void worker.terminate().catch(()=>{});})};
}

export function readableText(text) {
  return text.split(/\n/).map(line=>line.trim()).filter(line=>/[A-Za-zÀ-ÿ]{4,}|\d{3,}/.test(line) && (line.match(/[A-Za-zÀ-ÿ0-9]/g)||[]).length >= line.length*.55).join("\n");
}
export function extractNumericField(text,target,confidence) {
  const fields={odometer:["Hodômetro (km)",9999999.9],fuelAmount:["Valor do combustível (R$)",999999.99],liters:["Litros abastecidos",9999]};
  const field=fields[target];
  const token=text.trim();
  // A selected single number must retain its decimal separator. Never guess missing cents.
  const valid=/^\d{1,7}(?:[.,]\d{1,3})?$/.test(token);
  const value=Number(token.replace(",","."));
  return {suggestions:field && confidence>=60 && valid && value>0 && value<=field[1] && (target==='odometer' || /[.,]/.test(token)) ? [{field:target,label:field[0],value}] : [],warnings:[]};
}

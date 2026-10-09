import React, { useEffect, useRef, useState } from "react";
import ExpensePhotoAssist from "./expense-photo-assist.jsx";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const currency = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const referenceDate = (value, dateOnly=false) => {
  if(!value)return "Data não informada";
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.split("-").reverse().join("/");
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Data não informada" : parsed.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",...(!dateOnly ? {hour:"2-digit",minute:"2-digit"} : {})});
};
const number = value => Number(String(value).replace(/\./g, "").replace(",", "."));
const steps = ["Tipo", "Veículo", "KM", "Valores", "Local", "Nota", "Revisão"];
const lastStep = steps.length - 1;
// Decimal keyboards vary by phone locale; accept both comma and period.
const decimalInput = (raw, precision) => {
  const cleaned = raw.replace(/[^0-9,.]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "") : cleaned.replace(".", ",");
  const [integer, ...fraction] = normalized.split(",");
  return integer.slice(0, 7) + (fraction.length ? `,${fraction.join("").slice(0, precision)}` : "");
};
const categories = [
  ["Abastecimento", "⛽", "Combustível, litros e quilometragem"],
  ["Manutenção", "🔧", "Serviços e reparos no veículo"],
  ["Outros", "🧾", "Pedágio, estacionamento e outras despesas"],
];
async function prepareReceipt(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  if (file.size > 15000000) throw new Error("A foto deve ter até 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", .82);
    if (data.length > 1500000) data = canvas.toDataURL("image/jpeg", .6);
    if (data.length > 1500000) throw new Error("A foto ficou muito grande. Tente uma foto menor.");
    return data;
  } finally { URL.revokeObjectURL(url); }
}

export default function DriverExpenseWizard({ record, user, fleet, fleetLoading, fleetError, onRetryFleet, onSaved, onClose, manager, Dialog, FleetSelect, sanitizeAmount }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [category, setCategory] = useState(record?.service || "");
  const [plate, setPlate] = useState(record?.plate || "");
  const [date, setDate] = useState(record?.expenseDate || today());
  const [amount, setAmount] = useState(record ? record.amount.toFixed(2).replace(".", ",") : "");
  const [liters, setLiters] = useState(record?.liters == null ? "" : String(record.liters).replace(".", ","));
  const [odometer, setOdometer] = useState(record?.odometer == null ? "" : String(record.odometer).replace(".", ","));
  const [supplier, setSupplier] = useState(record?.supplier || "");
  const [location, setLocation] = useState(record?.location || "");
  const [locationReference,setLocationReference]=useState(null);
  const [locationLoading,setLocationLoading]=useState(false);
  const [locationError,setLocationError]=useState("");
  const [locationAttempt,setLocationAttempt]=useState(0);
  const locationEdited=useRef(Boolean(record)), locationPlate=useRef(plate), locationAuto=useRef(false);
  function editLocation(value){locationEdited.current=true;locationAuto.current=false;setLocation(value);}
  useEffect(()=>{
    let active=true;
    if(locationPlate.current!==plate){locationPlate.current=plate;locationEdited.current=false;locationAuto.current=false;setLocation("");}
    if(date!==today() && locationAuto.current){setLocation("");locationAuto.current=false;}
    setLocationReference(null);setLocationError("");setLocationLoading(false);
    if(!fleet.includes(plate) || !window.RB_API.getPlantaoLocation)return;
    setLocationLoading(true);
    window.RB_API.getPlantaoLocation(plate).then(data=>{
      if(!active)return;
      if(!data.location){setLocationError("Localização indisponível. Você pode informar a cidade manualmente.");return;}
      setLocationReference(data);
      if(!locationEdited.current && date===today() && !record){setLocation(data.location);locationAuto.current=true;}
    }).catch(()=>{if(active)setLocationError("Não foi possível consultar a localização. Preencha manualmente ou tente novamente.");}).finally(()=>{if(active)setLocationLoading(false);});
    return()=>{active=false;};
  },[plate,date,fleet,record,locationAttempt]);
  const [note, setNote] = useState(record?.note || "");
  const [documentNumber, setDocumentNumber] = useState(record?.document || "");
  const [photos, setPhotos] = useState({});
  const [fuelAmount, setFuelAmount] = useState(record?.fuelAmount == null ? "" : record.fuelAmount.toFixed(2).replace(".", ","));
  const [hasArla,setHasArla] = useState(record?.arlaLiters != null);
  const [arlaLiters,setArlaLiters] = useState(record?.arlaLiters == null ? "" : String(record.arlaLiters).replace(".",","));
  const [arlaAmount,setArlaAmount] = useState(record?.arlaAmount == null ? "" : record.arlaAmount.toFixed(2).replace(".",","));
  const [kmReference,setKmReference] = useState(null);
  const [kmLoading,setKmLoading] = useState(false);
  const [kmError,setKmError] = useState("");
  const [kmAttempt,setKmAttempt] = useState(0);
  const kmEdited=useRef(Boolean(record)), kmPlate=useRef(plate), kmAuto=useRef(false);
  function editOdometer(value) {kmEdited.current=true;kmAuto.current=false;setOdometer(value);}
  useEffect(()=>{
    let active=true;
    if(kmPlate.current!==plate){kmPlate.current=plate;kmEdited.current=false;kmAuto.current=false;setOdometer("");}
    if(date!==today() && kmAuto.current){setOdometer("");kmAuto.current=false;}
    setKmReference(null);setKmError("");setKmLoading(false);
    if(!fleet.includes(plate) || !window.RB_API.getPlantaoOdometer) return;
    setKmLoading(true);
    window.RB_API.getPlantaoOdometer(plate).then(data=>{
      if(!active)return;
      const value=data.odometer == null ? null : Number(data.odometer);
      if(value==null || !Number.isFinite(value) || value<0 || value>9999999.9){setKmError("Sem km disponível para este veículo. Informe o valor do painel.");return;}
      const reference={...data,odometer:Math.round(value*10)/10};setKmReference(reference);
      if(!kmEdited.current && date===today() && !record){setOdometer(String(reference.odometer).replace(".",","));kmAuto.current=true;}
    }).catch(()=>{if(active)setKmError("Não foi possível buscar o km. Você pode digitar ou tentar novamente.");}).finally(()=>{if(active)setKmLoading(false);});
    return()=>{active=false;};
  },[plate,date,fleet,record,kmAttempt]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const knownPhotos=record?.photoKinds || {invoice:record?.hasReceipt};
  const hasPhoto=["odometer","pump","invoice"].some(kind=>photos[kind] !== undefined ? Boolean(photos[kind]) : knownPhotos[kind]);
  const applySuggestion=(field,value)=>{
    const formatted=typeof value === "number" ? String(value).replace(".",",") : value;
    ({odometer:editOdometer,liters:setLiters,amount:setAmount,fuelAmount:setFuelAmount,date:setDate,supplier:setSupplier,location:editLocation,documentNumber:setDocumentNumber})[field]?.(formatted);
  };
  const loadSavedPhotos=async()=>{
    if(!record?.id)return {};
    const data=await window.RB_API.receiptPlantao(record.id,manager);
    return data.photos || {invoice:data.receipt};
  };
  const fuel = category === "Abastecimento";
  function validate() {
    if (!category) return "Escolha o tipo de despesa.";
    if (step >= 1 && (!fleet.includes(plate) || fleetLoading || fleetError)) return "Selecione uma placa cadastrada na frota.";
    if (step >= 1 && (!date || date > today())) return "Informe a data da despesa, sem data futura.";
    if (step >= 3 && (!Number.isFinite(number(amount)) || number(amount) <= 0 || number(amount) > 999999.99)) return "Informe um valor entre R$ 0,01 e R$ 999.999,99.";
    if (step >= 3 && fuel && (!Number.isFinite(number(liters)) || number(liters) <= 0 || number(liters) > 9999)) return "Informe a quantidade de litros abastecidos.";
    if (step >= 2 && ((fuel && odometer === "") || (odometer !== "" && (!/^\d+(?:,\d)?$/.test(odometer) || number(odometer) > 9999999.9)))) return "Informe o hodômetro em quilômetros, com até uma casa decimal.";
    if (step >= 3 && fuel && fuelAmount && (!Number.isFinite(number(fuelAmount)) || number(fuelAmount) <= 0 || number(fuelAmount) > number(amount))) return "O valor do combustível deve ser positivo e não pode superar o total da despesa.";
    if (step >= 3 && fuel && hasArla) {
      if (!(number(arlaLiters)>0) || number(arlaLiters)>9999 || !(number(arlaAmount)>0) || number(arlaAmount)>999999.99) return "Informe os litros e o valor do ARLA.";
      if (Math.round((number(fuelAmount)+number(arlaAmount))*100)>Math.round(number(amount)*100)) return "Combustível e ARLA não podem superar o total da despesa.";
    }
    if (step >= 5 && category === "Outros" && !note.trim()) return "Descreva a despesa para a conferência.";
  }
  async function advance(event) {
    event.preventDefault();
    if (busy.current || photoLoading || user.readOnly) return;
    const invalid = validate(); setError(invalid || ""); if (invalid) return;
    if (step < lastStep) { setStep(step + 1); return; }
    busy.current = true; setSaving(true);
    try {
      const body = { source: "motorista", service: category, plate, expenseDate: date, amount: number(amount),
        liters: fuel ? number(liters) : null, odometer: odometer === "" ? null : number(odometer), supplier: supplier.trim(),
        location: location.trim(), note: note.trim(), document: documentNumber.trim(),
        arlaLiters: fuel && hasArla ? number(arlaLiters) : null, arlaAmount: fuel && hasArla ? number(arlaAmount) : null,
        photos, fuelAmount: fuel && fuelAmount ? number(fuelAmount) : null,
      };
      const result = record ? await window.RB_API.updatePlantao(record.id, { ...body, version: record.version }, manager) : await window.RB_API.createPlantao(body);
      onSaved(result.record); setDone(true);
    } catch (error) { setError(error.message || "Não foi possível enviar. Seus dados continuam aqui para tentar novamente."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <Dialog onClose={onClose} saving={saving || photoLoading} step={done ? "done" : step}>
    {done ? <div className="mp-complete driver-complete">
      <span className="driver-trophy" aria-hidden="true">✓</span>
      <p className="mp-eyebrow">JORNADA CONCLUÍDA · {steps.length} DE {steps.length}</p>
      <h2 id="mp-edit-title" data-step-title tabIndex={-1}>{record ? "Despesa atualizada!" : "Despesa enviada!"}</h2>
      <p>{plate} · {category} · {currency(number(amount))}</p>
      <p>Seu registro chegou à conferência. Acompanhe o pagamento e o lançamento na sua lista.</p>
      <button className="mp-submit" onClick={onClose}>Ver minhas despesas</button>
    </div> : <form className="mp-form mp-wizard driver-wizard" onSubmit={advance} noValidate>
      <header className="mp-wizard-header">
        <div className="mp-section-title"><div><p className="mp-eyebrow">{record ? "AJUSTAR DESPESA" : "REGISTRO DE BORDO"} · ETAPA {step + 1} DE {steps.length}</p>
          <h2 id="mp-edit-title" data-step-title tabIndex={-1}>{["O que aconteceu na viagem?", "Em qual veículo e dia?", "Qual é a quilometragem?", fuel ? "Quantos litros e qual o valor?" : "Qual foi o valor da despesa?", fuel ? "Em qual posto abasteceu?" : "Quem forneceu o serviço?", "Quer acrescentar um comprovante?", "Tudo certo para enviar?"][step]}</h2></div>
          <button type="button" className="mp-close" aria-label="Fechar despesa" disabled={saving || photoLoading} onClick={onClose}>×</button></div>
        <div className="mp-progress" role="progressbar" aria-label="Progresso da despesa" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{width:`${(step + 1) / steps.length * 100}%`}} /></div>
        <ol className="mp-steps driver-steps">{steps.map((label, i) => <li key={label} className={i <= step ? "is-active" : ""} aria-current={i === step ? "step" : undefined}><span>{i < step ? "✓" : i + 1}</span>{label}</li>)}</ol>
      </header>
      <div className="mp-wizard-body">
        <p className="driver-encouragement">{["Um passo de cada vez. Vamos começar pelo tipo de despesa.", "Boa! Agora identifique o veículo e a data.", "Primeiro, informe o km que aparece no painel.", fuel ? "Agora informe os litros e os valores do abastecimento." : "Informe quanto custou.", "Identifique o estabelecimento e a cidade, se souber.", "Quase lá! Uma foto ajuda a equipe a conferir.", "Último passo: confira os dados e envie com tranquilidade."][step]}</p>
        {step === 0 && <div className="driver-categories">{categories.map(([name, icon, description]) => <button type="button" key={name} aria-pressed={category === name} className={category === name ? "selected" : ""} onClick={() => {setCategory(name);setError("");}}><span aria-hidden="true">{icon}</span><span><strong>{name}</strong><small>{description}</small></span><b aria-hidden="true">{category === name ? "✓" : "→"}</b></button>)}</div>}
        {step === 1 && <><FleetSelect fleet={fleet} value={plate} onChange={setPlate} loading={fleetLoading} disabled={fleetLoading || Boolean(fleetError)} />
          {fleetError && <p role="alert">{fleetError} <button type="button" onClick={onRetryFleet}>Tentar carregar frota</button></p>}
          <label>Data da despesa<input type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></label>
          <p className="mp-field-help">Registrado por {user.nome || user.login}.</p></>}
        {step === 2 && <><label>Hodômetro (km){!fuel && " — opcional"}<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" aria-describedby="driver-km-help" placeholder="Ex.: 197611,7" value={odometer} onChange={e => editOdometer(decimalInput(e.target.value,1))} /></label><small id="driver-km-help" className="mp-field-help">Use a quilometragem total do veículo, não o contador parcial.</small>
          {kmLoading && <p role="status">Buscando o último km do veículo…</p>}
          {kmError && <p role="status">{kmError} <button type="button" onClick={()=>setKmAttempt(n=>n+1)}>Buscar km novamente</button></p>}
          {kmReference && <aside className="driver-reference-card" aria-label="Referência de quilometragem">
            <div className="driver-reference-top"><span className="driver-reference-tag">{kmReference.source === "telemetria" ? "TELEMETRIA" : "ÚLTIMO ABASTECIMENTO"}</span><time>{referenceDate(kmReference.date,kmReference.source!=="telemetria")}</time></div>
            <div className="driver-reference-main"><strong>{kmReference.odometer.toLocaleString("pt-BR")} <small>km</small></strong><button className="driver-reference-use" type="button" disabled={odometer!=="" && number(odometer)===kmReference.odometer} onClick={()=>editOdometer(String(kmReference.odometer).replace(".",","))}>{odometer!=="" && number(odometer)===kmReference.odometer ? "✓ Km aplicado" : "Usar este km"}</button></div>
            <p>{date===today() ? "Último km disponível. Confira no painel e ajuste se necessário." : "Esta referência pode ser posterior à despesa. Informe o km daquela data."}</p>
          </aside>}

        </>}
        {step === 3 && <>
          {fuel && <label>Litros abastecidos<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="Ex.: 250,500" value={liters} onChange={e => setLiters(decimalInput(e.target.value,3))} /></label>}
          <label>Valor total da despesa (R$)<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="0,00" value={amount} onChange={e => setAmount(sanitizeAmount(e.target.value))} /></label>
          {fuel && <label>Valor só do combustível (R$) — opcional<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" value={fuelAmount} placeholder="Sem ARLA ou outros itens" onChange={e=>setFuelAmount(sanitizeAmount(e.target.value))} /></label>}
          {fuel && <div className={`driver-arla ${hasArla ? "is-enabled" : ""}`}><label className="driver-arla-toggle"><span className="driver-arla-title"><strong>Adicionar ARLA</strong><small>Litros e valor separados do diesel</small></span><input type="checkbox" aria-label="Adicionar ARLA neste abastecimento" checked={hasArla} onChange={e=>setHasArla(e.target.checked)}/><span className="driver-toggle-track" aria-hidden="true"/></label>
            {hasArla && <div className="driver-arla-fields">
              <label>Litros de ARLA<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="Ex.: 41,500" value={arlaLiters} onChange={e=>setArlaLiters(decimalInput(e.target.value,3))}/></label>
              <label>Valor do ARLA (R$)<input type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="0,00" value={arlaAmount} onChange={e=>setArlaAmount(sanitizeAmount(e.target.value))}/></label>
              {number(fuelAmount)>0 && number(arlaAmount)>0 && <button type="button" onClick={()=>setAmount((number(fuelAmount)+number(arlaAmount)).toFixed(2).replace(".",","))}>Usar soma de combustível + ARLA no total</button>}
            </div>}
          </div>}
          {fuel && number(liters) > 0 && number(fuelAmount) > 0 && number(fuelAmount) <= number(amount) && <p className="driver-unit-price">Preço do combustível por litro: <strong>{currency(number(fuelAmount) / number(liters))}</strong></p>}</>}
        {step === 4 && <>
          <label>{fuel ? "Posto — opcional" : "Fornecedor — opcional"}<input value={supplier} maxLength={120} enterKeyHint="next" onChange={e => setSupplier(e.target.value)} /></label>
          <label>Cidade / local — opcional<input value={location} maxLength={160} enterKeyHint="next" onChange={e => editLocation(e.target.value)} /></label>
          {locationLoading && <p role="status">Buscando a localização do veículo…</p>}
          {locationError && <p role="status">{locationError} <button className="driver-reference-use" type="button" onClick={()=>setLocationAttempt(n=>n+1)}>Tentar novamente</button></p>}
          {locationReference && <aside className="driver-reference-card driver-location-reference" aria-label="Localização pela telemetria">
            <div className="driver-reference-top"><span className="driver-reference-tag">LOCALIZAÇÃO DO VEÍCULO</span><time>{referenceDate(locationReference.date)}</time></div>
            <strong>{locationReference.city || locationReference.location}</strong>{locationReference.city && locationReference.address && <p>{locationReference.address}</p>}
            <p>{date===today() ? "Última posição recebida. Você pode alterar a cidade e o local acima." : "Esta posição pode ser posterior à despesa. Informe o local daquele dia."}</p>
            <button className="driver-reference-use" type="button" disabled={location===locationReference.location} onClick={()=>editLocation(locationReference.location)}>{location===locationReference.location ? "✓ Local aplicado" : "Usar esta localização"}</button>
          </aside>}

        </>}
        {[2,3,4,5].includes(step) && (fuel || step !== 3) && <details className="driver-step-photos" key={step}>
          <summary><span className="driver-photo-summary-icon" aria-hidden="true">+</span><span><strong>{step === 2 ? "Foto do painel" : step === 3 ? "Foto da bomba" : step === 4 ? "Preencher com a nota" : "Nota ou comprovante"}</strong><small>{step === 4 ? "Use os dados da nota para identificar o posto" : "Adicionar imagem ou tentar a leitura"}</small></span><span className="driver-photo-chevron" aria-hidden="true">⌄</span></summary>
          <ExpensePhotoAssist photos={photos} knownPhotos={knownPhotos} fuel={fuel} suggestionFields={step === 4 ? ["supplier","location"] : undefined} photoKinds={[step === 2 ? "odometer" : step === 3 ? "pump" : "invoice"]} preparePhoto={prepareReceipt}
            onPhoto={(kind,photo)=>setPhotos(current=>({...current,[kind]:photo}))} onApply={applySuggestion} onLoadSaved={loadSavedPhotos} onBusy={setPhotoLoading}
            values={{amount,fuelAmount,liters,odometer,date,supplier,location,documentNumber}} />
        </details>}
        {step === 5 && <>
          <label>Número da nota / comprovante — opcional<input maxLength={80} value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} /></label>
          <label>{category === "Outros" ? "Descreva a despesa" : "O que foi feito? — opcional"}<textarea maxLength={300} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Conte o que aconteceu para ajudar a conferência." /></label></>}
        {step === lastStep && <section className="mp-review"><div className="mp-review-total"><span>{category} · {plate}</span><strong>{currency(number(amount))}</strong></div><dl>
          {[["Data", date.split("-").reverse().join("/")], ["Fornecedor", supplier || "Não informado"], ["Local", location || "Não informado"], ...(fuel ? [["Litros", liters], ["Valor do combustível",fuelAmount ? currency(number(fuelAmount)) : "Não informado"]] : []), ...(fuel && hasArla ? [["Litros de ARLA",arlaLiters],["Valor do ARLA",currency(number(arlaAmount))]] : []), ["Hodômetro", odometer ? `${odometer} km` : "Não informado"], ["Comprovante", documentNumber || "Não informado"], ["Foto", hasPhoto ? "Anexada" : "Sem foto"], ["Observação", note || "Sem observação"]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl></section>}
        {error && <p className="mp-feedback error" role="alert">{error}</p>}
      </div>
      <footer className="mp-wizard-actions"><button className="mp-cancel-edit" type="button" disabled={saving || photoLoading} onClick={() => step ? (setStep(step - 1),setError("")) : onClose()}>{step ? "Voltar" : "Cancelar"}</button>
        <button className="mp-submit" type="submit" disabled={saving || photoLoading || user.readOnly}>{saving ? "Enviando…" : step === lastStep ? record ? "Salvar despesa" : "Enviar para conferência" : "Próximo passo"}<span aria-hidden="true">→</span></button>
        <p>{step === lastStep ? "Seu registro será salvo ao enviar." : `${step + 1} de ${steps.length} etapas · Você está avançando!`}</p></footer>
    </form>}
  </Dialog>;
}

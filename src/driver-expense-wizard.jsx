import ExpensePaymentDetails from "./expense-payment-details.jsx";
import SupplierSelect from "./expense-supplier-select.jsx";
import ExpenseWhatsappSummary from "./expense-whatsapp-summary.jsx";
import React, { useEffect, useRef, useState } from "react";
import ExpenseDocumentFields, {documentTypes} from "./expense-document-fields.jsx";
import ExpensePhotoAssist from "./expense-photo-assist.jsx";
import ExpenseUnloading, {cteLabel,documentItinerary} from './expense-unloading.jsx';
import {readExpenseDraft,clearExpenseDraft,useExpenseDraft} from "./expense-draft.js";

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
  ["Descarga", "📦", "Chapa e outros custos de descarga"],
  ["Abastecimento", "⛽", "Combustível, litros e quilometragem"],
  ["Manutenção", "🔧", "Serviços e reparos no veículo"],
  ["Outros", "🧾", "Pedágio, estacionamento e outras despesas"],
];
export async function prepareReceipt(file) {
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

export default function DriverExpenseWizard({ record, user, fleet, fleetLoading, fleetError, onRetryFleet, onSaved, onClose, onMaintenance, manager, Dialog, FleetSelect, sanitizeAmount }) {
  const [draft] = useState(()=>readExpenseDraft(user,"expense",record));
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [savedRecord,setSavedRecord] = useState(null);
  const [paymentDetails,setPaymentDetails] = useState(draft?.paymentDetails ?? record?.paymentDetails ?? null);
  const [supplierSelection,setSupplierSelection] = useState(draft?.supplierSelection ?? {codigo:record?.supplierCode,empresa:record?.supplierCompany});
  const [category, setCategory] = useState(draft?.category ?? (record?.service || ""));
  const [documentType,setDocumentType]=useState(draft?.documentType ?? record?.documentType ?? '');
  const [tireFireNumber,setTireFireNumber]=useState(draft?.tireFireNumber ?? record?.tireFireNumber ?? '');
  const [expenseTrip,setExpenseTrip]=useState(draft?.expenseTrip ?? (record?.trip ? {trip:record.trip} : null));
  const [unloading,setUnloading]=useState(draft?.unloading ?? record?.unloading ?? null);
  const [plate, setPlate] = useState(draft?.plate ?? (record?.plate || (user.expenseProfile === "motorista" ? fleet[0] || "" : "")));
  const [date, setDate] = useState(draft?.date ?? (record?.expenseDate || today()));
  function changePlate(value) {if(value===plate)return;setPlate(value);setUnloading(null);setExpenseTrip(null);}
  const [dateConfirmed, setDateConfirmed] = useState(Boolean(draft?.date || record?.expenseDate));
  function editDate(value) { setDate(value); setDateConfirmed(true); }
  const [expenseTime,setExpenseTime] = useState(draft?.expenseTime ?? record?.expenseTime ?? "");
  const [receiptReason,setReceiptReason] = useState(draft?.receiptReason ?? record?.receiptReason ?? "");
  const [amount, setAmount] = useState(draft?.amount ?? (record ? record.amount.toFixed(2).replace(".", ",") : ""));
  const [liters, setLiters] = useState(draft?.liters ?? (record?.liters == null ? "" : String(record.liters).replace(".", ",")));
  const [odometer, setOdometer] = useState(record?.odometer == null ? "" : String(record.odometer).replace(".", ","));
  const [supplier, setSupplier] = useState(draft?.supplier ?? (record?.supplier || ""));
  const [location, setLocation] = useState(draft?.location ?? (record?.location || ""));
  const [locationReference,setLocationReference]=useState(null);
  const [locationLoading,setLocationLoading]=useState(false);
  const [locationError,setLocationError]=useState("");
  const [locationAttempt,setLocationAttempt]=useState(0);
  const locationEdited=useRef(Boolean(record || draft?.location)), locationPlate=useRef(plate), locationAuto=useRef(false);
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
  const [note, setNote] = useState(draft?.note ?? (record?.note || ""));
  const [documentNumber, setDocumentNumber] = useState(draft?.documentNumber ?? (record?.document || ""));
  const [photos, setPhotos] = useState(draft?.photos ?? ({}));
  const [fuelType,setFuelType] = useState(draft?.fuelType ?? (record?.fuelType || ""));
  const [customerName,setCustomerName] = useState(draft?.customerName ?? (record?.customerName || ""));
  const [fuelAmount, setFuelAmount] = useState(draft?.fuelAmount ?? (record?.fuelAmount == null ? "" : record.fuelAmount.toFixed(2).replace(".", ",")));
  const [hasArla,setHasArla] = useState(draft?.hasArla ?? (record?.arlaLiters != null));
  const [arlaLiters,setArlaLiters] = useState(draft?.arlaLiters ?? (record?.arlaLiters == null ? "" : String(record.arlaLiters).replace(".",",")));
  const [arlaAmount,setArlaAmount] = useState(draft?.arlaAmount ?? (record?.arlaAmount == null ? "" : record.arlaAmount.toFixed(2).replace(".",",")));
  const [kmReference,setKmReference] = useState(null);
  const [kmLoading,setKmLoading] = useState(false);
  const [kmError,setKmError] = useState("");
  const [kmAttempt,setKmAttempt] = useState(0);
  useEffect(()=>{
    let active=true;
    setKmReference(null);setKmError("");setKmLoading(false);setOdometer("");
    const timeKey = value => value?.length===5 ? `${value}:00` : value || "";
    if (record && record.plate===plate && record.expenseDate===date && timeKey(record.expenseTime)===timeKey(expenseTime) && record.odometer!=null) {
      setOdometer(String(record.odometer).replace(".",","));
      setKmReference({odometer:record.odometer,date:record.odometerDate,source:"saved"});
      return;
    }
    if(!fleet.includes(plate) || !date || date>today()) return;
    if(!expenseTime){setKmError("Confira o horário da nota na primeira etapa.");return;}
    if(!window.RB_API.getPlantaoOdometer){setKmError("Consulta de telemetria indisponivel.");return;}
    setKmLoading(true);
    window.RB_API.getPlantaoOdometer(plate,date,expenseTime).then(data=>{
      if(!active)return;
      const value=data.odometer == null ? null : Number(data.odometer);
      if(data.source!=="telemetria" || value==null || !Number.isFinite(value) || value<=0 || value>9999999.9){setKmError("Sem leitura de telemetria para esta placa na data da despesa.");return;}
      const reference={...data,odometer:Math.round(value*10)/10};
      setKmReference(reference);setOdometer(String(reference.odometer).replace(".",","));
    }).catch(()=>{if(active)setKmError("Nao foi possivel consultar a telemetria. Tente novamente.");}).finally(()=>{if(active)setKmLoading(false);});
    return()=>{active=false;};
  },[plate,date,expenseTime,fleet,kmAttempt,record]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const draftWarning = useExpenseDraft(user,"expense",record,{category,plate,date,expenseTime,amount,liters,supplier,location,note,documentNumber,photos,fuelType,customerName,fuelAmount,hasArla,arlaLiters,arlaAmount,receiptReason,unloading,documentType,tireFireNumber,expenseTrip,paymentDetails,supplierSelection},!done && Boolean(category || photos.invoice));
  const knownPhotos=record?.photoKinds || {invoice:record?.hasReceipt};
  const hasPhoto=["odometer","pump","invoice"].some(kind=>photos[kind] !== undefined ? Boolean(photos[kind]) : knownPhotos[kind]);
  const applySuggestion=(field,value)=>{
    const formatted=typeof value === "number" ? String(value).replace(".",",") : value;
    ({expenseTime:setExpenseTime,fuelType:setFuelType,customerName:setCustomerName,liters:setLiters,amount:setAmount,fuelAmount:setFuelAmount,date:editDate,supplier:value=>{setSupplier(value);setSupplierSelection({});},location:editLocation,documentNumber:setDocumentNumber})[field]?.(formatted);
  };
  const loadSavedPhotos=async()=>{
    if(!record?.id)return {};
    const data=await window.RB_API.receiptPlantao(record.id,manager);
    return data.photos || {invoice:data.receipt};
  };
  const fuel = category === "Abastecimento";
  const stepIndexes = category && !fuel ? [0,1,3,4,5,6] : [0,1,2,3,4,5,6];
  const stepNumber = stepIndexes.indexOf(step) + 1;
  const [showTimeCorrection, setShowTimeCorrection] = useState(false);
  function validate() {
    if (step === lastStep && paymentDetails && (!paymentDetails.holderName.trim() || !paymentDetails.pixKey.trim())) return "Preencha o nome do titular e a chave PIX, ou desative os dados para pagamento.";
    if (!category) return "Escolha o tipo de despesa.";
    if (step >= 1 && (!fleet.includes(plate) || fleetLoading || fleetError)) return "Selecione uma placa cadastrada na frota.";
    if (step >= 1 && (!date || date > today())) return "Informe a data da despesa, sem data futura.";
    if (step >= 1 && fuel && !expenseTrip?.trip) return "Vincule uma viagem da placa para registrar o abastecimento.";
    if (step >= 1 && category === 'Descarga' && (!unloading?.trip || !unloading?.cte || typeof unloading.reimbursement !== 'boolean')) return 'Selecione a viagem, o documento (CT-e ou orçamento) e informe se haverá reembolso da descarga.';
    const sameSavedReading=record && record.plate===plate && record.expenseDate===date && !record.expenseTime && !expenseTime && record.odometer!=null;
    if (fuel && !expenseTime && !sameSavedReading) return "O horário não foi identificado. Leia a nota ou informe o horário em Ajustar horário da nota nesta primeira etapa.";
    if (expenseTime && new Date(`${date}T${expenseTime.length===5 ? expenseTime+":00" : expenseTime}-03:00`)>new Date()) return "O horário da despesa não pode estar no futuro.";
    if (step >= 3 && (!Number.isFinite(number(amount)) || number(amount) <= 0 || number(amount) > 999999.99)) return "Informe um valor entre R$ 0,01 e R$ 999.999,99.";
    if (step >= 3 && fuel && (!Number.isFinite(number(liters)) || number(liters) <= 0 || number(liters) > 9999)) return "Informe a quantidade de litros abastecidos.";
    if (step >= 2 && fuel && (kmLoading || !kmReference)) return "Aguarde uma leitura valida da telemetria para continuar.";
    if (step >= 2 && ((fuel && odometer === "") || (odometer !== "" && (!/^\d+(?:,\d)?$/.test(odometer) || number(odometer) > 9999999.9)))) return "Informe o hodômetro em quilômetros, com até uma casa decimal.";
    if (step >= 3 && fuel && fuelAmount && (!Number.isFinite(number(fuelAmount)) || number(fuelAmount) <= 0 || number(fuelAmount) > number(amount))) return "O valor do combustível deve ser positivo e não pode superar o total da despesa.";
    if (step >= 3 && fuel && hasArla) {
      if (!(number(arlaLiters)>0) || number(arlaLiters)>9999 || !(number(arlaAmount)>0) || number(arlaAmount)>999999.99) return "Informe os litros e o valor do ARLA.";
      if (Math.round((number(fuelAmount)+number(arlaAmount))*100)>Math.round(number(amount)*100)) return "Combustível e ARLA não podem superar o total da despesa.";
    }
    if (step >= 4 && !supplier.trim()) return "Informe o fornecedor, mesmo que não esteja cadastrado.";
    if (step >= 5 && !documentType) return "Selecione o tipo de documento fiscal ou informe que não há documento.";
    if (step >= 5 && documentType==='nf_servico' && !documentNumber.trim()) return "Informe o número da nota fiscal de serviço.";
    if (step >= 5 && ["Outros","Descarga"].includes(category) && !note.trim()) return "Descreva a despesa para a conferência.";
    const hasInvoice=photos.invoice !== undefined ? Boolean(photos.invoice) : Boolean(knownPhotos.invoice);
    if (step>=5 && !hasInvoice && receiptReason.trim().length<10) return "Anexe a nota ou justifique a ausência com pelo menos 10 caracteres.";
  }
  async function advance(event) {
    event.preventDefault();
    if (busy.current || photoLoading || user.readOnly) return;
    const invalid = validate(); setError(invalid || ""); if (invalid) { if (step === 0 && fuel && !expenseTime) setShowTimeCorrection(true); return; }
    if (step === 0 && category === "Manutenção" && !record && onMaintenance) { onMaintenance(photos.invoice ? {photos,date,amount,supplier,documentNumber,plate} : null); return; }
    if (step < lastStep) { setStep(stepIndexes[stepNumber]); return; }
    busy.current = true; setSaving(true);
    try {
      const body = { source: record?.source || "motorista", service: category, plate, expenseDate: date, expenseTime:expenseTime || null, receiptReason, documentType,tireFireNumber:category==='Manutenção' ? tireFireNumber.trim() : '',trip:category!=='Descarga' && expenseTrip?.trip ? {company:expenseTrip.trip.company,number:expenseTrip.trip.number} : null, amount: number(amount),
        ...(category==='Descarga' ? {unloading:{trip:{company:unloading.trip.company,number:unloading.trip.number},cte:{company:unloading.cte.company,series:unloading.cte.series,code:unloading.cte.code},reimbursement:unloading.reimbursement}} : {}),
        liters: fuel ? number(liters) : null, odometer: odometer === "" ? null : number(odometer), supplier: supplier.trim(), supplierCode:supplierSelection.codigo ?? null,supplierCompany:supplierSelection.empresa ?? null,
        paymentDetails:paymentDetails ? {holderName:paymentDetails.holderName.trim(),pixKey:paymentDetails.pixKey.trim()} : null,
        fuelType: fuelType.trim(), customerName: customerName.trim(), location: location.trim(), note: note.trim(), document: documentNumber.trim(),
        arlaLiters: fuel && hasArla ? number(arlaLiters) : null, arlaAmount: fuel && hasArla ? number(arlaAmount) : null,
        photos, fuelAmount: fuel && fuelAmount ? number(fuelAmount) : null,
      };
      const result = record ? await window.RB_API.updatePlantao(record.id, { ...body, version: record.version }, manager) : await window.RB_API.createPlantao(body);
      try {clearExpenseDraft(user,"expense",record);} catch { /* Saving the expense already succeeded. */ }
      setSavedRecord(result.record); onSaved(result.record); setDone(true);
    } catch (error) { setError(error.message || "Não foi possível enviar. Seus dados continuam aqui para tentar novamente."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <Dialog onClose={onClose} saving={saving || photoLoading} step={done ? "done" : step}>
    {done ? <div className="mp-complete driver-complete">
      <span className="driver-trophy" aria-hidden="true">✓</span>
      <p className="mp-eyebrow">JORNADA CONCLUÍDA · {stepIndexes.length} DE {stepIndexes.length}</p>
      <h2 id="mp-edit-title" data-step-title tabIndex={-1}>{record ? "Despesa atualizada!" : "Despesa enviada!"}</h2>
      <p>{plate} · {category} · {currency(number(amount))}</p>
      <p>Seu registro chegou à conferência. Acompanhe o pagamento e o lançamento na sua lista.</p>
      <ExpenseWhatsappSummary record={savedRecord}/>
      <button className="mp-submit" onClick={onClose}>Ver minhas despesas</button>
    </div> : <form className="mp-form mp-wizard driver-wizard" onSubmit={advance} noValidate>
      <header className="mp-wizard-header">
        <div className="mp-section-title"><div><p className="mp-eyebrow">{record ? "AJUSTAR DESPESA" : "REGISTRO DE BORDO"} · ETAPA {stepNumber} DE {stepIndexes.length}</p>
          <h2 id="mp-edit-title" data-step-title tabIndex={-1}>{["O que aconteceu na viagem?", "Em qual veículo e dia?", "Qual é a quilometragem?", fuel ? "Quantos litros e qual o valor?" : "Qual foi o valor da despesa?", fuel ? "Em qual posto abasteceu?" : "Quem forneceu o serviço?", "Confira a nota ou justificativa", "Tudo certo para enviar?"][step]}</h2></div>
          <button type="button" className="mp-close" aria-label="Fechar despesa" disabled={saving || photoLoading} onClick={onClose}>×</button></div>
        <div className="mp-progress" role="progressbar" aria-label="Progresso da despesa" aria-valuemin={0} aria-valuemax={stepIndexes.length} aria-valuenow={stepNumber}><span style={{width:`${stepNumber / stepIndexes.length * 100}%`}} /></div>
        <ol className="mp-steps driver-steps" style={{gridTemplateColumns:`repeat(${stepIndexes.length}, minmax(0, 1fr))`}}>{stepIndexes.map((i, position) => <li key={steps[i]} className={i <= step ? "is-active" : ""} aria-current={i === step ? "step" : undefined}><span>{i < step ? "✓" : position + 1}</span>{i < step ? <button type="button" className="mp-step-back" aria-label={`Voltar para ${steps[i]}`} disabled={saving || photoLoading} onClick={()=>{setStep(i);setError("");}}>{steps[i]}</button> : steps[i]}</li>)}</ol>
      </header>
      <div className="mp-wizard-body">
        {step !== 0 && draftWarning && <p role="status">{draftWarning}</p>}
        {step === 0 && <div className="driver-draft-bar"><p className="mp-field-help">{draftWarning || (draft ? "Rascunho recuperado. Confira os dados antes de enviar." : "Seu progresso é salvo neste aparelho.")}</p>
        {(draft || category || photos.invoice) && <button type="button" className="mp-cancel-edit" disabled={saving || photoLoading} onClick={()=>{try {clearExpenseDraft(user,"expense",record);onClose();} catch {setError("Não foi possível descartar o rascunho.");}}}>Descartar rascunho</button>}</div>}
        <p className="driver-encouragement" hidden={step === 0}>{["Um passo de cada vez. Vamos começar pelo tipo de despesa.", "Boa! Agora identifique o veículo e a data.", "Confira o km recebido automaticamente pela telemetria.", fuel ? "Agora informe os litros e os valores do abastecimento." : "Informe quanto custou.", "Identifique o estabelecimento e a cidade, se souber.", "Quase lá! Uma foto ajuda a equipe a conferir.", "Último passo: confira os dados e envie com tranquilidade."][step]}</p>
        {step === 0 && <>
          <details className="driver-step-photos driver-initial-receipt" open>
            <summary><span className="driver-photo-summary-icon" aria-hidden="true">+</span><span><strong>Começar pela nota fiscal</strong><small>Adicione uma foto para preencher os dados antes de continuar</small></span><span className="driver-photo-chevron" aria-hidden="true">⌄</span></summary>
            <ExpensePhotoAssist photos={photos} knownPhotos={knownPhotos} fuel={fuel} photoKinds={["invoice"]} preparePhoto={prepareReceipt} autoRead
              onPhoto={(kind,photo)=>setPhotos(current=>({...current,[kind]:photo}))} onApply={applySuggestion} onLoadSaved={loadSavedPhotos} onBusy={setPhotoLoading}
              values={{amount,fuelAmount,liters,date:dateConfirmed ? date : "",expenseTime,supplier,location,documentNumber,fuelType,customerName}} />
          </details>
          <p className="mp-field-help">Você também pode preencher manualmente. Escolha o tipo de despesa para continuar.</p>
          <div className="driver-categories">{categories.map(([name, icon, description]) => <button type="button" key={name} aria-pressed={category === name} className={category === name ? "selected" : ""} disabled={photoLoading} onClick={() => {setCategory(name);setError("");}}><span aria-hidden="true">{icon}</span><span><strong>{name}</strong><small>{description}</small></span><b aria-hidden="true">{category === name ? "✓" : "→"}</b></button>)}</div>
          {fuel && <details className="driver-step-photos driver-time-correction" open={showTimeCorrection} onToggle={e=>setShowTimeCorrection(e.currentTarget.open)}>
            <summary>Ajustar horário da nota</summary>
            <p className="mp-field-help">Use apenas se a leitura não encontrou o horário ou se precisar corrigi-lo. Ele permite consultar o KM do abastecimento.</p>
            <label>Horário da nota<input type="time" step="1" value={expenseTime} onChange={e=>setExpenseTime(e.target.value)} /></label>
          </details>}
        </>}
        {step === 1 && <><FleetSelect fleet={fleet} value={plate} onChange={changePlate} loading={fleetLoading} disabled={user.expenseProfile === "motorista" || fleetLoading || Boolean(fleetError)} />
          {fleetError && <p role="alert">{fleetError} <button type="button" onClick={onRetryFleet}>Tentar carregar frota</button></p>}
          <label>Data da despesa<input type="date" max={today()} value={date} onChange={e => editDate(e.target.value)} /></label>
          {fleet.includes(plate) && (category==='Descarga' ? <ExpenseUnloading key={plate} plate={plate} value={unloading} onChange={setUnloading}/> : <ExpenseUnloading key={plate} plate={plate} value={expenseTrip} onChange={setExpenseTrip} tripOnly required={fuel}/>)}
          <p className="mp-field-help">Registrado por {user.nome || user.login}.</p></>}
        {step === 2 && <><label>Hodômetro (km){!fuel && " — opcional"}<input type="text" readOnly aria-describedby="driver-km-help" placeholder="Aguardando telemetria" value={odometer} /></label><small id="driver-km-help" className="mp-field-help">Preenchido somente pela telemetria da placa e da data selecionadas.</small>
          {kmLoading && <p role="status">Buscando o último km do veículo…</p>}
          {kmError && <p role="status">{kmError} <button type="button" onClick={()=>setKmAttempt(n=>n+1)}>Buscar km novamente</button></p>}
          {kmReference && <aside className="driver-reference-card" aria-label="Referência de quilometragem">
            <div className="driver-reference-top"><span className="driver-reference-tag">{kmReference.source === "saved" ? "KM REGISTRADO" : "TELEMETRIA"}</span><time>{referenceDate(kmReference.date)}</time></div>
            <div className="driver-reference-main"><strong>{kmReference.odometer.toLocaleString("pt-BR")} <small>km</small></strong><span>✓ Km aplicado</span></div>
            <p>{kmReference.source==="saved" ? "KM preservado do lançamento original. Alterar placa, data ou horário exige uma nova consulta." : "Última leitura anterior ao horário da nota. O KM será preservado nas próximas edições."}</p>
          </aside>}

        </>}
        {step === 3 && <>
          {fuel && <label>Combustível da nota — opcional<input value={fuelType} maxLength={80} placeholder="Ex.: Diesel S10" onChange={e=>setFuelType(e.target.value)} /></label>}
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
          <SupplierSelect label={fuel ? "Posto / fornecedor — obrigatório" : "Fornecedor — obrigatório"} value={{...supplierSelection,nome:supplier}} onChange={value=>{setSupplier(value.nome);setSupplierSelection(value);}} />
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
        {step === 5 && <details className="driver-step-photos" key={step}>
          <summary><span className="driver-photo-summary-icon" aria-hidden="true">+</span><span><strong>Nota ou comprovante</strong><small>Confira o anexo ou substitua a foto, se necessário</small></span><span className="driver-photo-chevron" aria-hidden="true">⌄</span></summary>
          <ExpensePhotoAssist photos={photos} knownPhotos={knownPhotos} fuel={fuel} photoKinds={["invoice"]} preparePhoto={prepareReceipt}
            onPhoto={(kind,photo)=>setPhotos(current=>({...current,[kind]:photo}))} onApply={applySuggestion} onLoadSaved={loadSavedPhotos} onBusy={setPhotoLoading}
            values={{amount,fuelAmount,liters,date,expenseTime,supplier,location,documentNumber,fuelType,customerName}} />
        </details>}
        {step === 5 && <>
          {!(photos.invoice !== undefined ? photos.invoice : knownPhotos.invoice) && <label>Justificativa sem nota<textarea value={receiptReason} minLength={10} maxLength={300} onChange={e=>setReceiptReason(e.target.value)} placeholder="Explique por que não há nota ou comprovante." /></label>}
          <ExpenseDocumentFields type={documentType} onTypeChange={setDocumentType} number={documentNumber} onNumberChange={setDocumentNumber}/>
          {category==='Manutenção' && <label>Número de fogo do pneu — opcional<input maxLength={80} value={tireFireNumber} onChange={e=>setTireFireNumber(e.target.value)} /></label>}
          <label>{category === "Descarga" ? "Descreva os custos da descarga" : category === "Outros" ? "Descreva a despesa" : "O que foi feito? — opcional"}<textarea maxLength={300} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={category==='Descarga' ? 'Ex.: chapa, movimentação de carga e outros serviços.' : "Conte o que aconteceu para ajudar a conferência."} /></label></>}
        {step === lastStep && <section className="mp-review"><div className="mp-review-total"><span>{category} · {plate}</span><strong>{currency(number(amount))}</strong></div><dl>
          {category==='Descarga' && [["Viagem do ERP",`${unloading.trip.number} · Empresa ${unloading.trip.company}`],["Documento",cteLabel(unloading.cte)],["Itinerário",documentItinerary(unloading.cte)],["Cliente do documento",unloading.cte.customerName],["Reembolso da descarga",unloading.reimbursement ? 'Sim' : 'Não']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {[["Tipo de documento",documentTypes[documentType] || "Não informado"],["Número de fogo",tireFireNumber || "—"],[fuel ? "Viagem do abastecimento" : "Viagem opcional",category!=="Descarga" ? expenseTrip?.trip?.number || "Sem vínculo" : "—"],["Data", date.split("-").reverse().join("/")], ["Horário da nota", expenseTime || "Não informado"], ["Justificativa sem nota", receiptReason || "—"], ["Combustível", fuelType || "Não informado"], ["Fornecedor", supplier || "Não informado"], ["Local", location || "Não informado"], ...(fuel ? [["Litros", liters], ["Valor do combustível",fuelAmount ? currency(number(fuelAmount)) : "Não informado"]] : []), ...(fuel && hasArla ? [["Litros de ARLA",arlaLiters],["Valor do ARLA",currency(number(arlaAmount))]] : []), ["Hodômetro", odometer ? `${odometer} km` : "Não informado"], ["Comprovante", documentNumber || "Não informado"], ["Foto", hasPhoto ? "Anexada" : "Sem foto"], ["Observação", note || "Sem observação"]].filter(([label]) => (label !== "Combustível" || fuel) && (label !== "Hodômetro" || fuel || odometer) && (label !== "Horário da nota" || fuel || expenseTime)).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl></section>}
        {step === lastStep && <ExpensePaymentDetails paymentDetails={paymentDetails} setPaymentDetails={setPaymentDetails}/>}
        {error && <p className="mp-feedback error" role="alert">{error}</p>}
      </div>
      <footer className="mp-wizard-actions"><button className="mp-cancel-edit" type="button" disabled={saving || photoLoading} onClick={() => step ? (setStep(stepIndexes[stepNumber - 2]),setError("")) : onClose()}>{step ? "Voltar" : "Voltar às despesas"}</button>
        <button className="mp-submit" type="submit" disabled={saving || photoLoading || user.readOnly}>{saving ? "Enviando…" : step === lastStep ? record ? "Salvar despesa" : "Enviar para conferência" : "Próximo passo"}<span aria-hidden="true">→</span></button>
        <p>{step === lastStep ? "Seu registro será salvo ao enviar." : `${stepNumber} de ${stepIndexes.length} etapas`}</p></footer>
    </form>}
  </Dialog>;
}

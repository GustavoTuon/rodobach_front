import React from "react";

const money = value => value.toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const day = row => row.expenseDate || new Date(row.date).toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
export function expenseTotals(rows) {
  const sums = {total:0,pending:0,checked:0,fuel:0,maintenance:0,other:0,unloading:0};
  for (const row of rows) {
    const cents = Math.round(Number(row.amount) * 100);
    sums.total += cents;
    sums[row.checked ? "checked" : "pending"] += cents;
    sums[row.service === "Abastecimento" ? "fuel" : row.service === 'Descarga' ? 'unloading' : row.service === "Outros" ? "other" : "maintenance"] += cents;
  }
  return Object.fromEntries(Object.entries(sums).map(([key,value])=>[key,value/100]));
}

export function ExpenseSummary({records}) {
  const sums = expenseTotals(records);
  return <section className="mp-period-summary" aria-label="Resumo do período">
    <h3>Resumo do período</h3><p>{records.length} {records.length === 1 ? "despesa" : "despesas"} · Valores dos filtros selecionados</p>
    <div className="mp-summary-grid">{[["Total registrado","total"],["A conferir","pending"],["Conferido","checked"]].map(([label,key])=>
      <div key={key}><span>{label}</span><strong>{money(sums[key])}</strong></div>)}</div>
    <div className="mp-category-totals">{[["Abastecimento","fuel"],["Manutenção","maintenance"],["Descarga","unloading"],["Outros","other"]].map(([label,key])=>
      <div key={key}><span>{label}</span><b>{money(sums[key])}</b></div>)}</div>
  </section>;
}

export default function ExpenseHistory({records, isDriver, currentPlate, renderRecord}) {
  const sorted = [...records].sort((a,b)=>day(b).localeCompare(day(a)) || String(b.date).localeCompare(String(a.date)));
  function recordRows(rows) {
    return rows.map(row=><article className="mp-expense-row" key={row.id}>
      <details className="mp-expense-detail"><summary>
        <span className="mp-expense-date"><time>{day(row).split("-").reverse().join("/")}</time><span>{row.expenseTime?.slice(0,5) || "Data da despesa"}</span></span>
        <span className="mp-expense-description"><strong>{row.service}</strong><span>{row.supplier || "Fornecedor não informado"}</span>
          <span className="mp-expense-evidence">{row.photoKinds?.invoice || row.hasReceipt ? "Nota anexada" : row.receiptReason ? "Ausência de nota justificada" : "Sem comprovante registrado"}</span>
        </span>
        <span className="mp-expense-amount"><b>{money(Number(row.amount))}</b><span className={`mp-status ${row.checked ? "checked" : ""}`}>{row.checked ? "Conferido" : "A conferir"}</span>{row.paid && <small>{row.checked ? "Pago" : "Pago, aguardando conferência"}</small>}</span>
        <span className="mp-expense-toggle"><span className="mp-expense-view">Ver detalhes</span><span className="mp-expense-hide">Fechar detalhes</span><span aria-hidden="true">⌄</span><span className="mp-sr-only"> de {row.service} em {day(row).split("-").reverse().join("/")}</span></span>
      </summary>
        {renderRecord(row)}
      </details>
    </article>);
  }
  function plateGroups(rows) {
    const plates = [...new Set(rows.map(row=>row.plate))].sort();
    return plates.map(plate=>{
      const items=rows.filter(row=>row.plate===plate), sums=expenseTotals(items);
      return <details className="mp-plate-group" key={plate}>
        <summary><span className="mp-group-identity"><strong>{plate}</strong><span>{items.length} {items.length === 1 ? "despesa" : "despesas"}</span></span><span className="mp-group-value">Total no período <b>{money(sums.total)}</b></span><span className={`mp-group-value ${items.some(item=>!item.checked) ? "has-pending" : "all-checked"}`}>{items.some(item=>!item.checked) ? "A conferir" : "Tudo conferido"}<b>{items.some(item=>!item.checked) ? money(sums.pending) : "✓"}</b></span><span className="mp-group-chevron" aria-hidden="true">⌄</span></summary>
        <div className="mp-group-records">{recordRows(items)}</div>
      </details>;
    });
  }
  if (!isDriver) return <div className="mp-plate-groups">{plateGroups(sorted)}</div>;
  const current=sorted.filter(row=>row.plate===currentPlate), previous=sorted.filter(row=>row.plate!==currentPlate);
  const months=[...new Set(current.map(row=>day(row).slice(0,7)))];
  return <div className="mp-plate-groups">
    <h3>{currentPlate ? `Sua placa atual · ${currentPlate}` : "Placa atual não confirmada"}</h3>
    {!current.length && <p className="mp-history-help">Nenhuma despesa da placa atual neste período.</p>}
    {months.map(month=><section className="mp-driver-month" key={month}>
      <h4>{new Date(`${month}-01T12:00:00Z`).toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"America/Sao_Paulo"})}</h4>
      {recordRows(current.filter(row=>day(row).startsWith(month)))}
    </section>)}
    {previous.length>0 && <details className="mp-previous-plates"><summary>Histórico de outras placas <span>{previous.length} despesa(s)</span></summary>
      {plateGroups(previous)}
    </details>}
  </div>;
}

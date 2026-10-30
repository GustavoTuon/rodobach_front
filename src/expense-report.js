export const reimbursementLabels = {nao_aplicavel:'Sem reembolso',a_cobrar:'Reembolso a cobrar',cobrado:'Aguardando reembolso',recebido:'Reembolso recebido'};
export const reimbursementOf = row => row.reimbursement || {status:row.unloading?.reimbursement ? 'a_cobrar' : 'nao_aplicavel',customer:row.unloading?.cte?.customerName || '',document:'',receivedDate:null,note:''};
const csvCell = value => {
  let text=String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};
export const expenseReportColumns=['ID','Data da despesa','Placa','Empresa da viagem','Viagem','Tipo','Fornecedor / emitente','Cliente do documento / nota','Documento fiscal','Valor (R$)','Pago','Data do pagamento','Forma de pagamento','Conferido','Lançado no ERP','Reembolso','Cliente do reembolso','Documento de cobrança','Recebido em','Observações'];
export const reportExpenseDate = row => row.expenseDate || (row.date ? new Date(row.date).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}) : '');
const financialFlag = value => value === true ? 'Sim' : value === false ? 'Não' : 'Não informado';
export function expenseCsv(rows, columns=expenseReportColumns) {
  const indexes=expenseReportColumns.map((label,index)=>columns.includes(label) ? index : -1).filter(index=>index>=0);
  if (!indexes.length) throw new Error('Selecione pelo menos uma coluna.');
  const header=expenseReportColumns;
  const data=rows.map(row=>{
    const trip=row.unloading?.trip || row.trip, reembolso=reimbursementOf(row);
    return [row.id,reportExpenseDate(row),row.plate,trip?.company,trip?.number,row.service,row.supplier,
      row.unloading?.cte?.customerName || row.customerName,row.document,Number(row.amount).toFixed(2).replace('.',','),
      financialFlag(row.paid),row.paymentDate,row.paymentMethod?.name,row.checked ? 'Sim' : 'Não',financialFlag(row.posted),
      reimbursementLabels[reembolso.status],reembolso.customer,reembolso.document,reembolso.receivedDate,row.note];
  });
  return '\uFEFF'+[header,...data].map(row=>indexes.map(index=>csvCell(row[index])).join(';')).join('\r\n');
}
export function downloadExpenseReport(rows, columns=expenseReportColumns) {
  const url=URL.createObjectURL(new Blob([expenseCsv(rows,columns)],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='despesas-filtradas.csv';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

import React from "react";
export default function ExpensePaymentDetails({paymentDetails,setPaymentDetails}) {
  return <section className="expense-payment-details">
          <label className="expense-payment-toggle"><input type="checkbox" checked={Boolean(paymentDetails)} onChange={e=>setPaymentDetails(e.target.checked ? {holderName:"",pixKey:""} : null)}/>Informar dados para pagamento via PIX</label>
          <p className="mp-field-help">Opcional. Esses dados ficam disponíveis para o financeiro e no resumo para copiar.</p>
          {paymentDetails && <div className="expense-payment-fields">
            <label>Nome do titular da conta<input required maxLength={160} value={paymentDetails.holderName} onChange={e=>setPaymentDetails({...paymentDetails,holderName:e.target.value})}/></label>
            <label>Chave PIX<input required maxLength={160} value={paymentDetails.pixKey} autoCapitalize="none" spellCheck={false} onChange={e=>setPaymentDetails({...paymentDetails,pixKey:e.target.value})}/></label>
            <p className="mp-field-help">Confira o titular e a chave antes de enviar.</p>
          </div>}
  </section>;
}

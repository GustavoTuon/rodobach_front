import React, { useState } from "react";
import { purchasesApi } from "./purchases-api.js";
import { quoteProgress } from "./purchases-status.js";
export default function QuoteActions({ quote, onChanged }) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const progress = quoteProgress(quote),
    remove = progress.answered === 0;
  if (quote.origem_chave || quote.status === "cancelada") return null;
  const label = remove ? "Excluir cotação" : "Cancelar cotação";
  return (
    <div className="quote-lifecycle">
      <button
        className="purchase-danger"
        disabled={busy}
        onClick={() => setConfirm(true)}
      >
        {label}
      </button>
      {confirm && (
        <div className="quote-confirm" role="group" aria-label={label}>
          <strong>
            {label}: {quote.titulo}?
          </strong>
          <p>
            {remove
              ? "Nenhum fornecedor respondeu. A cotação e seus links serão excluídos definitivamente."
              : "As respostas serão preservadas para consulta. Os fornecedores não poderão mais enviar ou alterar propostas."}
          </p>
          <div className="purchase-actions">
            <button
              className="purchase-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await purchasesApi(
                    `/cotacoes/${quote.id}/${remove ? "excluir" : "cancelar"}`,
                    {},
                  );
                  await onChanged(remove);
                  setConfirm(false);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "Aguarde…"
                : `Confirmar ${remove ? "exclusão" : "cancelamento"}`}
            </button>
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

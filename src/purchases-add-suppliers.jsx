import React, { useState } from "react";
import { SupplierPicker } from "./purchases-dashboard.jsx";
import { purchasesApi } from "./purchases-api.js";
export default function AddSuppliers({ quote, suppliers, groups, onSaved }) {
  const [opened, setOpened] = useState(false),
    [selection, setSelection] = useState({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  if (
    quote.origem_chave ||
    quote.status !== "aberta" ||
    new Date(quote.prazo) <= new Date()
  )
    return null;
  const count = Object.values(selection).reduce((n, ids) => n + ids.length, 0);
  return (
    <section className="purchase-card">
      <header className="purchase-toolbar">
        <div>
          <h3>Convidar mais fornecedores</h3>
          <p>Adicione parceiros por produto, individualmente ou por grupo.</p>
        </div>
        <button onClick={() => setOpened(!opened)}>
          {opened ? "Fechar seleção" : "+ Adicionar fornecedores"}
        </button>
      </header>
      {notice && <p role="status">{notice}</p>}
      {opened && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !count) return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              await purchasesApi(`/cotacoes/${quote.id}/fornecedores`, {
                itens: Object.entries(selection)
                  .filter(([, ids]) => ids.length)
                  .map(([id, fornecedores]) => ({ id, fornecedores })),
              });
              setSelection({});
              setOpened(false);
              await onSaved();
              setNotice(
                "Fornecedores adicionados. Os links estão disponíveis abaixo; nenhum envio é automático.",
              );
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Os vínculos e as respostas existentes serão preservados.
            Fornecedores que já responderam não recebem novos itens nesta
            cotação.
          </p>
          {quote.itens.map((item) => {
            const eligible = suppliers.filter(
              (s) =>
                !item.fornecedores.includes(s.id) &&
                !quote.convites.some(
                  (c) =>
                    c.fornecedor_id === s.id && (c.resposta || c.respondido_em),
                ),
            );
            const ids = new Set(eligible.map((s) => s.id));
            return (
              <div className="purchase-item" key={item.id}>
                <h4>{item.nome}</h4>
                <SupplierPicker
                  suppliers={eligible}
                  groups={groups.map((g) => ({
                    ...g,
                    fornecedores: g.fornecedores.filter((id) => ids.has(id)),
                  }))}
                  selected={selection[item.id] || []}
                  onChange={(values) =>
                    setSelection({ ...selection, [item.id]: values })
                  }
                />
              </div>
            );
          })}
          {error && <p role="alert">{error}</p>}
          <button className="purchase-primary" disabled={busy || !count}>
            {busy ? "Salvando…" : "Adicionar selecionados"}
          </button>
        </form>
      )}
    </section>
  );
}

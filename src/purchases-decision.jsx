import React, { useState, useEffect } from "react";
import { ProductChoice } from "./purchases-selection.jsx";
import { purchasesApi as api } from "./purchases-api.js";
const money = (v) =>
  v == null
    ? "Não informado"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function bestProductOffers(rows, productId) {
  const eligible = rows.filter(
    (r) =>
      r.productId === productId &&
      r.available &&
      r.price > 0 &&
      r.requested > 0 &&
      r.quantity >= r.requested,
  );
  const min = eligible.length
    ? Math.min(...eligible.map((r) => r.price))
    : null;
  return eligible.filter((r) => r.price === min);
}
export default function PurchaseDecision({ quote, rows, onRefresh }) {
  const [history, setHistory] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [editing, setEditing] = useState(null),
    [value, setValue] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/cotacoes/${quote.id}/historico`)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quote.id, retry]);
  const save = async (remove = false) => {
    if (busy) return;
    setBusy(true);
    setSaveError("");
    try {
      await api(`/cotacoes/${quote.id}/desconto`, {
        conviteId: editing.inviteId,
        respondidoEm: editing.date,
        produtoId: editing.productId,
        valor: remove ? null : Number(value),
        observacoes: notes,
      });
      await onRefresh();
      setEditing(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="purchase-card purchase-decision">
      <header>
        <span className="purchase-eyebrow">HISTÓRICO E NEGOCIAÇÃO</span>
        <h2>O que vale a pena comprar?</h2>
        <p>
          Melhor preço unitário entre ofertas que atendem toda a quantidade, já
          considerando descontos registrados.
        </p>
      </header>
      <p className="analysis-caution">
        A indicação não inclui frete, impostos adicionais ou equivalência de
        marcas. Confira unidade, embalagem, especificação e prazo antes de
        decidir. Os preços anteriores são valores lançados no sistema, sem
        conversão de unidade.
      </p>
      {error && (
        <p role="alert">
          Histórico indisponível: {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {quote.itens.map((product) => {
        const offers = rows.filter(
            (r) => r.productId === product.id && r.available,
          ),
          best = bestProductOffers(rows, product.id),
          past = history.filter((h) => h.produto_id === String(product.id)),
          last = past[0],
          lastPrice = Number(last?.valor_unitario),
          delta =
            lastPrice > 0 && best.length
              ? (best[0].price / lastPrice - 1) * 100
              : null;
        return (
          <article className="decision-product" key={product.id}>
            <header className="purchase-toolbar">
              <div>
                <h3>{product.nome}</h3>
                <small>
                  Solicitado: {product.quantidade ?? "Não informado"}{" "}
                  {product.unidade}
                </small>
              </div>
              <span className="purchase-badge">
                {best.length > 1
                  ? "Empate no menor preço"
                  : best.length
                    ? "Melhor preço identificado"
                    : "Sem oferta completa"}
              </span>
            </header>
            <div className="decision-summary">
              <div>
                <small>Última compra registrada</small>
                <strong>
                  {loading
                    ? "Carregando…"
                    : last
                      ? money(last.valor_unitario)
                      : error
                        ? "Indisponível"
                        : "Sem histórico"}
                </strong>
                {last && (
                  <span>
                    {last.data
                      ? new Date(last.data).toLocaleDateString("pt-BR")
                      : "Data não informada"}{" "}
                    · {last.fornecedor || "Fornecedor não informado"}
                  </span>
                )}
              </div>
              <div>
                <small>Menor unitário nesta cotação</small>
                <strong>
                  {best.length
                    ? money(best[0].price)
                    : "Aguardando oferta completa"}
                </strong>
                <span>{best.map((r) => r.supplier).join(" / ")}</span>
                {delta !== null && (
                  <span
                    className={
                      delta <= 0 ? "decision-saving" : "decision-increase"
                    }
                  >
                    {Math.abs(delta).toFixed(1)}%{" "}
                    {delta <= 0 ? "abaixo" : "acima"} da última compra ·
                    confirme a unidade
                  </span>
                )}
              </div>
              <div>
                <small>Estimativa para a quantidade solicitada</small>
                <strong>
                  {best.length
                    ? money(best[0].price * Number(product.quantidade))
                    : "—"}
                </strong>
                <span>
                  Sem frete · {product.quantidade} {product.unidade}
                </span>
              </div>
            </div>
            <details>
              <summary>
                Ver compras anteriores ({past.length}
                {past.length === 10 ? " mais recentes" : ""})
              </summary>
              {loading ? (
                <p>Consultando sistema…</p>
              ) : !past.length ? (
                <p>
                  {error
                    ? "Não foi possível consultar o histórico."
                    : "Nenhuma compra encontrada para este produto nesta empresa."}
                </p>
              ) : (
                <div className="analysis-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Documento</th>
                        <th>Fornecedor</th>
                        <th>Quantidade lançada</th>
                        <th>Unitário lançado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((h, index) => (
                        <tr key={index}>
                          <td>
                            {h.data
                              ? new Date(h.data).toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td>{h.documento}</td>
                          <td>{h.fornecedor}</td>
                          <td>{h.quantidade}</td>
                          <td>{money(h.valor_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
            {!quote.origem_dados && offers.length > 0 && (
              <div className="decision-offers">
                {offers.map((r) => (
                  <div key={r.id}>
                    <span>
                      <strong>{r.supplier}</strong>
                      <small>
                        {r.brand} · {r.quantity} {r.unit}
                      </small>
                    </span>
                    <span>
                      <small>Original: {money(r.originalPrice)}</small>
                      <strong>
                        {money(r.price)} / {r.unit}
                      </strong>
                      {r.discount && (
                        <small>
                          Desconto: {money(r.originalPrice - r.price)} por
                          unidade
                        </small>
                      )}
                    </span>
                    {onRefresh && quote.status !== "cancelada" && (
                      <button
                        onClick={() => {
                          setEditing(r);
                          setValue(r.price);
                          setNotes(r.discount?.observacoes || "");
                          setSaveError("");
                        }}
                      >
                        {" "}
                        {r.discount ? "Editar desconto" : "Registrar desconto"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {onRefresh &&
              !quote.origem_chave &&
              quote.status !== "cancelada" && (
                <ProductChoice
                  quote={quote}
                  product={product}
                  offers={offers}
                  onRefresh={onRefresh}
                />
              )}
          </article>
        );
      })}
      {editing && (
        <form
          className="decision-negotiation"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h3>Desconto negociado · {editing.supplier}</h3>
          <p>
            {editing.product} · Preço original: {money(editing.originalPrice)}{" "}
            por {editing.unit}
          </p>
          <div className="purchase-grid">
            <label>
              Valor unitário final (R$)
              <input
                autoFocus
                required
                type="number"
                min="0.0001"
                max={editing.originalPrice}
                step="0.0001"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label>
              Observação da negociação
              <input
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: desconto confirmado por telefone"
              />
            </label>
          </div>
          <p>
            Redução de{" "}
            {money(Math.max(0, editing.originalPrice - Number(value)))} por
            unidade. Uma nova resposta do fornecedor remove os descontos desta
            proposta para nova conferência.
          </p>
          {saveError && <p role="alert">{saveError}</p>}
          <div className="purchase-actions">
            <button className="purchase-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar desconto"}
            </button>
            {editing.discount && (
              <button type="button" disabled={busy} onClick={() => save(true)}>
                Remover desconto
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

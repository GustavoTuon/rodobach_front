import React, { useState, useEffect, useRef } from "react";
import { ProductChoice } from "./purchases-selection.jsx";
import ItemHistory, {
  money,
  quantity,
  dateLabel,
  historyDate,
  priceDifference,
} from "./purchases-item-history.jsx";
import { purchasesApi as api } from "./purchases-api.js";
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
  const negotiationDialog = useRef(null);
  const [search, setSearch] = useState(""),
    [pendingOnly, setPendingOnly] = useState(false),
    [picks, setPicks] = useState({}),
    [history, setHistory] = useState([]),
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
    setHistory([]);
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
  useEffect(() => {
    if (editing && negotiationDialog.current && !negotiationDialog.current.open)
      negotiationDialog.current.showModal();
  }, [editing]);
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
      <header className="purchase-toolbar">
        <div>
          <span className="purchase-eyebrow">
            HISTÓRICO · PROPOSTAS · ESCOLHA
          </span>
          <h2>Análise por item</h2>
          <p>
            Veja de quem comprou, compare as condições e escolha a proposta.
          </p>
        </div>
      </header>
      <div className="decision-progress">
        <strong>
          {
            quote.itens.filter((p) => bestProductOffers(rows, p.id).length)
              .length
          }{" "}
          de {quote.itens.length} itens com oferta para toda a quantidade
        </strong>
        {quote.planoCompra && !quote.origem_chave && (
          <span>
            {quote.planoCompra.pendentes} sem escolha ·{" "}
            {quote.planoCompra.revisar} para revisar · Total selecionado com
            frete: <b>{money(quote.planoCompra.total)}</b>
          </span>
        )}
      </div>
      <div className="analysis-controls">
        <label>
          Buscar item
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou código do produto"
          />
        </label>
        {!quote.origem_chave && (
          <label className="purchase-check">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
            />
            Somente itens sem escolha ou para revisar
          </label>
        )}
      </div>
      <p className="analysis-caution">
        Menor unitário sem frete, com descontos registrados. Confira marca,
        embalagem e impostos. O frete é da proposta e entra uma vez por
        fornecedor no resumo.
      </p>
      {error && (
        <p role="alert">
          Histórico indisponível: {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {quote.itens
        .filter(
          (p) =>
            `${p.nome} ${p.codigo}`
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR")) &&
            (!pendingOnly || !quote.planoCompra?.escolhas?.[p.id]?.valida),
        )
        .map((product) => {
          const offers = rows
            .filter((r) => r.productId === product.id)
            .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
          const best = bestProductOffers(rows, product.id);
          const past = history.filter(
            (h) => h.produto_id === String(product.id),
          );
          const last = past[0];
          const selected = quote.planoCompra?.escolhas?.[product.id];
          return (
            <article className="decision-product" key={product.id}>
              <header className="purchase-toolbar">
                <div>
                  <small>
                    Empresa {product.empresa} · Produto {product.codigo}
                  </small>
                  <h3>{product.nome}</h3>
                  <strong>
                    Solicitado: {quantity(product.quantidade)} {product.unidade}
                  </strong>
                </div>
                <span className="purchase-badge">
                  {selected?.valida
                    ? "Escolha salva"
                    : selected
                      ? "Revisar escolha"
                      : best.length
                        ? "Pronto para comparar"
                        : "Sem oferta completa"}
                </span>
              </header>
              <div className="decision-summary">
                <div>
                  <small>Última compra até a abertura</small>
                  <strong>
                    {loading
                      ? "Carregando…"
                      : error
                        ? "Indisponível"
                        : last
                          ? money(last.valor_unitario)
                          : "Sem histórico anterior"}
                  </strong>
                  {last && (
                    <span>
                      {last.fornecedor} · {dateLabel(last.data)} ·{" "}
                      {quantity(last.quantidade)}{" "}
                      {last.unidade || "Unidade não informada"}
                    </span>
                  )}
                </div>
                <div>
                  <small>Menor unitário da cotação · sem frete</small>
                  <strong>
                    {best.length ? money(best[0].price) : "Sem oferta completa"}
                  </strong>
                  <span>{best.map((r) => r.supplier).join(" / ")}</span>
                </div>
                <div>
                  <small>
                    {quote.origem_chave
                      ? "Cotação importada"
                      : "Fornecedor escolhido"}
                  </small>
                  <strong>
                    {quote.origem_chave
                      ? "Somente consulta"
                      : selected?.fornecedor || "Ainda não escolhido"}
                  </strong>
                  <span>
                    {selected && !selected.valida
                      ? "Condições alteradas: confirme novamente"
                      : "Compare entrega, pagamento e quantidade antes de decidir."}
                  </span>
                </div>
              </div>
              <ItemHistory
                key={`${quote.id}:${product.id}`}
                product={product}
                preview={past}
                cutoff={historyDate(quote)}
                loading={loading}
                error={error}
              />
              <h4>Propostas desta cotação</h4>
              {offers.length ? (
                <div
                  className="analysis-table-scroll"
                  role="region"
                  aria-label={`Propostas de ${product.nome}`}
                  tabIndex={0}
                >
                  <table className="decision-compare">
                    <thead>
                      <tr>
                        <th>Fornecedor / marca</th>
                        <th>Quantidade ofertada</th>
                        <th>Unitário final</th>
                        <th>Vs. última compra</th>
                        <th>Total ofertado</th>
                        <th>Entrega / pagamento</th>
                        <th>Frete da proposta</th>
                        <th>Decisão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((r) => {
                        const full =
                          r.available &&
                          r.price > 0 &&
                          product.quantidade > 0 &&
                          r.quantity >= product.quantidade;
                        const delta = priceDifference(r.price, last, r.unit);
                        return (
                          <tr
                            key={r.id}
                            className={
                              selected?.valida &&
                              selected.conviteId === r.inviteId
                                ? "offer-chosen"
                                : best.includes(r)
                                  ? "offer-lowest"
                                  : ""
                            }
                          >
                            <td data-label="Fornecedor / marca">
                              <strong>{r.supplier}</strong>
                              <small>{r.brand}</small>
                              {r.notes && <small>{r.notes}</small>}
                              {quote.origem_chave && (
                                <small>
                                  {r.status} · {dateLabel(r.date)}
                                </small>
                              )}
                            </td>
                            <td data-label="Quantidade ofertada">
                              {quantity(r.quantity)} {r.unit}
                              <small>
                                {!r.available
                                  ? r.status
                                  : r.quantity < product.quantidade
                                    ? "Quantidade parcial"
                                    : r.quantity > product.quantidade
                                      ? "Confirmar preço para quantidade menor"
                                      : "Quantidade solicitada atendida"}
                              </small>
                            </td>
                            <td data-label="Unitário final">
                              <strong>{money(r.price)}</strong>
                              {r.discount && (
                                <small>
                                  Original: {money(r.originalPrice)} · Negociado
                                </small>
                              )}
                              {best.includes(r) && (
                                <small className="decision-saving">
                                  Menor unitário
                                  {best.length > 1 ? " · empate" : ""}
                                </small>
                              )}
                            </td>
                            <td data-label="Vs. última compra">
                              {delta == null ? (
                                <small>
                                  {last
                                    ? "Conferir unidade / preço"
                                    : "Sem referência anterior"}
                                </small>
                              ) : (
                                <span
                                  className={
                                    delta <= 0
                                      ? "decision-saving"
                                      : "decision-increase"
                                  }
                                >
                                  {Math.abs(delta).toLocaleString("pt-BR", {
                                    maximumFractionDigits: 1,
                                  })}
                                  % {delta <= 0 ? "abaixo" : "acima"}
                                  <small>Mesma unidade · confira marca</small>
                                </span>
                              )}
                            </td>
                            <td data-label="Total ofertado">
                              {money(r.total)}
                              <small>
                                Para {quantity(r.quantity)} {r.unit}
                              </small>
                            </td>
                            <td data-label="Entrega / pagamento">
                              Entrega: {r.delivery || "não informada"}
                              <small>
                                Pagamento: {r.payment || "não informado"}
                              </small>
                            </td>
                            <td data-label="Frete da proposta">
                              {money(r.freight)}
                              <small>Uma vez por fornecedor</small>
                            </td>
                            <td data-label="Decisão">
                              {onRefresh &&
                              !quote.origem_chave &&
                              quote.status !== "cancelada" ? (
                                <div className="decision-row-actions">
                                  <button
                                    disabled={!full}
                                    aria-label={`Escolher ${r.supplier}`}
                                    aria-pressed={
                                      (picks[product.id]?.inviteId ||
                                        selected?.conviteId) === r.inviteId
                                    }
                                    onClick={() =>
                                      setPicks({
                                        ...picks,
                                        [product.id]: {
                                          inviteId: r.inviteId,
                                          revision: Date.now(),
                                        },
                                      })
                                    }
                                  >
                                    Escolher
                                  </button>
                                  {r.available && (
                                    <button
                                      onClick={() => {
                                        setEditing(r);
                                        setValue(r.price);
                                        setNotes(r.discount?.observacoes || "");
                                        setSaveError("");
                                      }}
                                    >
                                      {r.discount
                                        ? "Editar desconto"
                                        : "Negociar"}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                r.status
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Aguardando propostas para este item.</p>
              )}
              {onRefresh &&
                !quote.origem_chave &&
                quote.status !== "cancelada" && (
                  <ProductChoice
                    quote={quote}
                    product={product}
                    offers={offers}
                    onRefresh={onRefresh}
                    suggested={picks[product.id]}
                  />
                )}
            </article>
          );
        })}
      {!quote.itens.some(
        (p) =>
          `${p.nome} ${p.codigo}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")) &&
          (!pendingOnly || !quote.planoCompra?.escolhas?.[p.id]?.valida),
      ) && <p>Nenhum item com esses filtros.</p>}
      {editing && (
        <dialog
          ref={negotiationDialog}
          className="purchase-negotiation-dialog"
          onCancel={() => setEditing(null)}
          aria-label="Negociar proposta"
        >
          <form
            className="decision-negotiation"
            aria-label="Negociar proposta"
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(true)}
                >
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
        </dialog>
      )}
    </section>
  );
}

import React, { useEffect, useState } from "react";
import { purchasesApi as api } from "./purchases-api.js";
const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export function ProductChoice({ quote, product, offers, onRefresh }) {
  const selected = quote.planoCompra?.escolhas?.[product.id];
  const [invite, setInvite] = useState(selected?.conviteId || ""),
    [reason, setReason] = useState(selected?.motivo || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setInvite(selected?.conviteId || "");
    setReason(selected?.motivo || "");
  }, [selected?.conviteId, selected?.motivo, selected?.escolhido_em]);
  const eligible = offers.filter(
    (r) =>
      r.available &&
      r.price > 0 &&
      r.quantity >= product.quantidade &&
      product.quantidade > 0,
  );
  const candidate = eligible.find((r) => r.inviteId === invite),
    minimum = Math.min(...eligible.map((r) => r.price)),
    needsReason = candidate && candidate.price > minimum;
  const save = async (remove = false) => {
    if (busy) return;
    if (!remove && !candidate) return;
    if (!remove && needsReason && !reason.trim()) {
      setError(
        "Informe o motivo para escolher uma oferta acima do menor preço.",
      );
      return;
    }
    let saved = false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/cotacoes/${quote.id}/escolha`, {
        produtoId: product.id,
        conviteId: remove ? null : invite,
        versaoProposta: remove ? undefined : candidate?.proposalVersion,
        motivo: reason,
      });
      saved = true;
      await onRefresh();
      setNotice(
        remove
          ? "Escolha removida."
          : "Fornecedor escolhido. Resumo de compra atualizado.",
      );
    } catch (e) {
      setError(
        saved
          ? "Escolha salva, mas não foi possível atualizar o resumo. Atualize as respostas antes de continuar."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="product-choice"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <header>
        <h4>Escolher fornecedor para este produto</h4>
        {selected && (
          <span
            className={`purchase-badge ${selected.valida ? "respondida" : "aguardando"}`}
          >
            {selected.valida ? "Escolha salva" : "Revisar escolha"}
          </span>
        )}
      </header>
      {selected && !selected.valida && (
        <p role="status">
          A proposta ou o desconto mudou. Confira as condições e confirme
          novamente. Este item está fora do total até a revisão.
        </p>
      )}
      <div className="purchase-grid">
        <label>
          Fornecedor vencedor
          <select
            aria-label={`Fornecedor vencedor de ${product.nome}`}
            required
            disabled={busy}
            value={invite}
            onChange={(e) => {
              setInvite(e.target.value);
              setNotice("");
              setError("");
            }}
          >
            <option value="">Selecione uma oferta</option>
            {invite && !candidate && (
              <option value={invite} disabled>
                Oferta anterior indisponível para esta quantidade
              </option>
            )}
            {eligible.map((r) => (
              <option value={r.inviteId} key={r.id}>
                {r.supplier} · {money(r.price)} / {r.unit}
                {r.price === minimum ? " · Menor preço" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          {needsReason
            ? "Motivo da escolha (obrigatório)"
            : "Motivo da escolha (opcional)"}
          <input
            disabled={busy}
            required={Boolean(needsReason)}
            value={reason}
            maxLength={1000}
            placeholder="Ex.: melhor marca, entrega mais rápida"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      {!eligible.length && (
        <p>
          Aguardando uma oferta que atenda toda a quantidade. A escolha é de um
          fornecedor por produto.
        </p>
      )}
      {candidate && (
        <p>
          Comprar{" "}
          <strong>
            {product.quantidade} {product.unidade}
          </strong>{" "}
          por <strong>{money(candidate.price * product.quantidade)}</strong>,
          sem frete. Marca: {candidate.brand}.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="purchase-actions">
        <button className="purchase-primary" disabled={busy || !candidate}>
          {busy
            ? "Salvando…"
            : selected && !selected.valida
              ? "Confirmar escolha revisada"
              : "Salvar escolha"}
        </button>
        {selected && (
          <button type="button" disabled={busy} onClick={() => save(true)}>
            Remover escolha
          </button>
        )}
      </div>
    </form>
  );
}
export function purchaseSummaryText(quote) {
  const plan = quote.planoCompra;
  const lines = [
    `Resumo de compra — ${quote.titulo}`,
    plan.completa
      ? "Todos os produtos selecionados"
      : "Resumo parcial: há produtos pendentes ou escolhas para revisar",
    "Estimativa; não constitui pedido de compra.",
  ];
  for (const supplier of plan.fornecedores) {
    lines.push("", supplier.fornecedor);
    for (const item of supplier.itens)
      lines.push(
        `${item.nome} | ${item.quantidade} ${item.unidade} | ${item.marca} | unitário ${money(item.unitario)} | total ${money(item.total)}${item.motivo ? ` | Motivo: ${item.motivo}` : ""}`,
      );
    lines.push(
      `Desconto nos produtos: ${money(supplier.desconto)}`,
      `Subtotal: ${money(supplier.subtotal)} | Frete informado: ${money(supplier.frete)} | Total: ${money(supplier.total)}`,
      `Entrega: ${supplier.prazoEntrega || "Não informada"} | Pagamento: ${supplier.pagamento || "Não informado"}`,
    );
  }
  lines.push(
    "",
    `Total selecionado com frete: ${money(plan.total)}`,
    "Frete contado uma vez por fornecedor. Confirme condições para a quantidade e os itens selecionados.",
  );
  return lines.join("\n");
}
export function PurchaseSummary({ quote, onRefresh }) {
  const [notice, setNotice] = useState("");
  const [copying, setCopying] = useState(false);
  const plan = quote.planoCompra;
  if (!plan || quote.origem_chave) return null;
  return (
    <section className="purchase-card purchase-summary">
      <header className="purchase-toolbar">
        <div>
          <span className="purchase-eyebrow">DA ANÁLISE À COMPRA</span>
          <h2>Resumo de compra por fornecedor</h2>
          <p>
            {quote.status === "cancelada"
              ? "Cotação cancelada — seleção mantida apenas para consulta."
              : plan.completa
                ? "Todos os produtos têm uma escolha válida. Confira as condições antes de executar a compra."
                : `${plan.pendentes} produtos sem escolha · ${plan.revisar} escolhas precisam de revisão`}
          </p>
        </div>
        <button
          disabled={
            copying ||
            !plan.fornecedores.length ||
            plan.revisar > 0 ||
            quote.status === "cancelada"
          }
          onClick={async () => {
            setCopying(true);
            setNotice("");
            try {
              const fresh = onRefresh
                ? await onRefresh()
                : await api(`/cotacoes/${quote.id}`);
              if (
                fresh.status === "cancelada" ||
                fresh.planoCompra?.revisar > 0 ||
                JSON.stringify(fresh.planoCompra) !== JSON.stringify(plan)
              ) {
                setNotice(
                  "A cotação mudou. Confira as escolhas e os valores atualizados antes de copiar.",
                );
                return;
              }
              await navigator.clipboard.writeText(purchaseSummaryText(fresh));
              setNotice("Resumo copiado. Nenhum pedido foi enviado.");
            } catch {
              setNotice(
                "Não foi possível atualizar e copiar o resumo. Verifique a conexão e a permissão de copiar do navegador.",
              );
            } finally {
              setCopying(false);
            }
          }}
        >
          {copying ? "Conferindo valores…" : "Copiar resumo"}
        </button>
      </header>
      {notice && <p role="status">{notice}</p>}
      <div className="decision-summary">
        <div>
          <small>Produtos selecionados</small>
          <strong>{money(plan.subtotal)}</strong>
        </div>
        <div>
          <small>Descontos negociados nos produtos</small>
          <strong>{money(plan.desconto)}</strong>
          <span>Já descontados do subtotal</span>
        </div>
        <div>
          <small>Frete dos fornecedores escolhidos</small>
          <strong>{money(plan.frete)}</strong>
        </div>
      </div>
      {!plan.fornecedores.length ? (
        <p>Escolha o fornecedor de cada produto para montar o resumo.</p>
      ) : (
        plan.fornecedores.map((s) => (
          <article className="decision-product" key={s.conviteId}>
            <header className="purchase-toolbar">
              <h3>{s.fornecedor}</h3>
              <strong>{money(s.total)} com frete</strong>
            </header>
            <p>
              {s.email || ""} {s.telefone || ""}
            </p>
            <div className="analysis-table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Produto",
                      "Comprar",
                      "Marca",
                      "Unitário original",
                      "Unitário final",
                      "Total",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.itens.map((i) => (
                    <tr key={i.produtoId}>
                      <td>
                        {i.nome}
                        {i.motivo && (
                          <small className="purchase-choice-reason">
                            Motivo: {i.motivo}
                          </small>
                        )}
                      </td>
                      <td>
                        {i.quantidade} {i.unidade}
                      </td>
                      <td>{i.marca}</td>
                      <td>{money(i.original)}</td>
                      <td>{money(i.unitario)}</td>
                      <td>{money(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="purchase-summary-terms">
              <span>
                Subtotal: <strong>{money(s.subtotal)}</strong>
              </span>
              <span>
                Frete informado: <strong>{money(s.frete)}</strong>
              </span>
              <span>
                Entrega: <strong>{s.prazoEntrega || "Não informada"}</strong>
              </span>
              <span>
                Pagamento: <strong>{s.pagamento || "Não informado"}</strong>
              </span>
            </div>
          </article>
        ))
      )}
      <footer className="purchase-summary-total">
        <span>
          {plan.completa
            ? "Total estimado da compra"
            : "Total parcial das escolhas válidas"}
        </span>
        <strong>{money(plan.total)}</strong>
      </footer>
      <p className="analysis-caution">
        Frete contado uma vez por fornecedor, usando o valor da proposta.
        Confirme se ele e as condições valem para os itens e quantidades
        escolhidos. Este resumo não gera pedido nem registra compra no sistema.
      </p>
    </section>
  );
}

import React, { useState } from "react";
const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const date = (value) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export function responseSummary(form) {
  const available = form.itens.filter((i) => i.disponivel);
  const complete = form.itens.filter(
    (i) =>
      !i.disponivel ||
      (Number(i.quantidade) > 0 && Number(i.valor) > 0 && i.marca.trim()),
  ).length;
  const subtotal = available.reduce(
    (sum, i) => sum + Number(i.quantidade || 0) * Number(i.valor || 0),
    0,
  );
  return {
    complete,
    available: available.length,
    subtotal,
    total: subtotal + Number(form.frete || 0),
  };
}
export function SupplierEditor({
  quote,
  form,
  update,
  setForm,
  busy,
  saved,
  error,
  onSubmit,
}) {
  const summary = form ? responseSummary(form) : null;
  return (
    <main className="supplier-workspace">
      {error && (
        <p className="supplier-message error" role="alert">
          {error}
        </p>
      )}
      {!quote || !form ? (
        <section className="supplier-empty">
          <h1>Preparando sua cotação</h1>
          <p>
            {error
              ? "Volte aos seus convites ou tente novamente."
              : "Carregando os produtos solicitados…"}
          </p>
        </section>
      ) : (
        <>
          <header className="supplier-hero">
            <div>
              <span className="supplier-eyebrow">SUA PROPOSTA COMERCIAL</span>
              <h1>{quote.titulo}</h1>
              <p>{quote.fornecedor}</p>
            </div>
            <div className="supplier-deadline">
              <span>Prazo para responder</span>
              <strong>{date(quote.prazo)}</strong>
              <small>
                Até{" "}
                {new Date(quote.prazo).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          </header>
          <form className="supplier-editor-layout" onSubmit={onSubmit}>
            <div className="supplier-editor-main">
              {quote.observacoes && (
                <div className="supplier-request-note">
                  <span>Orientações da Rodobach</span>
                  <p>{quote.observacoes}</p>
                </div>
              )}
              <div className="supplier-section-heading">
                <div>
                  <span className="supplier-eyebrow">01 / PRODUTOS</span>
                  <h2>O que você pode fornecer?</h2>
                </div>
                <span>
                  {summary.complete} de {form.itens.length} itens preenchidos
                </span>
              </div>
              {form.itens.map((item, index) => {
                const product = quote.itens.find((p) => p.id === item.id);
                const ready =
                  !item.disponivel ||
                  (item.quantidade > 0 && item.valor > 0 && item.marca.trim());
                return (
                  <section
                    className={`supplier-product ${!item.disponivel ? "unavailable" : ""}`}
                    key={item.id}
                  >
                    <header>
                      <span className="supplier-item-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{product.nome}</h3>
                        <p>
                          Solicitado{" "}
                          <strong>
                            {product.quantidade} {product.unidade}
                          </strong>
                        </p>
                      </div>
                      <span
                        className={`supplier-pill ${ready ? "done" : "pending"}`}
                      >
                        {!item.disponivel
                          ? "Não disponível"
                          : ready
                            ? "Preenchido"
                            : "A preencher"}
                      </span>
                    </header>
                    <label className="supplier-availability">
                      <input
                        type="checkbox"
                        checked={item.disponivel}
                        onChange={(e) =>
                          update(item.id, "disponivel", e.target.checked)
                        }
                      />
                      Tenho este produto disponível
                    </label>
                    {item.disponivel ? (
                      <>
                        <div className="supplier-product-inputs">
                          <label>
                            Quantidade ofertada ({product.unidade})
                            <input
                              required
                              type="number"
                              inputMode="decimal"
                              min="0.001"
                              max="1000000000"
                              step="0.001"
                              value={item.quantidade}
                              onChange={(e) =>
                                update(
                                  item.id,
                                  "quantidade",
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </label>
                          <label>
                            Valor por {product.unidade} (R$)
                            <input
                              required
                              type="number"
                              inputMode="decimal"
                              min="0.0001"
                              max="1000000000"
                              step="0.0001"
                              placeholder="0,00"
                              value={item.valor || ""}
                              onChange={(e) =>
                                update(
                                  item.id,
                                  "valor",
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </label>
                          <label>
                            Marca
                            <input
                              required
                              maxLength={200}
                              placeholder="Informe a marca"
                              value={item.marca}
                              onChange={(e) =>
                                update(item.id, "marca", e.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="supplier-product-footer">
                          <details open={item.observacoes ? true : undefined}>
                            <summary>Observações / especificação</summary>
                            <label>
                              <span className="supplier-eyebrow">
                                Detalhes do produto
                              </span>
                              <textarea
                                aria-label="Observações / especificação"
                                rows={2}
                                maxLength={1000}
                                placeholder="Modelo, medidas ou características adicionais"
                                value={item.observacoes}
                                onChange={(e) =>
                                  update(item.id, "observacoes", e.target.value)
                                }
                              />
                            </label>
                          </details>
                          <div>
                            <small>Total deste item</small>
                            <strong>
                              {money(item.quantidade * item.valor)}
                            </strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="supplier-unavailable-note">
                        Este item será enviado como indisponível e não entra no
                        total da proposta.
                      </p>
                    )}
                  </section>
                );
              })}
              <section className="supplier-terms">
                <div className="supplier-section-heading">
                  <div>
                    <span className="supplier-eyebrow">
                      02 / CONDIÇÕES COMERCIAIS
                    </span>
                    <h2>Combine os detalhes</h2>
                  </div>
                </div>
                <div className="supplier-product-inputs">
                  {[
                    ["frete", "Frete total (R$)", "0,00"],
                    ["prazoEntrega", "Prazo de entrega", "Ex.: 3 dias úteis"],
                    ["pagamento", "Condição de pagamento", "Ex.: 30 dias"],
                  ].map(([key, label, placeholder]) => (
                    <label key={key}>
                      {label}
                      <input
                        required
                        type={key === "frete" ? "number" : "text"}
                        inputMode={key === "frete" ? "decimal" : undefined}
                        min={0}
                        max={key === "frete" ? 1000000000 : undefined}
                        step="0.01"
                        maxLength={1000}
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [key]:
                              key === "frete"
                                ? e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="supplier-general-notes">
                  Observações gerais <small>Opcional</small>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="Inclua informações importantes para a equipe de compras"
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                  />
                </label>
              </section>
            </div>
            <aside className="supplier-summary">
              <span className="supplier-eyebrow">03 / REVISÃO E ENVIO</span>
              <h2>Sua proposta</h2>
              <div className="supplier-completion">
                <span>Preenchimento dos produtos</span>
                <strong>
                  {Math.round((summary.complete / form.itens.length) * 100)}%
                </strong>
                <progress value={summary.complete} max={form.itens.length} />
              </div>
              <dl>
                <div>
                  <dt>Itens disponíveis</dt>
                  <dd>
                    {summary.available} de {form.itens.length}
                  </dd>
                </div>
                <div>
                  <dt>Subtotal dos produtos</dt>
                  <dd>{money(summary.subtotal)}</dd>
                </div>
                <div>
                  <dt>Frete</dt>
                  <dd>{money(form.frete)}</dd>
                </div>
                <div className="supplier-grand-total">
                  <dt>Total da proposta</dt>
                  <dd>{money(summary.total)}</dd>
                </div>
              </dl>
              <p className="supplier-summary-note">
                Confira quantidades, marcas e condições antes de enviar. Você
                pode atualizar sua proposta até o encerramento.
              </p>
              <button
                className="purchase-primary supplier-submit"
                disabled={busy}
              >
                {busy ? "Enviando…" : "Enviar proposta"}
                <span aria-hidden="true">→</span>
              </button>
              {saved ? (
                <p className="supplier-message success" role="status">
                  Proposta recebida com sucesso.
                </p>
              ) : (
                <small className="supplier-save-note">
                  O preenchimento só é enviado ao clicar no botão.
                </small>
              )}
            </aside>
          </form>
        </>
      )}
    </main>
  );
}
function status(q) {
  return q.status !== "aberta" || new Date(q.prazo) <= new Date()
    ? "closed"
    : q.respondido_em
      ? "sent"
      : "pending";
}
export function SupplierInvitations({ quotes, loading, onOpen }) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const visible = quotes.filter(
    (q) =>
      (filter === "all" || status(q) === filter) &&
      q.titulo
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const pending = quotes.filter((q) => status(q) === "pending").length;
  return (
    <main className="supplier-workspace">
      <header className="supplier-hero">
        <div>
          <span className="supplier-eyebrow">PARCERIA QUE MOVE A RODOBACH</span>
          <h1>Minhas cotações</h1>
          <p>Seus convites, suas propostas. Tudo em um só lugar.</p>
        </div>
        <div className="supplier-deadline">
          <strong>{loading ? "—" : pending}</strong>
          <span>
            {pending === 1
              ? "convite aguardando você"
              : "convites aguardando você"}
          </span>
        </div>
      </header>
      <div className="supplier-inbox-toolbar">
        <div
          className="supplier-tabs"
          role="group"
          aria-label="Filtrar convites"
        >
          {[
            ["all", "Todos"],
            ["pending", "A responder"],
            ["sent", "Enviadas"],
            ["closed", "Encerradas"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              <span>
                {id === "all"
                  ? quotes.length
                  : quotes.filter((q) => status(q) === id).length}
              </span>
            </button>
          ))}
        </div>
        <input
          aria-label="Buscar cotação"
          placeholder="Buscar cotação…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <p>Carregando cotações…</p>
      ) : !visible.length ? (
        <section className="supplier-empty">
          <span aria-hidden="true">▤</span>
          <h2>
            {quotes.length
              ? "Nenhuma cotação neste filtro"
              : "Seu próximo convite aparece aqui"}
          </h2>
          <p>
            {quotes.length
              ? "Tente outro filtro ou termo de busca."
              : "Quando a Rodobach convidar sua empresa, você poderá preparar e acompanhar sua proposta por aqui."}
          </p>
        </section>
      ) : (
        <div className="supplier-invitation-grid">
          {visible.map((q) => {
            const state = status(q);
            return (
              <article className={`supplier-invitation ${state}`} key={q.token}>
                <div className="supplier-invitation-top">
                  <span className={`supplier-pill ${state}`}>
                    {state === "closed"
                      ? q.status === "cancelada"
                        ? "Cancelada"
                        : "Encerrada"
                      : state === "sent"
                        ? "Proposta enviada"
                        : "Aguardando sua proposta"}
                  </span>
                  <span aria-hidden="true">↗</span>
                </div>
                <h2>{q.titulo}</h2>
                <dl>
                  <div>
                    <dt>Produtos solicitados</dt>
                    <dd>
                      {q.produtos} {Number(q.produtos) === 1 ? "item" : "itens"}
                    </dd>
                  </div>
                  <div>
                    <dt>Responder até</dt>
                    <dd>{date(q.prazo)}</dd>
                  </div>
                </dl>
                <footer>
                  <small>
                    {state === "closed"
                      ? "Recebimento finalizado"
                      : state === "sent"
                        ? "Você pode revisar até o prazo"
                        : "Prepare sua melhor oferta"}
                  </small>
                  <button
                    className={state === "pending" ? "purchase-primary" : ""}
                    disabled={state === "closed"}
                    onClick={() => onOpen(q.token)}
                  >
                    {state === "closed"
                      ? "Encerrada"
                      : state === "sent"
                        ? "Revisar proposta"
                        : "Responder cotação"}{" "}
                    {state !== "closed" && <span aria-hidden="true">→</span>}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

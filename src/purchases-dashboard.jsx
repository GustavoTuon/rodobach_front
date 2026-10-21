import { quoteProgress } from "./purchases-status.js";
import { SupplierAccess } from "./purchases-groups.jsx";
import { analysisRows } from "./purchases-analysis.jsx";
import PurchaseDecision from "./purchases-decision.jsx";
import React, { useState } from "react";
const money = (v) =>
  v == null
    ? "Não informado"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = (v) =>
  v
    ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString(
        "pt-BR",
      )
    : "Sem data";
export function quoteStatus(q) {
  if (q.origem_chave) return "historico";
  if (q.status === "cancelada") return "cancelada";
  if (q.status === "encerrada" || new Date(q.prazo) <= new Date())
    return "encerrada";
  return "aberta";
}
export function PurchaseDashboard({
  quotes,
  onOpen,
  onNew,
  onImport,
  onRefresh,
  importing,
  loading,
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("todas"),
    [page, setPage] = useState(1);
  const filtered = quotes.filter(
    (q) =>
      (filter === "todas" ||
        quoteStatus(q) === filter ||
        quoteProgress(q).key === filter) &&
      `${q.titulo} ${q.origem_chave || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12)),
    current = Math.min(page, pages);
  const active = quotes.filter((q) => quoteStatus(q) === "aberta"),
    pending = active.reduce(
      (sum, q) => sum + Math.max(0, q.fornecedores - q.respostas),
      0,
    );
  return (
    <>
      <div className="purchase-metrics">
        {[
          [quotes.length, "Cotações no painel", "Sua base de negociações"],
          [active.length, "Em andamento", "Recebendo propostas"],
          [pending, "Respostas pendentes", "Fornecedores a acompanhar"],
          [
            quotes.filter((q) => q.origem_chave).length,
            "Importadas do sistema",
            "Histórico preservado",
          ],
        ].map(([value, label, hint]) => (
          <div className="purchase-metric" key={label}>
            <span>{label}</span>
            <strong>{loading ? "—" : value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      <section className="purchase-card purchase-panel">
        <header className="purchase-toolbar">
          <div>
            <h2>Suas cotações</h2>
            <p>Encontre uma negociação ou comece uma nova compra.</p>
          </div>
          <div className="purchase-actions">
            <button disabled={importing} onClick={onImport}>
              {importing ? "Importando…" : "↻ Importar do sistema"}
            </button>
            <button className="purchase-primary" onClick={onNew}>
              ＋ Nova cotação
            </button>
          </div>
        </header>
        <div className="purchase-filters">
          <label className="purchase-search">
            <span>Buscar cotação</span>
            <input
              placeholder="Busque por solicitação, empresa ou título"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Atualizar cotações"
          >
            Atualizar
          </button>
        </div>
        <div
          className="purchase-filter-tabs"
          role="group"
          aria-label="Filtrar por situação"
        >
          {[
            ["todas", "Todas"],
            ["cancelada", "Canceladas"],
            ["aberta", "Em andamento"],
            ["aguardando", "Aguardando respostas"],
            ["parcial", "Respostas parciais"],
            ["respondida", "Prontas para analisar"],
            ["historico", "Do sistema"],
            ["encerrada", "Encerradas"],
          ].map(([id, label]) => (
            <button
              aria-pressed={filter === id}
              key={id}
              onClick={() => {
                setFilter(id);
                setPage(1);
              }}
            >
              {label}
              <span>
                {id === "todas"
                  ? quotes.length
                  : quotes.filter(
                      (q) =>
                        quoteStatus(q) === id || quoteProgress(q).key === id,
                    ).length}
              </span>
            </button>
          ))}
        </div>
        <div className="purchase-list-heading">
          <span>Cotação / origem</span>
          <span>Produtos</span>
          <span>Fornecedores</span>
          <span>Data / prazo</span>
          <span>Situação</span>
        </div>
        <div className="purchase-list">
          {filtered.slice((current - 1) * 12, current * 12).map((q) => (
            <button
              className="purchase-list-row"
              key={q.id}
              onClick={() => onOpen(q.id)}
            >
              <span className="purchase-row-title">
                <span className="purchase-doc-icon" aria-hidden="true">
                  ▤
                </span>
                <span>
                  <strong>{q.titulo}</strong>
                  {!q.origem_chave && (
                    <small>
                      #{q.id.slice(0, 8).toUpperCase()} · Criada em{" "}
                      {shortDate(q.criado_em)}
                    </small>
                  )}
                  <small>
                    {q.origem_chave
                      ? `${q.respostas} ofertas registradas no sistema`
                      : `${q.respostas} de ${q.fornecedores} respostas recebidas`}
                  </small>
                </span>
              </span>
              <span data-label="Produtos">
                {q.produtos ?? "—"} <small>itens</small>
              </span>
              <span data-label="Fornecedores">
                {q.fornecedores} <small>participantes</small>
              </span>
              <span data-label={q.origem_chave ? "Criada em" : "Prazo"}>
                {shortDate(q.origem_chave ? q.criado_em : q.prazo)}
                <small>
                  {q.origem_chave ? "Data de origem" : "Limite de resposta"}
                </small>
              </span>
              <span className={`purchase-badge ${quoteProgress(q).key}`}>
                {quoteProgress(q).label}
              </span>
            </button>
          ))}
        </div>
        {!filtered.length && !loading && (
          <div className="purchase-empty">
            <span aria-hidden="true">▤</span>
            <h3>
              {quotes.length
                ? "Nenhuma cotação com esses filtros"
                : "Tudo pronto para sua primeira cotação"}
            </h3>
            <p>
              {quotes.length
                ? "Tente outro termo ou selecione Todas."
                : "Importe o histórico do sistema ou adicione os produtos de uma nova compra."}
            </p>
          </div>
        )}
        <footer className="purchase-pagination">
          <span>
            {filtered.length} cotações · Página {current} de {pages}
          </span>
          <div className="purchase-actions">
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <button
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
export function comparableErpOffers(offers) {
  return offers
    .map((o) => ({
      ...o,
      precoLiquido:
        Number(o.quantidadecotadacot) > 0 && o.valortotalcot != null
          ? Number(o.valortotalcot) / Number(o.quantidadecotadacot)
          : null,
    }))
    .sort(
      (a, b) => (a.precoLiquido ?? Infinity) - (b.precoLiquido ?? Infinity),
    );
}
export function ImportedQuote({ quote, onBack }) {
  const [query, setQuery] = useState("");
  const source = quote.origem_dados;
  const products = quote.itens.filter((i) =>
    `${i.nome} ${i.codigo}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      <button className="purchase-back" onClick={onBack}>
        ← Voltar às cotações
      </button>
      <section className="purchase-card">
        <header className="purchase-toolbar">
          <div>
            <span className="purchase-badge historico">
              Histórico do sistema
            </span>
            <h2 className="purchase-detail-title">{quote.titulo}</h2>
            <p>
              {quote.itens.length} produtos · {source.fornecedores} fornecedores
              · {source.ofertas.length} ofertas
            </p>
          </div>
          <div>
            <small>Última oferta registrada</small>
            <strong>{shortDate(source.ultima_data)}</strong>
          </div>
        </header>
        <div className="purchase-info">
          Importada para consulta. Aprovações e recusas abaixo são as
          registradas no sistema de origem. Esta importação não envia convites e
          não reabre a negociação.
        </div>
        {quote.observacoes && <p>{quote.observacoes}</p>}
      </section>
      <PurchaseDecision quote={quote} rows={analysisRows(quote)} />
      <details className="analysis-original">
        <summary>Consultar registros originais e descontos</summary>
        <label className="purchase-search">
          <span>Encontrar produto nesta cotação</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou código do produto"
          />
        </label>
        {products.map((product) => {
          const offers = comparableErpOffers(
            source.ofertas.filter(
              (o) => String(o.produtocot) === product.codigo,
            ),
          );
          const eligible = offers.filter(
            (o) =>
              !o.reprovadacot &&
              o.precoLiquido > 0 &&
              (product.quantidade == null ||
                Number(o.quantidadecotadacot) >= product.quantidade),
          );
          const best = eligible[0]?.precoLiquido;
          return (
            <section className="purchase-card" key={product.id}>
              <header className="purchase-toolbar">
                <div>
                  <small>PRODUTO {product.codigo}</small>
                  <h2>{product.nome}</h2>
                  <p>
                    {product.quantidade == null
                      ? "Quantidade solicitada não informada"
                      : `Solicitado: ${product.quantidade} ${product.unidade}`}{" "}
                    · {offers.length} ofertas
                  </p>
                </div>
                {best != null && (
                  <div className="purchase-best">
                    <small>Menor unitário líquido elegível</small>
                    <strong>{money(best)}</strong>
                  </div>
                )}
              </header>
              <p className="purchase-comparison-note">
                Unitário líquido = total registrado ÷ quantidade ofertada.
                Confira datas, quantidades e observações: descontos e adicionais
                são os do sistema; frete e marca não estão informados nesta
                fonte.
              </p>
              <div className="purchase-offer-grid">
                {offers.map((o) => {
                  const partial =
                    product.quantidade != null &&
                    Number(o.quantidadecotadacot) < product.quantidade;
                  const winner =
                    !o.reprovadacot && !partial && o.precoLiquido === best;
                  return (
                    <article
                      className={`purchase-offer${winner ? " best" : ""}`}
                      key={o.codigocot}
                    >
                      <header>
                        <span
                          className={`purchase-badge ${o.reprovadacot ? "rejected" : winner ? "aberta" : "neutral"}`}
                        >
                          {o.aprovadacot
                            ? "Aprovada no sistema"
                            : o.reprovadacot
                              ? "Recusada no sistema"
                              : winner
                                ? "Menor preço elegível"
                                : "Oferta registrada"}
                        </span>
                        <small>
                          #{o.codigocot} · {shortDate(o.data)}
                        </small>
                      </header>
                      <h3>{o.fornecedor || `Fornecedor ${o.fornecedorcot}`}</h3>
                      <strong className="purchase-offer-price">
                        {money(o.precoLiquido)}
                        <small>por {product.unidade} · líquido</small>
                      </strong>
                      <dl>
                        <div>
                          <dt>Quantidade ofertada</dt>
                          <dd>
                            {Number(o.quantidadecotadacot)} {product.unidade}
                            {partial ? " · Parcial" : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Unitário original</dt>
                          <dd>{money(o.valorunitariocot)}</dd>
                        </div>
                        <div>
                          <dt>Total registrado</dt>
                          <dd>{money(o.valortotalcot)}</dd>
                        </div>
                        <div>
                          <dt>Desconto registrado</dt>
                          <dd>{money(o.valordescontocot)}</dd>
                        </div>
                        <div>
                          <dt>Adicional registrado</dt>
                          <dd>{money(o.valoradicionalcot)}</dd>
                        </div>
                        <div>
                          <dt>Validade</dt>
                          <dd>{shortDate(o.validade)}</dd>
                        </div>
                      </dl>
                      {o.observacaocot && (
                        <p className="purchase-offer-note">{o.observacaocot}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!products.length && (
          <div className="purchase-empty">Nenhum produto encontrado.</div>
        )}
      </details>
    </>
  );
}
export function SupplierDirectory({ suppliers, onRefresh }) {
  const [query, setQuery] = useState("");
  const filtered = suppliers.filter((s) =>
    `${s.nome} ${s.codigo_erp || ""} ${s.documento}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="purchase-card">
      <header className="purchase-toolbar">
        <div>
          <h2>Seus fornecedores</h2>
          <p>{suppliers.length} fornecedores disponíveis para cotação.</p>
        </div>
      </header>
      <label className="purchase-search">
        <span>Buscar fornecedor</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, documento ou código"
        />
      </label>
      <div className="purchase-supplier-grid">
        {filtered.map((s) => (
          <article className="purchase-supplier" key={s.id}>
            <span className="purchase-avatar" aria-hidden="true">
              {s.nome.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h3>{s.nome}</h3>
              <p>{s.email || "E-mail não informado"}</p>
              <p>{s.telefone || "Telefone não informado"}</p>
              <small>
                {s.codigo_erp
                  ? `Sistema · Código ${s.codigo_erp}`
                  : "Cadastro no portal"}
              </small>
              {onRefresh && (
                <SupplierAccess supplier={s} onRefresh={onRefresh} />
              )}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && <p>Nenhum fornecedor encontrado.</p>}
    </section>
  );
}
export function SupplierPicker({
  suppliers,
  selected,
  onChange,
  groups = [],
  label = "Fornecedores deste produto",
  showGroups = true,
}) {
  const [query, setQuery] = useState("");
  const filtered = suppliers.filter((s) =>
    s.nome
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <fieldset className="purchase-supplier-picker">
      {showGroups && (
        <label>
          Adicionar um grupo
          <select
            aria-label="Adicionar um grupo"
            disabled={!groups.length}
            value=""
            onChange={(e) => {
              const group = groups.find((g) => g.id === e.target.value);
              if (group)
                onChange([...new Set([...selected, ...group.fornecedores])]);
            }}
          >
            <option value="">
              {groups.length
                ? "Selecione um grupo para marcar os fornecedores"
                : "Nenhum grupo cadastrado"}
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id} disabled={!g.fornecedores.length}>
                {g.nome} ({g.fornecedores.length})
              </option>
            ))}
          </select>
          {!groups.length && (
            <small>
              Crie seus grupos na aba Fornecedores para selecionar vários
              parceiros de uma vez.
            </small>
          )}
          {groups
            .filter(
              (g) =>
                g.fornecedores.length &&
                g.fornecedores.every((id) => selected.includes(id)),
            )
            .map((g) => (
              <small className="purchase-badge respondida" key={g.id}>
                {g.nome}: fornecedores selecionados
              </small>
            ))}
        </label>
      )}
      <legend>
        {label} · {selected.length} selecionados
      </legend>
      <label className="purchase-search">
        <span>Buscar na sua rede de fornecedores</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do fornecedor"
        />
      </label>
      <div className="purchase-selected-suppliers">
        {suppliers
          .filter((s) => selected.includes(s.id))
          .map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => onChange(selected.filter((id) => id !== s.id))}
              aria-label={`Remover ${s.nome}`}
            >
              {s.nome} ×
            </button>
          ))}
      </div>
      <div className="purchase-picker-options">
        {filtered.map((s) => (
          <label className="purchase-check" key={s.id}>
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, s.id]
                    : selected.filter((id) => id !== s.id),
                )
              }
            />
            <span>{s.nome}</span>
          </label>
        ))}
      </div>
      {!suppliers.length && (
        <p>
          Cadastre fornecedores na aba Fornecedores. Sua cotação permanece
          preenchida ao trocar de aba.
        </p>
      )}
      {suppliers.length > 0 && !filtered.length && (
        <p>Nenhum fornecedor com esse nome.</p>
      )}
    </fieldset>
  );
}

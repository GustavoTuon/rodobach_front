import React, { useEffect, useState } from "react";
const money = (value) =>
  value == null
    ? "Não informado"
    : Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
export function analysisRows(quote) {
  if (quote.origem_dados)
    return quote.origem_dados.ofertas.map((o) => {
      const product = quote.itens.find(
        (i) => String(i.codigo) === String(o.produtocot),
      );
      const quantity = Number(o.quantidadecotadacot),
        total = o.valortotalcot == null ? null : Number(o.valortotalcot);
      return {
        id: `erp-${o.codigocot}`,
        product: product?.nome || String(o.produtocot),
        productId: product?.id || String(o.produtocot),
        supplier: o.fornecedor || String(o.fornecedorcot),
        supplierId: String(o.fornecedorcot),
        quantity,
        requested: product?.quantidade,
        unit: product?.unidade || "—",
        price: quantity > 0 && total != null ? total / quantity : null,
        total,
        brand: "Não informada",
        freight: null,
        date: o.data,
        notes: o.observacaocot || "",
        available: !o.reprovadacot,
        status: o.aprovadacot
          ? "Aprovada no sistema"
          : o.reprovadacot
            ? "Recusada no sistema"
            : "Registrada",
      };
    });
  return quote.convites.flatMap((c) =>
    (c.resposta?.itens || []).map((o) => {
      const p = quote.itens.find((i) => i.id === o.id);
      const discount = c.descontos?.[o.id];
      const price = discount?.original === o.valor ? discount.valor : o.valor;
      return {
        inviteId: c.id,
        proposalVersion: c.versaoProposta,
        originalPrice: o.valor,
        discount: discount?.original === o.valor ? discount : null,
        id: `${c.id}:${o.id}`,
        product: p?.nome || o.id,
        productId: o.id,
        supplier: c.nome,
        supplierId: c.fornecedor_id,
        quantity: o.quantidade,
        requested: p?.quantidade,
        unit: p?.unidade,
        price: o.disponivel ? price : null,
        total: o.disponivel ? price * o.quantidade : null,
        brand: o.marca || "Não informada",
        freight: c.resposta.frete,
        delivery: c.resposta.prazoEntrega,
        payment: c.resposta.pagamento,
        date: c.respondido_em,
        notes: o.observacoes,
        available: o.disponivel,
        status: o.disponivel ? "Respondida" : "Indisponível",
      };
    }),
  );
}
export function sortAnalysis(rows, sort) {
  return [...rows].sort((a, b) =>
    sort === "supplier"
      ? a.supplier.localeCompare(b.supplier, "pt-BR")
      : sort === "recent"
        ? String(b.date || "").localeCompare(String(a.date || ""))
        : (a[sort] ?? Infinity) - (b[sort] ?? Infinity),
  );
}
const fits = (r) =>
  r.available &&
  r.price > 0 &&
  r.requested != null &&
  r.quantity >= Number(r.requested);
export default function PurchaseAnalysis({ quote }) {
  const key = `rodobach:purchase-analysis:${window.RB_AUTH?.getUser?.()?.id || "local"}`;
  const [settings, setSettings] = useState(() => {
      try {
        const v = JSON.parse(localStorage.getItem(key));
        return {
          view: ["cards", "table", "supplier"].includes(v?.view)
            ? v.view
            : "cards",
          sort: ["price", "total", "supplier", "recent"].includes(v?.sort)
            ? v.sort
            : "price",
        };
      } catch {
        return { view: "cards", sort: "price" };
      }
    }),
    [search, setSearch] = useState(""),
    [supplier, setSupplier] = useState(""),
    [onlyFull, setOnlyFull] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {
      /* Preference storage is optional. */
    }
  }, [key, settings]);
  const all = analysisRows(quote),
    rows = sortAnalysis(
      all.filter(
        (r) =>
          (!supplier || r.supplierId === supplier) &&
          (!onlyFull || fits(r)) &&
          `${r.product} ${r.supplier} ${r.brand}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")),
      ),
      settings.sort,
    );
  const suppliers = [
    ...new Map(all.map((r) => [r.supplierId, r.supplier])).entries(),
  ];
  const groups = new Map();
  for (const row of rows) {
    const id = settings.view === "supplier" ? row.supplierId : row.productId;
    if (!groups.has(id))
      groups.set(id, {
        title: settings.view === "supplier" ? row.supplier : row.product,
        rows: [],
      });
    groups.get(id).rows.push(row);
  }
  const bestPrice = (productId) => {
    const valid = all
      .filter((r) => r.productId === productId && fits(r))
      .map((r) => r.price);
    return valid.length ? Math.min(...valid) : null;
  };
  const status = (r) =>
    !r.available
      ? r.status
      : r.requested == null
        ? "Quantidade solicitada desconhecida"
        : r.quantity < r.requested
          ? "Quantidade parcial"
          : r.price === bestPrice(r.productId)
            ? "Menor unitário · atende quantidade"
            : "Atende quantidade";
  return (
    <section className="purchase-card purchase-analysis">
      <header className="purchase-toolbar">
        <div>
          <span className="purchase-eyebrow">SEU JEITO DE COMPARAR</span>
          <h2>Uma análise, várias perspectivas</h2>
          <p>
            Escolha sua visualização. O modo e a ordenação ficam salvos neste
            navegador.
          </p>
        </div>
        <span className="quest-score">
          {rows.length} de {all.length} ofertas
        </span>
      </header>
      <div className="analysis-modes" role="group" aria-label="Modo de análise">
        {[
          ["cards", "Por produto"],
          ["table", "Tabela comparativa"],
          ["supplier", "Por fornecedor"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={settings.view === value}
            onClick={() => setSettings({ ...settings, view: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="analysis-controls">
        <label className="purchase-field">
          Buscar na análise
          <input
            placeholder="Produto, fornecedor ou marca"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="purchase-field">
          Fornecedor
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">Todos os fornecedores</option>
            {suppliers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="purchase-field">
          Ordenar por
          <select
            value={settings.sort}
            onChange={(e) => setSettings({ ...settings, sort: e.target.value })}
          >
            <option value="price">Menor preço unitário</option>
            <option value="total">Menor total ofertado</option>
            <option value="supplier">Nome do fornecedor</option>
            <option value="recent">Resposta mais recente</option>
          </select>
        </label>
      </div>
      <label className="purchase-check">
        <input
          type="checkbox"
          checked={onlyFull}
          onChange={(e) => setOnlyFull(e.target.checked)}
        />
        Somente ofertas que atendem toda a quantidade
      </label>
      <p className="analysis-caution">
        A ordenação por preço não inclui frete. O frete informado é por proposta
        do fornecedor, não por produto. Totais de quantidades diferentes não
        representam a mesma compra.{" "}
        {quote.origem_dados
          ? "No histórico, o unitário é o total registrado dividido pela quantidade; marca não estruturada e frete não informados."
          : ""}
      </p>
      {settings.view === "table" ? (
        <div
          className="analysis-table-scroll"
          role="region"
          aria-label="Tabela comparativa de ofertas"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {[
                  "Produto",
                  "Fornecedor",
                  "Quantidade",
                  "Unitário",
                  "Total ofertado",
                  "Frete da proposta",
                  "Marca",
                  "Situação",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.product}</td>
                  <td>{r.supplier}</td>
                  <td>
                    {r.quantity} {r.unit}
                  </td>
                  <td>
                    {money(r.price)}
                    {r.discount && <small> Negociado</small>}
                  </td>
                  <td>{money(r.total)}</td>
                  <td>{money(r.freight)}</td>
                  <td>{r.brand}</td>
                  <td>{status(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {[...groups.entries()].map(([id, group]) => (
            <section key={id} className="analysis-group">
              <h3>{group.title}</h3>
              {settings.view === "supplier" && (
                <p>
                  Frete da proposta: {money(group.rows[0].freight)} · Exibindo{" "}
                  {group.rows.length} ofertas. Confira a cobertura dos produtos;
                  não há soma de versões do histórico.
                </p>
              )}
              <div className="purchase-offer-grid">
                {group.rows.map((r) => (
                  <article
                    className={`purchase-offer ${fits(r) && r.price === bestPrice(r.productId) ? "best" : ""}`}
                    key={r.id}
                  >
                    <span className="purchase-badge">{status(r)}</span>
                    <h3>
                      {settings.view === "supplier" ? r.product : r.supplier}
                    </h3>
                    <strong className="purchase-offer-price">
                      {money(r.price)}
                      <small>por {r.unit}</small>
                    </strong>
                    <dl>
                      <div>
                        <dt>Ofertado / solicitado</dt>
                        <dd>
                          {r.quantity} / {r.requested ?? "—"} {r.unit}
                        </dd>
                      </div>
                      <div>
                        <dt>Total ofertado</dt>
                        <dd>{money(r.total)}</dd>
                      </div>
                      <div>
                        <dt>Marca</dt>
                        <dd>{r.brand}</dd>
                      </div>
                      <div>
                        <dt>Frete da proposta</dt>
                        <dd>{money(r.freight)}</dd>
                      </div>
                      <div>
                        <dt>Registro</dt>
                        <dd>
                          {r.date
                            ? new Date(
                                r.date.length === 10
                                  ? `${r.date}T12:00:00`
                                  : r.date,
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                    {r.notes && (
                      <p className="purchase-offer-note">{r.notes}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {!rows.length && (
        <div className="purchase-empty">
          <h3>
            {all.length
              ? "Nenhuma oferta com esses filtros"
              : "Aguardando as primeiras respostas"}
          </h3>
          <p>
            {all.length
              ? "Ajuste a busca ou desmarque o filtro de quantidade."
              : "As propostas recebidas aparecerão aqui para comparação."}
          </p>
        </div>
      )}
    </section>
  );
}

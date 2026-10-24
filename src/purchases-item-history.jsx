import React, { useEffect, useState } from "react";
import { purchasesApi as api } from "./purchases-api.js";
export const money = (v) =>
  v == null
    ? "Não informado"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const quantity = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
export const dateLabel = (v) =>
  v
    ? new Date(
        String(v).length === 10 ? `${v}T12:00:00` : v,
      ).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "—";
export function historyDate(quote) {
  if (!quote.criado_em) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(quote.criado_em));
}
export function priceDifference(price, previous, unit) {
  if (!(price > 0) || !(Number(previous?.valor_unitario) > 0)) return null;
  if (
    !unit ||
    !previous.unidade ||
    unit.trim().toUpperCase() !== previous.unidade.trim().toUpperCase()
  )
    return null;
  return (price / Number(previous.valor_unitario) - 1) * 100;
}
export function HistoryTable({ rows }) {
  return (
    <div className="analysis-table-scroll">
      <table className="item-history-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Fornecedor</th>
            <th>Documento</th>
            <th>Quantidade / unidade</th>
            <th>Unitário registrado</th>
            <th>Total registrado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => (
            <tr key={i}>
              <td data-label="Data">{dateLabel(h.data)}</td>
              <td data-label="Fornecedor">{h.fornecedor || "Não informado"}</td>
              <td data-label="Documento">{h.documento}</td>
              <td data-label="Quantidade / unidade">
                {quantity(h.quantidade)} {h.unidade || "Unidade não informada"}
              </td>
              <td data-label="Unitário registrado">
                {money(h.valor_unitario)}
              </td>
              <td data-label="Total registrado">{money(h.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function ItemHistory({
  product,
  preview,
  cutoff,
  loading,
  error,
}) {
  const [open, setOpen] = useState(false),
    [filters, setFilters] = useState({ de: "", ate: cutoff, fornecedor: "" }),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    setFailure("");
    setResult(null);
    if (filters.de && filters.ate && filters.de > filters.ate) {
      setFailure("A data inicial deve ser anterior à data final.");
      setBusy(false);
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        empresa: product.empresa,
        codigo: product.codigo,
        page: String(page),
        ...filters,
      });
      api(`/historico?${params}`)
        .then((data) => {
          if (active) setResult(data);
        })
        .catch((e) => {
          if (active) setFailure(e.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, product.empresa, product.codigo, page, filters, retry]);
  return (
    <section
      className="item-history"
      aria-label={`Histórico de ${product.nome}`}
    >
      <header className="purchase-toolbar">
        <div>
          <h4>Compras anteriores</h4>
          <small>
            Empresa {product.empresa} ·{" "}
            {cutoff
              ? `Referência até ${dateLabel(cutoff)}`
              : "Referência sem data de abertura"}
          </small>
        </div>
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Fechar histórico completo" : "Ver histórico completo"}
        </button>
      </header>
      {!open ? (
        loading ? (
          <p role="status">Consultando compras anteriores…</p>
        ) : error ? (
          <p>Histórico indisponível.</p>
        ) : preview.length ? (
          <>
            <HistoryTable rows={preview} />
            <small>
              Até 3 compras mais recentes até a data de referência acima.
            </small>
          </>
        ) : (
          <p>
            Nenhuma compra anterior encontrada para este produto nesta empresa.
          </p>
        )
      ) : (
        <>
          <div className="analysis-controls">
            <label>
              Fornecedor
              <input
                placeholder="Buscar fornecedor no histórico"
                value={filters.fornecedor}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, fornecedor: e.target.value });
                }}
              />
            </label>
            <label>
              Compras a partir de
              <input
                type="date"
                value={filters.de}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, de: e.target.value });
                }}
              />
            </label>
            <label>
              Compras até
              <input
                type="date"
                value={filters.ate}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, ate: e.target.value });
                }}
              />
            </label>
          </div>
          <p>
            Os filtros abaixo não alteram a referência da cotação. Você também
            pode consultar compras posteriores.
          </p>
          {busy ? (
            <p role="status">Carregando histórico…</p>
          ) : failure ? (
            <p role="alert">
              {failure}{" "}
              <button onClick={() => setRetry(retry + 1)}>
                Tentar novamente
              </button>
            </p>
          ) : result?.rows?.length ? (
            <HistoryTable rows={result.rows} />
          ) : (
            <p>Nenhuma compra encontrada com esses filtros.</p>
          )}
          <div className="purchase-actions">
            <button
              disabled={busy || page === 1}
              onClick={() => setPage(page - 1)}
            >
              Compras anteriores: página anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={busy || !result?.hasMore}
              onClick={() => setPage(page + 1)}
            >
              Mais compras
            </button>
          </div>
        </>
      )}
      <small>
        Valores da nota de entrada. Confira marca, embalagem e impostos; unidade
        igual não garante produto equivalente.
      </small>
    </section>
  );
}

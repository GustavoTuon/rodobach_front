import React, { useEffect, useState } from "react";
import { purchasesApi as api } from "./purchases-api.js";
import { money, quantity, dateLabel } from "./purchases-item-history.jsx";
export default function PreviousSuppliers({
  product,
  suppliers = [],
  onSelect,
}) {
  const [rows, setRows] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(
      `/historico?${new URLSearchParams({ empresa: product.empresa, codigo: product.codigo })}`,
    )
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [product.empresa, product.codigo]);
  const recent = [
    ...new Map(
      (rows || [])
        .slice()
        .reverse()
        .map((h) => [String(h.fornecedor_codigo), h]),
    ).values(),
  ].sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return (
    <div className="previous-suppliers">
      <strong>
        {onSelect ? "Já compramos de" : "Última compra registrada"}
      </strong>
      {error ? (
        <p>Histórico indisponível: {error}</p>
      ) : rows === null ? (
        <p>Consultando histórico…</p>
      ) : !rows.length ? (
        <p>Sem compras anteriores nesta empresa.</p>
      ) : (
        (onSelect ? recent : rows.slice(0, 1)).map((h, index) => {
          const supplier = suppliers.find(
            (s) =>
              String(s.empresa_erp) === String(product.empresa) &&
              String(s.codigo_erp) === String(h.fornecedor_codigo),
          );
          return (
            <div key={index}>
              <span>
                {h.fornecedor} · {money(h.valor_unitario)} /{" "}
                {h.unidade || "unidade não informada"}
                <small>
                  {dateLabel(h.data)} · {quantity(h.quantidade)} {h.unidade}
                </small>
              </span>
              {onSelect &&
                (supplier ? (
                  <button type="button" onClick={() => onSelect(supplier.id)}>
                    Convidar {supplier.nome}
                  </button>
                ) : (
                  <small>Fornecedor ainda não cadastrado no portal.</small>
                ))}
            </div>
          );
        })
      )}
      {onSelect && rows?.length > 0 && (
        <small>
          Fornecedores encontrados nas últimas 50 compras. Consulte também os
          demais fornecedores abaixo.
        </small>
      )}
    </div>
  );
}

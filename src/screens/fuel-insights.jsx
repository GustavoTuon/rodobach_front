import React from "react";
import "./fuel-insights.css";
const n = (value, digits = 1) =>
  Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });
const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const date = (value) => value?.split("-").reverse().join("/");
const labels = {
  alerta: "Consumo aumentou",
  atencao: "Atenção",
  melhora: "Melhorou",
  estavel: "Estável",
  pendente: "Conferir dados",
};
const order = { alerta: 0, atencao: 1, pendente: 2, estavel: 3, melhora: 4 };
export function FuelInsights({ data, onHistory, onReview }) {
  const [filter, setFilter] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const comparison = data.comparison;
  const erp = data.fonteKm === "abastecimento";
  const map = new Map((comparison?.vehicles || []).map((r) => [r.placa, r]));
  const rows = (data.ranking || []).map((r) => ({
    ...r,
    ...(map.get(r.placa) || { status: "pendente", variacao: null }),
  }));
  const comparable = rows.filter((r) => r.variacao != null).length;
  const pending = rows.filter((r) => r.status === "pendente").length;
  const alerts = rows.filter((r) =>
    ["alerta", "atencao"].includes(r.status),
  ).length;
  const improved = rows.filter((r) => r.status === "melhora").length;
  const visible = rows
    .filter(
      (r) =>
        (filter === "todos" ||
          (filter === "riscos" && ["alerta", "atencao"].includes(r.status)) ||
          filter === r.status) &&
        r.placa.includes(search.toUpperCase().replace(/[^A-Z0-9]/g, "")),
    )
    .sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (b.variacao || 0) - (a.variacao || 0),
    );
  return (
    <section className="fi">
      <div className="fi-hero">
        <div>
          <span className="fi-eyebrow">
            RADAR DE CONSUMO · {data.combustivelLabel || "Diesel"} / FROTA
            PRÓPRIA
          </span>
          <h2>
            {alerts
              ? `${alerts} veículo${alerts > 1 ? "s precisam" : " precisa"} de atenção`
              : pending
                ? "Complete os dados para revelar a evolução"
                : rows.length
                  ? "Consumo sem aumentos acima de 5%"
                  : "Nenhum abastecimento neste período"}
          </h2>
          <p>
            Compare cada veículo com o próprio histórico. Menos litros por 100
            km significa mais eficiência.
          </p>
          {comparison && (
            <small>
              Referência: {date(comparison.period.startDate)} a{" "}
              {date(comparison.period.endDate)} · mesmos filtros
            </small>
          )}
          {data.comparisonUnavailable && (
            <p role="alert">
              Comparação anterior indisponível. Tente aplicar o período
              novamente.
            </p>
          )}
        </div>
        <div className="fi-progress">
          <strong>
            {comparable}
            <span> / {rows.length}</span>
          </strong>
          <span>veículos comparáveis</span>
          <progress
            aria-label="Veículos com comparação válida"
            value={comparable}
            max={rows.length || 1}
          />
          <small>
            {erp
              ? "KM dos abastecimentos nos dois períodos"
              : "Dados completos nos dois períodos"}
          </small>
        </div>
      </div>
      <div className="fi-missions">
        {[
          [
            "riscos",
            "Investigar aumentos",
            alerts,
            "Consumo por km subiu pelo menos 5%",
          ],
          [
            "pendente",
            erp ? "Conferir abastecimentos" : "Completar leituras",
            pending,
            "Pendências não são consumo ruim",
          ],
          [
            "melhora",
            "Reconhecer melhorias",
            improved,
            "Consumo por km caiu pelo menos 5%",
          ],
        ].map(([key, label, count, hint]) => (
          <button
            key={key}
            className={`fi-mission ${key} ${filter === key ? "selected" : ""}`}
            onClick={() => setFilter(filter === key ? "todos" : key)}
            aria-pressed={filter === key}
          >
            <span>{label}</span>
            <strong>{count}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>
      <div className="fi-deltas">
        {[
          ["Valor abastecido", data.summary?.valor, comparison?.valor, true],
          [
            "Litros abastecidos",
            data.summary?.litros,
            comparison?.litros,
            false,
          ],
          [
            "Preço por litro",
            data.summary?.precoMedioPonderado,
            comparison?.preco,
            true,
          ],
        ].map(([label, value, delta, currency]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{currency ? money(value) : `${n(value)} L`}</strong>
            <small>
              {delta == null
                ? "Sem base anterior"
                : `${delta > 0 ? "+" : ""}${n(delta)}% em relação ao período anterior`}
            </small>
          </div>
        ))}
      </div>
      <p className="fi-note">
        Gastar mais ou abastecer mais litros não significa consumir mais por km.
        {erp
          ? "Fonte: KM registrado nos abastecimentos do ERP. Km/l = soma do KM rodado ÷ soma dos litros. A comparação exige ao menos 2 registros com KM e litros válidos em cada período. O KM pode incluir deslocamentos anteriores ao início do filtro."
          : "Os alertas usam L/100 km e exigem leituras completas nos dois períodos."}{" "}
        A estimativa pode variar com carga, rota e nível do tanque.
      </p>
      <div className="fi-toolbar">
        <div>
          <h3>Onde agir primeiro</h3>
          <span>
            {visible.length} de {rows.length} veículos · prioridades no topo
          </span>
        </div>
        <label>
          Buscar placa
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex.: ABC1D23"
          />
        </label>
        <label>
          Situação
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos os veículos</option>
            <option value="riscos">Aumentos de consumo</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="fi-cards">
        {visible.map((row) => (
          <article className={`fi-vehicle ${row.status}`} key={row.placa}>
            <header>
              <div>
                <h3>{row.placa}</h3>
                <small>
                  {row.modelo === "Nao informado"
                    ? "Modelo não informado"
                    : row.modelo}
                </small>
              </div>
              <span className="fi-badge">{labels[row.status]}</span>
            </header>
            <div className="fi-score">
              <strong>
                {row.variacao == null
                  ? "Sem comparação"
                  : `${row.variacao > 0 ? "+" : ""}${n(row.variacao)}%`}
              </strong>
              <span>
                {row.variacao == null
                  ? erp
                    ? "Confira o KM dos abastecimentos"
                    : "Confira a cobertura das leituras"
                  : "variação de litros por 100 km"}
              </span>
            </div>
            <div className="fi-pair">
              <div>
                <small>Anterior · km/l</small>
                <b>{row.anterior > 0 ? n(row.anterior, 2) : "—"}</b>
              </div>
              <span>→</span>
              <div>
                <small>Atual · km/l</small>
                <b>{row.media > 0 ? n(row.media, 2) : "—"}</b>
              </div>
            </div>
            {erp && (
              <div className="fi-coverage">
                <span>KM registrado</span>
                <b>{n(row.cobertura?.kmObservado, 0)} km</b>
                <span>R$/km: {row.reaisKm > 0 ? money(row.reaisKm) : "—"}</span>
              </div>
            )}
            <div className="fi-coverage">
              <span>
                {erp ? "Abastecimentos com KM válido" : "Leituras atuais"}
              </span>
              <b>
                {(erp
                  ? row.cobertura?.registrosValidos
                  : row.cobertura?.diasValidos) || 0}
                /
                {(erp
                  ? row.cobertura?.registrosTotal
                  : row.cobertura?.diasEsperados) || 0}{" "}
                {erp ? "registros" : "dias"}
              </b>
            </div>
            <progress
              aria-label={`Cobertura de ${row.placa}`}
              value={
                (erp
                  ? row.cobertura?.registrosValidos
                  : row.cobertura?.diasValidos) || 0
              }
              max={
                (erp
                  ? row.cobertura?.registrosTotal
                  : row.cobertura?.diasEsperados) || 1
              }
            />
            <p>
              {row.status === "pendente"
                ? row.motivo ||
                  (erp
                    ? "Sem base comparável no período anterior ou combustível diferente."
                    : "Sem histórico comparável, leitura incompleta ou filtro de posto ativo.")
                : row.status === "alerta" || row.status === "atencao"
                  ? "Confira abastecimentos, rota e carga antes de concluir a causa."
                  : row.status === "melhora"
                    ? "Melhoria estimada em relação ao próprio histórico."
                    : "Variação dentro da faixa de ±5%."}
            </p>
            <footer>
              <span>
                {money(row.total)}
                <small>{n(row.litros)} litros</small>
              </span>
              <button
                className="btn"
                onClick={() =>
                  row.status === "pendente"
                    ? onHistory(row.placa)
                    : onReview(row.placa)
                }
              >
                {row.status === "pendente"
                  ? erp
                    ? "Conferir KM"
                    : "Conferir leituras"
                  : "Ver abastecimentos"}{" "}
                →
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="fi-empty">
          Nenhum veículo nesta seleção. Altere a situação, a placa ou o período.
        </div>
      )}
      <details className="fi-note">
        <summary>Entenda os níveis de atenção</summary>
        <p>
          Alerta: aumento de 10% ou mais em L/100 km. Atenção: de 5% a menos de
          10%. Melhoria: redução de pelo menos 5%. Estável: entre −5% e +5%. São
          critérios de triagem, não metas de desempenho. Períodos mensais
          fechados são comparados com os meses anteriores; outros intervalos
          usam a mesma quantidade de dias.
        </p>
      </details>
    </section>
  );
}
export function exportFuelCsv(rows) {
  const escape = (value) =>
    '"' +
    String(value ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const lines = [
    [
      "Data",
      "Placa",
      "Posto",
      "Combustível",
      "Hodômetro",
      "KM rodado",
      "Litros",
      "Preço líquido por litro",
      "Desconto",
      "Valor abastecido",
    ],
    ...rows.map((r) => [
      r.data,
      r.placa,
      r.postoNome,
      r.combustivel,
      r.odometro,
      r.km,
      String(r.litros).replace(".", ","),
      String(r.valorLitro).replace(".", ","),
      String(r.desconto).replace(".", ","),
      String(r.total).replace(".", ","),
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + lines.map((row) => row.map(escape).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "abastecimentos.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

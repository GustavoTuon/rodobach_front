import React from "react";
import { ecDate, ecMoney, ecPct } from "./cost-analysis-model.js";
import {
  change,
  comparisonPeriod,
  fuelEfficiency,
  maintenanceEvolution,
  operationalScope,
  operationalFuelType,
  inPeriod,
} from "./cost-efficiency-model.js";

const number = (value, digits = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString("pt-BR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })
    : "—";
const percent = (value) =>
  value === null ? "Sem base" : `${value > 0 ? "+" : ""}${ecPct(value)}`;
function Metric({ label, value, note }) {
  return (
    <article className="ec-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
export function CostEfficiency({
  period,
  owner,
  plates,
  fuel,
  financialRows,
  supplierCodes,
  centerCodes,
  category,
}) {
  const [kind, setKind] = React.useState(
    category.includes("Manutenção") ? "maintenance" : "fuel",
  );
  const [product, setProduct] = React.useState("diesel");
  const [state, setState] = React.useState({
    busy: true,
    data: null,
    error: "",
  });
  const [revision, setRevision] = React.useState(0);
  const prior = React.useMemo(() => comparisonPeriod(period), [period]);
  React.useEffect(() => {
    if (!window.RB_API.getCostOperations) return;
    let active = true;
    setState({ busy: true, data: null, error: "" });
    window.RB_API.getCostOperations({ ...period, proprietario: owner })
      .then((data) => {
        if (active) setState({ busy: false, data, error: "" });
      })
      .catch(() => {
        if (active)
          setState({
            busy: false,
            data: null,
            error: "Não foi possível carregar a análise operacional.",
          });
      });
    return () => {
      active = false;
    };
  }, [period.startDate, period.endDate, owner, revision]);
  const scope = React.useMemo(
    () => ({ plates, supplierCodes, centerCodes }),
    [plates, supplierCodes, centerCodes],
  );
  const fuelRows = React.useMemo(
    () => operationalScope(state.data?.fuel?.rows || [], scope),
    [state.data, scope],
  );
  const maintenanceRows = React.useMemo(
    () => operationalScope(state.data?.maintenance?.rows || [], scope),
    [state.data, scope],
  );
  const products = [...new Set(fuelRows.map(operationalFuelType))].sort();
  const types = fuel.length
    ? fuel
    : product === "all"
      ? []
      : product === "diesel"
        ? products.filter((p) => p.startsWith("Diesel"))
        : [product];
  const model = React.useMemo(
    () =>
      fuelEfficiency(fuelRows, period, prior, {
        types:
          product === "diesel" && !fuel.length && !types.length
            ? ["Diesel S10"]
            : types,
        restricted: supplierCodes !== null || centerCodes !== null,
      }),
    [
      fuelRows,
      period,
      prior,
      JSON.stringify(types),
      supplierCodes,
      centerCodes,
    ],
  );
  const maintenance = React.useMemo(
    () => maintenanceEvolution(maintenanceRows, period, prior),
    [maintenanceRows, period, prior],
  );
  if (!window.RB_API.getCostOperations) return null;
  const source = state.data?.[kind];
  const partial =
    period.startDate.slice(8) !== "01" ||
    new Date(`${period.endDate}T12:00:00Z`).getUTCDate() !==
      new Date(
        Date.UTC(
          Number(period.endDate.slice(0, 4)),
          Number(period.endDate.slice(5, 7)),
          0,
        ),
      ).getUTCDate();
  return (
    <section className="ec-efficiency" aria-label="Eficiência operacional">
      <div className="ec-panel-head">
        <div>
          <span className="ec-eyebrow">GASTO, ATIVIDADE E EFICIÊNCIA</span>
          <h2>Estamos economizando ou operando menos?</h2>
          <p>
            {ecDate(period.startDate)} a {ecDate(period.endDate)} · comparação:{" "}
            {ecDate(prior.startDate)} a {ecDate(prior.endDate)}
            {partial ? " · intervalo parcial" : ""}
          </p>
        </div>
        <div className="ec-segments" aria-label="Análise operacional">
          {[
            ["fuel", "Combustível"],
            ["maintenance", "Manutenção"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="ec-footnote">
        Base operacional do ERP, separada dos valores financeiros abaixo.
        Respeita propriedade, placas, fornecedor e centro selecionados. A
        categoria financeira não limita esta visão.
      </p>
      {state.busy ? (
        <p role="status">
          Consultando abastecimentos e ordens de serviço… Os valores financeiros
          continuam disponíveis.
        </p>
      ) : state.error || !source?.available ? (
        <div className="ec-workspace-error" role="alert">
          <span>
            {state.error ||
              source?.message ||
              "Fonte operacional indisponível."}
          </span>
          <button className="btn" onClick={() => setRevision((r) => r + 1)}>
            Atualizar análise operacional
          </button>
        </div>
      ) : (
        <>
          <div className="ec-source-line">
            <span>
              Fonte:{" "}
              {kind === "fuel"
                ? "abastecimentos · data do abastecimento"
                : "OS externas · data de entrada, ou emissão quando ausente"}
            </span>
            <span>
              Último registro no recorte:{" "}
              {ecDate(kind === "fuel" ? model.latest : maintenance.latest)}
            </span>
            <span>
              Consulta:{" "}
              {new Date(state.data.generatedAt).toLocaleString("pt-BR")}
            </span>
            <button className="btn" onClick={() => setRevision((r) => r + 1)}>
              Atualizar análise operacional
            </button>
          </div>
          {kind === "fuel" ? (
            <>
              <label className="ec-product-filter">
                Produto operacional
                <select
                  value={fuel.length ? "global" : product}
                  disabled={fuel.length > 0}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  {fuel.length > 0 && (
                    <option value="global">
                      Filtro do painel: {fuel.join(", ")}
                    </option>
                  )}
                  <option value="diesel">Diesel · todos os tipos</option>
                  <option value="all">Todos os produtos</option>
                  {products.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div className="ec-efficiency-metrics">
                <Metric
                  label="Valor abastecido"
                  value={ecMoney(model.now.value)}
                  note={`${percent(change(model.now.value, model.before.value))} · anterior ${ecMoney(model.before.value)}`}
                />
                <Metric
                  label={
                    model.mixedUnits
                      ? "Volume por produto"
                      : "Litros abastecidos"
                  }
                  value={
                    model.mixedUnits
                      ? "Unidades distintas"
                      : `${number(model.now.liters)} L`
                  }
                  note={
                    model.mixedUnits
                      ? "GNV não deve ser somado a litros."
                      : `${percent(change(model.now.liters, model.before.liters))} · anterior ${number(model.before.liters)} L`
                  }
                />
                <Metric
                  label="Preço médio ponderado"
                  value={
                    model.productRows.filter((r) => r.now.count).length === 1 &&
                    model.now.price !== null
                      ? `${ecMoney(model.now.price)}/${model.mixedUnits ? "un." : "L"}`
                      : "Ver por produto"
                  }
                  note="Valor total dividido pelo volume; não é média simples dos preços."
                />
                <Metric
                  label="Cobertura comparável"
                  value={`${model.comparable.length} de ${model.ranking.length} veículos`}
                  note={`${number(model.valueCoverage, 1)}% do valor atual · registros válidos nos dois períodos`}
                />
              </div>
              <div className="ec-efficiency-verdict">
                <strong>
                  {!model.now.count || !model.before.count
                    ? "Sem abastecimentos suficientes para comparar."
                    : model.now.value < model.before.value
                      ? "O gasto caiu. Isso, sozinho, não comprova economia."
                      : "O gasto não caiu. Confira volume, preço e rendimento separadamente."}
                </strong>
                <p>
                  {model.comparable.length
                    ? "A estimativa de consumo usa somente os mesmos veículos com base válida nos dois períodos."
                    : "Não há veículos com base válida nos dois períodos para estimar ganho de consumo."}{" "}
                  KM é o intervalo informado nos abastecimentos, não a
                  quilometragem completa de calendário.
                </p>
              </div>
              <div className="ec-efficiency-columns">
                <section className="ec-panel">
                  <h3>O que mudou no valor abastecido?</h3>
                  <dl className="ec-change-list">
                    <div>
                      <dt>Efeito do volume comprado</dt>
                      <dd>{ecMoney(model.volumeEffect)}</dd>
                    </div>
                    <div>
                      <dt>Efeito do preço por produto</dt>
                      <dd>{ecMoney(model.priceEffect)}</dd>
                    </div>
                    <div>
                      <dt>Produtos sem base nos dois períodos</dt>
                      <dd>{ecMoney(model.unexplained)}</dd>
                    </div>
                    <div>
                      <dt>Variação total</dt>
                      <dd>{ecMoney(model.now.value - model.before.value)}</dd>
                    </div>
                  </dl>
                  <p className="ec-footnote">
                    Calculado por produto: Δvolume × preço anterior, depois
                    volume atual × Δpreço. Volume comprado não é consumo
                    comprovado.
                  </p>
                </section>
                <section className="ec-panel">
                  <h3>Consumo na amostra comparável</h3>
                  <dl className="ec-change-list">
                    <div>
                      <dt>KM dos intervalos válidos atuais</dt>
                      <dd>{number(model.comparableCurrent.km, 0)} km</dd>
                    </div>
                    <div>
                      <dt>Custo por KM dessa amostra</dt>
                      <dd>
                        {model.comparableCurrent.km > 0
                          ? ecMoney(
                              model.comparableCurrent.value /
                                model.comparableCurrent.km,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Efeito estimado de consumo</dt>
                      <dd>
                        {model.comparable.length
                          ? ecMoney(model.estimatedSavings)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className="ec-footnote">
                    Positivo = litros estimados poupados × preço atual, usando o
                    consumo anterior de cada placa para o KM atual. Negativo =
                    consumo adicional estimado. Depende de validar tanques,
                    rotas e carga; não constitui economia aprovada para
                    comissão.
                  </p>
                </section>
              </div>
              <details className="ec-panel">
                <summary>
                  Produtos e preços · diesel, Arla e demais produtos separados
                </summary>
                <div className="ec-table-scroll">
                  <table className="ec-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Volume anterior</th>
                        <th>Volume atual</th>
                        <th>Preço anterior/un.</th>
                        <th>Preço atual/un.</th>
                        <th>Valor atual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.productRows.map((p) => (
                        <tr key={p.product}>
                          <td>{p.product}</td>
                          <td>{number(p.before.liters)}</td>
                          <td>{number(p.now.liters)}</td>
                          <td>
                            {p.before.price === null
                              ? "—"
                              : ecMoney(p.before.price)}
                          </td>
                          <td>
                            {p.now.price === null ? "—" : ecMoney(p.now.price)}
                          </td>
                          <td>{ecMoney(p.now.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="ec-footnote">
                  Arla é aditivo: não entra no cálculo de rendimento do diesel.
                  GNV mantém sua unidade operacional e não entra em km/L.
                </p>
              </details>
              <section className="ec-panel">
                <h3>Veículos · maior piora de consumo primeiro</h3>
                <div className="ec-table-scroll">
                  <table className="ec-table">
                    <thead>
                      <tr>
                        <th>Placa</th>
                        <th>Anterior L/100 km</th>
                        <th>Atual L/100 km</th>
                        <th>Variação</th>
                        <th>Efeito estimado</th>
                        <th>Qualidade da comparação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.ranking.map((r) => (
                        <tr key={r.placa}>
                          <td>{r.placa}</td>
                          <td>{r.valid ? number(r.before.rate * 100) : "—"}</td>
                          <td>{r.valid ? number(r.now.rate * 100) : "—"}</td>
                          <td>
                            {r.valid ? percent(r.consumptionChange) : "—"}
                          </td>
                          <td>{r.valid ? ecMoney(r.estimatedSavings) : "—"}</td>
                          <td>
                            {r.valid
                              ? "Comparável · validar operação"
                              : r.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!model.ranking.length && (
                  <p>
                    Sem abastecimentos neste recorte. Documentos financeiros
                    mistos não permitem repartir valores por produto; use um
                    produto operacional individual para investigar.
                  </p>
                )}
              </section>
            </>
          ) : (
            <MaintenanceHealth
              model={maintenance}
              plans={state.data.plans}
              plates={plates}
              supplierCodes={supplierCodes}
              centerCodes={centerCodes}
              financialRows={financialRows}
              period={period}
            />
          )}
        </>
      )}
    </section>
  );
}

function MaintenanceHealth({
  model,
  plans,
  plates,
  supplierCodes,
  centerCodes,
  financialRows,
  period,
}) {
  const knownPlates = new Set([
    ...model.ranking.map((r) => r.placa),
    ...plates,
  ]);
  const planRows = (plans.rows || []).filter((r) =>
    knownPlates.has(String(r.placa).trim().toUpperCase()),
  );
  const financial = financialRows
    .filter((r) => inPeriod(r, period) && r.tipoCusto === "Manutencao")
    .reduce((s, r) => s + r.valor, 0);
  return (
    <>
      <div className="ec-efficiency-metrics">
        <Metric
          label="Valor das OS externas"
          value={ecMoney(model.now.value)}
          note={`${percent(change(model.now.value, model.before.value))} · anterior ${ecMoney(model.before.value)}`}
        />
        <Metric
          label="Ordens de serviço"
          value={String(model.now.count)}
          note={`${model.before.count} anteriores · ${model.now.vehicles} veículos atuais`}
        />
        <Metric
          label="OS com hodômetro"
          value={`${model.now.withKm} de ${model.now.count}`}
          note="Hodômetro pontual não é distância rodada no período."
        />
        <Metric
          label="OS com início e término"
          value={`${model.now.withTimes} de ${model.now.count}`}
          note="Horas isoladas não comprovam tempo total parado."
        />
      </div>
      <div className="ec-efficiency-verdict">
        <strong>
          {model.now.value < model.before.value
            ? "Menor gasto de manutenção ainda não comprova economia."
            : "Avalie custo junto com serviços e qualidade dos registros."}
        </strong>
        <p>
          Confirme que não houve serviços necessários adiados. Falta de OS ou
          lançamento não comprova ausência de falha nem manutenção em dia.
        </p>
      </div>
      <div className="ec-efficiency-columns">
        <section className="ec-panel">
          <h3>Financeiro e serviços são bases distintas</h3>
          <dl className="ec-change-list">
            <div>
              <dt>Manutenção financeira por emissão</dt>
              <dd>{ecMoney(financial)}</dd>
            </div>
            <div>
              <dt>Ordens externas por entrada/emissão</dt>
              <dd>{ecMoney(model.now.value)}</dd>
            </div>
          </dl>
          <p className="ec-footnote">
            Não somar os dois valores. A conciliação por documento, itens e
            placa ainda é necessária; datas, parcelamento e classificação podem
            diferir.
          </p>
        </section>
        <section className="ec-panel">
          <h3>Preventivas e dados pendentes</h3>
          <p>
            {plans.available
              ? `${planRows.length} planos ativos hoje nas placas deste recorte, sendo ${planRows.filter((r) => r.control === "km").length} por KM.`
              : "Cadastro de planos indisponível nesta consulta."}
          </p>
          <p className="ec-footnote">
            Cadastro atual, não histórico de cumprimento.{" "}
            {supplierCodes !== null || centerCodes !== null
              ? "Planos não têm filtro por fornecedor/centro; são apresentados pelas placas das OS."
              : ""}{" "}
            Não indica se as preventivas estão em dia.
          </p>
          <ul>
            <li>
              Classificar cada serviço como preventivo, corretivo ou
              extraordinário.
            </li>
            <li>Registrar componente e causa para medir reincidência.</li>
            <li>
              Registrar entrada e liberação com data e hora para medir
              disponibilidade.
            </li>
            <li>
              Conciliar OS e financeiro e validar KM antes de comparar R$/km.
            </li>
          </ul>
        </section>
      </div>
      <section className="ec-panel">
        <h3>Manutenção por veículo</h3>
        <div className="ec-table-scroll">
          <table className="ec-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>OS anteriores</th>
                <th>OS atuais</th>
                <th>Valor anterior</th>
                <th>Valor atual</th>
                <th>Variação em R$</th>
                <th>OS atuais com KM</th>
              </tr>
            </thead>
            <tbody>
              {model.ranking.map((r) => (
                <tr key={r.placa}>
                  <td>{r.placa}</td>
                  <td>{r.before.count}</td>
                  <td>{r.now.count}</td>
                  <td>{ecMoney(r.before.value)}</td>
                  <td>{ecMoney(r.now.value)}</td>
                  <td>{ecMoney(r.delta)}</td>
                  <td>
                    {r.now.withKm} de {r.now.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!model.ranking.length && (
          <p>Nenhuma OS externa encontrada nos períodos selecionados.</p>
        )}
      </section>
    </>
  );
}

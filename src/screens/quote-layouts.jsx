import React, { useState } from "react";
import "./quote-layouts.css";
import { RodobachSheet } from "./rodobach-sheet.jsx";

export const QUOTE_LAYOUTS = [
  ["original", "Original", "Tela atual"],
  ["sheet", "Planilha Rodobach", "Células e cenários lado a lado"],
  ["compare", "Comparativo visual", "A mesma cotação, com mais respiro"],
  ["guided", "Cotação guiada", "Preenchimento por etapas"],
];

export function QuoteLayoutPicker({ value, onChange }) {
  return (
    <div className="ql-picker" role="group" aria-label="Modelo da calculadora">
      {QUOTE_LAYOUTS.map(([id, title, description]) => (
        <button
          key={id}
          type="button"
          title={description}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <strong>{title}</strong>
        </button>
      ))}
    </div>
  );
}

function Field({ field }) {
  return (
    <label className="ql-field">
      <span>{field.label}</span>
      <div>
        <input
          aria-label={field.label}
          inputMode={field.mode || "decimal"}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          placeholder={
            field.placeholder ||
            (field.mode === "numeric" ? "Ex.: 1.600" : "0,00")
          }
        />
        {field.unit && <b>{field.unit}</b>}
      </div>
    </label>
  );
}

export function QuoteLayouts({ model, vm }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(2);
  const { money, percent, ready, scenarios } = vm;
  const amount = (value) => (ready ? money(value) : "—");
  const rows = [
    ["Valor motorista", "valorMotorista", "driver"],
    ["Valor cliente / CT-e", "valorCliente", "client"],
    ["ICMS", "icmsValor"],
    ["Taxas + seguros + pedágio", "taxasSemMotorista"],
    ["RPA (incluído nas taxas)", "taxaRpa"],
    ["INSS patronal (incluído nas taxas)", "inssPatronal"],
    ["Custo total com impostos", "custoTotal"],
    ["Resultado líquido", "lucro", "profit"],
    ["Margem líquida", "margemReal", "margin"],
  ];
  const vehicles = (
    <div className="ql-vehicles">
      {vm.vehicles.map((row) => (
        <button
          key={row.eixos}
          type="button"
          aria-pressed={vm.eixos === row.eixos}
          onClick={() => vm.setEixos(row.eixos)}
        >
          <strong>{row.tipoVeiculo}</strong>
          <span>{row.eixos} eixos</span>
        </button>
      ))}
    </div>
  );
  const options = (
    <div className="ql-options">
      <label>
        Preço ANTT
        <select
          aria-label="Preço ANTT"
          value={vm.tipoCarga}
          onChange={(e) => vm.setTipoCarga(e.target.value)}
        >
          <option value="normal">Normal</option>
          <option value="alto_desempenho">Alto desempenho</option>
        </select>
      </label>
      <label>
        Contratação
        <select
          aria-label="Contratação"
          value={vm.operacao}
          onChange={(e) => vm.setOperacao(e.target.value)}
        >
          <option value="etc">ETC — Empresa</option>
          <option value="tac">TAC — Autônomo</option>
        </select>
      </label>
    </div>
  );
  const fields = (
    <div className="ql-fields">
      {vm.fields.map((field) => (
        <Field key={field.label} field={field} />
      ))}
    </div>
  );
  const negotiation = (
    <div className="ql-negotiation">
      {vm.negotiation.map((field) => (
        <Field key={field.label} field={field} />
      ))}
      <p>
        O cliente padrão usa Normal ETC como referência para comparar as quatro combinações. Os valores
        digitados são aplicados às quatro combinações. O percentual bruto orienta
        o cenário “Alterar motorista”.
      </p>
    </div>
  );
  const status = (
    <div className="ql-live" role="status">
      {vm.inputError ? vm.inputError : vm.error
        ? "Não foi possível calcular. Altere um campo para tentar novamente."
        : vm.loading
          ? "Atualizando cotação…"
          : !ready
            ? "Informe a quilometragem para calcular os três cenários."
            : "Cotação atualizada · valores em reais"}
    </div>
  );
  const reference = (
    <div className="ql-reference">
      <span>
        Referência selecionada
        <strong>
          {vm.vehicleLabel} · {vm.eixos} eixos · {vm.tipoCarga === 'normal' ? 'Normal' : 'Alto desempenho'} · {vm.operacao.toUpperCase()}
        </strong>
      </span>
      <span>
        Carga e descarga
        <strong>{amount(vm.calc?.tabela?.cargaDescarga)}</strong>
      </span>
      <span>
        Tarifa por km<strong>{amount(vm.calc?.tabela?.kmValor)}</strong>
      </span>
      <span>
        Seguro de carga<strong>{amount(vm.calc?.encargos?.seguroCarga)}</strong>
      </span>
      <span>
        Seguro terceiros<strong>{amount(vm.calc?.encargos?.seguroRC)}</strong>
      </span>
    </div>
  );
  const resultTable = (scenario) => (
    <dl className="ql-result-list">
      {rows.map(([label, key, tone]) => (
        <div
          key={key}
          className={`${tone || ""} ${ready && scenario.data.lucro < 0 && (tone === "profit" || tone === "margin") ? "negative" : ""}`}
        >
          <dt>{label}</dt>
          <dd>
            {!ready
              ? "—"
              : key === "margemReal"
                ? percent(scenario.data[key])
                : money(scenario.data[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
  const warning = (scenario) =>
    ready && (
      <div className={`ql-warning ${scenario.data.status.tone}`}>
        {scenario.data.status.label}
      </div>
    );
  const actions = (
    <footer className="ql-actions">
      <span>
        Cliente = motorista Normal ETC ÷ 70%. Impostos e demais custos são descontados no resultado líquido.
      </span>
      <button className="btn" disabled={!ready} onClick={vm.copy}>
        {vm.copied ? "Copiado!" : "Copiar negociação"}
      </button>
      <button
        className="btn primary"
        disabled={
          !ready || vm.loading || vm.simulation.status.tone === "danger"
        }
        onClick={vm.useQuote}
      >
        Usar negociação na viagem
      </button>
    </footer>
  );

  if (model === "sheet") return <RodobachSheet vm={vm} />;

  return (
    <div className={`view ql ql-${model}${ready ? "" : " ql-pending"}`}>
      <header className="ql-head">
        <div>
          <span className="ql-eyebrow">
            COTAÇÃO DE FRETE /{" "}
            {QUOTE_LAYOUTS.find((item) => item[0] === model)?.[1]}
          </span>
          <h1>
            {model === "sheet"
              ? "Sua cotação, como na planilha."
              : model === "compare"
                ? "Três cenários. Uma decisão."
                : "Vamos montar sua cotação."}
          </h1>
          <p>
            {model === "sheet"
              ? "Preencha as células azuis e confira os resultados nas três colunas."
              : model === "compare"
                ? "Compare o padrão, o pagamento ao motorista e o valor negociado com o cliente."
                : "Escolha o veículo, informe os custos e confira o resultado."}
          </p>
        </div>
        <button className="btn" onClick={vm.goTrips}>
          Viagens
        </button>
      </header>
      {model === "guided" ? (
        <div className="ql-guided-grid">
          <section className="ql-panel">
            <nav className="ql-steps" aria-label="Etapas da cotação">
              {["Veículo e tabela", "Distância e custos", "Negociação"].map(
                (label, index) => (
                  <button
                    key={label}
                    aria-current={step === index ? "step" : undefined}
                    onClick={() => setStep(index)}
                  >
                    <b>{index + 1}</b>
                    {label}
                  </button>
                ),
              )}
            </nav>
            <div className="ql-step-content">
              <span className="ql-eyebrow">ETAPA {step + 1} DE 3</span>
              <h2>
                {
                  [
                    "Escolha o caminhão",
                    "Preencha os dados da viagem",
                    "Ajuste os valores combinados",
                  ][step]
                }
              </h2>
              {step === 0 ? (
                <>
                  {vehicles}
                  {options}
                </>
              ) : step === 1 ? (
                fields
              ) : (
                negotiation
              )}
            </div>
            <div className="ql-step-actions">
              <button
                className="btn"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Voltar
              </button>
              {step < 2 ? (
                <button
                  className="btn primary"
                  onClick={() => setStep(step + 1)}
                >
                  Continuar
                </button>
              ) : (
                <span>Compare os cenários no resumo ao lado.</span>
              )}
            </div>
          </section>
          <aside className="ql-panel ql-summary">
            <div className="ql-section-title">Resumo da cotação</div>
            <div
              className="ql-scenario-tabs"
              role="group"
              aria-label="Cenário do resumo"
            >
              {scenarios.map((scenario, index) => (
                <button
                  key={scenario.title}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  {scenario.short}
                </button>
              ))}
            </div>
            {status}
            <h2>{scenarios[selected].title}</h2>
            {resultTable(scenarios[selected])}
            {warning(scenarios[selected])}
            <small>
              As ações abaixo utilizam o cenário “Motorista + cliente”.
            </small>
          </aside>
        </div>
      ) : (
        <>
          <section className="ql-panel">
            <div className="ql-section-title">
              Escolha a tabela <span>Campos azuis são editáveis</span>
            </div>
            {vehicles}
            {fields}
            {status}
          </section>
          {reference}
          <>
            <section className="ql-panel ql-input-bar">
              <div>
                <span className="ql-eyebrow">SIMULAÇÃO</span>
                <h2>Valores da negociação</h2>
              </div>
              {negotiation}
            </section>
            <div className="ql-cards">
              {scenarios.map((scenario, index) => (
                <section
                  className={`ql-scenario ql-scenario-${index}`}
                  key={scenario.title}
                >
                  <header>
                    <span>0{index + 1}</span>
                    <h2>{scenario.title}</h2>
                    <p>{scenario.description}</p>
                  </header>
                  {vm.comparison ? vm.comparison.map((group) => (
                    <section className="ql-rate-group" key={group.type} aria-label={`${scenario.title} · ${group.label}`}>
                      <div className="ql-rate-heading"><h3>{group.label}</h3><span>Referência ANTT</span></div>
                      <div className="ql-contracts">
                        {group.options.map(option => {
                          const data = option.results[index];
                          const loss = ready && data.lucro < 0;
                          return <article className="ql-contract" key={option.operation} aria-label={`${group.label} ${option.operation.toUpperCase()}`}>
                            <div className="ql-contract-heading"><strong>{option.operation.toUpperCase()}</strong><span>{option.operation === 'etc' ? 'Empresa' : 'Autônomo'}</span></div>
                            <dl className="ql-contract-prices">
                              <div className="driver"><dt>A pagar ao motorista</dt><dd>{amount(data.valorMotorista)}</dd></div>
                              <div className="client"><dt>A cobrar do cliente</dt><dd>{amount(data.valorCliente)}</dd></div>
                            </dl>
                            <div className={`ql-contract-result${loss ? ' loss' : ''}`}>
                              <span>{loss ? 'Prejuízo líquido' : 'Lucro líquido'}</span>
                              <strong>{amount(data.lucro)}</strong>
                              <div><span>Margem líquida</span><b>{ready ? percent(data.margemReal) : '—'}</b></div>
                            </div>
                          </article>;
                        })}
                      </div>
                      <details className="ql-rate-details"><summary>Ver impostos e demais custos</summary>
                        <table className="ql-rate-table ql-cost-table">
                          <thead><tr><th scope="col">Detalhamento</th>{group.options.map(option => <th scope="col" key={option.operation}>{option.operation.toUpperCase()}</th>)}</tr></thead>
                          <tbody>{[
                            ['ICMS', 'icmsValor'],
                            ['Taxas + seguros + pedágio', 'taxasSemMotorista'],
                            ['RPA (incluído nas taxas)', 'taxaRpa'],
                            ['INSS patronal (incluído nas taxas)', 'inssPatronal'],
                            ['Motorista + taxas TAC', 'custoMotorista'],
                            ['Custo total com impostos', 'custoTotal'],
                          ].map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{group.options.map(option => <td key={option.operation}>{amount(option.results[index][key])}</td>)}</tr>)}</tbody>
                        </table>
                        <p>O custo total inclui motorista, taxas, seguros, pedágio e ICMS. RPA e INSS patronal já estão incluídos nas taxas.</p>
                        {group.options.map((option) => {
                          const data = option.results[index];
                          return <div key={option.operation}><strong>{option.operation.toUpperCase()}</strong>
                            <p>Carga e descarga: {amount(option.source?.tabela?.cargaDescarga)} · Por km: {amount(option.source?.tabela?.kmValor)}</p>
                            <p>RPA assumido pela empresa: {amount(data.rpa.totalDescontos)} · Líquido ao motorista: {amount(data.rpa.valorLiquidoMot)}</p>
                            {warning({ data })}
                          </div>;
                        })}
                      </details>
                    </section>
                  )) : <>{resultTable(scenario)}{warning(scenario)}</>}

                </section>
              ))}
            </div>
          </>
        </>
      )}
      {model === "guided" && reference}
      {model === "compare" && <section className="ql-panel ql-selection">
        <strong>Opção para copiar ou usar na viagem</strong>
        <p>Normal e Alto desempenho estão calculados acima. ETC = empresa; TAC = autônomo. Escolha abaixo a opção que será usada na viagem.</p>
        {options}
        <small>As ações usam “Motorista + cliente” · {vm.tipoCarga === 'normal' ? 'Normal' : 'Alto desempenho'} · {vm.operacao.toUpperCase()}.</small>
      </section>}
      {actions}
    </div>
  );
}

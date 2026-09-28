import React from "react";
import "./rodobach-sheet.css";

function SheetInput({ field, label = field.label, hint, badge = "Informar" }) {
  // Values and handlers belong to the simulator; this component only presents them.
  const value =
    field.unit === "R$" ? field.value.replace(/^R\$\s*/, "") : field.value;
  return (
    <label className="rs-input">
      <span className="rs-label">
        {label}
        <small>{badge}</small>
      </span>
      <span className="rs-input-box">
        {field.unit === "R$" && <span aria-hidden="true">R$</span>}
        <input
          aria-label={field.label}
          inputMode={field.mode || "decimal"}
          value={value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          placeholder={
            field.placeholder?.replace(/^R\$\s*/, "") ||
            (field.mode === "numeric" ? "Ex.: 1.600" : "0,00")
          }
        />
        {field.unit && field.unit !== "R$" && (
          <span aria-hidden="true">{field.unit}</span>
        )}
      </span>
      {hint && <small className="rs-hint">{hint}</small>}
    </label>
  );
}

function Calculated({ label, value, hint = "Calculado" }) {
  return (
    <div className="rs-calculated">
      <span className="rs-label">
        {label}
        <small>Calculado</small>
      </span>
      <strong>{value}</strong>
      <small className="rs-hint">{hint}</small>
    </div>
  );
}

export function RodobachSheet({ vm }) {
  const { ready, money, percent } = vm;
  const amount = (value) => (ready ? money(value) : "—");
  const insurance = vm.fields[3];
  const driver = vm.negotiation[0];
  const client = vm.negotiation[1];
  const automaticDriver = !driver.value.trim();
  const automaticClient = !client.value.trim();
  const descriptions = [
    "Referência ANTT com margem padrão de 30%",
    "Informe o motorista e a margem para calcular o cliente",
    "Informe o cliente para conferir quanto sobra",
  ];
  const currentVehicle = vm.vehicles.find((row) => row.eixos === vm.eixos);
  const vehicleName = `${(currentVehicle?.tipoVeiculo || vm.vehicleLabel).replace(/\s*\d+e$/i, "")} · ${vm.eixos} eixos`;
  const status = vm.error
    ? "Não foi possível calcular. Altere um campo para tentar novamente."
    : vm.loading
      ? "Atualizando cotação…"
      : ready
        ? "Cotação atualizada · valores em reais"
        : "Informe a quilometragem para calcular os três cenários.";
  return (
    <div className={`view ql rs-sheet${ready ? "" : " rs-pending"}`}>
      <header className="rs-head">
        <h1>Calculadora de frete</h1>
        <button className="btn" onClick={vm.goTrips}>
          Viagens
        </button>
      </header>
      <section className="rs-travel" aria-labelledby="rs-travel-title">
        <div className="rs-section-head">
          <h2 id="rs-travel-title">1. Dados da viagem</h2>
          <span>Escolha a tabela e preencha os campos da viagem.</span>
        </div>
        <div className="rs-selects">
          <label>
            Veículo
            <select
              aria-label="Veículo"
              value={vm.eixos}
              onChange={(event) => vm.setEixos(Number(event.target.value))}
            >
              {vm.vehicles.map((row) => (
                <option key={row.eixos} value={row.eixos}>
                  {row.tipoVeiculo.replace(/\s*\d+e$/i, "")} · {row.eixos} eixos
                </option>
              ))}
            </select>
          </label>
          <label>
            Tabela ANTT
            <select
              aria-label="Preço ANTT"
              value={vm.tipoCarga}
              onChange={(event) => vm.setTipoCarga(event.target.value)}
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
              onChange={(event) => vm.setOperacao(event.target.value)}
            >
              <option value="etc">ETC — Empresa</option>
              <option value="tac">TAC — Autônomo</option>
            </select>
          </label>
          <div className="rs-active">
            <span>Seleção ativa</span>
            <strong>{vehicleName}</strong>
            <small>
              {vm.tipoCarga === "normal" ? "Normal" : "Alto desempenho"} ·{" "}
              {vm.operacao.toUpperCase()}
            </small>
          </div>
        </div>
        <div className="rs-travel-fields">
          {vm.fields.map((field) => (
            <SheetInput
              key={field.label}
              field={field}
              badge={
                field === insurance
                  ? insurance.value.trim()
                    ? "Manual"
                    : "Automático"
                  : "Informar"
              }
              hint={
                field === insurance
                  ? insurance.value.trim()
                    ? "Apague para usar o automático."
                    : "Em branco: calculado por km."
                  : undefined
              }
            />
          ))}
        </div>
        <div
          className={`rs-status${vm.error ? " rs-error" : ""}`}
          role="status"
        >
          {status}
        </div>
      </section>
      <div className="rs-reference">
        <span>Referência ANTT</span>
        <span>
          Tarifa por km <strong>{amount(vm.calc?.tabela?.kmValor)}</strong>
        </span>
        <span>
          Carga / descarga{" "}
          <strong>{amount(vm.calc?.tabela?.cargaDescarga)}</strong>
        </span>
      </div>
      <section aria-labelledby="rs-scenarios-title">
        <div className="rs-section-head rs-scenarios-heading">
          <h2 id="rs-scenarios-title">2. Cotação e negociação</h2>
          <span>Campos com borda são editáveis.</span>
        </div>
        <div className="rs-scenarios">
          {vm.scenarios.map((scenario, index) => (
            <article
              key={scenario.title}
              className="rs-scenario"
              aria-label={scenario.title}
            >
              <header>
                <h3>{scenario.title}</h3>
                <p>{descriptions[index]}</p>
              </header>
              <div className="rs-pair rs-prices">
                <div className="rs-driver">
                  {index === 1 ? (
                    <SheetInput
                      field={driver}
                      label="Motorista"
                      badge="Editar"
                      hint={
                        automaticDriver
                          ? `Automático: ${amount(scenario.data.valorMotorista)}`
                          : "Valor informado"
                      }
                    />
                  ) : (
                    <Calculated
                      label="Motorista"
                      value={amount(scenario.data.valorMotorista)}
                      hint={
                        index === 2
                          ? "Mesmo motorista do cenário anterior"
                          : "Referência ANTT"
                      }
                    />
                  )}
                </div>
                <div className="rs-client">
                  {index === 2 ? (
                    <SheetInput
                      field={client}
                      label="Cliente / CT-e"
                      badge="Editar"
                      hint={
                        automaticClient
                          ? `Automático: ${amount(scenario.data.valorCliente)} (padrão)`
                          : "Valor informado"
                      }
                    />
                  ) : (
                    <Calculated
                      label="Cliente / CT-e"
                      value={amount(scenario.data.valorCliente)}
                      hint={
                        index === 1
                          ? "Calculado pela meta deste cenário"
                          : "Referência com margem de 30%"
                      }
                    />
                  )}
                </div>
              </div>
              <div
                className={`rs-pair rs-results${ready && scenario.data.lucro < 0 ? " rs-loss" : ""}`}
              >
                <div>
                  <span>Resultado líquido</span>
                  <strong>{amount(scenario.data.lucro)}</strong>
                  <small>
                    {ready
                      ? scenario.data.lucro < 0
                        ? "Prejuízo"
                        : "Saldo após os custos"
                      : "Aguardando cálculo"}
                  </small>
                </div>
                <div>
                  <span>Margem líquida</span>
                  <strong>
                    {ready ? percent(scenario.data.margemReal) : "—"}
                  </strong>
                  <small>Calculada sobre o cliente</small>
                </div>
              </div>
              <div className="rs-meta">
                {index === 1 ? (
                  <SheetInput
                    field={vm.negotiation[2]}
                    label="Margem desejada"
                    badge="Meta deste cenário"
                  />
                ) : (
                  <p>
                    {index === 0
                      ? "Cotação padrão independente da negociação."
                      : "Cliente em branco usa a cotação padrão."}
                  </p>
                )}
              </div>
              <details className="rs-costs" open>
                <summary>Conferência dos custos</summary>
                <dl>
                  <div>
                    <dt>ICMS</dt>
                    <dd>{amount(scenario.data.icmsValor)}</dd>
                  </div>
                  <div className="rs-cost-total">
                    <dt>Taxas, seguros e pedágio</dt>
                    <dd>{amount(scenario.data.taxasSemMotorista)}</dd>
                  </div>
                  <div className="rs-cost-part">
                    <dt>↳ Seguro de carga</dt>
                    <dd>{amount(vm.calc?.encargos?.seguroCarga)}</dd>
                  </div>
                  <div className="rs-cost-part">
                    <dt>↳ Seguro de terceiros</dt>
                    <dd>{amount(vm.calc?.encargos?.seguroRC)}</dd>
                  </div>
                  <div className="rs-cost-part">
                    <dt>↳ Pedágio</dt>
                    <dd>{amount(vm.pedagioNum)}</dd>
                  </div>
                  {vm.operacao === "tac" && (
                    <div className="rs-cost-part">
                      <dt>↳ INSS patronal</dt>
                      <dd>{amount(scenario.data.inssPatronal)}</dd>
                    </div>
                  )}
                </dl>
                <small>
                  Os itens com ↳ já estão incluídos no total de taxas.
                </small>
              </details>
              {ready && (
                <div className={`ql-warning ${scenario.data.status.tone}`}>
                  <strong>{scenario.data.status.label}</strong>
                  <span>{scenario.data.status.text}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <footer className="ql-actions rs-actions">
        <span>
          As ações usam o cenário <strong>Motorista + cliente</strong>.
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
    </div>
  );
}

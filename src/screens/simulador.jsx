// Calculadora de Frete ANTT - Rodobach
const SimuladorFrete = ({ onNavigate }) => {
  const D = window.NT_DATA || {};
  const { useEffect, useMemo, useRef, useState } = React;

  const [anttTabela, setAnttTabela] = useState(() => D.ANTT_TABELA || []);
  const [eixos, setEixos] = useState(6);
  const [tipoCarga, setTipoCarga] = useState("normal");
  const [operacao, setOperacao] = useState("etc");
  const [km, setKm] = useState("");
  const [pedagio, setPedagio] = useState("");
  const [seguro, setSeguro] = useState("");
  const [icms, setIcms] = useState("12");
  const [simMotorista, setSimMotorista] = useState("");
  const [simCliente, setSimCliente] = useState("");
  const [simMargem, setSimMargem] = useState("30");
  const [showCalc, setShowCalc] = useState(false);
  const [showAntt, setShowAntt] = useState(false);
  const [calc, setCalc] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef(null);

  const RPA_DEFAULTS = {
    inssBasePercent: 20,
    inssPercent: 11,
    sestPercent: 1.5,
    senatPercent: 1,
    patronalInssPercent: 2.698,
  };

  const parseBRNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value).trim();
    if (!raw) return 0;
    const cleaned = raw
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const parseMoneyNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value).trim();
    if (!raw) return 0;
    // Digitação simples representa reais, não centavos:
    // "9000" => 9000; "9.000" => 9000; "9.000,50" => 9000.50.
    if (/^\d+$/.test(raw)) return Number(raw);
    return parseBRNumber(raw);
  };

  const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const fmtR = (value) => `R$ ${round2(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (value) => `${round2(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const fmtIntBR = (value) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
  const onlyDecimal = (value) => String(value || "").replace(/[^\d,.]/g, "");
  const moneyInput = (setter) => (event) => setter(onlyDecimal(event.target.value));
  const percentInput = (setter) => (event) => setter(onlyDecimal(event.target.value).slice(0, 6));
  const integerInput = (setter) => (event) => setter(onlyDigits(event.target.value));
  const formatMoneyOnBlur = (value, setter) => {
    const amount = parseMoneyNumber(value);
    setter(amount > 0 ? fmtR(amount) : "");
  };
  const formatIntegerOnBlur = (value, setter) => {
    const amount = parseBRNumber(value);
    setter(amount > 0 ? fmtIntBR(amount) : "");
  };
  const formatPercentOnBlur = (value, setter) => {
    const amount = parseBRNumber(value);
    setter(amount > 0 ? String(round2(amount)).replace(".", ",") : "30");
  };

  useEffect(() => {
    window.RB_API.listAntt()
      .then((data) => { if (Array.isArray(data) && data.length) setAnttTabela(data); })
      .catch((err) => console.warn("API indisponivel, usando dados locais.", err));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const kmNum = parseBRNumber(km);
    if (!kmNum) {
      setCalc(null);
      setCalcError(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setCalcLoading(true);
      setCalcError(false);
      window.RB_API.calcularFrete({
        eixos,
        tipoCarga,
        operacao,
        km: kmNum,
        pedagio: parseMoneyNumber(pedagio),
        seguroRCManual: seguro.trim() ? parseMoneyNumber(seguro) : "",
        margem: 30,
        icms: parseBRNumber(icms) || 12,
      })
        .then((data) => { setCalc(data); setCalcError(false); })
        .catch((err) => { console.warn("Falha ao calcular frete:", err); setCalc(null); setCalcError(true); })
        .finally(() => setCalcLoading(false));
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [eixos, tipoCarga, operacao, km, pedagio, seguro, icms]);

  const tabRow = useMemo(
    () => anttTabela.find((row) => row.eixos === eixos) || anttTabela[0] || (D.ANTT_TABELA || [])[0] || {},
    [anttTabela, eixos]
  );

  const hasKm = parseBRNumber(km) > 0;
  const kmNum = parseBRNumber(km);
  const pedagioNum = parseMoneyNumber(pedagio);
  const icmsNum = parseBRNumber(icms) || 12;
  const tipoCargaLabel = tipoCarga === "normal" ? "Normal" : "Especial";
  const tipoVeiculoLabel = calc?.entrada?.tipoVeiculo || tabRow.tipoVeiculo || "Veiculo";

  const calcRpaLocal = (driverValue) => {
    if (operacao !== "tac") {
      return {
        inssBase: 0, inss: 0, sest: 0, senat: 0,
        totalDescontos: 0, valorLiquidoMot: driverValue, patronalInss: 0,
      };
    }
    const inssBase = driverValue * (RPA_DEFAULTS.inssBasePercent / 100);
    const inss = inssBase * (RPA_DEFAULTS.inssPercent / 100);
    const sest = inssBase * (RPA_DEFAULTS.sestPercent / 100);
    const senat = inssBase * (RPA_DEFAULTS.senatPercent / 100);
    const totalDescontos = inss + sest + senat;
    return {
      inssBase: round2(inssBase), inss: round2(inss), sest: round2(sest), senat: round2(senat),
      totalDescontos: round2(totalDescontos),
      valorLiquidoMot: round2(driverValue - totalDescontos),
      patronalInss: round2(driverValue * (RPA_DEFAULTS.patronalInssPercent / 100)),
    };
  };

  const getStatus = ({ lucro, margemReal, margemMeta, motoristaDiff, clienteNecessarioDiff }) => {
    if (!hasKm || !calc) {
      return { id: "SEM_DADOS", label: "Informe o KM", text: "Preencha os dados da viagem para calcular a tabela ANTT.", tone: "neutral", icon: "calculator" };
    }
    if (lucro < 0) {
      return { id: "PREJUIZO", label: "Operacao com prejuizo", text: "O valor cobrado nao cobre motorista, taxas, ICMS e custos informados.", tone: "danger", icon: "alert" };
    }
    if (motoristaDiff < 0) {
      return { id: "MOTORISTA_ABAIXO_ANTT", label: "Motorista abaixo da tabela ANTT", text: "Risco de autuacao/multa. Revise o valor pago ao motorista.", tone: "danger", icon: "alert" };
    }
    if (clienteNecessarioDiff < 0) {
      return { id: "CLIENTE_ABAIXO_NECESSARIO", label: "Valor do cliente insuficiente", text: `Abaixo do necessario para manter margem de ${fmtPct(margemMeta)}.`, tone: "warn", icon: "alert" };
    }
    if (margemReal < margemMeta) {
      return { id: "MARGEM_BAIXA", label: "Margem abaixo da meta", text: `A margem real ficou menor que a meta de ${fmtPct(margemMeta)}.`, tone: "warn", icon: "alert" };
    }
    return { id: "FRETE_OK", label: "Frete dentro da tabela ANTT e margem dentro da meta", text: "Valores comerciais cobrem a referencia ANTT, custos e margem desejada.", tone: "success", icon: "check" };
  };

  const buildCommercialCalc = ({ driverValue, clientValue, marginTarget }) => {
    const valorMinimoAntt = round2(calc?.tabela?.valorMotoristaTabela || 0);
    const valorMotorista = round2(driverValue || 0);
    const margemMeta = parseBRNumber(marginTarget) || 30;
    const rpa = calcRpaLocal(valorMotorista);
    const seguroCarga = round2(calc?.encargos?.seguroCarga || 0);
    const seguroRC = round2(calc?.encargos?.seguroRC || 0);
    const taxasSemMotorista = round2(seguroCarga + seguroRC + pedagioNum + rpa.patronalInss);
    const custoTotalAntesIcms = round2(valorMotorista + taxasSemMotorista);
    const divisor = 1 - icmsNum / 100 - margemMeta / 100;
    const valorClienteNecessario = divisor > 0 ? round2(custoTotalAntesIcms / divisor) : 0;
    const valorCliente = round2(clientValue || 0);
    const icmsValor = round2(valorCliente * icmsNum / 100);
    const lucro = round2(valorCliente - valorMotorista - taxasSemMotorista - icmsValor);
    const margemReal = valorCliente > 0 ? round2((lucro / valorCliente) * 100) : 0;
    const motoristaDiff = round2(valorMotorista - valorMinimoAntt);
    const clienteSugeridoDiff = round2(valorCliente - (calc?.resultado?.valorCliente || 0));
    const clienteNecessarioDiff = round2(valorCliente - valorClienteNecessario);
    const margemDiff = round2(margemReal - margemMeta);
    const status = getStatus({ lucro, margemReal, margemMeta, motoristaDiff, clienteNecessarioDiff });

    return {
      valorMinimoAntt, valorMinimoKm: kmNum > 0 ? round2(valorMinimoAntt / kmNum) : 0,
      valorMotorista, valorCliente, valorClienteNecessario,
      valorClienteSugerido: round2(calc?.resultado?.valorCliente || 0),
      lucro, margemReal, margemMeta, margemDiff,
      motoristaDiff, clienteSugeridoDiff, clienteNecessarioDiff,
      rpa, inssPatronal: rpa.patronalInss, taxasSemMotorista, custoTotalAntesIcms, icmsValor, status,
    };
  };

  const official = calc ? buildCommercialCalc({
    driverValue: calc?.resultado?.valorMotorista || calc?.tabela?.valorMotoristaTabela || 0,
    clientValue: calc?.resultado?.valorCliente || 0,
    marginTarget: 30,
  }) : buildCommercialCalc({ driverValue: 0, clientValue: 0, marginTarget: 30 });

  const simDriverValue = simMotorista.trim() ? parseMoneyNumber(simMotorista) : official.valorMotorista;
  const simClientValue = simCliente.trim() ? parseMoneyNumber(simCliente) : official.valorCliente;
  const simulation = calc ? buildCommercialCalc({
    driverValue: simDriverValue,
    clientValue: simClientValue,
    marginTarget: simMargem || 30,
  }) : official;
  const driverScenarioBase = calc ? buildCommercialCalc({
    driverValue: simDriverValue,
    clientValue: 0,
    marginTarget: simMargem || 30,
  }) : official;
  const driverScenario = calc ? buildCommercialCalc({
    driverValue: simDriverValue,
    clientValue: driverScenarioBase.valorClienteNecessario,
    marginTarget: simMargem || 30,
  }) : official;

  const resumoTexto = simulation.valorCliente > 0 ? [
    simulation.status.tone === "danger" || simulation.status.tone === "warn"
      ? `ATENCAO: ${simulation.status.label}. ${simulation.status.text}` : null,
    `*Cotacao ANTT - ${tipoVeiculoLabel} (${eixos} eixos)*`,
    `Carga: ${tipoCargaLabel}`,
    `Operacao: ${operacao.toUpperCase()}`,
    `KM: ${fmtIntBR(kmNum)} km`,
    `Valor minimo ANTT: ${fmtR(official.valorMinimoAntt)}`,
    `Valor sugerido cliente: ${fmtR(official.valorClienteSugerido)}`,
    `Valor motorista simulado: ${fmtR(simulation.valorMotorista)}`,
    `Valor cliente simulado: ${fmtR(simulation.valorCliente)}`,
    `Lucro real: ${fmtR(simulation.lucro)}`,
    `Margem real: ${fmtPct(simulation.margemReal)}`,
    `Status: ${simulation.status.label}`,
  ].filter(Boolean).join("\n") : "";

  const copiarResumo = () => {
    if (!resumoTexto) return;
    navigator.clipboard?.writeText(resumoTexto).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  const usarComoCotacao = () => {
    window.NT_SIM = {
      km: kmNum, pedagio: pedagioNum,
      valorMotorista: simulation.valorMotorista,
      valorCliente: simulation.valorCliente,
      tipoVeiculo: tipoVeiculoLabel, eixos,
    };
    onNavigate("viagens");
  };

  const inputStyle = {
    height: 38, padding: "0 11px",
    border: "1.5px solid var(--border)", borderRadius: "var(--r)",
    background: "var(--surface)", color: "var(--text)",
    fontSize: 13, outline: "none", boxSizing: "border-box",
    width: "100%", fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block", fontSize: 11, color: "var(--text-2)",
    fontWeight: 700, textTransform: "uppercase", marginBottom: 6,
  };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const StatCard = ({ label, value, sub, tone = "neutral", icon }) => (
    <div className={`frete-stat-card ${tone}`}>
      <div className="frete-stat-top">
        <span>{label}</span>
        {icon && <Icon name={icon} size={15}/>}
      </div>
      <div className="frete-stat-value">{value}</div>
      {sub && <div className="frete-stat-sub">{sub}</div>}
    </div>
  );

  const HeroCard = ({ label, value, sub, tone = "info" }) => (
    <div className={`frete-hero-card ${tone}`}>
      <div className="frete-hero-label">{label}</div>
      <div className="frete-hero-value">{value}</div>
      {sub && <div className="frete-hero-sub">{sub}</div>}
    </div>
  );

  const AlertBanner = ({ tone, icon, title, text }) => (
    <div className={`frete-alert-banner ${tone}`}>
      <Icon name={icon} size={16}/>
      <div>
        <div className="frete-alert-banner-title">{title}</div>
        {text && <div className="frete-alert-banner-text">{text}</div>}
      </div>
    </div>
  );

  // ── Alerts for simulation ────────────────────────────────────────────────────
  const simAlerts = calc ? [
    simulation.lucro < 0 && { tone: "danger", icon: "alert", title: "Operacao com prejuizo.", text: "O valor cobrado nao cobre motorista, taxas e ICMS." },
    simulation.motoristaDiff < 0 && { tone: "danger", icon: "alert", title: "Motorista abaixo da tabela ANTT. Risco de autuacao/multa.", text: `Diferenca: ${fmtR(Math.abs(simulation.motoristaDiff))} abaixo do minimo.` },
    simulation.clienteNecessarioDiff < 0 && simulation.lucro >= 0 && { tone: "warn", icon: "alert", title: `Valor do cliente abaixo do necessario para manter margem de ${fmtPct(simulation.margemMeta)}.`, text: `Necessario: ${fmtR(simulation.valorClienteNecessario)}.` },
    simulation.margemReal < simulation.margemMeta && simulation.clienteNecessarioDiff >= 0 && simulation.lucro >= 0 && { tone: "warn", icon: "alert", title: "Margem abaixo da meta.", text: `Real: ${fmtPct(simulation.margemReal)} · Meta: ${fmtPct(simulation.margemMeta)}` },
    simulation.status.id === "FRETE_OK" && { tone: "success", icon: "check", title: "Frete dentro da tabela ANTT e margem dentro da meta.", text: null },
  ].filter(Boolean) : [];

  const SimpleQuote = () => (
    <div className="view quote-simple">
      <div className="page-head quote-head">
        <div><h1>Calculadora de frete</h1><div className="sub">Informe a distância, compare com a ANTT e veja quanto sobra.</div></div>
        <button className="btn" onClick={() => onNavigate("viagens")}><Icon name="route"/> Viagens</button>
      </div>

      <section className="card quote-start">
        <div className="quote-intro"><b>Comece aqui</b><span>1. Escolha o caminhão</span><span>2. Informe a distância</span></div>
        <div className="quote-vehicle-row">
          {anttTabela.map((row) => <button key={row.eixos} type="button" onClick={() => setEixos(row.eixos)} className={`quote-vehicle ${eixos === row.eixos ? "active" : ""}`}><strong>{row.tipoVeiculo}</strong><small>{row.eixos} eixos</small></button>)}
        </div>
        <div className="quote-main-fields">
          <label><span>Distância da viagem</span><div className="quote-unit"><input inputMode="numeric" value={km} onChange={integerInput(setKm)} onBlur={() => formatIntegerOnBlur(km, setKm)} placeholder="Ex.: 1.600"/><b>km</b></div></label>
          <label><span>Pedágio</span><input inputMode="decimal" value={pedagio} onChange={moneyInput(setPedagio)} onBlur={() => formatMoneyOnBlur(pedagio, setPedagio)} placeholder="R$ 0,00"/></label>
          <label><span>Seguro adicional</span><input inputMode="decimal" value={seguro} onChange={moneyInput(setSeguro)} onBlur={() => formatMoneyOnBlur(seguro, setSeguro)} placeholder="Automático"/></label>
          <label><span>ICMS</span><div className="quote-unit"><input inputMode="decimal" value={icms} onChange={percentInput(setIcms)}/><b>%</b></div></label>
          <label><span>Margem desejada</span><div className="quote-unit"><input inputMode="decimal" value={simMargem} onChange={percentInput(setSimMargem)} onBlur={() => formatPercentOnBlur(simMargem, setSimMargem)}/><b>%</b></div></label>
        </div>
        {calcLoading && <div className="quote-message">Calculando...</div>}
        {calcError && <div className="quote-message danger">Não foi possível calcular. Tente novamente.</div>}
      </section>

      {!hasKm || !calc ? <div className="card quote-empty"><b>Informe a distância acima</b><span>Os três cálculos aparecerão automaticamente.</span></div> : <>
        <div className="quote-columns">
          <section className="quote-column official">
            <div className="quote-column-head"><i>1</i><div><strong>Referência ANTT</strong><small>Quanto a tabela recomenda</small></div></div>
            <div className="quote-big"><span>Mínimo para o motorista</span><b>{fmtR(official.valorMinimoAntt)}</b><small>{fmtR(official.valorMinimoKm)} por km</small></div>
            <div className="quote-compare">
              <div><span>Valor motorista</span><b>{fmtR(official.valorMotorista)}</b></div>
              <div><span>Valor cliente</span><b>{fmtR(official.valorClienteSugerido)}</b></div>
              <div><span>Pedágio</span><b>{fmtR(pedagioNum)}</b></div>
              <div><span>Seguros</span><b>{fmtR((calc.encargos?.seguroCarga || 0) + (calc.encargos?.seguroRC || 0))}</b></div>
              <div><span>ICMS</span><b>{fmtR(official.icmsValor)}</b></div>
              <div className="result"><span>Resultado líquido</span><b>{fmtR(official.lucro)}</b></div>
              <div className="result"><span>Margem</span><b>{fmtPct(official.margemReal)}</b></div>
            </div>
            <p>Esta é apenas a referência oficial. Os outros valores não alteram esta coluna.</p>
          </section>

          <section className="quote-column driver">
            <div className="quote-column-head"><i>2</i><div><strong>Alterar motorista</strong><small>Simule outro pagamento</small></div></div>
            <label className="quote-money"><span>Valor pago ao motorista</span><input inputMode="decimal" value={simMotorista} onChange={moneyInput(setSimMotorista)} onBlur={() => formatMoneyOnBlur(simMotorista, setSimMotorista)} placeholder={fmtR(official.valorMotorista)}/></label>
            <div className={`quote-warning ${driverScenario.motoristaDiff < 0 ? "danger" : "ok"}`}>{driverScenario.motoristaDiff < 0 ? `${fmtR(Math.abs(driverScenario.motoristaDiff))} abaixo da ANTT` : "Valor igual ou acima da ANTT"}</div>
            <div className="quote-big"><span>Cobrar do cliente para ter {fmtPct(driverScenario.margemMeta)}</span><b>{fmtR(driverScenario.valorClienteNecessario)}</b></div>
            <div className="quote-compare">
              <div><span>Valor motorista</span><b>{fmtR(driverScenario.valorMotorista)}</b></div>
              <div><span>Valor cliente calculado</span><b>{fmtR(driverScenario.valorClienteNecessario)}</b></div>
              <div><span>Pedágio</span><b>{fmtR(pedagioNum)}</b></div>
              <div><span>Seguros</span><b>{fmtR((calc.encargos?.seguroCarga || 0) + (calc.encargos?.seguroRC || 0))}</b></div>
              <div><span>ICMS</span><b>{fmtR(driverScenario.icmsValor)}</b></div>
              <div className="result"><span>Resultado líquido</span><b>{fmtR(driverScenario.lucro)}</b></div>
              <div className="result"><span>Margem</span><b>{fmtPct(driverScenario.margemReal)}</b></div>
            </div>
          </section>

          <section className={`quote-column deal ${simulation.lucro < 0 ? "loss" : ""}`}>
            <div className="quote-column-head"><i>3</i><div><strong>Ver quanto sobra</strong><small>Informe o valor combinado</small></div></div>
            <div className="quote-driver-link"><span>Motorista usado nesta conta</span><b>{fmtR(simulation.valorMotorista)}</b><small>Valor informado na coluna 2</small></div>
            <label className="quote-money"><span>Valor cobrado do cliente</span><input inputMode="decimal" value={simCliente} onChange={moneyInput(setSimCliente)} onBlur={() => formatMoneyOnBlur(simCliente, setSimCliente)} placeholder={fmtR(driverScenario.valorClienteNecessario)}/></label>
            <div className="quote-big"><span>Valor que vai sobrar</span><b>{fmtR(simulation.lucro)}</b><small>Margem de {fmtPct(simulation.margemReal)}</small></div>
            <div className="quote-compare">
              <div><span>Valor motorista</span><b>{fmtR(simulation.valorMotorista)}</b></div>
              <div><span>Valor cliente</span><b>{fmtR(simulation.valorCliente)}</b></div>
              <div><span>Pedágio</span><b>{fmtR(pedagioNum)}</b></div>
              <div><span>Seguros</span><b>{fmtR((calc.encargos?.seguroCarga || 0) + (calc.encargos?.seguroRC || 0))}</b></div>
              <div><span>ICMS</span><b>{fmtR(simulation.icmsValor)}</b></div>
              <div className="result"><span>Resultado líquido</span><b>{fmtR(simulation.lucro)}</b></div>
              <div className="result"><span>Margem</span><b>{fmtPct(simulation.margemReal)}</b></div>
            </div>
            <div className={`quote-status ${simulation.status.tone}`}><Icon name={simulation.status.icon} size={16}/><div><b>{simulation.status.label}</b><span>{simulation.status.text}</span></div></div>
            <div className="quote-actions"><button className="btn" onClick={copiarResumo} disabled={!resumoTexto}>{copied ? "Copiado!" : "Copiar resumo"}</button><button className="btn primary" onClick={usarComoCotacao} disabled={simulation.status.tone === "danger"}>Usar na viagem</button></div>
          </section>
        </div>

        <details className="card quote-advanced">
          <summary><span><Icon name="settings" size={15}/> Opções avançadas</span><small>Tipo de carga e operação</small></summary>
          <div className="quote-advanced-grid">
            <label><span>Tipo de carga</span><select value={tipoCarga} onChange={(e) => setTipoCarga(e.target.value)}><option value="normal">Normal</option><option value="alto_desempenho">Especial</option></select></label>
            <label><span>Operação</span><select value={operacao} onChange={(e) => setOperacao(e.target.value)}><option value="etc">ETC — Empresa</option><option value="tac">TAC — Autônomo</option></select></label>
          </div>
        </details>
      </>}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return SimpleQuote();
};

window.SimuladorFrete = SimuladorFrete;

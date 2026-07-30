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
  return (
    <div className="view frete-view">

      {/* ─── Cabeçalho da página ─── */}
      <div className="page-head">
        <div>
          <h1>Calculadora de Frete ANTT</h1>
          <div className="sub">Referencia oficial separada da simulacao comercial.</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => onNavigate("viagens")}><Icon name="route"/> Viagens</button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BLOCO 1 — REFERÊNCIA OFICIAL ANTT
          Apenas informativo. Margem padrão fixa de 30%.
          Não é afetado pela simulação comercial abaixo.
          ═══════════════════════════════════════════════════════════════ */}
      <div className="frete-bloco">
        <div className="frete-bloco-header info">
          <Icon name="chart" size={13}/>
          <span>Bloco 1 — Referencia Oficial ANTT</span>
          <span className="frete-bloco-badge">Apenas informativo · Margem padrao de 30% · Nao afetado pela simulacao</span>
        </div>

        {/* Formulário de configuração */}
        <div className="card frete-form-card">
          <div className="frete-section-title">Dados para calculo</div>
          <div className="frete-setup-grid">
            <div className="frete-setup-wide">
              <label style={labelStyle}>Tipo de veiculo</label>
              <div className="frete-choice-grid">
                {anttTabela.map((row) => (
                  <button key={row.eixos}
                    onClick={() => setEixos(row.eixos)}
                    className={`btn${eixos === row.eixos ? " primary" : ""}`}>
                    {row.tipoVeiculo}
                    <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 3 }}>({row.eixos}e)</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tipo de carga</label>
              <div className="frete-segment">
                {[{ id: "normal", label: "Normal" }, { id: "alto_desempenho", label: "Especial" }].map((opt) => (
                  <button key={opt.id} onClick={() => setTipoCarga(opt.id)}
                    className={tipoCarga === opt.id ? "active" : ""}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Operacao</label>
              <div className="frete-segment">
                {[{ id: "etc", label: "ETC" }, { id: "tac", label: "TAC" }].map((opt) => (
                  <button key={opt.id} onClick={() => setOperacao(opt.id)}
                    className={operacao === opt.id ? "active" : ""}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                KM da viagem <span style={{ color: "#f87171", fontWeight: 900 }}>*</span>
              </label>
              <div className="frete-input-unit">
                <input inputMode="numeric" value={km} onChange={integerInput(setKm)}
                  onBlur={() => formatIntegerOnBlur(km, setKm)}
                  style={inputStyle} placeholder="Ex: 1.000"/>
                <span>km</span>
              </div>
              {!hasKm
                ? <div className="frete-field-example warn">Obrigatorio — informe a distancia</div>
                : <div className="frete-field-example">{fmtIntBR(kmNum)} km selecionados</div>
              }
            </div>
            <div>
              <label style={labelStyle}>Pedagio</label>
              <input inputMode="decimal" value={pedagio} onChange={moneyInput(setPedagio)}
                onBlur={() => formatMoneyOnBlur(pedagio, setPedagio)}
                style={inputStyle} placeholder="Ex: 400,00"/>
              <div className="frete-field-example">Valor total da viagem</div>
            </div>
            <div>
              <label style={labelStyle}>Seguro adicional</label>
              <input inputMode="decimal" value={seguro} onChange={moneyInput(setSeguro)}
                onBlur={() => formatMoneyOnBlur(seguro, setSeguro)}
                style={inputStyle} placeholder="Opcional"/>
              <div className="frete-field-example">Deixe vazio para estimar</div>
            </div>
            <div>
              <label style={labelStyle}>ICMS %</label>
              <input inputMode="decimal" value={icms} onChange={percentInput(setIcms)}
                onBlur={() => formatPercentOnBlur(icms, setIcms)}
                style={inputStyle} placeholder="12"/>
              <div className="frete-field-example">Padrao: 12%</div>
            </div>
          </div>
        </div>

        {/* Estado vazio — KM não preenchido */}
        {!hasKm && (
          <div className="card frete-sem-dados">
            <div className="frete-sem-dados-icon"><Icon name="calculator" size={28}/></div>
            <div>
              <div className="frete-sem-dados-title">Informe o KM para calcular</div>
              <div className="frete-sem-dados-text">
                Preencha a distancia em quilometros no campo acima. O sistema calculara automaticamente os valores oficiais da tabela ANTT.
              </div>
            </div>
          </div>
        )}

        {/* Estado: calculando */}
        {hasKm && calcLoading && (
          <div className="card frete-calculando">
            <span className="frete-loading">Calculando tabela ANTT...</span>
          </div>
        )}

        {/* Estado: erro de API */}
        {hasKm && calcError && !calcLoading && (
          <div className="card frete-sem-dados">
            <div className="frete-sem-dados-icon"><Icon name="alert" size={28}/></div>
            <div>
              <div className="frete-sem-dados-title">Nao foi possivel calcular</div>
              <div className="frete-sem-dados-text">
                Verifique a conexao com o servidor e tente novamente. O KM informado pode nao ter tarifa cadastrada.
              </div>
            </div>
          </div>
        )}

        {/* Resultado oficial — aparece quando KM preenchido e cálculo retornou */}
        {hasKm && calc && !calcLoading && (
          <div className="card frete-official-ref-card">
            {/* Cabeçalho do resultado */}
            <div className="frete-ref-head">
              <div className="frete-ref-context">
                <span className="frete-eyebrow">Resultado oficial ANTT</span>
                <div className="frete-ref-context-tags">
                  <span className="frete-tag">{tipoVeiculoLabel}</span>
                  <span className="frete-tag">{tipoCargaLabel}</span>
                  <span className="frete-tag">{operacao.toUpperCase()}</span>
                  <span className="frete-tag">{fmtIntBR(kmNum)} km</span>
                  {pedagioNum > 0 && <span className="frete-tag">Pedagio {fmtR(pedagioNum)}</span>}
                  <span className="frete-tag">ICMS {icmsNum}%</span>
                </div>
              </div>
              <div className="frete-tag frete-tag-margem">Margem padrao: 30%</div>
            </div>

            {/* 3 hero cards: valores principais */}
            <div className="frete-hero-row">
              <HeroCard
                label="Minimo ANTT — Motorista"
                value={official.valorMinimoAntt > 0 ? fmtR(official.valorMinimoAntt) : "—"}
                sub={official.valorMinimoKm > 0 ? `${fmtR(official.valorMinimoKm)} / km` : "Calculando..."}
                tone="info"
              />
              <HeroCard
                label="Valor sugerido — Cliente"
                value={official.valorClienteSugerido > 0 ? fmtR(official.valorClienteSugerido) : "—"}
                sub={`Com ICMS ${icmsNum}% + encargos + 30% de margem`}
                tone="success"
              />
              <HeroCard
                label="Lucro esperado"
                value={official.lucro !== undefined && official.lucro > 0 ? fmtR(official.lucro) : "—"}
                sub="Margem padrao 30,00%"
                tone={(official.lucro || 0) >= 0 ? "success" : "danger"}
              />
            </div>

            {/* Detalhes adicionais */}
            <div className="frete-detail-chips">
              <div className="frete-detail-chip">
                <span>Minimo por KM</span>
                <b>{official.valorMinimoKm > 0 ? `${fmtR(official.valorMinimoKm)}/km` : "—"}</b>
              </div>
              <div className="frete-detail-chip">
                <span>Pedagio</span>
                <b>{pedagioNum > 0 ? fmtR(pedagioNum) : "Nao informado"}</b>
              </div>
              <div className="frete-detail-chip">
                <span>Seguro RC</span>
                <b>{calc?.encargos?.seguroRC > 0 ? fmtR(calc.encargos.seguroRC) : "Nao informado"}</b>
              </div>
              <div className="frete-detail-chip">
                <span>ICMS</span>
                <b>{fmtPct(icmsNum)}</b>
              </div>
              <div className="frete-detail-chip">
                <span>Operacao</span>
                <b>{operacao.toUpperCase()}</b>
              </div>
              <div className="frete-detail-chip">
                <span>Tipo de carga</span>
                <b>{tipoCargaLabel}</b>
              </div>
            </div>

            {/* Status ANTT da referência */}
            <div className={`frete-official-status ${official.status.tone}`}>
              <Icon name={official.status.icon} size={16}/>
              <div>
                <div className="frete-status-title">{official.status.label}</div>
                <div className="frete-status-text">{official.status.text}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BLOCO 2 — SIMULAÇÃO COMERCIAL
          Valores editáveis. Não altera a referência oficial acima.
          ═══════════════════════════════════════════════════════════════ */}
      <div className="frete-bloco">
        <div className="frete-bloco-header">
          <Icon name="calculator" size={13}/>
          <span>Bloco 2 — Simulacao Comercial</span>
          <span className="frete-bloco-badge">Nao altera a referencia oficial acima</span>
        </div>

        <div className="card frete-simulation-card">

          {!hasKm || !calc ? (
            /* Bloqueado até ter referência oficial */
            <div className="frete-sim-bloqueado">
              <Icon name="lock" size={20}/>
              <div>
                <div className="frete-sem-dados-title">Simulacao indisponivel</div>
                <div className="frete-sem-dados-text">
                  {!hasKm
                    ? "Preencha o KM no Bloco 1 para habilitar a simulacao."
                    : calcLoading
                    ? "Aguarde o calculo da tabela ANTT..."
                    : "Nao foi possivel carregar a referencia ANTT. Verifique a conexao."}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Layout 2 colunas: inputs | resultados */}
              <div className="frete-simulation-layout">

                {/* ── Coluna esquerda: entradas ── */}
                <div className="frete-simulation-inputs">
                  <div className="frete-sim-panel-title">Valores da negociacao</div>

                  <div>
                    <label style={labelStyle}>Valor pago ao motorista</label>
                    <input inputMode="decimal" value={simMotorista}
                      onChange={moneyInput(setSimMotorista)}
                      onBlur={() => formatMoneyOnBlur(simMotorista, setSimMotorista)}
                      style={inputStyle}
                      placeholder={official.valorMotorista > 0 ? fmtR(official.valorMotorista) : "Ex: 25.000,00"}/>
                    <div className={`frete-field-example ${simulation.motoristaDiff < 0 ? "warn" : ""}`}>
                      Min. ANTT: <strong>{fmtR(official.valorMinimoAntt)}</strong>
                      {simulation.motoristaDiff < 0 && " ⚠ Abaixo do minimo"}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Valor cobrado do cliente</label>
                    <input inputMode="decimal" value={simCliente}
                      onChange={moneyInput(setSimCliente)}
                      onBlur={() => formatMoneyOnBlur(simCliente, setSimCliente)}
                      style={inputStyle}
                      placeholder={official.valorClienteSugerido > 0 ? fmtR(official.valorClienteSugerido) : "Ex: 35.000,00"}/>
                    <div className={`frete-field-example ${simulation.clienteSugeridoDiff < 0 ? "warn" : ""}`}>
                      Sugerido: <strong>{fmtR(official.valorClienteSugerido)}</strong>
                      {simulation.clienteSugeridoDiff < 0 && " ⚠ Abaixo do sugerido"}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Margem desejada</label>
                    <div className="frete-input-unit">
                      <input inputMode="decimal" value={simMargem}
                        onChange={percentInput(setSimMargem)}
                        onBlur={() => formatPercentOnBlur(simMargem, setSimMargem)}
                        style={inputStyle} placeholder="30"/>
                      <span>%</span>
                    </div>
                    <div className="frete-field-example">Meta padrao sempre inicia em 30%</div>
                  </div>

                  {/* Mini-resumo de entrada */}
                  <div className="frete-sim-input-summary">
                    <div className="frete-sim-input-summary-row">
                      <span>Motorista</span>
                      <b>{fmtR(simulation.valorMotorista)}</b>
                    </div>
                    <div className="frete-sim-input-summary-row">
                      <span>Cliente</span>
                      <b>{fmtR(simulation.valorCliente)}</b>
                    </div>
                    <div className="frete-sim-input-summary-row">
                      <span>Meta de margem</span>
                      <b>{fmtPct(simulation.margemMeta)}</b>
                    </div>
                  </div>
                </div>

                {/* ── Coluna direita: resultados ── */}
                <div className="frete-simulation-results">
                  <div className="frete-sim-panel-title">Resultados da simulacao</div>

                  <div className="frete-stat-grid">
                    <StatCard
                      label="Lucro real"
                      value={fmtR(simulation.lucro || 0)}
                      sub="Cliente - motorista - taxas - ICMS"
                      tone={(simulation.lucro || 0) >= 0 ? "success" : "danger"}
                      icon="money"
                    />
                    <StatCard
                      label="Margem real"
                      value={fmtPct(simulation.margemReal || 0)}
                      sub={`Meta: ${fmtPct(simulation.margemMeta || 30)}`}
                      tone={simulation.margemReal >= simulation.margemMeta ? "success" : "warn"}
                      icon="chart"
                    />
                    <StatCard
                      label="Diferenca da meta"
                      value={`${simulation.margemDiff >= 0 ? "+" : ""}${fmtPct(simulation.margemDiff || 0)}`}
                      sub="Margem real menos margem desejada"
                      tone={simulation.margemDiff >= 0 ? "success" : "warn"}
                      icon="chart"
                    />
                    <StatCard
                      label="Necessario p/ margem"
                      value={fmtR(simulation.valorClienteNecessario || 0)}
                      sub={`Para manter ${fmtPct(simulation.margemMeta || 30)}`}
                      tone="info"
                      icon="calculator"
                    />
                    <StatCard
                      label="Motorista x ANTT"
                      value={`${simulation.motoristaDiff >= 0 ? "+" : String.fromCharCode(8722)}${fmtR(Math.abs(simulation.motoristaDiff || 0))}`}
                      sub="Comparado ao minimo ANTT"
                      tone={simulation.motoristaDiff >= 0 ? "success" : "danger"}
                      icon="truck"
                    />
                    <StatCard
                      label="Cliente x sugerido"
                      value={`${simulation.clienteSugeridoDiff >= 0 ? "+" : String.fromCharCode(8722)}${fmtR(Math.abs(simulation.clienteSugeridoDiff || 0))}`}
                      sub="Comparado ao valor sugerido oficial"
                      tone={simulation.clienteSugeridoDiff >= 0 ? "success" : "warn"}
                      icon="trending-up"
                    />
                  </div>
                </div>
              </div>

              {/* ── Alertas ── */}
              {simAlerts.length > 0 && (
                <div className="frete-alert-stack">
                  {simAlerts.map((a, i) => (
                    <AlertBanner key={i} tone={a.tone} icon={a.icon} title={a.title} text={a.text}/>
                  ))}
                </div>
              )}

              {/* ── Card de resumo final ── */}
              <div className="frete-sim-resumo-card">
                <div className="frete-sim-resumo-title">Resumo final da simulacao</div>
                <div className="frete-sim-resumo-grid">
                  <div className={`frete-sim-resumo-item ${(simulation.lucro || 0) >= 0 ? "success" : "danger"}`}>
                    <span>Lucro real</span>
                    <b>{fmtR(simulation.lucro || 0)}</b>
                  </div>
                  <div className={`frete-sim-resumo-item ${simulation.margemReal >= simulation.margemMeta ? "success" : "warn"}`}>
                    <span>Margem real</span>
                    <b>{fmtPct(simulation.margemReal || 0)}</b>
                  </div>
                  <div className={`frete-sim-resumo-item ${simulation.margemDiff >= 0 ? "success" : "warn"}`}>
                    <span>Diferenca da meta ({fmtPct(simulation.margemMeta)})</span>
                    <b>{simulation.margemDiff >= 0 ? "+" : ""}{fmtPct(simulation.margemDiff || 0)}</b>
                  </div>
                  <div className="frete-sim-resumo-item info">
                    <span>Necessario p/ {fmtPct(simulation.margemMeta)}</span>
                    <b>{fmtR(simulation.valorClienteNecessario || 0)}</b>
                  </div>
                  <div className={`frete-sim-resumo-item ${simulation.motoristaDiff >= 0 ? "neutral" : "danger"}`}>
                    <span>Dif. motorista x ANTT</span>
                    <b>{simulation.motoristaDiff >= 0 ? "+" : ""}{fmtR(simulation.motoristaDiff || 0)}</b>
                  </div>
                  <div className={`frete-sim-resumo-item ${simulation.clienteSugeridoDiff >= 0 ? "neutral" : "warn"}`}>
                    <span>Dif. cliente x sugerido</span>
                    <b>{simulation.clienteSugeridoDiff >= 0 ? "+" : ""}{fmtR(simulation.clienteSugeridoDiff || 0)}</b>
                  </div>
                </div>
              </div>

              {/* ── Copiar e ações ── */}
              <div className="frete-copy-box">
                <div>
                  <div className="frete-eyebrow">Resumo para compartilhar</div>
                  <p>
                    {simulation.status.tone === "danger" || simulation.status.tone === "warn"
                      ? "O resumo sera copiado com os alertas da simulacao."
                      : "Copie os valores para enviar ao motorista ou comercial."}
                  </p>
                </div>
                <button
                  className={`btn ${simulation.status.tone === "danger" ? "danger" : "primary"}`}
                  disabled={!resumoTexto}
                  onClick={copiarResumo}>
                  <Icon name={simulation.status.tone === "danger" ? "alert" : "whatsapp"} size={14}/>
                  {copied ? "Copiado!" : simulation.status.tone === "danger" ? "Copiar com alerta" : "Copiar WhatsApp"}
                </button>
              </div>

              <div className="col" style={{ gap: 8 }}>
                <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}
                  onClick={usarComoCotacao} disabled={!hasKm || simulation.status.tone === "danger"}>
                  <Icon name="route"/> Usar como cotacao de viagem
                </button>
              </div>

              {/* ── Calculo avançado (colapsável) ── */}
              {calc && (
                <>
                  <button onClick={() => setShowCalc((v) => !v)} className="frete-collapse-btn">
                    <span>Ver calculo avancado</span>
                    <Icon name={showCalc ? "arrow-up" : "arrow-down"} size={14}/>
                  </button>
                  {showCalc && (
                    <div className="frete-breakdown">
                      {[
                        { l: `Deslocamento (${fmtIntBR(kmNum)} km x R$ ${(calc.tabela?.kmValor || 0).toFixed(4)})`, v: calc.tabela?.deslocamento },
                        { l: "Carga e descarga (ANTT)", v: calc.tabela?.cargaDescarga },
                        calc.encargos?.seguroCarga > 0 && { l: "Seguro de carga", v: calc.encargos.seguroCarga },
                        calc.encargos?.seguroRC > 0 && { l: "Seguro RC", v: calc.encargos.seguroRC },
                        pedagioNum > 0 && { l: "Pedagio", v: pedagioNum },
                        simulation.inssPatronal > 0 && { l: "Custo patronal TAC", v: simulation.inssPatronal },
                      ].filter(Boolean).map((row, index) => (
                        <div key={index} className="row between">
                          <span className="muted">{row.l}</span>
                          <span className="num">{fmtR(row.v)}</span>
                        </div>
                      ))}
                      <div className="row between frete-breakdown-total">
                        <span>Custo antes de ICMS</span>
                        <span className="num">{fmtR(simulation.custoTotalAntesIcms)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Tabela ANTT completa */}
        <div className="card">
          <button onClick={() => setShowAntt((v) => !v)} className="frete-collapse-btn" style={{ borderTop: 0, paddingTop: 0 }}>
            <span>Tabela ANTT completa</span>
            <Icon name={showAntt ? "arrow-up" : "arrow-down"} size={14}/>
          </button>
          {showAntt && (
            <div style={{ overflow: "auto", marginTop: 4 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th className="num">Eixos</th>
                    <th className="num">Normal R$/km</th>
                    <th className="num">Normal C/D</th>
                    <th className="num">Especial R$/km</th>
                    <th className="num">Especial C/D</th>
                  </tr>
                </thead>
                <tbody>
                  {anttTabela.map((row) => (
                    <tr key={row.eixos} className={row.eixos === eixos ? "row-warn" : ""}>
                      <td style={{ fontWeight: row.eixos === eixos ? 600 : 400 }}>{row.tipoVeiculo}</td>
                      <td className="num">{row.eixos}</td>
                      <td className="num">{row.normal?.kmValor?.toFixed(4)}</td>
                      <td className="num">{fmtR(row.normal?.cargaDescarga)}</td>
                      <td className="num">{row.altoDesempenho?.kmValor?.toFixed(4)}</td>
                      <td className="num">{fmtR(row.altoDesempenho?.cargaDescarga)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

window.SimuladorFrete = SimuladorFrete;

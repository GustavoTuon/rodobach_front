import { QuoteLayouts } from './quote-layouts.jsx';
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
  const [valorNota, setValorNota] = useState("");
  const [seguro, setSeguro] = useState("");
  const [icms, setIcms] = useState("12");
  const [simMotorista, setSimMotorista] = useState("");
  const [simCliente, setSimCliente] = useState("");
  const [simMargem, setSimMargem] = useState("30");
  const [calculations, setCalc] = useState(null);
  const calc = calculations?.[`${tipoCarga}:${operacao}`] || null;
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef(null);

  const RPA_DEFAULTS = {
    inssBasePercent: 20,
    inssPercent: 11,
    sestPercent: 1.5,
    senatPercent: 1,
    patronalInssPercent: 4,
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
    setter(String(value).trim() ? fmtR(amount) : "");
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
    let active = true;
    clearTimeout(debounceRef.current);
    setCalc(null);
    const kmNum = parseBRNumber(km);
    if (!kmNum) {
      setCalc(null);
      setCalcError(false);
      setCalcLoading(false);
      return;
    }
    setCalcLoading(true);
    debounceRef.current = setTimeout(() => {
      setCalcLoading(true);
      setCalcError(false);
      Promise.all(['normal', 'alto_desempenho'].flatMap((type) =>
        ['etc', 'tac'].map(async (operation) => [`${type}:${operation}`, await window.RB_API.calcularFrete({
        eixos,
        tipoCarga: type,
        operacao: operation,
        km: kmNum,
        pedagio: parseMoneyNumber(pedagio),
        valorNota: parseMoneyNumber(valorNota),
        seguroRCManual: seguro.trim() ? parseMoneyNumber(seguro) : "",
        margem: 30,
        icms: icms.trim() === "" ? 12 : parseBRNumber(icms),
      })])))
        .then((entries) => { if (active) { setCalc(Object.fromEntries(entries)); setCalcError(false); } })
        .catch((err) => { if (active) { console.warn("Falha ao calcular frete:", err); setCalc(null); setCalcError(true); } })
        .finally(() => { if (active) setCalcLoading(false); });
    }, 400);

    return () => { active = false; clearTimeout(debounceRef.current); };
  }, [eixos, km, pedagio, seguro, icms, valorNota]);

  const tabRow = useMemo(
    () => anttTabela.find((row) => row.eixos === eixos) || anttTabela[0] || (D.ANTT_TABELA || [])[0] || {},
    [anttTabela, eixos]
  );

  const hasKm = parseBRNumber(km) > 0;
  const kmNum = parseBRNumber(km);
  const pedagioNum = parseMoneyNumber(pedagio);
  const icmsNum = icms.trim() === "" ? 12 : parseBRNumber(icms);
  const tipoCargaLabel = tipoCarga === "normal" ? "Normal" : "Alto desempenho";
  const tipoVeiculoLabel = calc?.entrada?.tipoVeiculo || tabRow.tipoVeiculo || "Veiculo";

  const calcRpaLocal = (driverValue, operation = operacao) => {
    if (operation !== "tac") {
      return {
        inssBase: 0, inss: 0, sest: 0, senat: 0,
        totalDescontos: 0, valorLiquidoMot: driverValue, patronalInss: 0, valorBruto: driverValue, custoTaxas: 0, custoMotorista: driverValue,
      };
    }
    const retention = RPA_DEFAULTS.inssBasePercent / 100 * (RPA_DEFAULTS.inssPercent + RPA_DEFAULTS.sestPercent + RPA_DEFAULTS.senatPercent) / 100;
    const bruto = driverValue / (1 - retention);
    const patronal = bruto * RPA_DEFAULTS.patronalInssPercent / 100;
    const inssBase = bruto * (RPA_DEFAULTS.inssBasePercent / 100);
    const inss = inssBase * (RPA_DEFAULTS.inssPercent / 100);
    const sest = inssBase * (RPA_DEFAULTS.sestPercent / 100);
    const senat = inssBase * (RPA_DEFAULTS.senatPercent / 100);
    const totalDescontos = inss + sest + senat;
    return {
      inssBase: round2(inssBase), inss: round2(inss), sest: round2(sest), senat: round2(senat),
      totalDescontos: round2(totalDescontos),
      valorLiquidoMot: round2(driverValue),
      valorBruto: round2(bruto),
      patronalInss: round2(patronal),
      custoTaxas: round2(bruto - driverValue + patronal),
      custoMotorista: round2(bruto + patronal),
    };
  };

  const getStatus = ({ lucro, margemBruta, margemMeta, motoristaDiff, clienteNecessarioDiff }) => {
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
    if (margemBruta + 0.01 < margemMeta) {
      return { id: "MARGEM_BAIXA", label: "Margem abaixo da meta", text: `O percentual bruto ficou menor que a meta de ${fmtPct(margemMeta)}.`, tone: "warn", icon: "alert" };
    }
    return { id: "FRETE_OK", label: "Frete dentro da tabela ANTT e margem dentro da meta", text: "Valores comerciais cobrem a referencia ANTT, custos; percentual bruto dentro da meta.", tone: "success", icon: "check" };
  };

  const buildCommercialCalc = ({ driverValue, clientValue, marginTarget }, source = calc, operation = operacao) => {
    const valorMinimoAntt = round2(source?.tabela?.valorMotoristaTabela || 0);
    const valorMotorista = round2(driverValue || 0);
    const margemMeta = String(marginTarget ?? "").trim() === "" ? 30 : parseBRNumber(marginTarget);
    const rpa = calcRpaLocal(valorMotorista, operation);
    const seguroCarga = round2(source?.encargos?.seguroCarga || 0);
    const seguroRC = round2(source?.encargos?.seguroRC || 0);
    const taxasSemMotorista = round2(seguroCarga + seguroRC + pedagioNum + rpa.custoTaxas);
    const custoTotalAntesIcms = round2(valorMotorista + taxasSemMotorista);
    const divisor = 1 - margemMeta / 100;
    const valorClienteNecessario = divisor > 0 ? round2(valorMotorista / divisor) : 0;
    const valorCliente = round2(clientValue || 0);
    const icmsValor = round2(valorCliente * icmsNum / 100);
    const lucro = round2(valorCliente - valorMotorista - taxasSemMotorista - icmsValor);
    const margemReal = valorCliente > 0 ? round2((lucro / valorCliente) * 100) : 0;
    const motoristaDiff = round2(valorMotorista - valorMinimoAntt);
    const clienteSugeridoDiff = round2(valorCliente - standardClient);
    const clienteNecessarioDiff = round2(valorCliente - valorClienteNecessario);
    const margemBruta = valorCliente > 0 ? round2((valorCliente - valorMotorista) / valorCliente * 100) : 0;
    const margemDiff = round2(margemBruta - margemMeta);
    const status = getStatus({ lucro, margemBruta, margemMeta, motoristaDiff, clienteNecessarioDiff });

    return {
      valorMinimoAntt, valorMinimoKm: kmNum > 0 ? round2(valorMinimoAntt / kmNum) : 0,
      valorMotorista, valorCliente, valorClienteNecessario,
      valorClienteSugerido: standardClient,
      lucro, margemReal, margemMeta, margemDiff,
      motoristaDiff, clienteSugeridoDiff, clienteNecessarioDiff,
      rpa, inssPatronal: rpa.patronalInss, taxaRpa: rpa.totalDescontos, custoMotorista: rpa.custoMotorista, taxasSemMotorista, custoTotalAntesIcms, custoTotal: round2(custoTotalAntesIcms + icmsValor), icmsValor, status,
    };
  };

  const standardClient = round2((calculations?.["normal:etc"]?.tabela?.valorMotoristaTabela || 0) / 0.7);
  const official = calc ? buildCommercialCalc({
    driverValue: calc?.resultado?.valorMotorista || calc?.tabela?.valorMotoristaTabela || 0,
    clientValue: standardClient,
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

  const comparison = ['normal', 'alto_desempenho'].map((type) => ({
    type, label: type === 'normal' ? 'Normal' : 'Alto desempenho',
    options: ['etc', 'tac'].map((operation) => {
      const source = calculations?.[`${type}:${operation}`];
      const build = (driverValue, clientValue, marginTarget) => buildCommercialCalc({ driverValue, clientValue, marginTarget }, source, operation);
      const standard = build(source?.resultado?.valorMotorista ?? source?.tabela?.valorMotoristaTabela ?? 0, standardClient, 30);
      const driver = simMotorista.trim() ? parseMoneyNumber(simMotorista) : standard.valorMotorista;
      const base = build(driver, 0, simMargem);
      return { operation, source, results: [standard, build(driver, base.valorClienteNecessario, simMargem), build(driver, simCliente.trim() ? parseMoneyNumber(simCliente) : standard.valorCliente, simMargem)] };
    }),
  }));

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
      tipoVeiculo: tipoVeiculoLabel, eixos, tipoCarga, operacao,
    };
    onNavigate("viagens");
  };

  const field = (label, value, setter, unit, mode = 'decimal') => ({
    label, value, unit, mode,
    onChange: mode === 'numeric' ? integerInput(setter) : moneyInput(setter),
    onBlur: unit === '%' ? undefined : () => {
      if (mode === 'numeric') return formatIntegerOnBlur(value, setter);
      const amount = parseMoneyNumber(value);
      setter(value.trim() ? amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    },
  });
  const invalidPercent = parseBRNumber(simMargem) >= 100 || icmsNum > 100;
  const vm = {
    inputError: invalidPercent ? "Use percentual bruto de 0 a menos de 100% e ICMS de 0 a 100%." : "",
    comparison,
    money: fmtR, percent: fmtPct, ready: hasKm && !!calc && !calcLoading && !invalidPercent,
    loading: calcLoading, error: calcError, calc, simulation, pedagioNum,
    vehicles: anttTabela, eixos, setEixos, tipoCarga, setTipoCarga, operacao, setOperacao,
    vehicleLabel: tipoVeiculoLabel,
    fields: [
      field('Quilometragem', km, setKm, 'km', 'numeric'),
      field('Pedágio', pedagio, setPedagio, 'R$'),
      field('Valor NF-e', valorNota, setValorNota, 'R$'),
      { ...field('Seguro terceiros', seguro, setSeguro, 'R$'), placeholder: 'Automático' },
      field('ICMS', icms, setIcms, '%'),
    ],
    negotiation: [
      { ...field('Valor do motorista', simMotorista, setSimMotorista, 'R$'), placeholder: calc ? fmtR(official.valorMotorista) : 'Padrão' },
      { ...field('Valor do cliente', simCliente, setSimCliente, 'R$'), placeholder: calc ? fmtR(official.valorCliente) : 'Padrão' },
      field('Percentual bruto', simMargem, setSimMargem, '%'),
    ],
    scenarios: [
      { title: 'Cotação padrão', short: 'Padrão', description: 'Referência da tabela ANTT', data: official },
      { title: 'Alterar motorista', short: 'Motorista', description: 'Cliente = motorista ÷ (1 − percentual bruto)', data: driverScenario },
      { title: 'Motorista + cliente', short: 'Negociação', description: 'Resultado dos valores combinados', data: simulation },
    ],
    copy: copiarResumo, copied, useQuote: usarComoCotacao, goTrips: () => onNavigate('viagens'),
  };
  return <div className="quote-workspace"><QuoteLayouts model="compare" vm={vm}/></div>;
};

window.SimuladorFrete = SimuladorFrete;

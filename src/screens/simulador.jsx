// Calculadora de Frete ANTT — Rodobach
const SimuladorFrete = ({ onNavigate }) => {
  const D = window.NT_DATA;
  const { useEffect, useState, useRef } = React;

  const [anttTabela, setAnttTabela] = useState(() => D.ANTT_TABELA);
  const [eixos,      setEixos]      = useState(6);
  const [tipoCarga,  setTipoCarga]  = useState("normal");
  const [operacao,   setOperacao]   = useState("etc");
  const [km,         setKm]         = useState("");
  const [pedagio,    setPedagio]    = useState("");
  const [seguro,     setSeguro]     = useState("");
  const [icms,       setIcms]       = useState(12);
  const [margem,     setMargem]     = useState(30);
  const [pedidoMot,  setPedidoMot]  = useState("");
  const [showCalc,   setShowCalc]   = useState(false);
  const [showAntt,   setShowAntt]   = useState(false);

  // Resultado do backend
  const [calc,        setCalc]       = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    window.RB_API.listAntt()
      .then((data) => { if (Array.isArray(data) && data.length) setAnttTabela(data); })
      .catch((err) => console.warn("API indisponivel, usando dados locais.", err));
  }, []);

  // Dispara o cálculo no backend sempre que os inputs mudam
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const kmNum = +km || 0;
    if (!kmNum) { setCalc(null); return; }

    debounceRef.current = setTimeout(() => {
      setCalcLoading(true);
      window.RB_API.calcularFrete({
        eixos,
        tipoCarga,
        operacao,
        km: kmNum,
        pedagio:        +pedagio || 0,
        seguroRCManual: seguro,
        margem:         +margem  || 30,
        icms:           +icms    || 12,
        valorMotoristaNegociado: pedidoMot,
      })
        .then(setCalc)
        .catch((err) => { console.warn("Falha ao calcular frete:", err); setCalc(null); })
        .finally(() => setCalcLoading(false));
    }, 400);
  }, [eixos, tipoCarga, operacao, km, pedagio, seguro, margem, icms, pedidoMot]);

  const tabRow = anttTabela.find(r => r.eixos === eixos) || anttTabela[0] || D.ANTT_TABELA[0];

  const hasKm         = (+km || 0) > 0;
  const valorMot      = calc?.resultado?.valorMotorista ?? 0;
  const valorCli      = calc?.resultado?.valorCliente   ?? 0;
  const lucro         = calc?.resultado?.lucro          ?? 0;
  const margemReal    = calc?.resultado?.margemPercent   ?? 0;
  const icmsValor     = calc?.resultado?.icmsValor       ?? 0;
  const simNeg        = calc?.simulacao;

  const margemNum     = +margem || 30;
  const icmsNum       = +icms   || 12;
  const kmNum         = +km     || 0;
  const pedagioNum    = +pedagio || 0;

  // Badge
  const badge = margemReal >= 30
    ? { label: "Frete bom",      color: "#047857", bg: "#f0fdf4", border: "#bbf7d0" }
    : margemReal >= 20
    ? { label: "Frete médio",    color: "#b45309", bg: "#fffbeb", border: "#fde68a" }
    : { label: "Frete apertado", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };

  const fmtR = (n) => `R$ ${fmtNum(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Texto para copiar
  const resumoTexto = hasKm && valorCli > 0 ? [
    `*Cotação ANTT — ${calc?.entrada?.tipoVeiculo || tabRow.tipoVeiculo} (${eixos} eixos)*`,
    `Operação: ${operacao.toUpperCase()} · Carga: ${tipoCarga === "normal" ? "Normal" : "Especial"}`,
    `Distância: ${kmNum.toLocaleString("pt-BR")} km`,
    pedagioNum > 0 ? `Pedágio: ${fmtR(pedagioNum)}` : null,
    calc?.encargos?.seguroCarga > 0 ? `Seguro carga: ${fmtR(calc.encargos.seguroCarga)}` : null,
    calc?.encargos?.seguroRC    > 0 ? `Seguro RC: ${fmtR(calc.encargos.seguroRC)}`       : null,
    ``,
    `*Pagar motorista: ${fmtR(valorMot)}*`,
    `*Cobrar do cliente: ${fmtR(valorCli)}*`,
    `Margem: ${margemReal}% · ICMS: ${icmsNum}%`,
  ].filter(x => x !== null).join("\n") : "";

  const usarComoCotacao = () => {
    window.NT_SIM = { km: kmNum, pedagio: pedagioNum, valorMotorista: valorMot, valorCliente: valorCli, tipoVeiculo: tabRow.tipoVeiculo, eixos };
    onNavigate("viagens");
  };

  const fs = {
    height: 34, padding: "0 10px",
    border: "1.5px solid var(--border)", borderRadius: "var(--r)",
    background: "var(--surface)", color: "var(--text)",
    fontSize: 13, outline: "none", boxSizing: "border-box", width: "100%",
  };
  const lbl = {
    display: "block", fontSize: 11, color: "var(--text-2)",
    fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6,
  };
  const secTitle = {
    fontSize: 12, fontWeight: 600, color: "var(--text-2)",
    paddingBottom: 10, marginBottom: 14, borderBottom: "1px solid var(--divider)",
  };

  const MARGENS = [20, 25, 30, 35];

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Calculadora de Frete</h1>
          <div className="sub">
            Modo rápido · tabela ANTT {tabRow.versao || "planilha_inicial"} · vigência {new Date().getFullYear()}
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => onNavigate("diarias")}>
            <Icon name="clock"/> Diárias
          </button>
          <button className="btn" onClick={() => onNavigate("viagens")}>
            <Icon name="route"/> Viagens
          </button>
        </div>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start"}}>

        {/* ── COLUNA ESQUERDA: Inputs ── */}
        <div className="card">

          {/* Seção 1 */}
          <div style={secTitle}>1. Dados da viagem</div>
          <div className="muted" style={{fontSize: 12, marginBottom: 14}}>
            Preencha só o necessário para chegar no valor do frete
          </div>

          {/* Veículo */}
          <div style={{marginBottom: 18}}>
            <label style={lbl}>Veículo</label>
            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
              {anttTabela.map(row => (
                <button key={row.eixos}
                  onClick={() => setEixos(row.eixos)}
                  className={`btn${eixos === row.eixos ? " primary" : ""}`}
                  style={{flex: "1 1 auto", minWidth: 80, fontSize: 12}}>
                  {row.tipoVeiculo}
                  <span style={{fontSize: 10, opacity: 0.75, marginLeft: 3}}>({row.eixos}e)</span>
                </button>
              ))}
            </div>
            <div className="muted" style={{fontSize: 11.5, marginTop: 6}}>
              Escolha o conjunto usado na viagem. O número de eixos define o CCD e o CC da tabela ANTT.
            </div>
          </div>

          {/* Tipo de carga */}
          <div style={{marginBottom: 18}}>
            <label style={lbl}>Carga normal ou carga especial?</label>
            <div className="row" style={{gap: 8}}>
              {[
                { id: "normal",          label: "Carga normal"   },
                { id: "alto_desempenho", label: "Carga especial" },
              ].map(opt => (
                <button key={opt.id}
                  onClick={() => setTipoCarga(opt.id)}
                  className={`btn${tipoCarga === opt.id ? " primary" : ""}`}
                  style={{flex: 1}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operação */}
          <div style={{marginBottom: 18}}>
            <label style={lbl}>Operação</label>
            <div className="row" style={{gap: 8}}>
              <button onClick={() => setOperacao("etc")}
                className={`btn${operacao === "etc" ? " primary" : ""}`}
                style={{flex: 1}}>ETC</button>
              <button onClick={() => setOperacao("tac")}
                className={`btn${operacao === "tac" ? " primary" : ""}`}
                style={{flex: 1}}>TAC</button>
            </div>
            <div className="muted" style={{fontSize: 11.5, marginTop: 6}}>
              ETC calcula como transportadoras. TAC adiciona os encargos estimados de RPA ao custo do motorista.
            </div>
          </div>

          {/* KM */}
          <div style={{marginBottom: 18}}>
            <label style={lbl}>KM da viagem</label>
            <div className="row" style={{gap: 8, alignItems: "center"}}>
              <input type="number" min="0" step="1" value={km}
                onChange={e => setKm(e.target.value)}
                style={fs} placeholder="Ex: 1.000"/>
              <span className="muted" style={{fontSize: 12.5, flexShrink: 0}}>km</span>
            </div>
          </div>

          {/* Seção 2 */}
          <div style={{...secTitle, marginTop: 4}}>2. Custos da viagem</div>
          <div className="muted" style={{fontSize: 12, marginBottom: 14}}>
            Informe os custos que normalmente entram na negociação
          </div>

          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18}}>
            <div>
              <label style={lbl}>Pedágio</label>
              <div className="row" style={{gap: 4, alignItems: "center"}}>
                <input type="number" min="0" step="0.01" value={pedagio}
                  onChange={e => setPedagio(e.target.value)}
                  style={{...fs}} placeholder="Ex: 400,00"/>
                <span className="muted" style={{fontSize: 11, flexShrink: 0}}>R$</span>
              </div>
            </div>
            <div>
              <label style={lbl}>Seguro adicional</label>
              <div className="row" style={{gap: 4, alignItems: "center"}}>
                <input type="number" min="0" step="0.01" value={seguro}
                  onChange={e => setSeguro(e.target.value)}
                  style={{...fs}} placeholder="Ex: 300,00"/>
                <span className="muted" style={{fontSize: 11, flexShrink: 0}}>R$</span>
              </div>
            </div>
            <div>
              <label style={lbl}>ICMS</label>
              <div className="row" style={{gap: 4, alignItems: "center"}}>
                <input type="number" min="0" max="30" step="0.1" value={icms}
                  onChange={e => setIcms(+e.target.value)}
                  style={{...fs}} placeholder="12"/>
                <span className="muted" style={{fontSize: 11, flexShrink: 0}}>%</span>
              </div>
            </div>
          </div>

          {/* Seção 3 */}
          <div style={{...secTitle, marginTop: 4}}>3. Meta de ganho</div>
          <div className="muted" style={{fontSize: 12, marginBottom: 12}}>
            Escolha rapidamente a margem desejada para a empresa
          </div>
          <div style={{marginBottom: 18}}>
            <label style={lbl}>Quanto a empresa quer ganhar?</label>
            <div className="row" style={{gap: 8}}>
              {MARGENS.map(m => (
                <button key={m}
                  onClick={() => setMargem(m)}
                  className={`btn${margem === m ? " primary" : ""}`}
                  style={{flex: 1}}>
                  {m}%
                </button>
              ))}
            </div>
          </div>

          {/* Seção 4 */}
          <div style={{...secTitle, marginTop: 4}}>4. Simulação de negociação</div>
          <div className="muted" style={{fontSize: 12, marginBottom: 12}}>
            Teste a conversa com o motorista e veja quanto precisa cobrar
          </div>
          <div style={{background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 18}}>
            <div style={{fontSize: 12.5, fontWeight: 500, marginBottom: 6}}>Simular negociação</div>
            <div className="muted" style={{fontSize: 12, marginBottom: 12}}>
              Digite o pedido do motorista, se quiser, o valor que pretende cobrar.
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12}}>
              <div>
                <label style={lbl}>Se o motorista pedir</label>
                <div className="row" style={{gap: 4, alignItems: "center"}}>
                  <input type="number" min="0" step="0.01" value={pedidoMot}
                    onChange={e => setPedidoMot(e.target.value)}
                    style={{...fs}} placeholder="Ex: 25.000,00"/>
                  <span className="muted" style={{fontSize: 11, flexShrink: 0}}>R$</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Quanto preciso cobrar do cliente?</label>
                <div style={{
                  ...fs, display: "flex", alignItems: "center", justifyContent: "flex-end",
                  fontWeight: simNeg?.valorCliente > 0 ? 600 : 400,
                  color: simNeg?.valorCliente > 0 ? "var(--brand-blue)" : "var(--text-3)",
                }}>
                  {simNeg?.valorCliente > 0 ? fmtR(simNeg.valorCliente) : "Ex: 35.969,74"}
                </div>
              </div>
            </div>
            {simNeg && (
              <div style={{fontSize: 12, color: "var(--text-2)"}}>
                Cobrar do cliente: <b style={{color: "var(--brand-blue)"}}>{fmtR(simNeg.valorCliente)}</b>
                &nbsp;· Lucro: <b style={{color: "#047857"}}>{fmtR(simNeg.lucro)}</b>
                &nbsp;· Margem: <b>{simNeg.margemPercent}%</b>
              </div>
            )}
          </div>

          {/* Acordeões */}
          <button onClick={() => setShowCalc(v => !v)}
            style={{width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--divider)", padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-2)"}}>
            <span>Ver cálculo avançado</span>
            <Icon name={showCalc ? "arrow-up" : "arrow-down"} size={14}/>
          </button>
          {showCalc && calc && (
            <div style={{background: "var(--bg)", borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 4}}>
              {[
                { l: `Deslocamento (${kmNum.toLocaleString("pt-BR")} km × R$ ${(calc.tabela?.kmValor || 0).toFixed(4)})`, v: calc.tabela?.deslocamento },
                { l: "Carga e descarga (ANTT)",    v: calc.tabela?.cargaDescarga },
                calc.encargos?.seguroCarga > 0 && { l: "Seguro de carga",         v: calc.encargos.seguroCarga },
                calc.encargos?.seguroRC    > 0 && { l: "Seguro RC (terceiros)",    v: calc.encargos.seguroRC    },
                pedagioNum > 0             && { l: "Pedágio",                      v: pedagioNum                },
                calc.encargos?.rpa?.patronalInss > 0 && { l: "Custo patronal TAC (INSS)", v: calc.encargos.rpa.patronalInss },
              ].filter(Boolean).map((row, i) => (
                <div key={i} className="row between" style={{marginBottom: 5}}>
                  <span className="muted">{row.l}</span>
                  <span className="num">{fmtR(row.v)}</span>
                </div>
              ))}
              {calc.encargos?.rpa && (
                <div style={{margin: "6px 0", padding: "6px 10px", background: "var(--surface)", borderRadius: 6, fontSize: 11.5}}>
                  <div style={{fontWeight: 500, marginBottom: 4, color: "var(--text-2)"}}>Detalhamento RPA/TAC (desconto motorista):</div>
                  {[
                    { l: `INSS (base ${calc.encargos.rpa.inssBase ? fmtR(calc.encargos.rpa.inssBase) : "—"})`, v: calc.encargos.rpa.inss },
                    { l: "SEST", v: calc.encargos.rpa.sest },
                    { l: "SENAT", v: calc.encargos.rpa.senat },
                  ].map((r, i) => (
                    <div key={i} className="row between" style={{marginBottom: 3}}>
                      <span className="muted">{r.l}</span>
                      <span className="num">- {fmtR(r.v)}</span>
                    </div>
                  ))}
                  <div className="row between" style={{fontWeight: 600, borderTop: "1px solid var(--divider)", paddingTop: 4, marginTop: 4}}>
                    <span>Líquido motorista</span>
                    <span className="num">{fmtR(calc.encargos.rpa.valorLiquidoMot)}</span>
                  </div>
                </div>
              )}
              <div style={{borderTop: "1px solid var(--divider)", paddingTop: 8, marginTop: 4}}>
                <div className="row between" style={{marginBottom: 5}}>
                  <span className="muted">= Custo operacional</span>
                  <span className="num" style={{fontWeight: 600}}>{fmtR(calc.encargos?.custoOperacional)}</span>
                </div>
                {icmsValor > 0 && (
                  <div className="row between" style={{marginBottom: 5}}>
                    <span className="muted">ICMS ({icmsNum}%)</span>
                    <span className="num">{fmtR(icmsValor)}</span>
                  </div>
                )}
                <div className="row between" style={{marginBottom: 5}}>
                  <span className="muted">Margem ({margemNum}%)</span>
                  <span className="num">{fmtR(lucro)}</span>
                </div>
                <div className="row between">
                  <span style={{fontWeight: 600}}>= Valor do cliente</span>
                  <span className="num" style={{fontWeight: 700, color: "var(--brand-blue)"}}>{fmtR(valorCli)}</span>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setShowAntt(v => !v)}
            style={{width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--divider)", padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-2)"}}>
            <span>Configuração ANTT</span>
            <Icon name={showAntt ? "arrow-up" : "arrow-down"} size={14}/>
          </button>
          {showAntt && (
            <div style={{overflow: "auto"}}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Veículo</th>
                    <th className="num">Eixos</th>
                    <th className="num">Normal R$/km</th>
                    <th className="num">Normal C/D</th>
                    <th className="num">Especial R$/km</th>
                    <th className="num">Especial C/D</th>
                  </tr>
                </thead>
                <tbody>
                  {anttTabela.map(row => (
                    <tr key={row.eixos} className={row.eixos === eixos ? "row-warn" : ""}>
                      <td style={{fontWeight: row.eixos === eixos ? 600 : 400}}>{row.tipoVeiculo}</td>
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

        {/* ── COLUNA DIREITA: Resultado ── */}
        <div className="col" style={{gap: 14}}>
          <div className="card">
            <div style={{fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 2}}>
              Cálculo da tabela
            </div>
            <div style={{fontSize: 13, color: "var(--text-2)", marginBottom: 20}}>
              Valor oficial da cotação · {tabRow.tipoVeiculo} · {tipoCarga === "normal" ? "Normal" : "Especial"}
            </div>

            {/* Indicador de carregamento */}
            {calcLoading && (
              <div style={{fontSize: 12, color: "var(--text-2)", marginBottom: 12, textAlign: "center"}}>
                Calculando…
              </div>
            )}

            {/* Cards de valores */}
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12}}>
              <div style={{padding: 16, background: hasKm && valorCli > 0 ? "var(--accent-soft)" : "var(--bg)", borderRadius: 8, border: `1.5px solid ${hasKm && valorCli > 0 ? "var(--accent-border)" : "var(--border)"}`}}>
                <div className="muted" style={{fontSize: 12, marginBottom: 6}}>Cobrar do cliente</div>
                <div style={{fontSize: 22, fontWeight: 700, color: valorCli > 0 ? "var(--brand-blue)" : "var(--text-3)", letterSpacing: "-0.5px"}}>
                  {valorCli > 0 ? fmtR(valorCli) : "—"}
                </div>
              </div>
              <div style={{padding: 16, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)"}}>
                <div className="muted" style={{fontSize: 12, marginBottom: 6}}>Pagar motorista</div>
                <div style={{fontSize: 22, fontWeight: 700, color: valorMot > 0 ? "var(--text)" : "var(--text-3)", letterSpacing: "-0.5px"}}>
                  {valorMot > 0 ? fmtR(valorMot) : "—"}
                </div>
              </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20}}>
              <div style={{padding: 16, background: lucro > 0 ? "#f0fdf4" : "var(--bg)", borderRadius: 8, border: `1px solid ${lucro > 0 ? "#bbf7d0" : "var(--border)"}`}}>
                <div style={{fontSize: 12, color: lucro > 0 ? "#047857" : "var(--text-2)", marginBottom: 6}}>Lucro da empresa</div>
                <div style={{fontSize: 20, fontWeight: 700, color: lucro > 0 ? "#047857" : "var(--text-3)"}}>
                  {lucro > 0 ? fmtR(lucro) : "—"}
                </div>
              </div>
              <div style={{padding: 16, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)"}}>
                <div className="row between" style={{marginBottom: 6}}>
                  <div style={{fontSize: 12, color: "var(--text-2)"}}>Margem</div>
                  <div style={{fontSize: 11.5, color: "var(--text-3)"}}>Meta {margemNum}%</div>
                </div>
                <div style={{fontSize: 20, fontWeight: 700, color: margemReal > 0 ? "#047857" : "var(--text-3)"}}>
                  {margemReal > 0 ? `${margemReal}%` : "—"}
                </div>
              </div>
            </div>

            {/* Badge de frete */}
            {valorCli > 0 && (
              <div style={{
                padding: "10px 14px", marginBottom: 20,
                background: badge.bg, border: `1px solid ${badge.border}`,
                borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8,
                fontSize: 13, fontWeight: 500, color: badge.color,
              }}>
                <Icon name="check" size={15} style={{color: badge.color, marginTop: 1, flexShrink: 0}}/>
                <div>
                  <div>{badge.label}</div>
                  <div style={{fontWeight: 400, fontSize: 12, marginTop: 2}}>
                    Margem real: {margemReal}% · Meta: {margemNum}%
                  </div>
                </div>
              </div>
            )}

            {/* Resumo para WhatsApp */}
            {valorCli > 0 && (
              <div style={{padding: 14, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 16}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", gap: 10}}>
                  <div>
                    <div style={{fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 2}}>
                      Resumo de negociação
                    </div>
                    <div style={{fontSize: 12, color: "var(--text-2)"}}>
                      Copie os valores principais para enviar ao motorista ou comercial.
                    </div>
                  </div>
                  <button className="btn primary" style={{fontSize: 12, flexShrink: 0}}
                    onClick={() => navigator.clipboard?.writeText(resumoTexto).catch(() => {})}>
                    <Icon name="whatsapp" size={13}/> Copiar para WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="col" style={{gap: 8}}>
              <button className="btn primary" style={{width: "100%", justifyContent: "center"}}
                onClick={usarComoCotacao} disabled={!hasKm}>
                <Icon name="route"/> Usar como cotação de viagem
              </button>
              <button className="btn" style={{width: "100%", justifyContent: "center"}}
                onClick={() => onNavigate("diarias")}>
                <Icon name="clock"/> Calcular diárias do motorista
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.SimuladorFrete = SimuladorFrete;
